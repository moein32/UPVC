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

    const merchant = process.env.VITE_ZARINPAL_MERCHANT_ID || 'c7c38578-79ef-42e4-a05f-7f77caa534cb';
    const useSandbox = process.env.VITE_ZARINPAL_USE_SANDBOX === 'true';

    console.log(`[Vercel Zarinpal Gateway] Verifying authority=${actualAuthority}, amount=${amountTomans} Tomans, merchant=${merchant}, sandbox=${useSandbox}`);

    const gatewayUrl = useSandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
      : 'https://api.zarinpal.com/pg/v4/payment/verify.json';

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        merchant_id: merchant,
        amount: Number(amountTomans),
        authority: actualAuthority
      })
    });

    if (!response.ok) {
      throw new Error(`خطای تایید تراکنش در وب‌سرویس زرین‌پال (کد وضعیت: ${response.status})`);
    }

    const resData = await response.json();
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
  } catch (err: any) {
    console.error('[Vercel Zarinpal Gateway Verify Error]', err);
    res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور در تایید تراکنش' });
  }
}
