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
    const { trackId } = body;

    if (!trackId) {
      res.status(400).json({ success: false, message: 'شناسه تراکنش (trackId) الزامی است.' });
      return;
    }

    const merchant = process.env.ZIBAL_MERCHANT_ID || '6a2da1bf87adc92a530c787c';
    console.log(`[Vercel Zibal Gateway] Verifying trackId=${trackId}, merchant=${merchant}`);

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
    console.log('[Vercel Zibal Gateway] Verification response:', resData);

    // Result 100 is paid and verified. 101 is already verified. Both are successful for the user.
    if (resData.result === 100 || resData.result === 101) {
      res.status(200).json({
        success: true,
        refNumber: String(resData.refNumber || ''),
        message: 'پرداخت با موفقیت تایید و نهایی شد.'
      });
    } else {
      res.status(200).json({
        success: false,
        message: `تایید تراکنش ناموفق بود: کد ${resData.result} - ${resData.message || 'پرداخت مورد تایید قرار نگرفت'}`
      });
    }
  } catch (err: any) {
    console.error('[Vercel Zibal Gateway Verify Error]', err);
    res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور در تایید تراکنش' });
  }
}
