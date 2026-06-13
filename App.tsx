
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Phone, LogOut } from 'lucide-react';
import { Login } from './screens/Login';
import { Onboarding } from './screens/Onboarding';
import { Dashboard } from './screens/Dashboard';
import { ProjectSetup } from './screens/ProjectSetup';
import { UnitDesigner } from './screens/UnitDesigner';
import { PriceBreakdown } from './screens/PriceBreakdown';
import { InvoicePrint } from './screens/InvoicePrint';
import { ProfileSelection } from './screens/ProfileSelection';
import { GlassHardware } from './screens/GlassHardware';
import { Projects } from './screens/Projects';
import { Settings } from './screens/Settings';
import { FinancialManagement } from './screens/FinancialManagement';
import { ProjectFinancials } from './screens/ProjectFinancials';
import { ProfileOptimization } from './screens/ProfileOptimization';
import { GlassOptimization } from './screens/GlassOptimization';
import { InventoryManagement } from './screens/InventoryManagement';
import { ProductionControl } from './screens/ProductionControl';
import { PaymentCallback } from './screens/PaymentCallback';

// نگهبان مسیرها بر اساس وضعیت لایسنس تایید شده در لوکال‌استوریج و سطح دسترسی اشتراک
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedTiers?: ('bronze' | 'silver' | 'gold')[];
}

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

// کامپوننت پایان دسترسی آزمایشی نکس‌وین
const TrialExpiredScreen = ({ user }: { user: any }) => {
  const handleLogout = () => {
    localStorage.removeItem('nexwin_user');
    window.location.reload();
  };

  const startDateStr = user.trial_start_date 
    ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date(user.trial_start_date))
    : 'نامشخص';
  const endDateStr = user.trial_start_date
    ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date(new Date(user.trial_start_date).getTime() + 7 * 24 * 60 * 60 * 1000))
    : 'نامشخص';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden font-['Vazirmatn'] px-4 py-8 select-none">
      {/* هاله‌های نوری تزیینی پس‌زمینه */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] border border-red-500/20 p-8 md:p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative text-right text-white z-50">
        <div className="text-center mb-8">
          <div className="inline-flex p-5 bg-red-500/10 text-red-500 rounded-full mb-5 shadow-[0_0_50px_rgba(239,68,68,0.2)] border border-red-500/20 animate-bounce">
            <Lock size={48} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-rose-500 tracking-tight leading-normal">
            پایان مهلت حساب آزمایشی ⏳
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-bold mt-2 leading-relaxed">
            امروز مدت ۷ روز استفاده آزمایشی (ورود آفلاین دمو) شما از پلتفرم محاسباتی نکس‌وین خاتمه یافته است.
          </p>
        </div>

        <div className="bg-slate-950/60 rounded-2xl p-6 border border-white/5 space-y-4 mb-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs text-slate-400 font-bold">سطح دسترسی آزمایشی:</span>
            <span className="text-sm font-black text-yellow-500">تمامی ماژول‌ها و خط تولید (GOLD)</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs text-slate-400 font-bold">صاحب کارگاه:</span>
            <span className="text-sm font-black text-slate-200">{user.owner_name || 'کاربر سیستم دمو'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs text-slate-400 font-bold">نام مجموعه:</span>
            <span className="text-sm font-black text-slate-200">{user.company_name || 'کارگاه نکس‌وین دمو'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs text-slate-400 font-bold">شروع لایسنس آزمایشی:</span>
            <span className="text-sm font-medium text-slate-300 font-mono">{startDateStr}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">پایان مهلت لایسنس آزمایشی:</span>
            <span className="text-sm font-black text-rose-400 font-mono">{endDateStr}</span>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-8 text-right">
          <p className="text-xs text-amber-400 leading-relaxed font-bold">
            ⚠️ کاربر گرامی کارگاه؛ جهت ثبت و بهره‌مندی همیشگی از بوم طراحی فوق‌پیشرفته و تمدید لایسنس به صورت دائم تجاری، لطفا با بخش مانیتورینگ و ارتقای لایسنس‌های نکس‌وین تماس حاصل فرمایید.
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
            خروج و ورود مجدد با لایسنس دائمی
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

  const userStr = localStorage.getItem('nexwin_user');
  let isTrialExpired = false;
  let trialUserObj: any = null;

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.is_trial && user.trial_start_date) {
        trialUserObj = user;
        const start = new Date(user.trial_start_date).getTime();
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (now - start >= sevenDaysMs) {
          isTrialExpired = true;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (isTrialExpired && trialUserObj) {
    return <TrialExpiredScreen user={trialUserObj} />;
  }

  const hasSession = !!userStr;

  return (
    <HashRouter>
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
    </HashRouter>
  );
}

export default App;

