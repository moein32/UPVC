
import React, { useEffect, useState, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Phone, LogOut, X, Share } from 'lucide-react';
import { Login } from './screens/Login';
import { PwaInstallManager } from './components/PwaInstallManager';
import { logoutUser } from './services/sessionService';

// Lazy loading sub-screens for ultra-fast startup and split bundling on mobile
const Onboarding = React.lazy(() => import('./screens/Onboarding').then(m => ({ default: m.Onboarding })));
const Dashboard = React.lazy(() => import('./screens/Dashboard').then(m => ({ default: m.Dashboard })));
const ProjectSetup = React.lazy(() => import('./screens/ProjectSetup').then(m => ({ default: m.ProjectSetup })));
const UnitDesigner = React.lazy(() => import('./screens/UnitDesigner').then(m => ({ default: m.UnitDesigner })));
const PriceBreakdown = React.lazy(() => import('./screens/PriceBreakdown').then(m => ({ default: m.PriceBreakdown })));
const InvoicePrint = React.lazy(() => import('./screens/InvoicePrint').then(m => ({ default: m.InvoicePrint })));
const ProfileSelection = React.lazy(() => import('./screens/ProfileSelection').then(m => ({ default: m.ProfileSelection })));
const GlassHardware = React.lazy(() => import('./screens/GlassHardware').then(m => ({ default: m.GlassHardware })));
const Projects = React.lazy(() => import('./screens/Projects').then(m => ({ default: m.Projects })));
const Settings = React.lazy(() => import('./screens/Settings').then(m => ({ default: m.Settings })));
const FinancialManagement = React.lazy(() => import('./screens/FinancialManagement').then(m => ({ default: m.FinancialManagement })));
const ProjectFinancials = React.lazy(() => import('./screens/ProjectFinancials').then(m => ({ default: m.ProjectFinancials })));
const ProfileOptimization = React.lazy(() => import('./screens/ProfileOptimization').then(m => ({ default: m.ProfileOptimization })));
const GlassOptimization = React.lazy(() => import('./screens/GlassOptimization').then(m => ({ default: m.GlassOptimization })));
const InventoryManagement = React.lazy(() => import('./screens/InventoryManagement').then(m => ({ default: m.InventoryManagement })));
const ProductionControl = React.lazy(() => import('./screens/ProductionControl').then(m => ({ default: m.ProductionControl })));
const PaymentCallback = React.lazy(() => import('./screens/PaymentCallback').then(m => ({ default: m.PaymentCallback })));

// A lightweight, premium loading fallback spinner for dynamically loaded sub-screens
const LoadingSpinner = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] font-['Vazirmatn'] text-white">
    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
    <span className="text-xs text-slate-400 font-bold">در حال بارگذاری ایمن...</span>
  </div>
);

// نگهبان مسیرها بر اساس وضعیت لایسنس تایید شده در لوکال‌استوریج و سطح دسترسی اشتراک
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedTiers?: ('bronze' | 'silver' | 'gold')[];
}

// مبدل تقویم میلادی به شمسی (فال‌بک در زمان عدم پشتیبانی محیط کاربری از Intl)
function gregorianToJalali(gy: number, gm: number, gd: number) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : gy - 1600;
  let gd_count = g_d_m[gm - 1] + gd;
  if (gm > 2 && ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0))) {
    gd_count++;
  }
  let jy_day = gd_count + 79;
  let j_np = Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
  let j_day_no = jy * 365 + j_np + jy_day;
  jy = Math.floor(j_day_no / 12053) * 33;
  j_day_no %= 12053;
  jy += Math.floor(j_day_no / 1461) * 4;
  j_day_no %= 1461;
  jy += Math.floor((j_day_no - 1) / 365);
  if (j_day_no > 365) {
    j_day_no = (j_day_no - 1) % 365;
  }
  let jm = 0, jd = 0;
  if (j_day_no < 186) {
    jm = 1 + Math.floor(j_day_no / 31);
    jd = 1 + (j_day_no % 31);
  } else {
    jm = 7 + Math.floor((j_day_no - 186) / 30);
    jd = 1 + ((j_day_no - 186) % 30);
  }
  return { jy: jy + 979, jm, jd };
}

