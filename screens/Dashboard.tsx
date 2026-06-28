import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Settings as SettingsIcon, 
  Layers, 
  Bell, 
  Hammer, 
  FolderOpen, 
  Download, 
  Banknote, 
  Scissors, 
  Package, 
  Activity, 
  Layout, 
  Lock, 
  ShieldCheck, 
  Crown, 
  Sparkles, 
  CreditCard,
  Building2,
  Calendar,
  Layers2,
  AlertCircle
} from 'lucide-react';
import { GlassCard } from '../components/UIComponents';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BeforeInstallPromptEvent, AppUser } from '../types';
import newProjectBg from '../src/assets/images/photo-1600607687920-4e2a09cf159d.jpeg';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  
  // وضعیت‌های مربوط به مدال ارتقای اشتراک
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState('');
  const [requiredTierName, setRequiredTierName] = useState('');
  const [requiredTierSlug, setRequiredTierSlug] = useState<'silver' | 'gold'>('silver');
  
  const today = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'fa-IR', { dateStyle: 'full' }).format(new Date());

  useEffect(() => {
    // بارگذاری کاربر فعال از لوکال‌استوریج
    const userStr = localStorage.getItem('nexwin_user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setCurrentUser(parsed);
      } catch (err) {
        console.error('Error parsing local user:', err);
      }
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // اطلاعات پلن فعلی کاربر
  const userTier = currentUser?.tier || 'bronze';
  const companyName = currentUser?.company_name || 'کارگاه نکس‌وین';
  const ownerName = currentUser?.owner_name || 'کاربر سیستم';
  const expiryDate = currentUser?.is_trial && currentUser?.trial_start_date
    ? (() => {
        const start = new Date(currentUser.trial_start_date);
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(end);
      })()
    : currentUser?.expiry_date || '۱۴۰۶/۰۶/۱۳';

  // بررسی دقیق سطوح دسترسی
  const hasProductionAccess = userTier === 'silver' || userTier === 'gold';
  const hasInventoryAccess = userTier === 'silver' || userTier === 'gold';
  const hasOptimizationAccess = userTier === 'silver' || userTier === 'gold';
  const hasProfilesAccess = userTier === 'silver' || userTier === 'gold';
  const hasGlassHardwareAccess = userTier === 'silver' || userTier === 'gold';
  const hasFinancialAccess = userTier === 'gold';

  // مدیریت کلیک روی کارت‌ها
  const handleCardClick = (route: string, isAllowed: boolean, featureName: string, requiredTier: 'silver' | 'gold') => {
    if (isAllowed) {
      navigate(route);
    } else {
      setLockedFeatureName(featureName);
      setRequiredTierSlug(requiredTier);
      setRequiredTierName(requiredTier === 'gold' ? 'صنعتی (GOLD)' : 'کارگاهی (SILVER)');
      setShowUpgradeModal(true);
    }
  };

  // استایل بدج پلن‌ها
  const getTierBadge = () => {
    if (currentUser?.is_trial) {
      const start = new Date(currentUser.trial_start_date || '');
      const elapsed = Date.now() - start.getTime();
      const remainingMs = Math.max(0, (7 * 24 * 60 * 60 * 1000) - elapsed);
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      
      return (
        <span className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-teal-500 via-emerald-600 to-indigo-600 text-white text-[11px] font-black rounded-full shadow-lg shadow-emerald-500/10 border border-emerald-300 animate-pulse">
          <Sparkles size={14} className="animate-spin" />
          حساب آزمایشی (۷ روزه - {remainingDays} روز مانده) 🚀
        </span>
      );
    }

    switch (userTier) {
      case 'gold':
        return (
          <span className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-slate-950 text-[11px] font-black rounded-full shadow-lg shadow-yellow-500/10 border border-yellow-200">
            <Crown size={14} className="animate-pulse" />
            صنعتی (GOLD) 🌟
          </span>
        );
      case 'silver':
        return (
          <span className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 text-slate-900 text-[11px] font-black rounded-full shadow-md border border-slate-200">
            <ShieldCheck size={14} />
            کارگاهی (SILVER) 🥈
          </span>
        );
      case 'bronze':
      default:
        return (
          <span className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white text-[11px] font-black rounded-full shadow-sm border border-amber-900">
            <Sparkles size={14} />
            فروشگاهی (BRONZE) 🥉
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen pb-24 px-6 pt-12 bg-[#f8fafc] font-['Vazirmatn'] overflow-x-hidden">
      <div className="max-w-7xl mx-auto lg:scale-[0.80] lg:origin-top transform transition-all duration-300">
        
        {/* هدر بالایی نکس وین */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-1">نکس‌وین</h1>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">{today}</p>
          </div>
          <div className="relative">
            <button className="p-3 bg-white rounded-2xl shadow-lg shadow-slate-200 text-slate-600 active:scale-90 transition-transform">
              <Bell size={20} />
            </button>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
          </div>
        </header>

        {/* کارت هویت و وضعیت لایسنس کارفرما */}
        <div className="mb-10 bg-slate-900/95 text-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-950/20 border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-600/10 rounded-r-[2.5rem] skew-x-12 translate-x-12 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                <Building2 size={24} />
              </div>
              <div className="text-right">
                <h2 className="text-lg font-black text-white">{companyName}</h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                  <span>مدیریت: {ownerName}</span>
                  <span className="bg-slate-800 w-1.5 h-1.5 rounded-full"></span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Calendar size={12} />
                    پایان لایسنس: {expiryDate}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl block">وضعیت حساب: فعال ✅</span>
              {getTierBadge()}
            </div>
          </div>
        </div>
        
        {deferredPrompt && (
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] p-5 flex items-center justify-between text-white shadow-xl shadow-blue-500/20">
              <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-xl"><Download size={22} /></div>
                  <div>
                      <h3 className="font-black text-sm">نصب اپلیکیشن نکس‌وین</h3>
                      <p className="text-[10px] text-blue-100 opacity-80">دسترسی سریع و تمام‌صفحه به سیستم</p>
                  </div>
              </div>
              <button onClick={handleInstallClick} className="bg-white text-blue-600 px-5 py-2.5 rounded-xl text-[10px] font-black shadow-lg active:scale-95 transition-transform">نصب کنید</button>
          </div>
        )}

        {/* دکمه اصلی: تعریف پروژه جدید - دسترسی عمومی برای همه برنامه‌ها */}
        <div 
          onClick={() => navigate('/project-setup')}
          className="w-full h-56 md:h-60 bg-slate-900 rounded-[3rem] relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,31,63,0.3)] mb-10 cursor-pointer group active:scale-[0.97] transition-all duration-500"
        >
          <div className="absolute inset-0 z-0">
            <img 
              src={newProjectBg} 
              alt="Modern Window Architecture" 
              className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-transparent"></div>
          </div>

          <div className={`relative z-10 h-full p-8 md:px-16 flex flex-col md:flex-row-reverse md:items-center justify-between items-start ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
            <div className="w-full md:w-auto">
              <h2 className="text-white text-3xl md:text-4xl font-black mb-1.5 leading-none drop-shadow-md">{t('new_project')}</h2>
              <p className="text-blue-200/70 text-[12px] md:text-sm font-bold tracking-tight">{t('new_project_desc')}</p>
            </div>
            
            <div className="p-4 md:p-5 bg-white/10 backdrop-blur-2xl w-fit rounded-[1.5rem] md:rounded-[2rem] text-white border border-white/20 shadow-[0_8px_32px_0_rgba(255,255,255,0.1)] group-hover:bg-blue-600 group-hover:border-blue-500 group-hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all duration-500">
              <Plus size={28} className="md:w-8 md:h-8" strokeWidth={2} />
            </div>
          </div>

          <div className="absolute -left-10 -top-10 w-48 h-48 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-400/30 transition-all duration-700"></div>
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none"></div>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-slate-900 font-black text-sm uppercase tracking-widest">پنل مدیریت و ابزارها</h3>
        </div>
        
        {/* چیدمان ابزارهای مدیریتی و فنی با افکت قفل لایسنس */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* کارت شماره ۱: کنترل تولید کارگاه (ویژه کارگاهی و صنعتی) */}
          <div 
            onClick={() => handleCardClick('/production-control', hasProductionAccess, 'کنترل تولید کارگاه', 'silver')} 
            className={`col-span-2 lg:col-span-4 bg-gradient-to-r ${
              hasProductionAccess ? 'from-blue-600 to-blue-700' : 'from-slate-700 to-slate-800'
            } rounded-[2rem] flex items-center justify-between px-8 py-7 active:scale-[0.98] transition-all duration-300 cursor-pointer text-white shadow-xl relative overflow-hidden group`}
          >
            <div className="flex items-center gap-5 relative z-10">
              <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                <Activity size={26} />
              </div>
              <div className="text-right">
                <span className="font-black text-base md:text-xl block mb-0.5 flex items-center gap-2">
                  کنترل تولید کارگاه
                  {!hasProductionAccess && <Lock size={16} className="text-yellow-400 fill-yellow-400" />}
                </span>
                <span className="text-[10px] md:text-xs text-blue-100 font-medium opacity-70">
                  {hasProductionAccess ? 'مدیریت خط تولید و کسر از انبار' : 'قفل شده 🔒 مخصوص اشتراک کارگاهی و صنعتی'}
                </span>
              </div>
            </div>
            
            {hasProductionAccess ? (
              <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest relative z-10 border border-white/10 animate-pulse">Live</div>
            ) : (
              <span className="px-3 py-1 bg-yellow-400 text-slate-950 font-black text-[9px] rounded-lg tracking-wide uppercase">Upgrade</span>
            )}
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-white/5 skew-x-[25deg] translate-x-12 group-hover:translate-x-0 transition-transform duration-700"></div>
          </div>

          {/* کارت شماره ۲: مدیریت مالی (فقط ویژه صنعتی طلایی) */}
          <GlassCard 
            onClick={() => handleCardClick('/financial-mgmt', hasFinancialAccess, 'مدیریت مالی', 'gold')} 
            className={`col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100 relative ${
              !hasFinancialAccess ? 'opacity-70 bg-slate-100/50' : ''
            }`}
          >
            <div className={`p-4 ${hasFinancialAccess ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-200 text-slate-400 border-slate-300'} rounded-2xl mb-1 shadow-sm border`}>
              <Banknote size={26} />
            </div>
            <span className="font-black text-xs md:text-sm text-slate-800 flex items-center gap-1">
              مدیریت مالی
              {!hasFinancialAccess && <Lock size={12} className="text-amber-500" />}
            </span>
            {!hasFinancialAccess && (
              <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">فقط طلایی</span>
            )}
          </GlassCard>

          {/* کارت شماره ۳: لیست پروژه‌ها (همگانی) */}
          <GlassCard onClick={() => navigate('/projects')} className="col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100">
            <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl mb-1 shadow-sm border border-teal-100">
              <FolderOpen size={26} />
            </div>
            <span className="font-black text-xs md:text-sm text-slate-800">لیست پروژه‌ها</span>
          </GlassCard>

          {/* کارت شماره ۴: قیمت پروفیل (ویژه کارگاهی و طلایی) */}
          <GlassCard 
            onClick={() => handleCardClick('/profiles', hasProfilesAccess, 'قیمت پروفیل', 'silver')} 
            className={`col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100 relative ${
              !hasProfilesAccess ? 'opacity-70 bg-slate-100/50' : ''
            }`}
          >
            <div className={`p-4 ${hasProfilesAccess ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-200 text-slate-400 border-slate-300'} rounded-2xl mb-1 shadow-sm border`}>
              <Layers size={26} />
            </div>
            <span className="font-black text-xs md:text-sm text-slate-800 flex items-center gap-1">
              قیمت پروفیل
              {!hasProfilesAccess && <Lock size={12} className="text-amber-500" />}
            </span>
            {!hasProfilesAccess && (
              <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">ویژه کارگاه</span>
            )}
          </GlassCard>

          {/* کارت شماره ۵: قیمت شیشه و یراق (ویژه کارگاهی و طلایی) */}
          <GlassCard 
            onClick={() => handleCardClick('/glass-hardware', hasGlassHardwareAccess, 'شیشه و یراق', 'silver')} 
            className={`col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100 relative ${
              !hasGlassHardwareAccess ? 'opacity-70 bg-slate-100/50' : ''
            }`}
          >
            <div className={`p-4 ${hasGlassHardwareAccess ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-200 text-slate-400 border-slate-300'} rounded-2xl mb-1 shadow-sm border`}>
              <Hammer size={26} />
            </div>
            <span className="font-black text-xs md:text-sm text-slate-800 flex items-center gap-1">
              شیشه و یراق
              {!hasGlassHardwareAccess && <Lock size={12} className="text-amber-500" />}
            </span>
            {!hasGlassHardwareAccess && (
              <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">ویژه کارگاه</span>
            )}
          </GlassCard>

          {/* کارت شماره ۶: بهینه برش پروفیل (ویژه کارگاهی و صنعتی) */}
          <GlassCard 
            onClick={() => handleCardClick('/optimization/profile', hasOptimizationAccess, 'بهینه برش پروفیل', 'silver')} 
            className={`col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100 relative ${
              !hasOptimizationAccess ? 'opacity-70 bg-slate-100/50' : ''
            }`}
          >
            <div className={`p-4 ${hasOptimizationAccess ? 'bg-violet-50 text-violet-600 border-violet-100' : 'bg-slate-200 text-slate-400 border-slate-300'} rounded-2xl mb-1 shadow-sm border`}>
              <Scissors size={26} />
            </div>
            <span className="font-black text-xs md:text-sm text-slate-800 text-center leading-tight flex items-center gap-1 justify-center">
              بهینه برش پروفیل
              {!hasOptimizationAccess && <Lock size={12} className="text-amber-500" />}
            </span>
            {!hasOptimizationAccess && (
              <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">ویژه کارگاه</span>
            )}
          </GlassCard>

          {/* کارت شماره ۷: بهینه برش شیشه (ویژه کارگاهی و صنعتی) */}
          <GlassCard 
            onClick={() => handleCardClick('/optimization/glass', hasOptimizationAccess, 'بهینه برش شیشه', 'silver')} 
            className={`col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100 relative ${
              !hasOptimizationAccess ? 'opacity-70 bg-slate-100/50' : ''
            }`}
          >
            <div className={`p-4 ${hasOptimizationAccess ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-slate-200 text-slate-400 border-slate-300'} rounded-2xl mb-1 shadow-sm border`}>
              <Layout size={26} />
            </div>
            <span className="font-black text-xs md:text-sm text-slate-800 text-center leading-tight flex items-center gap-1 justify-center">
              بهینه برش شیشه
              {!hasOptimizationAccess && <Lock size={12} className="text-amber-500" />}
            </span>
            {!hasOptimizationAccess && (
              <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">ویژه کارگاه</span>
            )}
          </GlassCard>

          {/* کارت شماره ۸: انبارگردانی (ویژه کارگاهی و صنعتی) */}
          <GlassCard 
            onClick={() => handleCardClick('/inventory', hasInventoryAccess, 'انبارگردانی و مدیریت انبار', 'silver')} 
            className={`col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100 relative ${
              !hasInventoryAccess ? 'opacity-70 bg-slate-100/50' : ''
            }`}
          >
            <div className={`p-4 ${hasInventoryAccess ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-200 text-slate-400 border-slate-300'} rounded-2xl mb-1 shadow-sm border`}>
              <Package size={26} />
            </div>
            <span className="font-black text-xs md:text-sm text-slate-800 text-center leading-tight flex items-center gap-1 justify-center">
              انبارگردانی
              {!hasInventoryAccess && <Lock size={12} className="text-amber-500" />}
            </span>
            {!hasInventoryAccess && (
              <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">ویژه کارگاه</span>
            )}
          </GlassCard>

          {/* کارت شماره ۹: تنظیمات سیستم (همگانی) */}
          <GlassCard onClick={() => navigate('/settings')} className="col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100">
            <div className="p-4 bg-slate-50 text-slate-500 rounded-2xl mb-1 shadow-sm border border-slate-150">
              <SettingsIcon size={26} />
            </div>
            <span className="font-black text-xs md:text-sm text-slate-800 text-center leading-tight">تنظیمات سیستم</span>
          </GlassCard>
        </div>

        {/* وضعیت کلی اتصال سیستم */}
        <div className="bg-white/70 backdrop-blur-md rounded-[1.5rem] p-5 border border-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-200"></div>
            <p className="text-xs font-black text-slate-600">{t('system_status')}</p>
          </div>
          <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-4 py-1.5 rounded-xl uppercase tracking-wider">{t('online')}</span>
        </div>
      </div>

      {/* مدال سینمایی و شیشه ای ارتقای اشتراک (Upgrade Modal Drawer) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-md w-full text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* جلوه های تزیینی پس زمینه مدال */}
            <div className="absolute -right-12 -top-12 w-32 h-32 bg-amber-500/20 rounded-full blur-[50px] pointer-events-none"></div>
            <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none"></div>

            <div className="text-center relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-500/20 border border-amber-500 text-amber-400 rounded-full flex items-center justify-center mb-5 animate-bounce">
                <Lock size={28} />
              </div>

              <h3 className="text-xl font-black text-white mb-2">دسترسی به بخش قفل شده</h3>
              <p className="text-sm text-slate-300 font-bold mb-4 bg-slate-800/60 px-4 py-1.5 rounded-2xl border border-slate-700/50">
                بخش: {lockedFeatureName}
              </p>

              <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800/80 mb-6 text-right w-full">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black text-xs text-amber-400 mb-1">دلیل محدودیت دسترسی:</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      این ماژول نیازمند لایسنس فعال سطح <span className="font-black text-yellow-400">{requiredTierName}</span> نکس‌وین می‌باشد. 
                      اشتراک فعلی مجموعه شما در حال حاضر سطح <span className="font-black text-blue-400">
                        {userTier === 'bronze' ? 'فروشگاهی (برنزی)' : userTier === 'silver' ? 'کارگاهی (نقره‌ای)' : 'تست'}
                      </span> است.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mb-6 text-center leading-normal">
                جهت ارتقای آنی پلن، فعالسازی خط تولید یا مدیریت انبار کارگاه با واحد کنترل لایسنس و پشتیبانی مرکزی نکس‌وین تماس بگیرید.
              </p>

              <div className="flex flex-col gap-2.5 w-full">
                <a 
                  href="tel:09193819356" 
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-blue-500/20 border-none cursor-pointer"
                >
                  <CreditCard size={16} />
                  تماس مستقیم با واحد لایسنس و ارتقا
                </a>
                
                <button 
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs transition-colors border border-slate-700 cursor-pointer"
                >
                  متوجه شدم، بازگشت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

