/**
 * NexWin SMS Panel Integration & Verification Code Service
 * --------------------------------------------------------
 * در این بخش می‌توانید مشخصات پنل پیامک واقعی خود (مانند کاوه نگار، فراز اس‌ام‌اس، ملی‌پیامک و ...) را به راحتی جایگزین نمایید.
 */

// مشخصات پنل ارسال پیامک
export const SMS_PANEL_CONFIG = {
  // ۱. آیدی پنل یا نام سرویس‌دهنده (مثال: 'kavenegar', 'farazsms', 'melipayamak', 'sms.ir')
  PROVIDER: import.meta.env.VITE_SMS_PROVIDER || 'sms.ir', 

  // ۲. کلید امنیتی API Key دریافت شده از پنل پیامکی شما
  API_KEY: import.meta.env.VITE_SMS_API_KEY || 'QQVvRd6pJXh4yqrwBnNuOgoFyoJIKDSPYpD5PaZZVdBPQRTQ',

  // ۳. شماره خط فرستنده عمومی یا خدماتی پنل شما
  SENDER_NUMBER: import.meta.env.VITE_SMS_SENDER_NUMBER || '3000505',

  // ۴. نام یا کد کد الگوی ارسال سریع (Pattern / Shared Template Code - در سامانه sms.ir همان templateId عددی است)
  OTP_TEMPLATE_CODE: import.meta.env.VITE_SMS_OTP_TEMPLATE_CODE || '100000',

  // ۵. فعال یا غیرفعال بودن ارسال واقعی پیامک
  // در صورتی که این متغیر true باشد، درخواست ارسال واقعی ارسال می‌شود
  IS_ACTIVE: true, 
};

/**
 * ایجاد یک کد تأیید تصادفی ۵ رقمی
 */
export function generateVerificationCode(): string {
  const code = Math.floor(10000 + Math.random() * 90000).toString();
  return code;
}

/**
 * متد عمومی جهت ارسال پیامک کد نکس‌وین به شماره کارفرما
 * @param phoneNumber شماره موبایل کاربر (فرمت انگلیسی تمیز)
 * @param code کد تایید ۵ رقمی ایجاد شده
 */
