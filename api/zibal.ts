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
    const { action, merchant, amount, callbackUrl, description, mobile, orderId, trackId } = body;

    if (!action) {
      res.status(400).json({ success: false, message: 'اکشن مورد نظر ارسال نشده است.' });
      return;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const useSupabaseProxy = !!(supabaseUrl && supabaseKey && 
                                 supabaseUrl !== 'zibal' && 
                                 !supabaseUrl.includes('YOUR_SUPABASE') && 
                                 supabaseUrl.trim() !== '');

    if (action === 'request') {
      if (!merchant || !amount || !callbackUrl) {
        res.status(400).json({ success: false, message: 'اطلاعات ارسالی برای درخواست پرداخت ناقص است.' });
        return;
      }

      let response;
      if (useSupabaseProxy) {
        const cleanSupabaseUrl = supabaseUrl!.replace(/\/$/, '');
        console.log(`[Zibal Server Proxy] Proxying payment request via Supabase Edge Function: ${cleanSupabaseUrl}/functions/v1/zibal`);
        response = await fetch(`${cleanSupabaseUrl}/functions/v1/zibal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            action: 'request',
            merchant,
            amount,
            callbackUrl,
            description,
            mobile,
            orderId
          })
        });
      } else {
        console.log(`[Zibal Server Proxy] Sending request directly to Zibal: merchant=${merchant}, amount=${amount}`);
        response = await fetch('https://gateway.zibal.ir/v1/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            merchant,
            amount,
            callbackUrl,
            description,
            mobile,
            orderId
          })
        });
      }

      if (response.ok) {
        const resData = await response.json();
        res.status(200).json(resData);
        return;
      } else {
        const errText = await response.text();
        res.status(response.status).json({ success: false, message: `خطای سرور زیبال در درخواست پرداخت: ${errText}` });
        return;
      }
    } else if (action === 'verify') {
      if (!merchant || !trackId) {
        res.status(400).json({ success: false, message: 'اطلاعات ارسالی برای بررسی تایید تراکنش ناقص است.' });
        return;
      }

      let response;
      if (useSupabaseProxy) {
        const cleanSupabaseUrl = supabaseUrl!.replace(/\/$/, '');
        console.log(`[Zibal Server Proxy] Proxying verification via Supabase Edge Function: ${cleanSupabaseUrl}/functions/v1/zibal`);
        response = await fetch(`${cleanSupabaseUrl}/functions/v1/zibal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            action: 'verify',
            merchant,
            trackId
          })
        });
      } else {
        console.log(`[Zibal Server Proxy] Verifying trackId=${trackId} directly with merchant=${merchant}`);
        response = await fetch('https://gateway.zibal.ir/v1/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            merchant,
            trackId
          })
        });
      }

      if (response.ok) {
        const resData = await response.json();
        res.status(200).json(resData);
        return;
      } else {
        const errText = await response.text();
        res.status(response.status).json({ success: false, message: `خطای سرور زیبال در تایید پرداخت: ${errText}` });
        return;
      }
    } else {
      res.status(400).json({ success: false, message: 'اکشن نامعتبر است.' });
    }
  } catch (err: any) {
    console.error('[Zibal Server Proxy Error]', err);
    res.status(500).json({ success: false, message: err.message || 'خطای داخلی سرور پروکسی زیبال' });
  }
}
