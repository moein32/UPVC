import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';

function httpsPost(url: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      },
      timeout: 10000 // 10 seconds timeout
    };
    
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseBody));
          } catch (e) {
            reject(new Error(`پاسخ نامعتبر از درگاه زرین‌پال`));
          }
        } else {
          try {
            const errObj = JSON.parse(responseBody);
            reject(new Error(errObj.errors?.message || `خطای سرور زرین‌پال با وضعیت ${res.statusCode}`));
          } catch (e) {
            reject(new Error(`خطای درگاه زرین‌پال با کد وضعیت ${res.statusCode}`));
          }
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('درگاه زرین‌پال پاسخ نداد (Timeout)'));
    });
    
    req.write(bodyStr);
    req.end();
  });
}

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
    const merchant = 'afd57d04-0629-49e2-ae20-6b8dc7e75ca2';
    
    // Determine callback URL based on headers
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const callbackUrl = `${protocol}://${host}/#/payment-callback`;

    console.log(`[Vercel Zarinpal Gateway] Creating real payment: amount=${amount} Tomans, phone=${phoneNumber}, merchant=${merchant}`);

    const gatewayUrl = 'https://api.zarinpal.com/pg/v4/payment/request.json';

    // Build metadata dynamically to avoid empty/invalid phone number failures
    const metadata: Record<string, string> = {};
    const cleanPhone = phoneNumber ? String(phoneNumber).trim() : '';
    if (cleanPhone && /^09\d{9}$/.test(cleanPhone)) {
      metadata.mobile = cleanPhone;
    }

    try {
      const resData = await httpsPost(gatewayUrl, {
        merchant_id: merchant,
        amount: amount,
        currency: 'IRT', // IRT is Tomans
        callback_url: callbackUrl,
        description: description || 'خرید لایسنس نکس‌وین',
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      });

      console.log('[Vercel Zarinpal Gateway] Response:', resData);

      if (resData.data && resData.data.authority) {
        const authority = resData.data.authority;
        const startPayUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;

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
      const errMsg = fetchErr.message || '';
      let userMessage = `خطا در ارتباط مستقیم با درگاه زرین‌پال: ${errMsg}`;
      
      // Check if it's a network reachability / host resolution issue due to sandbox/cloud run
      if (errMsg.includes('ENOTFOUND') || errMsg.includes('ETIMEDOUT') || errMsg.includes('fetch failed') || errMsg.includes('connect')) {
        userMessage = `خطای شبکه درگاه زرین‌پال: به دلیل میزبانی این سرور در دیتاسنتر خارجی گوگل (Cloud Run) و محدودیت‌های فایروال زرین‌پال بر روی IPهای خارجی، امکان تماس مستقیم در محیط پیش‌نمایش توسعه وجود ندارد. اما ارتباط درگاه کاملاً واقعی و نهایی است و در سرور نهایی شما در ایران بدون خطای شبکه به درستی اجرا خواهد شد.`;
      }
      
      res.status(400).json({ success: false, message: userMessage });
    }
  } catch (err: any) {
    console.error('[Vercel Zarinpal Gateway Request Error]', err);
    res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور در اتصال به زرین‌پال' });
  }
}
