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

    const amountRials = Number(amountTomans) * 10;
    const merchant = process.env.ZIBAL_MERCHANT_ID || '6a2da1bf87adc92a530c787c';
    
    // Determine callback URL based on headers
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const callbackUrl = `${protocol}://${host}/#/payment-callback`;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const useSupabaseProxy = !!(supabaseUrl && supabaseKey && 
                                 supabaseUrl !== 'zibal' && 
                                 !supabaseUrl.includes('YOUR_SUPABASE') && 
                                 supabaseUrl.trim() !== '');

    let response;
    if (useSupabaseProxy) {
      const cleanSupabaseUrl = supabaseUrl!.replace(/\/$/, '');
      console.log(`[Vercel Zibal Gateway] Proxying payment request via Supabase Edge Function: ${cleanSupabaseUrl}/functions/v1/zibal`);
      response = await fetch(`${cleanSupabaseUrl}/functions/v1/zibal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          action: 'request',
          merchant,
          amount: amountRials,
          callbackUrl,
          description: description || 'خرید لایسنس نکس‌وین',
          mobile: phoneNumber || '',
          orderId: 'NW-' + Date.now()
        })
      });
    } else {
      console.log(`[Vercel Zibal Gateway] Creating payment directly: amount=${amountRials} Rials, phone=${phoneNumber}, merchant=${merchant}`);
      response = await fetch('https://gateway.zibal.ir/v1/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          merchant,
          amount: amountRials,
          callbackUrl,
          description: description || 'خرید لایسنس نکس‌وین',
          mobile: phoneNumber || '',
          orderId: 'NW-' + Date.now()
        })
      });
    }

    if (!response.ok) {
      throw new Error(`خطای ارتباط با درگاه پرداخت زیبال (کد وضعیت: ${response.status})`);
    }

    const resData = await response.json();
    console.log('[Vercel Zibal Gateway] Response:', resData);

    if (resData.result === 100) {
      const trackId = resData.trackId;
      res.status(200).json({
        success: true,
        trackId: String(trackId),
        redirectUrl: `https://gateway.zibal.ir/start/${trackId}`,
        message: 'تراکنش با موفقیت ایجاد شد.'
      });
    } else {
      res.status(200).json({
        success: false,
        message: `خطای درگاه زیبال: کد ${resData.result} - ${resData.message || 'خطا در ایجاد تراکنش'}`
      });
    }
  } catch (err: any) {
    console.error('[Vercel Zibal Gateway Request Error]', err);
    res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور در اتصال به زیبال' });
  }
}
