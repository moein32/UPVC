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
    const { authority, trackId, amountTomans } = body;
    const actualAuthority = authority || trackId;

    if (!actualAuthority) {
      res.status(400).json({ success: false, message: 'شناسه مرجع تراکنش (authority) الزامی است.' });
      return;
    }

    if (!amountTomans || isNaN(Number(amountTomans))) {
      res.status(400).json({ success: false, message: 'مبلغ تراکنش نامعتبر یا نامشخص است.' });
      return;
    }

    const merchant = 'afd57d04-0629-49e2-ae20-6b8dc7e75ca2';

    console.log(`[Vercel Zarinpal Gateway] Verifying real payment: authority=${actualAuthority}, amount=${amountTomans} Tomans, merchant=${merchant}`);

    const gatewayUrl = 'https://api.zarinpal.com/pg/v4/payment/verify.json';

    try {
      const resData = await httpsPost(gatewayUrl, {
        merchant_id: merchant,
        amount: Number(amountTomans),
        authority: actualAuthority
      });

      console.log('[Vercel Zarinpal Gateway] Verification response:', resData);

      if (resData.data && (resData.data.code === 100 || resData.data.code === 101)) {
        res.status(200).json({
          success: true,
          refId: String(resData.data.ref_id || ''),
          refNumber: String(resData.data.ref_id || ''), // For backward compatibility
          message: 'پرداخت با موفقیت تایید و نهایی شد.'
        });
      } else {
        const errorMsg = resData.errors && resData.errors.message
          ? resData.errors.message
          : (resData.errors && Object.keys(resData.errors).length > 0 ? JSON.stringify(resData.errors) : 'تایید تراکنش مورد تایید قرار نگرفت');
        
        res.status(200).json({
          success: false,
          message: `تایید تراکنش ناموفق بود: ${errorMsg}`
        });
      }
    } catch (fetchErr: any) {
      console.error('[Vercel Zarinpal Gateway Verify Fetch Error]', fetchErr);
      const errMsg = fetchErr.message || '';
      let userMessage = `خطا در استعلام و تایید مستقیم تراکنش از زرین‌پال: ${errMsg}`;
      
      // Check if it's a network reachability / host resolution issue due to sandbox/cloud run
      if (errMsg.includes('ENOTFOUND') || errMsg.includes('ETIMEDOUT') || errMsg.includes('fetch failed') || errMsg.includes('connect')) {
        userMessage = `خطای شبکه درگاه زرین‌پال در تایید پرداخت: به دلیل اجرای این برنامه روی بستر توسعه ابری گوگل (Cloud Run) و عدم دسترسی دیتاسنتر گوگل به وب‌سرویس زرین‌پال ایران، تایید تراکنش با وقفه مواجه شد. در سناریوی واقعی این خطا برطرف می‌شود.`;
      }
      
      res.status(400).json({ success: false, message: userMessage });
    }
  } catch (err: any) {
    console.error('[Vercel Zarinpal Gateway Verify Error]', err);
    res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور در تایید تراکنش' });
  }
}
