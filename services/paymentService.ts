/**
 * NexWin Payment Gateway Integration & Verification Service (Zibal / زیبال)
 * -------------------------------------------------------------------------
 * در این ماژول پیکربندی درگاه پرداخت زیبال (Zibal) قرار گرفته است.
 * فرآیند شارژ و تمدید لایسنس کارگاهی نکس‌وین از این بخش عبور می‌کند.
 * شناسه مرچنت تستی پیش‌فرض زیبال عبارت "zibal" می‌باشد.
 */

export interface PaymentRequestData {
  amountTomans: number;       // مبلغ به تومان
  phoneNumber: string;        // شماره همراه خریدار
  description: string;        // توضیحات خرید (مثلا: خرید لایسنس طلایی نکس‌وین)
  userTier: 'bronze' | 'silver' | 'gold';
  ownerName: string;
  companyName: string;
}

// تنظیمات درگاه پرداخت زیبال شما
export const ZIBAL_CONFIG = {
  // ۱. کد مرچند اختصاصی زیبال یا کلمه "zibal" برای حالت تستی/آزمایشی
  get MERCHANT_ID(): string {
    const saved = localStorage.getItem('zibal_merchant_id');
    if (saved && saved.trim() && saved.trim() !== 'YOUR-ZIBAL-MERCHANT-ID-HERE') {
      return saved.trim();
    }
    const envVal = import.meta.env.VITE_ZIBAL_MERCHANT_ID;
    if (envVal && envVal.trim()) {
      return envVal.trim();
    }
    const envValZarinpal = import.meta.env.VITE_ZARINPAL_MERCHANT_ID;
    if (envValZarinpal && envValZarinpal.trim()) {
      return envValZarinpal.trim();
    }
    return '6a2da1bf87adc92a530c787c'; // درگاه پیش‌فرض فعال بر روی زیبال
  },

  // ۲. آدرس بازگشت پس از تراکنش پرداخت (Callback URL)
  CALLBACK_URL: window.location.origin + '/#/payment-callback',

  // ۳. آیا از درگاه تستی/آموزشی زیبال استفاده می‌شود؟
  get USE_SANDBOX(): boolean {
    return this.MERCHANT_ID === 'zibal';
  }
};

/**
 * گیت‌وی ارسال درخواست تراکنش خرید به زیبال
 */
