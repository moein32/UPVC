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
    const { amountTomans, phoneNumber, description } = body;

    if (!amountTomans || isNaN(Number(amountTomans))) {
      res.status(400).json({ success: false, message: 'مبلغ تراکنش نامعتبر یا نامشخص است.' });
      return;
    }

    const amount = Number(amountTomans);
    const isSandbox = process.env.ZARINPAL_SANDBOX !== 'false';
    const merchant = process.env.ZARINPAL_MERCHANT_ID || process.env.VITE_ZARINPAL_MERCHANT_ID || (isSandbox ? '00000000-0000-0000-0000-000000000000' : 'afd57d04-0629-49e2-ae20-6b8dc7e75ca2');
    
    // Determine callback URL based on headers
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const callbackUrl = `${protocol}://${host}/#/payment-callback`;

    console.log(`[Vercel Zarinpal Gateway] Creating payment (Sandbox=${isSandbox}): amount=${amount} Tomans, phone=${phoneNumber}, merchant=${merchant}`);

    const zarinpalHost = isSandbox ? 'sandbox.zarinpal.com' : 'api.zarinpal.com';
    const gatewayUrl = `https://${zarinpalHost}/pg/v4/payment/request.json`;

    // Build metadata dynamically to avoid empty/invalid phone number failures
    const metadata: Record<string, string> = {};
    const cleanPhone = phoneNumber ? String(phoneNumber).trim() : '';
    if (cleanPhone && /^09\d{9}$/.test(cleanPhone)) {
      metadata.mobile = cleanPhone;
    }

    try {
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          merchant_id: merchant,
          amount: amount,
          currency: 'IRT', // IRT is Tomans
          callback_url: callbackUrl,
          description: description || 'خرید لایسنس نکس‌وین',
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`خطای ارتباط با درگاه پرداخت زرین‌پال (کد وضعیت: ${response.status})`);
      }

      const resData: any = await response.json();
      console.log('[Vercel Zarinpal Gateway] Response:', resData);

      if (resData.data && resData.data.authority) {
        const authority = resData.data.authority;
        const startPayUrl = isSandbox 
          ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
          : `https://www.zarinpal.com/pg/StartPay/${authority}`;

        res.status(200).json({
          success: true,
          authority: authority,
          trackId: authority, // For backward compatibility if needed
          redirectUrl: startPayUrl,
          message: 'تراکنش با موفقیت در زرین‌پال ایجاد شد.'
        });
      } else {
        const errorMsg = resData.errors && resData.errors.message
          ? resData.errors.message
          : (resData.errors && Object.keys(resData.errors).length > 0 ? JSON.stringify(resData.errors) : 'خطا در ایجاد تراکنش');
        
        res.status(200).json({
          success: false,
          message: `خطای درگاه زرین‌پال: ${errorMsg}`
        });
      }
    } catch (fetchErr: any) {
      console.error('[Vercel Zarinpal Gateway Request Fetch Error]', fetchErr);
      res.status(400).json({ 
        success: false, 
        message: `خطا در ارتباط مستقیم با درگاه زرین‌پال: ${fetchErr.message || fetchErr}` 
      });
    }
  } catch (err: any) {
    console.error('[Vercel Zarinpal Gateway Request Error]', err);
    res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور در اتصال به زرین‌پال' });
  }
}
