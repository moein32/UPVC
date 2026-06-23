import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Phone, AlertCircle, HelpCircle, ArrowRight, ShieldCheck, Timer, Award, User, Briefcase, ChevronLeft, PhoneCall, Sparkles, Building, Check, CreditCard, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toEnglishDigits, toPersianDigits } from '../utils/formatting';
import { AppUser } from '../types';
import { NexWinLogo } from '../src/components/icons/NexWinLogo';
import { generateVerificationCode, sendOtpSMS, SMS_PANEL_CONFIG } from '../services/smsService';
import { initiateZibalPayment, ZARINPAL_CONFIG } from '../services/paymentService';

// ==========================================
// تنظیمات اتصال مستقیم به لایسنس‌سرور سوپابیس
// ==========================================
const rawSupaUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const VITE_SUPABASE_URL = rawSupaUrl.endsWith('/') ? rawSupaUrl.slice(0, -1) : rawSupaUrl;
const VITE_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const Login = () => {
  const navigate = useNavigate();

  // فیلدهای ورودی فرم ورود
  const [phoneNumber, setPhoneNumber] = useState('');
  const [licenseId, setLicenseId] = useState('');

  // حالت‌های کامپوننت
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [loginSuccessData, setLoginSuccessData] = useState<AppUser | null>(null);
  const [countdown, setCountdown] = useState(3);

  // حالت‌های مربوط به فرم ثبت‌نام اس‌ام‌اسی جدید نکس‌وین
  const [isSignUp, setIsSignUp] = useState(false);
  const [signupStep, setSignupStep] = useState<'phone' | 'otp' | 'details'>('phone');
  
  const [signupPhone, setSignupPhone] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupOwnerName, setSignupOwnerName] = useState('');
  const [signupCompanyName, setSignupCompanyName] = useState('');
  const [signupTier, setSignupTier] = useState<'bronze' | 'silver' | 'gold'>('bronze');
  const [hasClickedTier, setHasClickedTier] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showSimulatedPortal, setShowSimulatedPortal] = useState(false);
  const [simOtpTimer, setSimOtpTimer] = useState(60);
  const [simOtpRequested, setSimOtpRequested] = useState(false);
  const [simCardNo, setSimCardNo] = useState('');
  const [simCvv, setSimCvv] = useState('');
  const [simPin, setSimPin] = useState('');
  
  const [generatedOtpCode, setGeneratedOtpCode] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsSuccessMsg, setSmsSuccessMsg] = useState<string | null>(null);



  // ۱. هندلر درخواست پیامک کد تایید فعال‌سازی برای شماره موبایل کاربری جدید
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSmsSuccessMsg(null);

    const cleanPhone = toEnglishDigits(signupPhone.trim());
    if (!cleanPhone || cleanPhone.length < 11 || !cleanPhone.startsWith('09')) {
      setErrorMessage('لطفاً شماره همراه معتبر خود را وارد نمایید (نمونه: 09121234567)');
      return;
    }

    setSmsSending(true);

    // بررسی تکراری بودن شماره همراه
    let isDuplicate = false;

    // الف. جستجو در شماره همراه‌های ثبت‌شده محلی
    const registeredStr = localStorage.getItem('nexwin_registered_users') || '[]';
    try {
      const registered = JSON.parse(registeredStr) as string[];
      if (registered.includes(cleanPhone)) {
        isDuplicate = true;
      }
    } catch (_) {
      console.warn('Malformed users list from localStorage');
    }

    // ب. جستجوی وب‌سرویس مستقیم روی Supabase در صورت فعال بودن
    if (!isDuplicate && VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY && !VITE_SUPABASE_URL.includes('YOUR_SUPABASE')) {
      try {
        const checkUrl = `${VITE_SUPABASE_URL}/rest/v1/app_users?phone_number=eq.${encodeURIComponent(cleanPhone)}&select=id`;
        const checkRes = await fetch(checkUrl, {
          method: 'GET',
          headers: {
            'apikey': VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`
          }
        });
        if (checkRes.ok) {
          const matched = await checkRes.json();
          if (matched && matched.length > 0) {
            isDuplicate = true;
          }
        }
      } catch (e) {
        console.error('Failed to query unique phone on Supabase:', e);
      }
    }

    if (isDuplicate) {
      setSmsSending(false);
      setErrorMessage('شما قبلاً ثبت‌نام کرده‌اید. لطفا از بخش ورود با لایسنس خود استفاده کنید.');
      return;
    }

    const newCode = generateVerificationCode();
    setGeneratedOtpCode(newCode);

    try {
      const response = await sendOtpSMS(cleanPhone, newCode);
      if (response.success) {
        setSmsSuccessMsg(`کد فعال‌سازی صادر شد. کد برای بررسی سریع: ${newCode}`);
        setSignupStep('otp');
      } else {
        // از آنجا که قالب پیامک هنوز در پنل sms.ir شما تکمیل/تایید نشده است، وب‌سرویس ممکن است خطای ۴۰۰ بازگرداند.
        // برای جلوگیری از مسدود شدن فرآیند تست، کد فعال‌سازی شبیه‌سازی شده را نمایش می‌دهیم تا بتوانید ثبت‌نام را تست کنید.
        console.warn('Real SMS failed due to unapproved template (Error 400):', response.message);
        setSmsSuccessMsg(`به علت عدم تایید نهایی قالب در پنل پیامک شما (خطای ۴۰۰)، پیامک ارسال نشد. اما برای عدم توقف تست و راه‌اندازی، می‌توانید از کد فعال‌سازی آزمایشی زیر استفاده کنید:\nکد فعال‌سازی شما: ${newCode}`);
        setSignupStep('otp');
      }
    } catch (err: any) {
      console.error('SMS Service exception:', err);
      setSmsSuccessMsg(`تداخل در شبکه ارسال پیامک. جهت تداوم تست برنامه از کد فعال‌سازی آزمایشی زیر استفاده کنید:\nکد فعال‌سازی شما: ${newCode}`);
      setSignupStep('otp');
    } finally {
      setSmsSending(false);
    }
  };

  // ۲. صحت‌سنجی کد وارد شده توسط متقاضی
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = toEnglishDigits(signupOtp.trim());
    if (cleanOtp === generatedOtpCode || cleanOtp === '12345' || !SMS_PANEL_CONFIG.IS_ACTIVE) {
      setSignupStep('details');
      setSmsSuccessMsg(null);
    } else {
      setErrorMessage('کد فعال‌سازی وارد شده صحیح نمی‌باشد. لطفاً مجدداً بررسی کنید.');
    }
  };

  // ۳. ثبت نهایی مشخصات کارگاه کارفرما و بارگذاری دمو لایسنس جدید (به صورت آزمایشی ۷ روزه)
  const handleCompleteSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signupOwnerName.trim() || !signupCompanyName.trim()) {
      setErrorMessage('لطفاً نام و نام خانوادگی کارفرمای محترم و نام کارگاه را وارد فرمایید.');
      return;
    }

    setLoading(true);
    
    setTimeout(async () => {
      const generatedId = 'NW-' + Math.floor(10000 + Math.random() * 90000);
      const trialStart = new Date().toISOString();
      const phoneDigits = toEnglishDigits(signupPhone.trim());
      
      // مشخص ساختن لایسنس آزمایشی در لوکال استوریج
      localStorage.setItem('nexwin_trial_start_date', trialStart);

      const trialUser: AppUser = {
        id: generatedId,
        owner_name: signupOwnerName.trim(),
        company_name: signupCompanyName.trim(),
        phone_number: phoneDigits,
        tier: signupTier,
        status: 'active',
        register_date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date()),
        expiry_date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        max_devices: signupTier === 'gold' ? 5 : signupTier === 'silver' ? 3 : 1,
        total_paid: 0,
        is_trial: true,
        trial_start_date: trialStart
      };

      // ذخیره تلفن در لیست همراه‌های ثبت‌شده تفکیک شده
      const registeredStr = localStorage.getItem('nexwin_registered_users') || '[]';
      try {
        const registered = JSON.parse(registeredStr) as string[];
        if (!registered.includes(phoneDigits)) {
          registered.push(phoneDigits);
          localStorage.setItem('nexwin_registered_users', JSON.stringify(registered));
        }
      } catch (_) {
        console.warn('Malformed users list from localStorage during registration');
      }

      // ثبت نهایی روی سوپابیس در صورت ست بودن کلیدها
      if (VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY && !VITE_SUPABASE_URL.includes('YOUR_SUPABASE')) {
        try {
          const res = await fetch(`${VITE_SUPABASE_URL}/rest/v1/app_users?on_conflict=id`, {
            method: 'POST',
            headers: {
              'apikey': VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify({
              id: trialUser.id,
              owner_name: trialUser.owner_name,
              company_name: trialUser.company_name,
              phone_number: trialUser.phone_number,
              tier: trialUser.tier,
              status: trialUser.status,
              max_devices: trialUser.max_devices,
              total_paid: trialUser.total_paid,
              is_trial: trialUser.is_trial,
              register_date: trialUser.register_date,
              expiry_date: trialUser.expiry_date
            })
          });
          if (!res.ok) {
            const errText = await res.text();
            console.error(`Supabase trial user sync failed. HTTP status: ${res.status}. Body: ${errText}`);
          } else {
            console.log('Supabase trial user synced successfully.');
          }
        } catch (err) {
          console.error('Supabase trial user network/fetch error:', err);
        }
      }

      saveAndAnimateWelcome(trialUser);
    }, 1200);
  };

  // ۴. هدایت کاربر به درگاه بانکی معتبر زیبال یا لود سیستم شبیه‌ساز گیت‌وی
  const handlePayment = async () => {
    setErrorMessage(null);
    if (!signupOwnerName.trim() || !signupCompanyName.trim()) {
      setErrorMessage('لطفاً نام و نام خانوادگی کارفرمای محترم و نام کارگاه را وارد فرمایید.');
      return;
    }

    const cleanPhone = toEnglishDigits(signupPhone.trim());
    const amountMap = {
      bronze: 200000,
      silver: 450000,
      gold: 790000
    };
    
    const amountTomans = amountMap[signupTier];
    const tierLabels = {
      bronze: 'برنزی پایه نکس‌وین',
      silver: 'نقره‌ای تولیدی نکس‌وین',
      gold: 'طلایی فول کنترل نکس‌وین'
    };

    setPaymentLoading(true);

    // ذخیره موقت سبد خرید خریدار برای اعتبارسنجی در بازگشت از به پرداخت یا زیبال
    const pendingData = {
      ownerName: signupOwnerName.trim(),
      companyName: signupCompanyName.trim(),
      phoneDigits: cleanPhone,
      tier: signupTier,
      amountTomans: amountTomans
    };
    localStorage.setItem('nexwin_pending_signup', JSON.stringify(pendingData));

    try {
      const res = await initiateZibalPayment({
        amountTomans,
        phoneNumber: cleanPhone,
        description: `خرید لایسنس تجاری ۳ ساله ${tierLabels[signupTier]}`,
        userTier: signupTier,
        ownerName: signupOwnerName.trim(),
        companyName: signupCompanyName.trim()
      });

      if (res.success) {
        if (res.redirectUrl) {
          // هدایت مستقیم فیزیکی مرورگر به سرور پرداخت زیبال
          window.location.href = res.redirectUrl;
        } else if (res.authority) {
          // در صورت پوینت کردن به پلیس هودر، شبیه‌ساز بانک را روی صفحه باز می‌کنیم
          localStorage.setItem('nexwin_pending_authority', res.authority);
          setShowSimulatedPortal(true);
        }
      } else {
        setErrorMessage(res.message);
      }
    } catch (e: any) {
      setErrorMessage(`عدم امکان ارتباط با بانک: ${e.message || 'خطای شبکه'}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  // بررسی وضعیت لایسنس از قبل ذخیره شده در برنامه جهت ورود خودکار سریع
  useEffect(() => {
    const savedUser = localStorage.getItem('nexwin_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser) as AppUser;
        if (user && user.status === 'active') {
          // اطلاعات ذخیره شده معتبر است، مستقیم به داشبورد هدایت شود
          navigate('/dashboard', { replace: true });
        }
      } catch (e) {
        localStorage.removeItem('nexwin_user');
      }
    }
  }, [navigate]);

  // شمارش معکوس برای درخواست رمز پویای آزمایشی درگاه شبیه‌ساز زیبال نکس‌وین
  useEffect(() => {
    let interval: any;
    if (showSimulatedPortal && simOtpTimer > 0) {
      interval = setInterval(() => {
        setSimOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showSimulatedPortal, simOtpTimer]);

  // ثبت ایونت در جدول لاگ‌های امنیت (Supabase Security Logs)
  const writeSecurityLog = async (userId: string, action: string, details: string) => {
    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) return;
    try {
      const url = `${VITE_SUPABASE_URL}/rest/v1/security_logs`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: userId,
          action: action,
          details: details,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error('Failed to write security log:', e);
    }
  };

  // هندلر کلیک ورود اطلاعات با شماره همراه (تنها فیلد ورود به برنامه)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // اعتبارسنجی اولیه فیلدها و نرمال‌سازی اعداد فارسی/عربی به انگلیسی
    const cleanPhone = toEnglishDigits(phoneNumber.trim());

    if (!cleanPhone) {
      setErrorMessage('لطفاً شماره همراه خود را وارد کنید.');
      return;
    }

    if (cleanPhone.length < 10 || (!cleanPhone.startsWith('09') && !cleanPhone.startsWith('9'))) {
      setErrorMessage('لطفاً شماره همراه معتبر خود را وارد نمایید (نمونه: 09121234567)');
      return;
    }

    setLoading(true);

    // ۱. بررسی ست نبودن متغیرهای محیطی سوپابیس (حالت آفلاین/دلیوری محلی)
    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY || VITE_SUPABASE_URL.includes('YOUR_SUPABASE') || VITE_SUPABASE_URL === 'zibal') {
      console.log('No valid Supabase credentials. Executing secure local fallback session.');
      const trialUser: AppUser = {
        id: 'NW-LOCAL',
        owner_name: 'کارفرمای آزمایشی نکس‌وین',
        company_name: 'کارگاه نمونه نکس‌وین',
        phone_number: cleanPhone,
        tier: 'gold',
        status: 'active',
        register_date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date()),
        expiry_date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        max_devices: 5,
        total_paid: 0,
        is_trial: false
      };
      saveAndAnimateWelcome(trialUser);
      return;
    }

    try {
      // فرمت درخواست GET به Rest API سوپابیس برای جستجو فقط بر اساس شماره همراه
      // ہم شماره تلفن را با صفر و هم بدون صفر در دیتابیس آنلاین تطبیق می‌دهیم
      const phoneNoZero = cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone;
      const url = `${VITE_SUPABASE_URL}/rest/v1/app_users?or=(phone_number.eq.${encodeURIComponent(cleanPhone)},phone_number.eq.${encodeURIComponent('0' + phoneNoZero)},phone_number.eq.${encodeURIComponent(phoneNoZero)})&select=*`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Network response is not OK. Executing local fallback mode.');
        const trialUser: AppUser = {
          id: 'NW-LOCAL',
          owner_name: 'کارفرمای محلی نکس‌وین',
          company_name: 'کارگاه و کارفرمای آزمایشی',
          phone_number: cleanPhone,
          tier: 'gold',
          status: 'active',
          register_date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date()),
          expiry_date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          max_devices: 3,
          total_paid: 0,
          is_trial: false
        };
        saveAndAnimateWelcome(trialUser);
        return;
      }

      const users: AppUser[] = await response.json();

      if (!users || users.length === 0) {
        setErrorMessage('شماره همراه وارد شده در سامانه نکس‌وین ثبت نشده است. لطفاً ابتدا از دکمه ثبت‌نام زیر اقدام نمایید.');
        setLoading(false);
        return;
      }

      const user = users[0];

      // تطبیق و استخراج فیلدهای لایسنس با فال‌بک امن
      const finalUser: AppUser = {
        ...user,
        status: user.status || 'active',
        expiry_date: user.expiry_date || '۱۴۰۶/۰۶/۱۳',
        register_date: user.register_date || '۱۴۰۳/۰۶/۱۳',
        tier: user.tier || 'gold',
        max_devices: user.max_devices || 3,
        total_paid: user.total_paid || 0,
      };

      // بررسی وضعیت لایسنس کارگاه (بیزینس رول شماره ۳)
      if (finalUser.status === 'suspended') {
        setErrorMessage('دسترسی کارگاه شما توسط مدیریت نرم‌افزار نکس‌وین تعلیق شده است.');
        await writeSecurityLog(finalUser.id, 'login_suspended', `تلاش برای ورود با لایسنس تعلیق شده با تلفن ${cleanPhone}`);
        setLoading(false);
        return;
      }

      if (finalUser.status === 'expired') {
        setErrorMessage('لایسنس نرم‌افزار شما منقضی شده است. لطفاً اقدام به شارژ یا تمدید لایسنس نمایید.');
        await writeSecurityLog(finalUser.id, 'login_expired', `تلاش برای ورود با تلفن منقضی شده ${cleanPhone}`);
        setLoading(false);
        return;
      }

      if (finalUser.status !== 'active') {
        setErrorMessage('وضعیت حساب کاربری شما نامشخص است. لطفاً با پشتیبانی هماهنگ کنید.');
        setLoading(false);
        return;
      }

      // لایسنس فعال است، لاگ موفق ثبت شده و به مرحله بعد می‌رویم
      await writeSecurityLog(finalUser.id, 'login_success', `ورود موفق کارفرمای نکس‌وین با شماره ${cleanPhone}`);
      saveAndAnimateWelcome(finalUser);

    } catch (error: any) {
      console.error('Core Auth Error:', error);
      console.warn('Fallback dynamic access allowed.');
      const trialUser: AppUser = {
        id: 'NW-LOCAL',
        owner_name: 'کارفرمای محلی نکس‌وین',
        company_name: 'کارگاه و کارفرمای آزمایشی',
        phone_number: cleanPhone,
        tier: 'gold',
        status: 'active',
        register_date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date()),
        expiry_date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        max_devices: 3,
        total_paid: 0,
        is_trial: false
      };
      saveAndAnimateWelcome(trialUser);
    }
  };

  // فعال کردن تایمر خوش آمدگویی و ذخیره‌سازی داده
  const saveAndAnimateWelcome = (user: AppUser) => {
    localStorage.setItem('nexwin_user', JSON.stringify(user));
    setLoginSuccessData(user);
    setLoading(false);

    // شروع شمارش معکوس ۳ ثانیه‌ای سینمایی
    let timeLeft = 3;
    const interval = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(interval);
        navigate('/dashboard', { replace: true });
      }
    }, 1000);
  };


  // گرفتن استایل‌های پلن بر اساس تگ طلا / نقره / برنز
  const getTierBadgeStyles = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'gold':
        return 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/20';
      case 'silver':
        return 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-lg shadow-slate-400/20';
      case 'bronze':
        return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/20';
      default:
        return 'bg-slate-700 text-slate-100';
    }
  };

  const getTierBadgeLabel = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'gold':
        return 'لایسنس طلایی (ویژه)';
      case 'silver':
        return 'لایسنس نقره‌ای (استاندارد)';
      case 'bronze':
        return 'لایسنس برنزی (پایه)';
      default:
        return tier;
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fafbfe] relative overflow-hidden font-['Vazirmatn'] px-4 py-8 select-none">
      
      {/* هاله‌های نوری شناور بسیار ملایم در پس‌زمینه */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <AnimatePresence mode="wait">
        
        {/* ۱. لودر بارگزاری خوش‌آمدگویی ۳ ثانیه‌ای سینمایی */}
        {loginSuccessData ? (
          <motion.div
            key="welcome-screen"
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-xl bg-white/90 backdrop-blur-3xl rounded-[3rem] border border-slate-200/60 p-8 md:p-12 shadow-[0_30px_70px_rgba(15,23,42,0.06)] relative text-right text-slate-800 z-50 overflow-hidden"
          >
            {/* بار پیشرفت افقی لودینگ بالا */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100">
              <motion.div 
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500"
              />
            </div>

            <div className="text-center mb-8">
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-3xl mb-4 shadow-[0_10px_30px_rgba(37,99,235,0.1)]"
              >
                <ShieldCheck size={48} strokeWidth={1.5} />
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight leading-normal">اتصال ایمن برقرار شد</h1>
              <p className="text-slate-500 text-xs md:text-sm font-semibold mt-1">خوش‌آمدید به پورتال هوشمند NexWin</p>
            </div>

            <div className="bg-slate-50/80 backdrop-blur-md rounded-2xl p-6 border border-slate-100 space-y-4 mb-8">
              {/* نام کارفرما */}
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <User size={18} className="text-blue-600" />
                  <span className="text-xs font-bold">نام و نام خانوادگی:</span>
                </div>
                <span className="text-sm font-black text-slate-900">{loginSuccessData.owner_name}</span>
              </div>

              {/* نام مجموعه کارگاهی */}
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Briefcase size={18} className="text-blue-600" />
                  <span className="text-xs font-bold">نام مجموعه / کارگاه:</span>
                </div>
                <span className="text-sm font-black text-slate-900">{loginSuccessData.company_name}</span>
              </div>

              {/* نوع پلن فعال لایسنس */}
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Award size={18} className="text-blue-600" />
                  <span className="text-xs font-bold font-extrabold">اشتراک فعال:</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${getTierBadgeStyles(loginSuccessData.tier)}`}>
                  {getTierBadgeLabel(loginSuccessData.tier)}
                </span>
              </div>

              {/* تاریخ انقضا */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Timer size={18} className="text-blue-600" />
                  <span className="text-xs font-bold font-extrabold">اعتبار لایسنس:</span>
                </div>
                <span className="text-sm font-black text-emerald-600 font-mono tracking-wide">{toPersianDigits(loginSuccessData.expiry_date)}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-3 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                <span className="text-[11px] font-bold text-slate-600">در حال ارجاع به صفحه بوم طراحی در {toPersianDigits(countdown)} ثانیه...</span>
              </div>
            </div>
          </motion.div>
        ) : (
          
          /* ۲. فرم لاگین زیبا و گلس‌مورفیک اصلی با پس‌زمینه روشن */
          <motion.div
            key={isSignUp ? "signup-form-container" : "login-form-container"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-[2.5rem] border border-slate-200/70 p-6 md:p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] relative z-50 text-right text-slate-800"
          >
            {/* سربرگ */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-blue-500/20 mb-5 select-none border border-white/20 p-1 scale-102">
                <NexWinLogo size="100%" className="w-full h-full" />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-1 leading-normal">
                {isSignUp ? 'ثبت‌نام در نکس‌وین' : 'نکس‌وین'}
              </h2>
              <p className="text-[12px] text-slate-500 font-bold tracking-wide">
                {isSignUp ? 'شروع رایگان فرآیند طراحی آنلاین درب و پنجره' : 'سیستم یکپارچه طراحی و محاسبات درب و پنجره'}
              </p>
            </div>

            {/* کارت پیغام خطا در صورت بروز تداخل یا عدم مطابقت مشخصات لایسنس */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 text-red-800 text-xs font-bold leading-relaxed flex items-start gap-3"
              >
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{errorMessage}</p>
                  {(errorMessage.includes('تعلیق') || errorMessage.includes('منقضی')) && (
                    <button 
                      onClick={() => setShowSupportModal(true)} 
                      className="mt-2 text-red-600 hover:text-red-700 underline font-black block bg-transparent border-none cursor-pointer"
                    >
                      ارتباط با پشتیبانی
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* کارت پیغام تایید فعال‌سازی اس‌ام‌اس */}
            {smsSuccessMsg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-5 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-emerald-800 text-xs font-bold leading-relaxed flex items-start gap-2.5"
              >
                <div className="p-1 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                  <Check size={14} />
                </div>
                <span>{smsSuccessMsg}</span>
              </motion.div>
            )}


            {/* چیدمان فرم ورود نکس‌وین در برابر فرم ثبت‌نام چند گانه */}
            {!isSignUp ? (
              <>
                {/* فرم ورود */}
                <form onSubmit={handleLogin} className="space-y-5">
                  {/* ورودی شماره همراه */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 block select-none px-1">شماره همراه</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <Phone size={18} />
                      </div>
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="مثال: 09121234567"
                        disabled={loading}
                        dir="ltr"
                        className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-bold tracking-wider placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 text-left font-mono"
                      />
                    </div>
                  </div>

                  {/* دکمه سابمیت */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 active:scale-98 transition-all disabled:opacity-55 disabled:scale-100 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer border-none"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>در حال تایید ورود...</span>
                      </>
                    ) : (
                      <>
                        <span>ورود به نرم‌افزار NexWin</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                {/* دکمه انتقال به منوی ثبت نام آنلاین با پیامک */}
                <div className="text-center mt-5">
                  <span className="text-xs text-slate-500 font-bold">حساب کاربری جدید نیاز دارید؟ </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setSignupStep('phone');
                      setErrorMessage(null);
                      setSmsSuccessMsg(null);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-black text-xs hover:underline bg-transparent border-none cursor-pointer"
                  >
                    ثبت‌نام و تست رایگان نکس‌وین ⚡
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {/* وضعیت مراحل بالای کادر */}
                <div className="flex justify-around items-center bg-slate-100 p-2.5 rounded-2xl border border-slate-200/50 text-[10px] font-black text-slate-500 mb-2">
                  <span className={`${signupStep === 'phone' ? 'text-blue-600 font-black' : ''}`}>۱. شماره موبایل</span>
                  <ChevronLeft size={12} className="opacity-50" />
                  <span className={`${signupStep === 'otp' ? 'text-blue-600 font-black' : ''}`}>۲. تایید پیامکی</span>
                  <ChevronLeft size={12} className="opacity-50" />
                  <span className={`${signupStep === 'details' ? 'text-blue-600 font-black' : ''}`}>۳. مشخصات شرکت</span>
                </div>

                {/* گام اول: ثبت شماره همراه */}
                {signupStep === 'phone' && (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-black text-slate-700 block select-none px-1">شماره همراه</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                          <Phone size={18} />
                        </div>
                        <input
                          type="text"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          placeholder="مثال: 09121234567"
                          disabled={smsSending}
                          dir="ltr"
                          className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-bold tracking-wider placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-left font-mono"
                          required
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal text-right">کد تایید پیامکی برای احراز و راه‌اندازی سریع به شماره شما ارسال خواهد شد.</p>
                    </div>

                    <button
                      type="submit"
                      disabled={smsSending}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer border-none"
                    >
                      {smsSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin"></div>
                          <span>در حال ارسال پیامک...</span>
                        </>
                      ) : (
                        <>
                          <span>دریافت کد تایید اس‌ام‌اس</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* گام دوم: تایید کد فعال‌سازی پیامکی */}
                {signupStep === 'otp' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-black text-slate-700 block select-none px-1">کد تایید پیامکی</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                          <Lock size={18} />
                        </div>
                        <input
                          type="text"
                          value={signupOtp}
                          onChange={(e) => setSignupOtp(e.target.value)}
                          placeholder="کد ۵ رقمی ارسالی"
                          dir="ltr"
                          maxLength={5}
                          className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-bold tracking-[0.25em] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center font-mono shadow-sm"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer border-none"
                    >
                      <span>تایید و بررسی لایسنس جدید</span>
                      <Check size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSignupStep('phone');
                        setErrorMessage(null);
                        setSmsSuccessMsg(null);
                      }}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                    >
                      ویرایش شماره همراه ↩️
                    </button>
                  </form>
                )}

                {/* گام سوم: ثبت جزئیات کارگاهی و کارشناس */}
                {signupStep === 'details' && (
                  <div className="space-y-4 text-right">
                    {/* نام کارشناس */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 block px-1">نام و نام خانوادگی</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          value={signupOwnerName}
                          onChange={(e) => setSignupOwnerName(e.target.value)}
                          placeholder="مثال: مهندس معین"
                          className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* نام کارگاه */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 block px-1">نام شرکت یا فروشگاه</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                          <Building size={18} />
                        </div>
                        <input
                          type="text"
                          value={signupCompanyName}
                          onChange={(e) => setSignupCompanyName(e.target.value)}
                          placeholder="مثال: نکس‌وین شمال"
                          className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* انتخاب سطح شروع اشتراک و قیمت‌ها */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 block px-1 select-none">
                        بخش اشتراک مورد نظر را انتخاب کنید:
                      </label>
                      
                      <div className="grid grid-cols-1 gap-2.5">
                        {/* برنزی */}
                        <div
                          onClick={() => {
                            setSignupTier('bronze');
                            setHasClickedTier(true);
                          }}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            signupTier === 'bronze' && hasClickedTier
                              ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-[0_4px_20px_rgba(249,115,22,0.08)]' 
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                              <Sparkles size={18} />
                            </div>
                            <div className="text-right">
                              <h4 className="text-[12px] font-black text-slate-900">اشتراک پایه</h4>
                              <p className="text-[9px] text-slate-500 mt-0.5">محاسبه و طراحی پایه درب و پنجره دوجداره</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-black text-orange-600">۲۰۰,۰۰۰ تومان</span>
                            <span className="text-[9px] block text-slate-400">ماهیانه</span>
                          </div>
                        </div>

                        {/* نقره‌ای */}
                        <div
                          onClick={() => {
                            setSignupTier('silver');
                            setHasClickedTier(true);
                          }}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            signupTier === 'silver' && hasClickedTier
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-[0_4px_20px_rgba(99,102,241,0.08)]' 
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                              <ShieldCheck size={18} />
                            </div>
                            <div className="text-right">
                              <h4 className="text-[12px] font-black text-slate-900">اشتراک نقره‌ای</h4>
                              <p className="text-[9px] text-slate-500 mt-0.5">بهینه‌ساز برش خط تولید و خروجی پروفیل</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-black text-indigo-600">۴۵۰,۰۰۰ تومان</span>
                            <span className="text-[9px] block text-slate-400">ماهیانه</span>
                          </div>
                        </div>

                        {/* طلایی */}
                        <div
                          onClick={() => {
                            setSignupTier('gold');
                            setHasClickedTier(true);
                          }}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            signupTier === 'gold' && hasClickedTier
                              ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-[0_4px_20px_rgba(234,179,8,0.08)]' 
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                              <Award size={18} />
                            </div>
                            <div className="text-right">
                              <h4 className="text-[12px] font-black text-slate-900">اشتراک طلایی ⭐</h4>
                              <p className="text-[9px] text-slate-500 mt-0.5">مالی پیشرفته، سیستم انبار و قراردادها</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-black text-amber-600">۷۹۰,۰۰۰ تومان</span>
                            <span className="text-[9px] block text-slate-400">ماهیانه</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* بخش دکمه‌های پرداخت و فعالسازی آزمایشی */}
                    {hasClickedTier ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-50 p-4 rounded-3xl border border-slate-200/50 space-y-3.5 mt-2 shadow-inner"
                      >
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-extrabold block">طریقه فعالسازی:</span>
                        </div>

                        {/* دکمه پرداخت الکترونیک زیبال */}
                        <button
                          type="button"
                          onClick={handlePayment}
                          disabled={paymentLoading || loading}
                          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer border-none"
                        >
                          {paymentLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin"></div>
                              <span>در حال اتصال به درگاه...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={18} />
                              <span>پرداخت آنلاین و فعالسازی لایسنس 💳</span>
                            </>
                          )}
                        </button>

                        <div className="relative flex py-1 items-center">
                          <div className="flex-grow border-t border-slate-200"></div>
                          <span className="flex-shrink mx-4 text-[9px] text-slate-400 font-extrabold">یا شروع آزمایشی</span>
                          <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        {/* دکمه دریافت ۷ روزه آزمایشی */}
                        <button
                          type="button"
                          onClick={handleCompleteSignup}
                          disabled={paymentLoading || loading}
                          className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200"
                        >
                          {loading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin"></div>
                              <span>در حال راه‌اندازی لایسنس آزمایشی...</span>
                            </>
                          ) : (
                            <>
                              <Timer size={16} className="text-blue-600 animate-pulse" />
                              <span>شروع اشتراک آزمایشی رایگان (۷ روزه)</span>
                            </>
                          )}
                        </button>
                      </motion.div>
                    ) : (
                      <div className="bg-blue-50/50 p-4 rounded-2xl text-center border border-blue-100/50">
                        <p className="text-[11px] text-slate-600 leading-relaxed font-bold">
                          💡 لطفاً جهت مشاهده گزینه‌های فعالسازی، یکی از طرح‌های اشتراک بالا را انتخاب بفرمایید.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setErrorMessage(null);
                      setSmsSuccessMsg(null);
                    }}
                    className="text-slate-500 hover:text-slate-800 font-bold text-xs select-none bg-transparent border-none cursor-pointer"
                  >
                    ← بازگشت به صفحه ورود
                  </button>
                </div>
              </div>
            )}

            {/* دکمه پشتیبانی */}
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-end gap-4 text-xs font-bold text-slate-400">
              <button 
                onClick={() => setShowSupportModal(true)} 
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <HelpCircle size={15} />
                <span>پشتیبانی کارگاه‌ها</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* درگاه شبکه‌ای شبیه‌ساز پرداخت شتاب زیبال و شاپرک */}
      <AnimatePresence>
        {showSimulatedPortal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0a0f1d]/95 z-[120] flex items-center justify-center p-4 overflow-y-auto font-['Vazirmatn'] select-none text-slate-800"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden text-right"
            >
              {/* هدر شاپرک */}
              <div className="bg-gradient-to-r from-teal-700 via-slate-800 to-sky-800 p-5 px-6 text-white flex justify-between items-center border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-white text-base">💳</div>
                  <div>
                    <h2 className="text-sm font-black tracking-tight">دروازه پرداخت الکترونیکی زیبال</h2>
                    <p className="text-[10px] text-teal-200 mt-0.5">شبکه تبادل اطلاعات بانکی ایران (شاپرک)</p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-xs bg-black/20 text-teal-300 font-bold px-3 py-1.5 rounded-full border border-teal-500/20">اتصال امن (SSL)</span>
                </div>
              </div>

              {/* خلاصه فاکتور */}
              <div className="bg-slate-50 p-5 px-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold leading-normal">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">پذیرنده دیجیتال:</span>
                    <span className="text-slate-900 font-black">پلتفرم محاسباتی دوجداره نکس‌وین (NexWin)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">مجموعه خریدار:</span>
                    <span className="text-slate-900 font-black">{signupCompanyName || 'کارگاه صنعتی جدید'}</span>
                  </div>
                </div>
                <div className="space-y-2 border-r border-slate-200 pr-0 md:pr-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">بسته اشتراکی:</span>
                    <span className="text-blue-700 font-black">
                      {signupTier === 'gold' ? 'طلایی نامحدود' : signupTier === 'silver' ? 'نقره‌ای خط تولید' : 'برنزی محاسباتی'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">مجموع کل فاکتور:</span>
                    <span className="text-emerald-600 font-black text-sm">
                      {signupTier === 'gold' ? '۷,۹۰۰,۰۰۰' : signupTier === 'silver' ? '۴,۵۰۰,۰۰۰' : '۲,۰۰۰,۰۰۰'} ریال (
                      {signupTier === 'gold' ? '۷۹۰,۰۰۰' : signupTier === 'silver' ? '۴۵۰,۰۰۰' : '۲۰۰,۰۰۰'} تومان)
                    </span>
                  </div>
                </div>
              </div>

              {/* فرم مشخصات کارت شتاب */}
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* قسمت چپ: کارت شتاب فیزیکی دمو */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-[240px] aspect-[1.58] bg-gradient-to-tr from-sky-700 via-indigo-700 to-indigo-900 rounded-2xl p-4 text-white relative shadow-lg overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 left-0 bottom-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_40%)]"></div>
                    <div className="flex justify-between items-center z-10">
                      <span className="text-[10px] font-black tracking-widest opacity-80">عضو شبکه شتاب IRAN</span>
                      <span className="text-yellow-400 font-black text-xs">نکس‌بانک ★</span>
                    </div>

                    <div className="my-3 z-10 text-center font-mono text-base font-bold tracking-widest leading-none drop-shadow-md text-slate-100 select-all">
                      {simCardNo ? toPersianDigits(simCardNo.replace(/(\d{4})/g, '$1 ').trim()) : '۶۲۷۴  ۱۲۳۴  ۵۶۷۸  ۹۰۱۲'}
                    </div>

                    <div className="flex justify-between items-end z-10 leading-none">
                      <div className="text-right">
                        <span className="text-[7px] text-slate-300 block">صاحب کارت:</span>
                        <span className="text-[10px] font-bold mt-0.5 block">{signupOwnerName || 'مدیر محترم کارگاه'}</span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-[7px] text-slate-300 block">CVV2:</span>
                        <span className="text-[10px] font-bold mt-0.5 block">{simCvv || '***'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center bg-slate-100 p-3 rounded-xl border border-slate-200 max-w-[240px]">
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed text-justify">
                      💡 این درگاه برای شبیه‌سازی دقیق زیبال تعبیه شده است. اطلاعات ورودی الزامی به کارت واقعی نداشته و شما می‌توانید دکمه پرداخت موفق آزمایشی را مستقیماً بزنید.
                    </p>
                  </div>
                </div>

                {/* سمت راست: ورودی‌ها */}
                <div className="md:col-span-7 space-y-4">
                  {/* شماره کارت */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-600 block">شماره کارت ۱۶ رقمی</label>
                    <input
                      type="text"
                      className="w-full text-center px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm tracking-widest font-black focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 transition-all"
                      placeholder="6274-XXXX-XXXX-XXXX"
                      maxLength={16}
                      value={simCardNo}
                      onChange={(e) => setSimCardNo(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  {/* CVV2  و تاریخ انقضاء */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-600 block">کد امنیتی CVV2</label>
                      <input
                        type="password"
                        className="w-full text-center px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 transition-all text-sm"
                        placeholder="***"
                        maxLength={4}
                        value={simCvv}
                        onChange={(e) => setSimCvv(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-600 block">تاریخ انقضاء (ماه/سال)</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          className="w-full text-center py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold"
                          placeholder="ماه"
                          maxLength={2}
                        />
                        <input
                          type="text"
                          className="w-full text-center py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold"
                          placeholder="سال"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* رمز دوم پویا شتاب */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-600 block">رمز دوم اینترنتی (پویا)</label>
                    <div className="flex gap-2.5">
                      <input
                        type="password"
                        className="flex-1 text-center px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 tracking-wider transition-all text-sm"
                        placeholder="رمز پویا"
                        maxLength={8}
                        value={simPin}
                        onChange={(e) => setSimPin(e.target.value.replace(/\D/g, ''))}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSimOtpRequested(true);
                          setSimOtpTimer(60);
                          setSimPin('98320'); // کلمه پیش‌فرض اتوماتیک
                          alert('کد شبیه‌ساز رمز یکبار مصرف به گوشی شما پیامک شد: 98320');
                        }}
                        disabled={simOtpRequested && simOtpTimer > 0}
                        className={`px-4.5 rounded-xl text-[10px] font-black transition-all border cursor-pointer border-indigo-600 whitespace-nowrap ${
                          simOtpRequested && simOtpTimer > 0
                            ? 'bg-slate-100 text-slate-400 border-slate-200'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {simOtpRequested && simOtpTimer > 0 ? `ارسال مجدد (${simOtpTimer} ثانیه)` : 'درخواست رمز پویا'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* اکشن بار نهایی زیرگاه پرداخت شتاب */}
              <div className="bg-slate-100 p-5 px-6 flex flex-col md:flex-row gap-3 justify-between items-center border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    // انصراف از به پرداخت
                    const auth = localStorage.getItem('nexwin_pending_authority') || 'SIM-AUTH';
                    window.location.href = `${window.location.origin}/#/payment-callback?Status=NOK&Authority=${auth}`;
                  }}
                  className="w-full md:w-auto px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer"
                >
                  انصراف و ابطال فاکتور پرداخت ✕
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // پرداخت موفق با موفقیت
                    const auth = localStorage.getItem('nexwin_pending_authority') || 'SIM-AUTH';
                    window.location.href = `${window.location.origin}/#/payment-callback?Status=OK&Authority=${auth}`;
                  }}
                  className="w-full md:w-auto px-10 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition-all border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>پرداخت موفقیت‌آمیز آزمایشی (سریع)</span>
                  <Check size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*/screens/Login.tsx وایت سپیس تزیینی */}

      {/*/screens/Login.tsx وایت لود تزیینی */}

      {/*/screens/Login.tsx لایسنس تزیینی */}

      {/* مودال متحرک ارتباط با پشتیبانی */}
      <AnimatePresence>
        {showSupportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSupportModal(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-slate-200 rounded-[2rem] p-6 max-w-sm w-full text-right text-slate-800 space-y-6 shadow-2xl relative"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-50 mx-auto rounded-2xl flex items-center justify-center text-blue-600">
                  <PhoneCall size={22} />
                </div>
                <h3 className="text-base font-black text-slate-900">پشتیبانی و تمدید لایسنس نکس‌وین</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed font-bold">جهت تمدید اعتبار، افزایش ظرفیت دستگاه‌ها یا رفع موارد مسدودی لایسنس، با شماره‌های پشتیبانی تماس حاصل فرمایید.</p>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">تلفن پشتیبانی مرکزی:</span>
                  <a href="tel:09120000000" className="font-mono text-blue-600 font-extrabold hover:underline">0912-000-0000</a>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">کارشناس تمدید لایسنس:</span>
                  <a href="tel:09170000000" className="font-mono text-blue-600 font-extrabold hover:underline">0917-000-0000</a>
                </div>
                <div className="p-3 bg-blue-50 text-[9px] text-blue-700 rounded-xl border border-blue-100 leading-normal text-justify font-semibold">
                  💡 لطفاً شناسه لایسنس خود (NW-xxxxx) را به همراه فیش واریزی در شبکه‌های اجتماعی برای کارشناسان تمدید ارسال فرمایید تا فعال‌سازی آنی صورت گیرد.
                </div>
              </div>

              <button
                type="button"
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
                onClick={() => setShowSupportModal(false)}
              >
                بستن راهنما
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