// تابع تجزیه و استخراج سال، ماه و روز شمسی از هر فرمت متنی (عددی یا با حروف ماه)
function parsePersianDate(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  try {
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    let clean = dateStr;
    for (let i = 0; i < 10; i++) {
      clean = clean.replace(new RegExp(farsiDigits[i], 'g'), String(i));
    }
    
    const monthsMap: Record<string, string> = {
      'فروردین': '1', 'اردیبهشت': '2', 'خرداد': '3',
      'تیر': '4', 'مرداد': '5', 'شهریور': '6',
      'مهر': '7', 'آبان': '8', 'آذر': '9',
      'دی': '10', 'بهمن': '11', 'اسفند': '12'
    };
    for (const [name, num] of Object.entries(monthsMap)) {
      if (clean.includes(name)) {
        clean = clean.replace(name, `/${num}/`);
        break;
      }
    }
    
    const numbers = clean.match(/\d+/g);
    if (!numbers || numbers.length < 3) return null;
    
    const parsedNums = numbers.map(n => parseInt(n, 10));
    const yearIdx = parsedNums.findIndex(n => n >= 1300 && n <= 1500);
    if (yearIdx === -1) return null;
    
    let year = parsedNums[yearIdx];
    let month = 1;
    let day = 1;
    
    if (yearIdx === 0) {
      month = parsedNums[1];
      day = parsedNums[2];
    } else if (yearIdx === 2) {
      day = parsedNums[0];
      month = parsedNums[1];
    } else {
      return null;
    }
    
    return { year, month, day };
  } catch (e) {
    console.warn('[Parse Persian Date] Error:', dateStr, e);
    return null;
  }
}

// مبدل بسیار دقیق تقویم شمسی به میلادی با استفاده از سیستم نیتیو مرورگر جهت برطرف‌سازی خطاهای محاسبه روزها
function jalaliToGregorianSearch(jy: number, jm: number, jd: number): Date {
  let gYear = jy + 621;
  let searchDate = new Date(gYear, 2, 1);
  for (let k = 0; k < 450; k++) {
    try {
      const parts = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', numberingSystem: 'latn' }).formatToParts(searchDate);
      const curY = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
      const curM = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
      const curD = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
      if (curY === jy && curM === jm && curD === jd) {
        return searchDate;
      }
    } catch (e) {}
    searchDate = new Date(searchDate.getTime() + 24 * 60 * 60 * 1000);
  }
  return new Date(jy + 621, jm - 1, jd);
}

// تابع کمکی بررسی انقضای تاریخ شمسی لایسنس
function isPersianDateExpired(expiryDateStr: string): boolean {
  if (!expiryDateStr) return false;
  if (expiryDateStr.includes('بدون منقضی') || expiryDateStr.includes('۳ ساله') || expiryDateStr.includes('3 ساله')) {
    return false;
  }
  
  const parsedExpiry = parsePersianDate(expiryDateStr);
  if (!parsedExpiry) return false;
  
  const expiryDateObj = jalaliToGregorianSearch(parsedExpiry.year, parsedExpiry.month, parsedExpiry.day);
  const expiryTime = expiryDateObj.getTime() + 24 * 60 * 60 * 1000 - 1; // پایان روز انقضا
  return Date.now() >= expiryTime;
}

