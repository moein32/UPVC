import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Health Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Zibal Payment Request Endpoint (Server-Side Secure Gateway to prevent CORS)
  app.post("/api/payment/request", async (req: any, res: any) => {
    try {
      const { amountTomans, phoneNumber, description } = req.body;

      if (!amountTomans || isNaN(Number(amountTomans))) {
        return res.status(400).json({ success: false, message: 'مبلغ تراکنش نامعتبر یا نامشخص است.' });
      }

      const amountRials = Number(amountTomans) * 10;
      const merchant = process.env.ZIBAL_MERCHANT_ID || 'zibal';
      
      // Determine callback URL based on environment or host header
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const callbackUrl = `${protocol}://${host}/#/payment-callback`;

      console.log(`[Zibal Server Gateway] Creating payment: amount=${amountRials} Rials, phone=${phoneNumber}, merchant=${merchant}`);

      const response = await fetch('https://gateway.zibal.ir/v1/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          merchant,
          amount: amountRials,
          callbackUrl,
          description: description || 'خرید اشتراک نکس‌وین',
          mobile: phoneNumber || '',
          orderId: 'NW-' + Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`خطای ارتباط با درگاه پرداخت زیبال (کد وضعیت: ${response.status})`);
      }

      const resData = await response.json();
      console.log('[Zibal Server Gateway] Response:', resData);

      if (resData.result === 100) {
        const trackId = resData.trackId;
        return res.status(200).json({
          success: true,
          trackId: String(trackId),
          redirectUrl: `https://gateway.zibal.ir/start/${trackId}`,
          message: 'تراکنش با موفقیت ایجاد شد.'
        });
      } else {
        return res.status(200).json({
          success: false,
          message: `خطای درگاه زیبال: کد ${resData.result} - ${resData.message || 'خطا در ایجاد تراکنش'}`
        });
      }
    } catch (err: any) {
      console.error('[Zibal Gateway Request Error]', err);
      return res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور در اتصال به زیبال' });
    }
  });

  // Zibal Payment Verification Endpoint (Server-Side Secure Gateway)
  app.post("/api/payment/verify", async (req: any, res: any) => {
    try {
      const { trackId } = req.body;

      if (!trackId) {
        return res.status(400).json({ success: false, message: 'شناسه تراکنش (trackId) الزامی است.' });
      }

      const merchant = process.env.ZIBAL_MERCHANT_ID || 'zibal';
      console.log(`[Zibal Server Gateway] Verifying trackId=${trackId}, merchant=${merchant}`);

      const response = await fetch('https://gateway.zibal.ir/v1/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          merchant,
          trackId: Number(trackId)
        })
      });

      if (!response.ok) {
        throw new Error(`خطای تایید تراکنش در وب‌سرویس زیبال (کد وضعیت: ${response.status})`);
      }

      const resData = await response.json();
      console.log('[Zibal Server Gateway] Verification response:', resData);

      // Result 100 is paid and verified. 101 is already verified. Both are successful for the user.
      if (resData.result === 100 || resData.result === 101) {
        return res.status(200).json({
          success: true,
          refNumber: String(resData.refNumber || ''),
          message: 'پرداخت با موفقیت تایید و نهایی شد.'
        });
      } else {
        return res.status(200).json({
          success: false,
          message: `تایید تراکنش ناموفق بود: کد ${resData.result} - ${resData.message || 'پرداخت مورد تایید قرار نگرفت'}`
        });
      }
    } catch (err: any) {
      console.error('[Zibal Gateway Verify Error]', err);
      return res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور در تایید تراکنش' });
    }
  });

  // SMS API Endpoint
  app.post("/api/send-sms", async (req: any, res: any) => {
    try {
      const { phoneNumber, code } = req.body;

      if (!phoneNumber || !code) {
        return res.status(400).json({ success: false, message: 'شماره همراه و کد تایید الزامی هستند.' });
      }

      const provider = process.env.SMS_PROVIDER || process.env.VITE_SMS_PROVIDER || 'sms.ir';
      const apiKey = process.env.SMS_API_KEY || process.env.VITE_SMS_API_KEY || 'QQVvRd6pJXh4yqrwBnNuOgoFyoJIKDSPYpD5PaZZVdBPQRTQ';
      const templateIdCode = process.env.SMS_OTP_TEMPLATE_CODE || process.env.VITE_SMS_OTP_TEMPLATE_CODE || '100000';

      console.log(`[SMS Server API] Sending verification code to ${phoneNumber} using provider ${provider}`);

      if (provider === 'sms.ir') {
        const templateId = parseInt(templateIdCode, 10) || 100000;
        const bodyPayload = {
          mobile: phoneNumber,
          templateId: templateId,
          parameters: [
            { name: 'OTP', value: code },
            { name: 'otp', value: code },
            { name: 'Code', value: code },
            { name: 'code', value: code }
          ]
        };

        const response = await fetch('https://api.sms.ir/v1/send/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-KEY': apiKey
          },
          body: JSON.stringify(bodyPayload)
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.status === 1 || resData.status === 100 || resData.success || resData.result === 100) {
            return res.status(200).json({ success: true, message: 'پیامک با موفقیت ارسال شد.' });
          }
          return res.status(400).json({ success: false, message: `پاسخ خطا از سامانه پیامک: ${JSON.stringify(resData)}` });
        } else {
          const errText = await response.text();
          return res.status(response.status).json({ success: false, message: `خطای ارسال پیامک: ${errText}` });
        }
      } else if (provider === 'kavenegar') {
        const url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?receptor=${phoneNumber}&token=${code}&template=${templateIdCode}`;
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok && data.return?.status === 200) {
          return res.status(200).json({ success: true, message: 'پیامک با موفقیت از طریق کاوه‌نگار ارسال شد.' });
        }
        return res.status(400).json({ success: false, message: data.return?.message || 'خطا در وب‌سرویس کاوه‌نگار' });
      } else {
        return res.status(200).json({ success: true, message: 'ارسال با موفقیت شبیه‌سازی شد (سرویس پیش‌فرض).', mock: true });
      }
    } catch (err: any) {
      console.error('[SMS Server API Error]', err);
      return res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور' });
    }
  });

  // Vite middleware setup in development, static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
