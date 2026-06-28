// Supabase Edge Function: zibal
// This function proxies Zibal payment requests and verifications to ensure stable, whitelisted IPs from Supabase.
// Deploy this function to Supabase using: supabase functions deploy zibal

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, message: 'Only POST requests are allowed.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body = await req.json();
    const { action, merchant, amount, callbackUrl, description, mobile, orderId, trackId } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, message: 'Action is required ("request" or "verify").' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'request') {
      if (!merchant || !amount || !callbackUrl) {
        return new Response(
          JSON.stringify({ success: false, message: 'Missing parameters for payment request.' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`[Zibal Edge Proxy] Initiating request: amount=${amount}, orderId=${orderId}`);

      const zibalResponse = await fetch('https://gateway.zibal.ir/v1/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          merchant,
          amount,
          callbackUrl,
          description: description || 'خرید اشتراک نکس‌وین',
          mobile: mobile || '',
          orderId: orderId || `NW-${Date.now()}`
        })
      });

      if (!zibalResponse.ok) {
        const errorText = await zibalResponse.text();
        return new Response(
          JSON.stringify({ success: false, message: `Zibal server error: ${errorText}` }),
          { 
            status: zibalResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const resData = await zibalResponse.json();
      return new Response(
        JSON.stringify(resData),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else if (action === 'verify') {
      if (!merchant || !trackId) {
        return new Response(
          JSON.stringify({ success: false, message: 'Missing parameters for verification.' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`[Zibal Edge Proxy] Verifying trackId=${trackId}`);

      const zibalResponse = await fetch('https://gateway.zibal.ir/v1/verify', {
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

      if (!zibalResponse.ok) {
        const errorText = await zibalResponse.text();
        return new Response(
          JSON.stringify({ success: false, message: `Zibal server error: ${errorText}` }),
          { 
            status: zibalResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const resData = await zibalResponse.json();
      return new Response(
        JSON.stringify(resData),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid action. Supported values: "request", "verify".' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('[Zibal Edge Proxy Error]', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal proxy error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