// بررسی وضعیت کلی و انقضای کاربر به صورت محلی
const checkExpiry = (user: any): { isExpired: boolean; reason: 'trial' | 'subscription' | 'suspended' | null } => {
  if (!user) return { isExpired: false, reason: null };
  
  if (user.status === 'expired') {
    return { isExpired: true, reason: 'subscription' };
  }
  if (user.status === 'suspended') {
    return { isExpired: true, reason: 'suspended' };
  }

  // ۱. بررسی بر اساس برچسب زمانی دقیق انقضا (در صورت وجود اولویت دارد)
  if (user.expiry_timestamp) {
    if (Date.now() >= user.expiry_timestamp) {
      return { isExpired: true, reason: user.is_trial ? 'trial' : 'subscription' };
    }
    // اگر برچسب زمانی انقضا معتبر است و منقضی نشده، کاربر قطعا فعال است و نیاز به بررسی فیلد متنی تاریخ نیست
    return { isExpired: false, reason: null };
  }

  // ۲. بررسی دوره آزمایشی (7 روزه)
  if (user.is_trial && user.trial_start_date) {
    const start = new Date(user.trial_start_date).getTime();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (now - start >= sevenDaysMs) {
      return { isExpired: true, reason: 'trial' };
    }
  }

  // ۳. بررسی بر اساس فیلد متنی تاریخ شمسی انقضا (به عنوان بک‌آپ در صورتی که تایم‌استمپ نبود)
  if (user.expiry_date) {
    if (isPersianDateExpired(user.expiry_date)) {
      return { isExpired: true, reason: user.is_trial ? 'trial' : 'subscription' };
    }
  }

  return { isExpired: false, reason: null };
};

