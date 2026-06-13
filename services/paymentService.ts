/**
 * NexWin Payment Gateway Integration & Verification Service (Zarinpal / زرین‌پال)
 * -------------------------------------------------------------------------
 * در این ماژول می‌توانید به آسانی پیکربندی درگاه‌های پرداخت ایرانی (نظیر زرین‌پال، زیبال، پی‌پینگ و ...) را قرار دهید.
 * فرآیند شارژ و تمدید لایسنس کارگاهی نکس‌وین از این بخش عبور می‌کند.
 */

export interface PaymentRequestData {
  amountTomans: number;       // مبلغ به تومان
  phoneNumber: string;        // شماره همراه خریدار
  description: string;        // توضیحات خرید (مثلا: خرید لایسنس طلایی نکس‌وین)
  userTier: 'bronze' | 'silver' | 'gold';
  ownerName: string;
  companyName: string;
}

// تنظیمات درگاه پرداخت زرین‌پال شما
export const ZARINPAL_CONFIG = {
  // ۱. مرچنت کد ۳۶ کاراکتری دریافتی از پنل زرین‌پال
  MERCHANT_ID: 'YOUR-ZARINPAL-MERCHANT-ID-HERE-36-CHARS',

  // ۲. آدرس بازگشت پس از تراکنش پرداخت (Callback URL)
  // به این آدرس پارامترهای Authority و Status پاس داده می‌شوند.
  CALLBACK_URL: window.location.origin + '/#/payment-callback',

  // ۳. حالت آزمایشی (سندباکس زرین‌پال) - جهت تسریع فرآیند اعتبارسنجی
  // در صورتی که true باشد، پرداخت‌ها در محیط شبیه‌ساز واقعی زرین‌پال انجام می‌شود.
  USE_SANDBOX: false,

  // ۴. وضعیت درگاه مستقیم زرین‌پال (برای هدایت بدون کلیک ثانویه به بانک)
  USE_ZARINGATE: false,

  // ۵. واحد پول پیش‌فرض زرین‌پال که تومان (IRT) است.
  CURRENCY: 'IRT' 
};

/**
 * گیت‌وی ارسال درخواست تراکنش خرید به زرین‌پال
 * این متد Authority پرداخت را دریافت کرده و کاربر را هدایت می‌کند.
 */
export async function initiateZarinpalPayment(data: PaymentRequestData): Promise<{ success: boolean; redirectUrl?: string; authority?: string; message: string }> {
  console.log(`[Zarinpal Debug] Initiating payment for ${data.phoneNumber} - Amount: ${data.amountTomans} Tomans`);

  // در صورتی که مرچنت کد واقعی وارد نشده باشد، درگاه آزمایشی / شبیه‌ساز را جهت تست راحت در Sandbox فرانت‌اند باز می‌کنیم.
  const isPlaceholderMerchant = ZARINPAL_CONFIG.MERCHANT_ID.includes('YOUR-ZARINPAL-MERCHANT-ID');
  
  if (isPlaceholderMerchant) {
    // شبیه‌سازی درگاه پرداخت زرین‌پال برای راحتی خریدار دمو در هوش مصنوعی
    console.warn('[Zarinpal Note] Using simulation mode because no valid integration MERCHANT_ID is configured.');
    return {
      success: true,
      message: 'درگاه شبیه‌سازی با موفقیت لود شد',
      // ما کاربر را به یک صفحه دمو انتقال می‌دهیم یا Authority شبیه‌سازی شده برمی‌گردانیم
      authority: 'SIM-AUTHORITY-' + Math.floor(100000000 + Math.random() * 900000000),
    };
  }

  try {
    // تعیین آدرس وب‌سرویس بر اساس انتخاب محیط آزمایشی (Sandbox) یا واقعی
    const baseUrl = ZARINPAL_CONFIG.USE_SANDBOX 
      ? 'https://sandbox.zarinpal.com/pg/rest/v1/payment/request.json'
      : 'https://api.zarinpal.com/pg/rest/v1/payment/request.json';

    const payload = {
      merchant_id: ZARINPAL_CONFIG.MERCHANT_ID,
      amount: data.amountTomans,
      description: data.description,
      callback_url: ZARINPAL_CONFIG.CALLBACK_URL,
      metadata: {
        mobile: data.phoneNumber,
        owner_name: data.ownerName,
        company_name: data.companyName,
        tier: data.userTier
      }
    };

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`خطای پاسخ درگاه (${response.status})`);
    }

    const resData = await response.json();

    if (resData.data && resData.data.code === 100) {
      const authority = resData.data.authority;
      // ساخت آدرس ریدایرکت نهایی به بانک
      const payGateUrl = ZARINPAL_CONFIG.USE_SANDBOX
        ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
        : ZARINPAL_CONFIG.USE_ZARINGATE
          ? `https://www.zarinpal.com/pg/StartPay/${authority}/ZarinGate`
          : `https://www.zarinpal.com/pg/StartPay/${authority}`;

      return {
        success: true,
        authority: authority,
        redirectUrl: payGateUrl,
        message: 'اتصال به زرین‌پال موفقیت‌آمیز بود.'
      };
    } else {
      const errorMsg = resData.errors && resData.errors.message 
        ? resData.errors.message 
        : `کد خطای زرین‌پال: ${resData.errors?.code || 'نامشخص'}`;
      throw new Error(errorMsg);
    }

  } catch (error: any) {
    console.error('Zarinpal direct connection failed:', error);
    return {
      success: false,
      message: `امکان اتصال مستقیم به سرور زرین‌‌پال مقدور نشد: ${error.message || 'خطای شبکه'}`
    };
  }
}

/**
 * متد تایید و وریفای نهایی تراکنش پس از بازگشت کاربر از درگاه زرین‌پال
 */
export async function verifyZarinpalPayment(authority: string, amountTomans: number): Promise<{ success: boolean; refId?: string; message: string }> {
  const isSimulated = authority.startsWith('SIM-AUTHORITY');
  if (isSimulated) {
    return {
      success: true,
      refId: 'Ref-' + Math.floor(100000 + Math.random() * 900000),
      message: 'تراکنش آزمایشی در لایسنس‌سرور نکس‌وین با موفقیت تایید و مستند گردید.'
    };
  }

  try {
    const baseUrl = ZARINPAL_CONFIG.USE_SANDBOX
      ? 'https://sandbox.zarinpal.com/pg/rest/v1/payment/verify.json'
      : 'https://api.zarinpal.com/pg/rest/v1/payment/verify.json';

    const payload = {
      merchant_id: ZARINPAL_CONFIG.MERCHANT_ID,
      amount: amountTomans,
      authority: authority
    };

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json bg-slate-900'
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();

    if (resData.data && (resData.data.code === 100 || resData.data.code === 101)) {
      return {
        success: true,
        refId: resData.data.ref_id,
        message: 'پرداخت با موفقیت نهایی و تایید شد.'
      };
    } else {
      throw new Error(`پرداخت توسط بانک تایید نگردید: ${resData.errors?.message || 'تراکنش ناموفق'}`);
    }
  } catch (error: any) {
    console.error('Error verifying Zarinpal transaction:', error);
    return {
      success: false,
      message: error.message || 'کد تایید تراکنش با خطا روبرو شد'
    };
  }
}