export async function sendOtpSMS(phoneNumber: string, code: string): Promise<{ success: boolean; message: string }> {
  console.log(`[NexWin SMS Debug] Sending verification code ${code} to ${phoneNumber} using provider: ${SMS_PANEL_CONFIG.PROVIDER}`);

  // پیاده‌سازی آزمایشی / لوکال برای محیط توسعه (در صورتی که کلید اصلی ست نشده باشد)
  if (!SMS_PANEL_CONFIG.IS_ACTIVE || SMS_PANEL_CONFIG.API_KEY.includes('YOUR_SMS_PANEL_API_KEY')) {
    return {
      success: true,
      message: `[حالت شبیه‌سازی] کد تایید پیامکی جهت تست بر روی مانیتور قرار گرفت`
    };
  }

  // الگوهای پیشنهادی برای ارسال اس‌ام‌اس بر روی وب سرویس‌های ایرانی:
  try {
    if (SMS_PANEL_CONFIG.PROVIDER === 'sms.ir') {
      // پیاده‌سازی رسمی و تایید شده پنل نوین sms.ir با پشتیبانی هوشمند از بای‌پاس CORS مرورگر
      const originalUrl = 'https://api.sms.ir/v1/send/verify';
      const targetUrl = `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`;

      const templateId = parseInt(SMS_PANEL_CONFIG.OTP_TEMPLATE_CODE, 10) || 100000;
      const bodyPayload = {
        mobile: phoneNumber,
        templateId: templateId,
        parameters: [
          {
            name: 'OTP',
            value: code
          },
          {
            name: 'otp',
            value: code
          },
          {
            name: 'Code',
            value: code
          },
          {
            name: 'code',
            value: code
          }
        ]
      };

      console.log('[SMS.ir API] Sending request via CORS Proxy:', bodyPayload);

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-KEY': SMS_PANEL_CONFIG.API_KEY
          },
          body: JSON.stringify(bodyPayload)
        });

        if (response.ok) {
          const resData = await response.json();
          console.log('[SMS.ir API] Response:', resData);
          if (resData.status === 1 || resData.status === 100 || resData.success || resData.result === 100) {
            return { success: true, message: 'کد فعال‌سازی با موفقیت از طریق سامانه sms.ir پیامک شد.' };
          }
        }
        throw new Error(`خطای پاسخ ناموفق یا ساختار وب‌سرویس (${response.status})`);
      } catch (proxyError) {
        console.warn('[SMS.ir API] CORS Proxy failed, attempting direct fetch...', proxyError);
        
        // تلاش مجدد با فراخوانی مستقیم (بدون پروکسی) به عنوان فال‌بک
        const directResponse = await fetch(originalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-KEY': SMS_PANEL_CONFIG.API_KEY
          },
          body: JSON.stringify(bodyPayload)
        });

        if (directResponse.ok) {
          const resData = await directResponse.json();
          console.log('[SMS.ir API Direct] Response:', resData);
          return { success: true, message: 'کد فعال‌سازی با موفقیت از طریق سامانه مستقیم sms.ir پیامک شد.' };
        }
        throw new Error(`خطای وب‌سرویس مستقیم sms.ir (${directResponse.status})`);
      }
    } 
    else if (SMS_PANEL_CONFIG.PROVIDER === 'kavenegar') {
      // نمونه درگاه کاوه نگار با متد سریع OTP (Verify Lookup)
      const url = `https://api.kavenegar.com/v1/${SMS_PANEL_CONFIG.API_KEY}/verify/lookup.json?receptor=${phoneNumber}&token=${code}&template=${SMS_PANEL_CONFIG.OTP_TEMPLATE_CODE}`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data.return?.status === 200) {
        return { success: true, message: 'پیامک با موفقیت از طریق کاوه‌نگار ارسال شد.' };
      }
      throw new Error(data.return?.message || 'خطا در وب‌سرویس کاوه‌نگار');
    } 
    else if (SMS_PANEL_CONFIG.PROVIDER === 'farazsms' || SMS_PANEL_CONFIG.PROVIDER === 'ippanel') {
      // نمونه درگاه فراز اس‌ام‌اس یا خانواده آی‌پی‌پنل
      const url = 'https://ippanel.com/api/select'; // وب‌سرویس فراز اس‌ام‌اس
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `AccessKey ${SMS_PANEL_CONFIG.API_KEY}`
        },
        body: JSON.stringify({
          op: 'pattern',
          user: 'YOUR_USERNAME', // اختیاری بر اساس تنظیمات ippanel
          pass: 'YOUR_PASSWORD', // اختیاری بر اساس تنظیمات ippanel
          from: SMS_PANEL_CONFIG.SENDER_NUMBER,
          to: phoneNumber,
          pattern_code: SMS_PANEL_CONFIG.OTP_TEMPLATE_CODE,
          input_data: {
            code: code // نام متغیر موجود در الگوی پنل شما
          }
        })
      });
      if (response.ok) {
        return { success: true, message: 'پیامک با موفقیت از طریق فراز اس‌ام‌آس ارسال شد.' };
      }
      throw new Error(`خطای درگاه پیامک (${response.status})`);
    } else {
      // ارسال پیامک متنی ساده (اگر هیچ الگویی مشخص نبود)
      const messageText = `کد فعال‌سازی شما در سامانه نکس‌وین: ${code}`;
      console.log(`[SMS Send Simple] Text: ${messageText}`);
      // اینجا می‌توان وب سرویس ارسال پیامک ساده را فرخوانی کرد
      return { success: true, message: 'ارسال با موفقیت شبیه‌سازی شد.' };
    }
  } catch (error: any) {
    console.error('Failed to send real SMS code:', error);
    return {
      success: false,
      message: `عدم ارسال پیامک به علت: ${error.message || 'خطای سرور پیامکی'}`
    };
  }
}