const ProtectedRoute = ({ children, allowedTiers }: ProtectedRouteProps) => {
  const userStr = localStorage.getItem('nexwin_user');
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  if (allowedTiers) {
    try {
      const user = JSON.parse(userStr);
      const userTier = user.tier || 'bronze';
      if (!allowedTiers.includes(userTier)) {
        // در صورت عدم دسترسی، کاربر را به داشبورد هدایت می‌کنیم
        return <Navigate to="/dashboard" replace />;
      }
    } catch (e) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

// کامپوننت پایان دسترسی و انقضای حساب کاربری نکس‌وین
const AccountExpiredScreen = ({ user, reason }: { user: any; reason: 'trial' | 'subscription' | 'suspended' | null }) => {
  const handleLogout = async () => {
    await logoutUser();
    window.location.reload();
  };

  const getTrialEnd = (startDate: string) => {
    if (!startDate) return 'نامشخص';
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date(new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const startDateStr = user?.trial_start_date 
    ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date(user.trial_start_date))
    : 'نامشخص';

  const endDateStr = user?.is_trial
    ? getTrialEnd(user.trial_start_date || '')
    : (user?.expiry_date || 'نامشخص');

  const getTitle = () => {
    if (reason === 'trial') return 'پایان مهلت حساب آزمایشی ⏳';
    if (reason === 'suspended') return 'حساب کاربری غیرفعال یا تعلیق شده 🔒';
    return 'پایان دوره اشتراک نکس‌وین ⚠️';
  };

  const getDescription = () => {
    if (reason === 'trial') {
      return 'امروز مدت ۷ روز استفاده آزمایشی (ورود آفلاین دمو) شما از پلتفرم محاسباتی نکس‌وین خاتمه یافته است.';
    }
    if (reason === 'suspended') {
      return 'دسترسی شما به سیستم یکپارچه نکس‌وین بنا به دستور مدیریت مالی یا نقض شرایط استفاده موقتاً مسدود گردیده است.';
    }
    return 'اعتبار لایسنس تجاری/اشتراکی شما بر روی پلتفرم نکس‌وین خاتمه یافته است. برای ادامه کار لازم است اشتراک خود را تمدید فرمایید.';
  };

  const getTierLabel = () => {
    const tier = user?.tier || 'bronze';
    if (tier === 'gold') return 'طلایی (ماژول‌ها و خط تولید)';
    if (tier === 'silver') return 'نقره‌ای (کارگاهی استاندارد)';
    return 'برنزی (فروشگاهی)';
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-['Vazirmatn'] px-4 py-8 select-none">
      {/* هاله‌های نوری تزیینی پس‌زمینه */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] border border-red-500/20 p-8 md:p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative text-right text-white z-50 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex p-5 bg-red-500/10 text-red-500 rounded-full mb-5 shadow-[0_0_50px_rgba(239,68,68,0.2)] border border-red-500/20 animate-bounce">
            <Lock size={48} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-rose-500 tracking-tight leading-normal">
            {getTitle()}
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-bold mt-2 leading-relaxed">
            {getDescription()}
          </p>
        </div>

        <div className="bg-slate-950/60 rounded-2xl p-6 border border-white/5 space-y-4 mb-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs text-slate-400 font-bold">سطح دسترسی کاربری:</span>
            <span className="text-sm font-black text-yellow-500">{getTierLabel()}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs text-slate-400 font-bold">صاحب کارگاه/کاربر:</span>
            <span className="text-sm font-black text-slate-200">{user?.owner_name || 'کاربر سیستم'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs text-slate-400 font-bold">نام مجموعه:</span>
            <span className="text-sm font-black text-slate-200">{user?.company_name || 'مجموعه ثبت نشده'}</span>
          </div>
          {user?.is_trial && (
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs text-slate-400 font-bold">شروع لایسنس آزمایشی:</span>
              <span className="text-sm font-medium text-slate-300 font-mono">{startDateStr}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">پایان مهلت لایسنس:</span>
            <span className="text-sm font-black text-rose-400 font-mono">{endDateStr}</span>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-8 text-right">
          <p className="text-xs text-amber-400 leading-relaxed font-bold">
            ⚠️ کاربر گرامی کارگاه؛ جهت ثبت، فعال‌سازی و تمدید لایسنس به صورت دائم تجاری و دسترسی کامل به بوم طراحی فوق‌پیشرفته، لطفا با بخش پشتیبانی و تمدید لایسنس‌های نکس‌وین تماس حاصل فرمایید.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="tel:09193819356"
            className="flex items-center justify-center gap-2.5 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-blue-500/20 border-none cursor-pointer"
          >
            <Phone size={16} />
            تماس با مرکز تمدید و ارتقای لایسنس نکس‌وین
          </a>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs transition-all border border-slate-700 cursor-pointer"
          >
            <LogOut size={16} />
            خروج از حساب کاربری
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const dir = i18n.language === 'en' ? 'ltr' : 'rtl';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // کنترل وضعیت انقضای اشتراک/آزمایشی و همگام‌سازی دایمی با دیتابیس آنلاین
  const [expiredState, setExpiredState] = useState<{
    isExpired: boolean;
    user: any;
    reason: 'trial' | 'subscription' | 'suspended' | null;
  }>(() => {
    const userStr = localStorage.getItem('nexwin_user');
    if (!userStr) return { isExpired: false, user: null, reason: null };
    try {
      const user = JSON.parse(userStr);
      const check = checkExpiry(user);
      if (check.isExpired) {
        return { isExpired: true, user, reason: check.reason };
      }
    } catch (e) {
      console.error('[Initial Expiry Check Error]:', e);
    }
    return { isExpired: false, user: null, reason: null };
  });

  useEffect(() => {
    let active = true;

    const syncAndCheckStatus = async () => {
      const userStr = localStorage.getItem('nexwin_user');
      if (!userStr) {
        if (expiredState.isExpired) {
          setExpiredState({ isExpired: false, user: null, reason: null });
        }
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (!user || !user.id) return;

        // ۱. بررسی و تطابق محلی در وهله اول
        const localCheck = checkExpiry(user);
        if (localCheck.isExpired) {
          if (!expiredState.isExpired || expiredState.reason !== localCheck.reason) {
            setExpiredState({ isExpired: true, user, reason: localCheck.reason });
          }
        } else {
          if (expiredState.isExpired) {
            setExpiredState({ isExpired: false, user: null, reason: null });
          }
        }

        // ۲. تطابق برخط دایم با جدول دیتابیس Supabase
        const supaUrl = import.meta.env.VITE_SUPABASE_URL;
        const supaKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supaUrl || !supaKey || supaUrl.includes('YOUR_SUPABASE') || supaUrl === 'zarinpal' || supaUrl.trim() === '') {
          return;
        }

        const cleanUrl = supaUrl.endsWith('/') ? supaUrl.slice(0, -1) : supaUrl;
        const queryUrl = `${cleanUrl}/rest/v1/app_users?id=eq.${encodeURIComponent(user.id)}&select=*`;
        
        const response = await fetch(queryUrl, {
          method: 'GET',
          headers: {
            'apikey': supaKey,
            'Authorization': `Bearer ${supaKey}`
          }
        });

        if (!active) return;

        if (response.ok) {
          const data = await response.json();
          if (!data || data.length === 0) {
            // کاربر در دیتابیس ابری حذف شده است
            console.warn('[Security Sync] User not found in remote DB. Suspended.');
            const updated = { ...user, status: 'suspended' as const };
            localStorage.setItem('nexwin_user', JSON.stringify(updated));
            setExpiredState({ isExpired: true, user: updated, reason: 'suspended' });
            return;
          }

          const onlineUser = data[0];
          
          // همگام‌سازی و اعمال اطلاعات جدید دیتابیس در حافظه دستگاه
          const updated = {
            ...user,
            status: onlineUser.status,
            expiry_date: onlineUser.expiry_date,
            tier: onlineUser.tier,
            max_devices: onlineUser.max_devices,
            is_trial: onlineUser.is_trial,
            trial_start_date: onlineUser.trial_start_date,
            expiry_timestamp: onlineUser.expiry_timestamp
          };
          localStorage.setItem('nexwin_user', JSON.stringify(updated));

          const onlineCheck = checkExpiry(onlineUser);
          if (onlineCheck.isExpired) {
            setExpiredState({ isExpired: true, user: updated, reason: onlineCheck.reason });
          } else {
            setExpiredState({ isExpired: false, user: null, reason: null });
          }
        }
      } catch (err) {
        console.warn('[Security Sync] Error checking user subscription state remotely:', err);
      }
    };

    syncAndCheckStatus();
    const interval = setInterval(syncAndCheckStatus, 8000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [expiredState.isExpired]);

  if (expiredState.isExpired && expiredState.user) {
    return <AccountExpiredScreen user={expiredState.user} reason={expiredState.reason} />;
  }

  const hasSession = !!localStorage.getItem('nexwin_user');

  return (
    <HashRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Navigate to={hasSession ? "/dashboard" : "/login"} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/project-setup" element={<ProtectedRoute><ProjectSetup /></ProtectedRoute>} />
          <Route path="/designer" element={<ProtectedRoute><UnitDesigner /></ProtectedRoute>} />
          <Route path="/breakdown" element={<ProtectedRoute><PriceBreakdown /></ProtectedRoute>} />
          <Route path="/print-invoice" element={<ProtectedRoute><InvoicePrint /></ProtectedRoute>} />
          <Route path="/profiles" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><ProfileSelection /></ProtectedRoute>} />
          <Route path="/glass-hardware" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><GlassHardware /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/financial-mgmt" element={<ProtectedRoute allowedTiers={['gold']}><FinancialManagement /></ProtectedRoute>} />
          <Route path="/project-financials/:id" element={<ProtectedRoute allowedTiers={['gold']}><ProjectFinancials /></ProtectedRoute>} />
          <Route path="/optimization/profile" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><ProfileOptimization /></ProtectedRoute>} />
          <Route path="/optimization/glass" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><GlassOptimization /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><InventoryManagement /></ProtectedRoute>} />
          <Route path="/production-control" element={<ProtectedRoute allowedTiers={['silver', 'gold']}><ProductionControl /></ProtectedRoute>} />
          <Route path="/payment-callback" element={<PaymentCallback />} />
        </Routes>
      </Suspense>
      <PwaInstallManager />
    </HashRouter>
  );
}

export default App;

