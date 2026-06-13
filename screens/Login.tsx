import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Phone, AlertCircle, HelpCircle, ArrowRight, ShieldCheck, Timer, Award, User, Briefcase, ChevronLeft, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toEnglishDigits, toPersianDigits } from '../utils/formatting';
import { AppUser } from '../types';

// ==========================================
// تنظیمات اتصال مستقیم به لایسنس‌سرور سوپابیس
// ==========================================
const VITE_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const VITE_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const Login = () => {
  const navigate = useNavigate();

  // فیلدهای ورودی فرم
  const [phoneNumber, setPhoneNumber] = useState('');
  const [licenseId, setLicenseId] = useState('');

  // حالت‌های کامپوننت
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [loginSuccessData, setLoginSuccessData] = useState<AppUser | null>(null);
  const [countdown, setCountdown] = useState(3);

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

  // هندلر کلیک ورود اطلاعات لایسنس
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // اعتبارسنجی اولیه فیلدها و نرمال‌سازی اعداد فارسی/عربی به انگلیسی
    const cleanPhone = toEnglishDigits(phoneNumber.trim());
    const cleanLicense = toEnglishDigits(licenseId.trim()).toUpperCase();

    if (!cleanPhone || !cleanLicense) {
      setErrorMessage('لطفاً شماره همراه و شناسه لایسنس نکس‌وین را وارد کنید.');
      return;
    }

    setLoading(true);

    // ۱. بررسی ست نبودن متغیرهای محیطی سوپابیس (ارائه راهنما + دمو جهت تسهیل پیش‌نمایش در Sandbox)
    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY || VITE_SUPABASE_URL.includes('YOUR_SUPABASE')) {
      // شبیه‌سازی ورود لوکال جهت اینکه نرم‌افزار بالا بیاید و قابلیت تست داشته باشد در صورت عدم کانفیگ کلیدها
      setTimeout(() => {
        setLoading(false);
        // یک کاربر نمونه برای حالت دمو فعال می‌کنیم
        const demoUser: AppUser = {
          id: cleanLicense,
          owner_name: 'جناب آقای معین',
          company_name: 'کارگاه برادران معین (صنایع نکس‌وین دمو)',
          phone_number: cleanPhone,
          tier: 'gold',
          status: 'active',
          register_date: '۱۴۰۳/۰۲/۱۵',
          expiry_date: '۱۴۰۶/۰۲/۱۵',
          max_devices: 5,
          total_paid: 15000000
        };
        saveAndAnimateWelcome(demoUser);
      }, 1000);
      return;
    }

    try {
      // فرمت درخواست GET به Rest API سوپابیس برای جستجوی کاربر فعال
      const url = `${VITE_SUPABASE_URL}/rest/v1/app_users?id=eq.${encodeURIComponent(cleanLicense)}&phone_number=eq.${encodeURIComponent(cleanPhone)}&select=*`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`خطا در ارتباط با سرور: ${response.status}`);
      }

      const users: AppUser[] = await response.json();

      if (!users || users.length === 0) {
        setErrorMessage('شناسه لایسنس یا شماره همراه وارد شده نامعتبر است.');
        setLoading(false);
        return;
      }

      const user = users[0];

      // بررسی وضعیت لایسنس کارگاه (بیزینس رول شماره ۳)
      if (user.status === 'suspended') {
        setErrorMessage('دسترسی کارگاه شما توسط مدیریت نرم‌افزار نکس‌وین تعلیق شده است.');
        await writeSecurityLog(user.id, 'login_suspended', `تلاش برای ورود با لایسنس تعلیق شده`);
        setLoading(false);
        return;
      }

      if (user.status === 'expired') {
        setErrorMessage('لایسنس نرم‌افزار شما منقضی شده است. لطفاً اقدام به شارژ یا تمدید لایسنس نمایید.');
        await writeSecurityLog(user.id, 'login_expired', `تلاش برای ورود با لایسنس منقضی شده با انقضای ${user.expiry_date}`);
        setLoading(false);
        return;
      }

      if (user.status !== 'active') {
        setErrorMessage('وضعیت حساب کاربری شما نامشخص است. لطفاً با پشتیبانی هماهنگ کنید.');
        setLoading(false);
        return;
      }

      // لایسنس فعال است، لاگ موفق ثبت شده و به مرحله بعد می‌رویم
      await writeSecurityLog(user.id, 'login_success', `ورود موفق کارفرما از طریق سیستم طراحی`);
      saveAndAnimateWelcome(user);

    } catch (error: any) {
      console.error('Core Auth Error:', error);
      setErrorMessage(`خطا در اتصال به شبکه لایسنس سرور: ${error.message || 'لطفاً وضعیت اینترنت خود را چک کنید'}`);
      setLoading(false);
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

  // شبیه‌سازی ورود سریع برای راحتی کاربران سیستم بدون وارد کردن اطلاعات بلند
  const handleFastDemoLogin = () => {
    const demoUser: AppUser = {
      id: 'NW-98421',
      owner_name: 'جناب معین (پیش فرض)',
      company_name: 'مجموعه صنعتی نکس‌وین شیراز',
      phone_number: '09171234567',
      tier: 'gold',
      status: 'active',
      register_date: '۱۴۰۴/۰۱/۰۱',
      expiry_date: '۱۴۰۷/۱۲/۲۹',
      max_devices: 3,
      total_paid: 25000000
    };
    saveAndAnimateWelcome(demoUser);
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-['Vazirmatn'] px-4 py-8 select-none">
      
      {/* هاله‌های نوری شناور سینمایی در پس‌زمینه */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <AnimatePresence mode="wait">
        
        {/* ۱. لودر بارگزاری خوش‌آمدگویی ۳ ثانیه‌ای سینمایی */}
        {loginSuccessData ? (
          <motion.div
            key="welcome-screen"
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-xl bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-8 md:p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative text-right text-white z-50 overflow-hidden"
          >
            {/* بار پیشرفت افقی لودینگ بالا */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
              <motion.div 
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400"
              />
            </div>

            <div className="text-center mb-8">
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="inline-flex p-4 bg-blue-500/20 text-blue-400 rounded-3xl mb-4 shadow-[0_0_40px_rgba(59,130,246,0.3)]"
              >
                <ShieldCheck size={48} strokeWidth={1.5} />
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight leading-normal">اتصال ایمن برقرار شد</h1>
              <p className="text-slate-400 text-xs md:text-sm font-semibold mt-1">خوش آمدید به پلتفرم مهندسی نکس‌وین</p>
            </div>

            <div className="bg-slate-950/50 backdrop-blur-md rounded-2xl p-6 border border-white/5 space-y-4 mb-8">
              {/* نام کارفرما */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <User size={18} className="text-blue-400" />
                  <span className="text-xs font-bold">کارفرمای محترم:</span>
                </div>
                <span className="text-sm font-black text-white">{loginSuccessData.owner_name}</span>
              </div>

              {/* نام مجموعه کارگاهی */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Briefcase size={18} className="text-blue-400" />
                  <span className="text-xs font-bold">مجموعه برتر صنعتی:</span>
                </div>
                <span className="text-sm font-black text-white">{loginSuccessData.company_name}</span>
              </div>

              {/* نوع پلن فعال لایسنس */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Award size={18} className="text-blue-400" />
                  <span className="text-xs font-bold">سطح اشتراک فعال:</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${getTierBadgeStyles(loginSuccessData.tier)}`}>
                  {getTierBadgeLabel(loginSuccessData.tier)}
                </span>
              </div>

              {/* تاریخ انقضا */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Timer size={18} className="text-blue-400" />
                  <span className="text-xs font-bold">مهلت اعتبار لایسنس:</span>
                </div>
                <span className="text-sm font-black text-emerald-400 font-mono tracking-wide">{toPersianDigits(loginSuccessData.expiry_date)}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-3 bg-blue-500/10 px-4 py-2.5 rounded-xl border border-blue-500/20">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                <span className="text-[11px] font-bold text-slate-300">در حال بارگذاری ایمن هسته محاسباتی نکس‌وین در {toPersianDigits(countdown)} ثانیه...</span>
              </div>
            </div>
          </motion.div>
        ) : (
          
          /* ۲. فرم لاگین زیبا و گلس‌مورفیک اصلی */
          <motion.div
            key="login-form-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="w-full max-w-md bg-slate-900/50 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-6 md:p-8 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] relative z-50 text-right text-white"
          >
            {/* سربرگ */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-sky-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-2xl text-white select-none border border-white/10 mb-4 scale-102">
                NW
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white mb-1">صنایع یوپی‌وی‌سی نکس‌وین</h2>
              <p className="text-[11px] text-slate-400 font-bold tracking-wider uppercase">سامانه مرکزی تایید لایسنس و ورود به طراح</p>
            </div>

            {/* کارت پیغام خطا در صورت بروز تداخل یا عدم مطابقت مشخصات لایسنس */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-100 text-xs font-bold leading-relaxed flex items-start gap-3"
              >
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{errorMessage}</p>
                  {(errorMessage.includes('تعلیق') || errorMessage.includes('منقضی')) && (
                    <button 
                      onClick={() => setShowSupportModal(true)} 
                      className="mt-2 text-red-300 hover:text-red-200 underline font-black block"
                    >
                      ارتباط با واحد مانیتورینگ و پشتیبانی
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* راهنمایی کوچکی در صورتی که اتصال به اینترنت یا Supabase ست نشده باشد برای دمو */}
            {(!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) && (
              <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-amber-200 text-[10px] font-bold leading-relaxed">
                🚀 سوپابیس ست نشده است. جهت بررسی سریع عملکرد، می‌توانید با هر شماره و لایسنسی دکمه ورود را بزنید یا مستقیماً از دکمه ورود سریع دمو استفاده نمایید.
              </div>
            )}

            {/* فرم ورود */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* ورودی شماره همراه */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 block select-none px-1">شماره همراه کارفرما / کارگاه</label>
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
                    className="w-full pl-4 pr-12 py-3.5 bg-slate-950/40 border border-white/10 rounded-2xl text-white text-sm font-bold tracking-wider placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 text-left font-mono"
                  />
                </div>
              </div>

              {/* ورودی شناسه لایسنس */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-300 block select-none px-1">شناسه لایسنس نکس‌وین</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="text"
                    value={licenseId}
                    onChange={(e) => setLicenseId(e.target.value)}
                    placeholder="مثال: NW-83921"
                    disabled={loading}
                    dir="ltr"
                    className="w-full pl-4 pr-12 py-3.5 bg-slate-950/40 border border-white/10 rounded-2xl text-white text-sm font-bold tracking-wider placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 text-left font-mono"
                  />
                </div>
              </div>

              {/* دکمه سابمیت */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-900/30 flex items-center justify-center gap-3 active:scale-98 transition-all disabled:opacity-55 disabled:scale-100 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer border-none"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>در حال ارزیابی اتصال لایسنس سرور...</span>
                  </>
                ) : (
                  <>
                    <span>بررسی لایسنس و ورود به بوم طراح</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* دکمه‌های ورود سریع دمو و پشتیبانی */}
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between gap-4 text-xs font-bold text-slate-400">
              <button 
                onClick={handleFastDemoLogin} 
                className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl flex items-center gap-2 border border-white/5 active:scale-95"
              >
                ورود دمو (آفلاین دسکتاپ) ⚙️
              </button>
              
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

      {/* مودال متحرک ارتباط با پشتیبانی */}
      <AnimatePresence>
        {showSupportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSupportModal(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 max-w-sm w-full text-right text-white space-y-6 shadow-2xl relative"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-500/10 mx-auto rounded-2xl flex items-center justify-center text-blue-400">
                  <PhoneCall size={22} />
                </div>
                <h3 className="text-base font-black">پشتیبانی و تمدید لایسنس نکس‌وین</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed font-bold">جهت تمدید اعتبار، افزایش ظرفیت دستگاه‌ها یا فعال‌سازی لایسک‌های مسدوده با شماره‌های واحد ناظر تماس حاصل فرمایید.</p>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">تلفن پشتیبانی مرکزی:</span>
                  <a href="tel:09120000000" className="font-mono text-blue-400 font-extrabold hover:underline">0912-000-0000</a>
                </div>
                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">کارشناس تمدید لایسنس:</span>
                  <a href="tel:09170000000" className="font-mono text-blue-400 font-extrabold hover:underline">0917-000-0000</a>
                </div>
                <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 text-[9px] text-blue-300 leading-normal text-justify">
                  💡 لطفا شناسه لایسنس خود (مثال: NW-83921) یا فیش واریزی آخر را در پلتفرم تلگرام یا واتساپ برای کارشناسان تمدید ارسال فرمایید تا فعال‌سازی آنی صورت گیرد.
                </div>
              </div>

              <button
                type="button"
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
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
