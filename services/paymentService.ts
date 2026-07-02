/**
 * NexWin Payment Gateway Integration & Verification Service (Zarinpal / زرین‌پال) - Standard Client Gateway
 * ------------------------------------------------------------------------------------------------
 * این سرویس جهت دور زدن محدودیت‌های CORS مرورگر، درخواست‌ها را به صورت امن به گیت‌وی بک‌اند اختصاصی
 * اپلیکیشن (/api/payment/request و /api/payment/verify) ارسال می‌کند. بک‌اند نیز به صورت کاملاً استاندارد،
 * مستقیم و با پروتکل رسمی به سرورهای زرین‌پال متصل می‌شود و تراکنش‌ها را برقرار می‌کند.
 */

export interface PaymentRequestData {
  amountTomans: number;       // مبلغ به تومان
  phoneNumber: string;        // شماره همراه خریدار
  description: string;        // توضیحات خرید (مثلا: خرید لایسنس طلایی نکس‌وین)
  userTier: 'bronze' | 'silver' | 'gold';
  ownerName: string;
  companyName: string;
}

// تنظیمات رسمی درگاه پرداخت زرین‌پال (از سمت کلاینت)
export const ZARINPAL_CONFIG = {
  // شناسه درگاه حقیقی رسمی زرین‌پال خریدار
  MERCHANT_ID: 'afd57d04-0629-49e2-ae20-6b8dc7e75ca2',

  // تشخیص محیط نیتیو (اندروید/کاپازیتور)
  get isNative(): boolean {
    const isCapacitor = !!(window as any).Capacitor;
    const isLocalOrigin = window.location.origin.includes('capacitor://') || 
                         window.location.origin.includes('http://localhost');
    return isCapacitor || isLocalOrigin || window.location.protocol === 'file:';
  },

  // آدرس پایه API - در اندروید باید آدرس کامل سرور (مثلاً ورسل) باشد
  get API_BASE_URL(): string {
    const configuredUrl = import.meta.env.VITE_API_BASE_URL;
    if (this.isNative && configuredUrl) {
      // حذف اسلش انتهایی در صورت وجود برای جلوگیری از دو برابر شدن اسلش در مسیر
      return configuredUrl.replace(/\/$/, '');
    }
    return ''; // در وب از مسیر نسبی استفاده می‌کنیم
  },

  // آدرس بازگشت پس از تراکنش پرداخت (Callback URL)
  get CALLBACK_URL(): string {
    const configuredUrl = import.meta.env.VITE_API_BASE_URL;
    // در اندروید آدرس بازگشت باید حتماً آدرس وب باشد (زرین‌پال آدرس لوکال اندروید را قبول نمی‌کند)
    if (this.isNative && configuredUrl) {
      const baseUrl = configuredUrl.endsWith('/') ? configuredUrl.slice(0, -1) : configuredUrl;
      return baseUrl + '/#/payment-callback';
    }
    return window.location.origin + '/#/payment-callback';
  }
};

/**
 * ارسال درخواست تراکنش خرید به گیت‌وی بک‌اند جهت ثبت تراکنش مستقیم در زرین‌پال
 */
export async function initiateZarinpalPayment(data: PaymentRequestData): Promise<{ success: boolean; redirectUrl?: string; authority?: string; message: string }> {
  console.log(`[Zarinpal Client] Initiating payment request for ${data.amountTomans} Tomans...`);

  try {
    const apiUrl = `${ZARINPAL_CONFIG.API_BASE_URL}/api/payment/request`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        amountTomans: data.amountTomans,
        phoneNumber: data.phoneNumber,
        description: data.description
      })
    });

    if (!response.ok) {
      let errorMsg = `پاسخ ناپایدار از سرور گیت‌وی بک‌اند (کد وضعیت: ${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMsg = errorData.message;
        }
      } catch (e) {
        // ignore JSON parse error
      }
      throw new Error(errorMsg);
    }

    const resData = await response.json();
    console.log('[Zarinpal Client] Request response:', resData);

    if (resData.success) {
      return {
        success: true,
        authority: resData.authority,
        redirectUrl: resData.redirectUrl,
        message: resData.message || 'درخواست پرداخت با موفقیت ثبت شد.'
      };
    } else {
      return {
        success: false,
        message: resData.message || 'خطا در فرآیند آغاز پرداخت زرین‌پال'
      };
    }
  } catch (error: any) {
    console.error('[Zarinpal Client Request Error]', error);
    return {
      success: false,
      message: error.message || 'خطا در ارتباط با سرور میانی پرداخت نکس‌وین'
    };
  }
}

/**
 * استعلام وضعیت پرداخت و وریفای از طریق گیت‌وی بک‌اند زرین‌پال
 */
export async function verifyZarinpalPayment(authority: string, amountTomans: number): Promise<{ success: boolean; refId?: string; message: string }> {
  console.log(`[Zarinpal Client] Verifying payment for authority=${authority}, Amount=${amountTomans} Tomans...`);

  if (!authority) {
    return {
      success: false,
      message: 'شناسه مرجع تراکنش نامعتبر است.'
    };
  }

  try {
    const apiUrl = `${ZARINPAL_CONFIG.API_BASE_URL}/api/payment/verify`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        authority: authority,
        amountTomans: amountTomans
      })
    });

    if (!response.ok) {
      let errorMsg = `خطای پاسخ گیت‌وی بک‌اند در تایید پرداخت (کد وضعیت: ${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMsg = errorData.message;
        }
      } catch (e) {
        // ignore JSON parse error
      }
      throw new Error(errorMsg);
    }

    const resData = await response.json();
    console.log('[Zarinpal Client] Verify response:', resData);

    if (resData.success) {
      return {
        success: true,
        refId: resData.refId || resData.refNumber,
        message: resData.message || 'پرداخت با موفقیت تایید شد.'
      };
    } else {
      return {
        success: false,
        message: resData.message || 'تایید پرداخت ناموفق بود.'
      };
    }
  } catch (error: any) {
    console.error('[Zarinpal Client Verify Error]', error);
    return {
      success: false,
      message: error.message || 'خطا در استعلام وضعیت تراکنش از سرور میانی پرداخت'
    };
  }
}
