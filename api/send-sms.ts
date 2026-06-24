import type { IncomingMessage, ServerResponse } from 'http';

// Helper to parse JSON body for Serverless Function
function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', (err: any) => {
      reject(err);
    });
  });
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  try {
    const body = req.body || await parseBody(req);
    const { phoneNumber, code } = body;

    if (!phoneNumber || !code) {
      res.status(400).json({ success: false, message: 'شماره همراه و کد تایید الزامی هستند.' });
      return;
    }

    const provider = process.env.SMS_PROVIDER || process.env.VITE_SMS_PROVIDER || 'sms.ir';
    const apiKey = process.env.SMS_API_KEY || process.env.VITE_SMS_API_KEY || 'QQVvRd6pJXh4yqrwBnNuOgoFyoJIKDSPYpD5PaZZVdBPQRTQ';
    const templateIdCode = process.env.SMS_OTP_TEMPLATE_CODE || process.env.VITE_SMS_OTP_TEMPLATE_CODE || '100000';

    console.log(`[Vercel Serverless SMS] Sending verification code to ${phoneNumber} using provider ${provider}`);

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
          res.status(200).json({ success: true, message: 'پیامک با موفقیت از طریق سرورست ورسل ارسال شد.' });
          return;
        }
        res.status(400).json({ success: false, message: `پاسخ خطا از سامانه پیامک: ${JSON.stringify(resData)}` });
        return;
      } else {
        const errText = await response.text();
        res.status(response.status).json({ success: false, message: `خطای ارسال پیامک: ${errText}` });
        return;
      }
    } else if (provider === 'kavenegar') {
      const url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?receptor=${phoneNumber}&token=${code}&template=${templateIdCode}`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data.return?.status === 200) {
        res.status(200).json({ success: true, message: 'پیامک با موفقیت از طریق کاوه‌نگار ارسال شد.' });
        return;
      }
      res.status(400).json({ success: false, message: data.return?.message || 'خطا در وب‌سرویس کاوه‌نگار' });
      return;
    } else {
      res.status(200).json({ success: true, message: 'ارسال با موفقیت شبیه‌سازی شد (سرویس پیش‌فرض).', mock: true });
      return;
    }
  } catch (err: any) {
    console.error('[Vercel Serverless SMS Error]', err);
    res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور در ارسال پیامک' });
  }
}