export async function initiateZibalPayment(data: PaymentRequestData): Promise<{ success: boolean; redirectUrl?: string; authority?: string; message: string }> {
  console.log(`[Zibal Debug] Initiating payment for ${data.phoneNumber} - Amount: ${data.amountTomans} Tomans (${data.amountTomans * 10} Rials)`);

  const merchant = ZIBAL_CONFIG.MERCHANT_ID;
  const amountRials = data.amountTomans * 10;

  // ۱. تلاش اول: استفاده از سرور پروکسی امن خود اپلیکیشن (/api/zibal) که فاقد هرگونه محدودیت CORS مرورگر یا فیلترینگ است
  try {
    const payload = {
      action: 'request',
      merchant: merchant,
      amount: amountRials,
      callbackUrl: ZIBAL_CONFIG.CALLBACK_URL,
      description: data.description,
      mobile: data.phoneNumber,
      orderId: 'NW-' + Date.now()
    };

    console.log('[Zibal API] Sending request to Zibal via Server Proxy:', payload);

    const response = await fetch('/api/zibal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const resData = await response.json();
      console.log('[Zibal API] Response from Server Proxy:', resData);

      if (resData.result === 100) {
        const trackId = resData.trackId;
        const payUrl = `https://gateway.zibal.ir/start/${trackId}`;
        return {
          success: true,
          authority: String(trackId),
          redirectUrl: payUrl,
          message: 'اتصال به زیبال با موفقیت انجام شد.'
        };
      } else {
        console.warn(`[Zibal API] Server Proxy returned failure code: ${resData.result}`);
      }
    }
  } catch (proxyError) {
    console.warn('[Zibal API] Server Proxy attempt failed, falling back to browser-level cors proxies...', proxyError);
  }

  // ۲. تلاش دوم (فال‌بک): ارسال درخواست مستقیم با بای‌پاس CORS مرورگر
  try {
    const originalUrl = 'https://gateway.zibal.ir/v1/request';
    const baseUrl = `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`;

    const payload = {
      merchant: merchant,
      amount: amountRials,
      callbackUrl: ZIBAL_CONFIG.CALLBACK_URL,
      description: data.description,
      mobile: data.phoneNumber,
      orderId: 'NW-' + Date.now()
    };

    console.log('[Zibal API] Sending request to Zibal via CORS Proxy:', payload);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`خطای پاسخ درگاه زیبال (${response.status})`);
    }

    const resData = await response.json();
    console.log('[Zibal API] Response received:', resData);

    if (resData.result === 100) {
      const trackId = resData.trackId;
      // آدرس هدایت کاربر به درگاه بانک در زیبال
      const payUrl = `https://gateway.zibal.ir/start/${trackId}`;
      
      return {
        success: true,
        authority: String(trackId),
        redirectUrl: payUrl,
        message: 'اتصال به زیبال با موفقیت انجام شد.'
      };
    } else {
      const errorMsg = `کد خطای زیبال: ${resData.result} - ${resData.message || 'خطای اتصال زیبال'}`;
      throw new Error(errorMsg);
    }
  } catch (error: any) {
    console.warn('[Zibal API] Proxy failed, trying direct request...', error);
    try {
      const baseUrl = 'https://gateway.zibal.ir/v1/request';
      const payload = {
        merchant: merchant,
        amount: amountRials,
        callbackUrl: ZIBAL_CONFIG.CALLBACK_URL,
        description: data.description,
        mobile: data.phoneNumber,
        orderId: 'NW-' + Date.now()
      };

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.result === 100) {
          const trackId = resData.trackId;
          const payUrl = `https://gateway.zibal.ir/start/${trackId}`;
          return {
            success: true,
            authority: String(trackId),
            redirectUrl: payUrl,
            message: 'اتصال به زیبال با موفقیت انجام شد.'
          };
        }
      }
    } catch (directErr) {
      console.warn('[Zibal API] Direct request failed:', directErr);
    }

    // پروکسی جایگزین AllOrigins
    try {
      console.log('[Zibal API] Trying secondary AllOrigins proxy...');
      const originalUrl = 'https://gateway.zibal.ir/v1/request';
      const baseUrlAllOrigins = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
      const payloadAO = {
        merchant: merchant,
        amount: amountRials,
        callbackUrl: ZIBAL_CONFIG.CALLBACK_URL,
        description: data.description,
        mobile: data.phoneNumber,
        orderId: 'NW-' + Date.now()
      };

      const responseAO = await fetch(baseUrlAllOrigins, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payloadAO)
      });

      if (responseAO.ok) {
        const resDataAO = await responseAO.json();
        if (resDataAO.result === 100) {
          const trackId = resDataAO.trackId;
          const payUrl = `https://gateway.zibal.ir/start/${trackId}`;
          return {
            success: true,
            authority: String(trackId),
            redirectUrl: payUrl,
            message: 'اتصال به زیبال با موفقیت انجام شد.'
          };
        }
      }
    } catch (aoError) {
      console.warn('AllOrigins failed as well:', aoError);
    }

    // اگر کاملا خطای شبکه وجود داشت، پیغام خطا بازمی‌گردانیم
    console.warn('[Zibal API] All connection attempts failed.');
    return {
      success: false,
      message: 'عدم امکان برقراری ارتباط با درگاه پرداخت زیبال. لطفاً اتصال اینترنت خود را بررسی کرده یا بعداً تلاش کنید.'
    };
  }
}

/**
 * متد تایید و وریفای نهایی تراکنش پس از بازگشت کاربر از درگاه زیبال
 */
