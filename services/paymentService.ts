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
  MERCHANT_ID: 'c7c38578-79ef-42e4-a05f-7f77caa534cb',

  // آدرس بازگشت پس از تراکنش پرداخت (Callback URL)
  get CALLBACK_URL(): string {
    return window.location.origin + '/#/payment-callback';
  }
};

/**
 * ارسال درخواست تراکنش خرید به گیت‌وی بک‌اند جهت ثبت تراکنش مستقیم در زرین‌پال
 */
export async function initiateZarinpalPayment(data: PaymentRequestData): Promise<{ success: boolean; redirectUrl?: string; authority?: string; message: string }> {
  console.log(`[Zarinpal Client] Initiating payment request for ${data.amountTomans} Tomans...`);

  try {
    const response = await fetch('/api/payment/request', {
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
      throw new Error(`پاسخ ناپایدار از سرور گیت‌وی بک‌اند (کد وضعیت: ${response.status})`);
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
    const response = await fetch('/api/payment/verify', {
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
      throw new Error(`خطای پاسخ گیت‌وی بک‌اند در تایید پرداخت (کد وضعیت: ${response.status})`);
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