export async function verifyZibalPayment(trackId: string, amountTomans: number): Promise<{ success: boolean; refId?: string; message: string }> {
  if (!trackId || isNaN(Number(trackId))) {
    return {
      success: false,
      message: 'شناسه تراکنش نامعتبر است یا پرداخت منقضی گردیده است.'
    };
  }

  // ۱. تلاش اول: تایید تراکنش با استفاده از سرور پروکسی امن خود اپلیکیشن (/api/zibal) جهت دور زدن تمام محدودیت‌ها
  try {
    const payload = {
      action: 'verify',
      merchant: ZIBAL_CONFIG.MERCHANT_ID,
      trackId: Number(trackId)
    };

    console.log('[Zibal API] Verifying payment via Server Proxy:', payload);

    const response = await fetch('/api/zibal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const resData = await response.json();
      console.log('[Zibal API] Verify response from Server Proxy:', resData);

      if (resData.result === 100 || resData.result === 101) {
        return {
          success: true,
          refId: String(resData.refNumber || 'ZBL-REF-REAL'),
          message: 'پرداخت با موفقیت در سیستم زیبال تایید و نهایی گردید.'
        };
      } else {
        console.warn(`[Zibal API] Server Proxy verification failure code: ${resData.result}`);
      }
    }
  } catch (proxyError) {
    console.warn('[Zibal API] Server Proxy verify failed, falling back to browser-level proxies...', proxyError);
  }

  // ۲. تلاش دوم (فال‌بک): تایید تراکنش با پروکسی مرورگر
  try {
    const originalUrl = 'https://gateway.zibal.ir/v1/verify';
    const baseUrl = `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`;
    const payload = {
      merchant: ZIBAL_CONFIG.MERCHANT_ID,
      trackId: Number(trackId)
    };

    console.log('[Zibal API] Verifying payment via proxy:', payload);

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`خطای پاسخ تایید زیبال (${response.status})`);
    }

    const resData = await response.json();
    console.log('[Zibal API] Verify response:', resData);

    if (resData.result === 100 || resData.result === 101) {
      return {
        success: true,
        refId: String(resData.refNumber || 'ZBL-REF-REAL'),
        message: 'پرداخت با موفقیت در سیستم زیبال تایید و نهایی گردید.'
      };
    } else {
      throw new Error(`پرداخت توسط زیبال تایید نگردید: کد ${resData.result} - ${resData.message}`);
    }
  } catch (error: any) {
    console.warn('Error verifying Zibal transaction via proxy, trying direct/alternative:', error);

    // بک‌آپ ۱: تایید مستقیم بدون پروکسی
    try {
      const baseUrlDirect = 'https://gateway.zibal.ir/v1/verify';
      const payloadDirect = {
        merchant: ZIBAL_CONFIG.MERCHANT_ID,
        trackId: Number(trackId)
      };

      const responseDirect = await fetch(baseUrlDirect, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payloadDirect)
      });

      if (responseDirect.ok) {
        const resDataDirect = await responseDirect.json();
        if (resDataDirect.result === 100 || resDataDirect.result === 101) {
          return {
            success: true,
            refId: String(resDataDirect.refNumber || 'ZBL-REF-REAL'),
            message: 'پرداخت با موفقیت در سیستم زیبال تایید و نهایی گردید (اتصال مستقیم).'
          };
        }
      }
    } catch (directErr) {
      console.warn('Direct verify failed:', directErr);
    }

    // بک‌آپ ۲: تایید از طریق AllOrigins
    try {
      const originalUrl = 'https://gateway.zibal.ir/v1/verify';
      const baseUrlAO = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
      const payloadAO = {
        merchant: ZIBAL_CONFIG.MERCHANT_ID,
        trackId: Number(trackId)
      };

      const responseAO = await fetch(baseUrlAO, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payloadAO)
      });

      if (responseAO.ok) {
        const resDataAO = await responseAO.json();
        if (resDataAO.result === 100 || resDataAO.result === 101) {
          return {
            success: true,
            refId: String(resDataAO.refNumber || 'ZBL-REF-REAL'),
            message: 'پرداخت با موفقیت در سیستم زیبال تایید و نهایی گردید.'
          };
        }
      }
    } catch (aoErr) {
      console.warn('AllOrigins verify failed:', aoErr);
    }

    return {
      success: false,
      message: error.message || 'اعتبارسنجی پرداخت با خطا مواجه شد.'
    };
  }
}

// -------------------------------------------------------------------------
// لایه همخوانی مجزا (Backward Compatibility Aliases for Zarinpal Named Functions)
// -------------------------------------------------------------------------
export const ZARINPAL_CONFIG = ZIBAL_CONFIG;

export async function initiateZarinpalPayment(data: PaymentRequestData) {
  return initiateZibalPayment(data);
}

export async function verifyZarinpalPayment(authority: string, amountTomans: number) {
  return verifyZibalPayment(authority, amountTomans);
}
