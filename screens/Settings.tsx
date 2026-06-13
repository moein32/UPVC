
import React, { useState, useEffect } from 'react';
import { ArrowRight, Moon, Globe, FileText, Database, Percent, Languages, Building2, MapPin, Phone, MessageSquare, Layout, CheckCircle2, LogOut, Sparkles, ShieldCheck, Award, Zap, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toPersianDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { AppSettings, InvoiceLayoutType, AppUser } from '../types';
import { InputField } from '../components/UIComponents';

const SettingItem = ({ icon: Icon, label, value, children, className }: any) => (
  <div className={`flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 mb-3 ${className}`}>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
        <Icon size={18} />
      </div>
      <span className="font-medium text-slate-700">{label}</span>
    </div>
    <div className="text-slate-400 text-sm flex items-center gap-2 flex-1 justify-end">
      {children || value}
    </div>
  </div>
);

const LayoutOption = ({ type, label, description, isSelected, onClick }: { type: InvoiceLayoutType, label: string, description: string, isSelected: boolean, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
    >
        <div className="flex justify-between items-start mb-2">
            <h4 className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{label}</h4>
            {isSelected && <CheckCircle2 size={18} className="text-blue-600" />}
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">{description}</p>
        <div className="mt-3 h-12 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200/50 overflow-hidden">
             {type === 'standard' && <div className="w-full flex flex-col gap-1 p-2"><div className="h-1 bg-slate-300 w-1/2"></div><div className="h-4 bg-slate-200 w-full"></div></div>}
             {type === 'modern' && <div className="w-full flex flex-col items-center gap-1 p-2"><div className="h-2 bg-blue-400 w-1/3"></div><div className="h-2 bg-slate-200 w-full"></div><div className="h-2 bg-slate-200 w-full"></div></div>}
             {type === 'technical' && <div className="w-full grid grid-cols-2 gap-1 p-2"><div className="h-6 bg-slate-200 w-full"></div><div className="h-6 bg-slate-200 w-full"></div></div>}
             {type === 'classic' && <div className="w-full border-2 border-slate-300 m-1 h-8"></div>}
        </div>
    </div>
);

export const Settings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // لود اطلاعات مشترک کارگاه جاری
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTargetTier, setUpgradeTargetTier] = useState<'silver' | 'gold'>('gold');
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  useEffect(() => {
    setSettings(pricingStore.getSettings());

    const userStr = localStorage.getItem('nexwin_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user state in Settings:', e);
      }
    }
  }, []);

  const handleApplyUpgrade = (selectedTier: 'silver' | 'gold') => {
    if (!currentUser) return;

    const updatedUser: AppUser = {
      ...currentUser,
      tier: selectedTier,
      max_devices: selectedTier === 'gold' ? 5 : 3,
      is_trial: false, // در صورت ارتقای آنلاین، حساب از تریال خارج و تجاری ۳ ساله دائم می‌شود
      expiry_date: '۱۴۰۹/۰۲/۱۵',
      total_paid: currentUser.total_paid + (selectedTier === 'gold' ? 35000000 : 15000000)
    };

    localStorage.setItem('nexwin_user', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setUpgradeSuccess(true);

    setTimeout(() => {
      setUpgradeSuccess(false);
      setShowUpgradeModal(false);
    }, 2000);
  };

  const save = (newSettings: AppSettings) => {
    setSettings(newSettings);
    pricingStore.saveSettings(newSettings);
  };

  const handleToggleDarkMode = () => {
    if (!settings) return;
    save({ ...settings, darkMode: !settings.darkMode });
  };

  const updateInvoice = (field: keyof AppSettings['invoice'], value: any) => {
    if (!settings) return;
    save({
        ...settings,
        invoice: { ...settings.invoice, [field]: value }
    });
  };

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-10 pb-20">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 mx-4 bg-white rounded-xl shadow-sm text-slate-700">
          <ArrowRight size={20} className={i18n.language === 'en' ? 'rotate-180' : ''} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">{t('settings')}</h1>
      </div>

      {/* بخش جدید مدیریت حساب کاربری و نوع اشتراک کارگاه */}
      {currentUser && (
        <div className="mb-8 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-3xl p-6 text-right text-white border border-indigo-500/20 shadow-xl relative overflow-hidden">
          {/* هاله‌های نوری تزیینی */}
          <div className="absolute top-[-30%] right-[-20%] w-72 h-72 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-[-35%] left-[-20%] w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none"></div>

          <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
            <h3 className="text-sm font-black text-indigo-300 flex items-center gap-2">
              <UserCheck size={18} />
              <span>پروفایل و مدیریت اشتراک کارگاه</span>
            </h3>
            {currentUser.is_trial ? (
              <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-2.5 py-1 rounded-full animate-pulse">
                حساب آزمایشی فعال (۷ روزه) ⏳
              </span>
            ) : (
              <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-full">
                لایسنس تجاری فعال دائم ✔️
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-5">
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-slate-400">نام کارگاه:</span>
              <span className="font-extrabold text-slate-100">{currentUser.company_name}</span>
            </div>
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-slate-400">کارفرما:</span>
              <span className="font-extrabold text-slate-100">{currentUser.owner_name}</span>
            </div>
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-slate-400">شماره موبایل فعال:</span>
              <span className="font-mono text-slate-200">{currentUser.phone_number}</span>
            </div>
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="text-slate-400">شناسه اختصاصی لایسنس:</span>
              <span className="font-mono text-yellow-400 font-black">{currentUser.id}</span>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-300">سطح اشتراک شما:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                  currentUser.tier === 'gold' 
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white' 
                    : currentUser.tier === 'silver'
                    ? 'bg-gradient-to-r from-slate-400 to-slate-500 text-white'
                    : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
                }`}>
                  {currentUser.tier === 'gold' ? 'طلایی (GOLD - حداکثر توان)' : currentUser.tier === 'silver' ? 'نقره‌ای (SILVER - استاندارد)' : 'برنزی (BRONZE - پایه)'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {currentUser.tier === 'gold' 
                  ? 'شما به تمامی کدهای بهینه‌ساز برش شیشه، سیستم محاسبه پروفیل، کتیبه و درب‌ها دسترسی نامحدود دارید.'
                  : currentUser.tier === 'silver'
                  ? 'دسترسی به برش شیشه و بهینه‌ساز خط فعال است. فاقد محاسبات ترکیبی کتیبه فوق پیشرفته.'
                  : 'اشتراک پایه بازار. فاقد دسترسی به نقشه چیدمان شیشه و خروجی زوایای دستگاه‌های CNC.'
                }
              </p>
            </div>

            {/* در صورتی که اشتراک نقره‌ای یا برنزی است، دکمه ارتقا نمایش داده شود */}
            {(currentUser.tier === 'bronze' || currentUser.tier === 'silver') && (
              <button
                onClick={() => {
                  setUpgradeTargetTier(currentUser.tier === 'bronze' ? 'silver' : 'gold');
                  setShowUpgradeModal(true);
                  setUpgradeSuccess(false);
                }}
                className="px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer border-none transition-all duration-150"
              >
                <Zap size={14} className="animate-bounce" />
                <span>ارتقای آنلاین لایسنس کارگاه 🚀</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* مودال ارتقای آنلاین حساب کاربری / لایسنس */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUpgradeModal(false)}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4 font-['Vazirmatn']"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 max-w-md w-full text-right text-white space-y-6 shadow-2xl relative"
            >
              {upgradeSuccess ? (
                <div className="text-center py-12 space-y-4">
                  <div className="inline-flex p-5 bg-emerald-500/20 text-emerald-400 rounded-full shadow-[0_0_50px_rgba(16,185,129,0.3)] border border-emerald-500/30 animate-bounce">
                    <CheckCircle2 size={48} />
                  </div>
                  <h3 className="text-xl font-black text-emerald-400">ارتقای موفقیت‌آمیز لایسنس 🎉</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-bold">
                    حساب کاربری شما با موفقیت به سطح تجاری 
                    <span className="text-yellow-400 font-extrabold mx-1">
                      {upgradeTargetTier === 'gold' ? 'طلایی (GOLD)' : 'نقره‌ای (SILVER)'}
                    </span>
                     ارتقا یافت و دسترسی نامحدود به ابزارها فعال گردید.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-indigo-500/20 mx-auto rounded-2xl flex items-center justify-center text-indigo-400">
                      <Zap size={22} className="animate-pulse" />
                    </div>
                    <h3 className="text-base font-black">ارتقا و افزایش نامحدود لایسنس</h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-bold">ارتقای حساب به ابزارهای بهینه‌ساز چیدمان شیشه و خروجی‌های خط تولید نکس‌وین</p>
                  </div>

                  <div className="space-y-3">
                    {/* انتخاب سطح مقصد ارتقا */}
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => setUpgradeTargetTier('silver')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 text-center ${
                          upgradeTargetTier === 'silver'
                            ? 'border-slate-300 bg-white/10 text-white'
                            : 'border-slate-800 bg-slate-950/40 text-slate-400'
                        }`}
                      >
                        <ShieldCheck size={18} className="text-slate-300" />
                        <span className="text-xs font-bold">نقره‌ای (Silver)</span>
                        <span className="text-[8px] opacity-70 font-bold">بهینه‌برش خط تولید</span>
                      </div>

                      <div
                        onClick={() => setUpgradeTargetTier('gold')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 text-center ${
                          upgradeTargetTier === 'gold'
                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
                            : 'border-slate-800 bg-slate-950/40 text-slate-400'
                        }`}
                      >
                        <Sparkles size={18} className="text-yellow-400" />
                        <span className="text-xs font-bold">طلایی (Gold)</span>
                        <span className="text-[8px] opacity-70 font-bold">نقشه شیشه + تمام قابلیت‌ها</span>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 space-y-2.5 text-xs text-right">
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <span className="text-slate-400">سطح مبدا:</span>
                        <span className="font-bold text-orange-400">اشتراک {currentUser?.tier === 'bronze' ? 'برنزی' : 'نقره‌ای'} فعلی</span>
                      </div>
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <span className="text-slate-400">سطح مقصد:</span>
                        <span className="font-bold text-emerald-400">
                          {upgradeTargetTier === 'gold' ? 'طلایی تجاری دائم' : 'نقره‌ای تجاری دائم'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">نوع لایسنس ثبتی:</span>
                        <span className="font-extrabold text-white">بدون منقضی - چند کاربره</span>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[9px] text-amber-300 leading-normal text-right">
                      💡 در Sandbox نکس‌وین؛ با فشردن دکمه زیر لایسنس کاربری شما به طور خودکار به سطح تجاری ارتقا می‌یابد تا بتوانید فوراً قابلیت‌های بهینه‌سازی پیشرفته را تست کنید.
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyUpgrade(upgradeTargetTier)}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition-all border-none cursor-pointer"
                    >
                      تایید ارتقا و فعالسازی آنی ⚡
                    </button>
                    <button
                      type="button"
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
                      onClick={() => setShowUpgradeModal(false)}
                    >
                      بستن
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">{t('general')}</h3>
        <SettingItem icon={Languages} label={t('language')}>
             <select 
               value={i18n.language} 
               onChange={changeLanguage}
               className="bg-slate-50 border-none outline-none text-sm font-bold text-slate-700"
             >
               <option value="fa">فارسی</option>
               <option value="en">English</option>
               <option value="ar">العربية</option>
             </select>
        </SettingItem>
        <SettingItem icon={Moon} label={t('dark_mode')}>
             <button 
                onClick={handleToggleDarkMode}
                className={`w-10 h-6 rounded-full relative transition-colors ${settings.darkMode ? 'bg-blue-600' : 'bg-slate-200'}`}
             >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${settings.darkMode ? 'left-1' : 'right-1'}`}></div>
             </button>
        </SettingItem>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">طراحی خروجی فاکتور (PDF)</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
            <LayoutOption 
                type="standard" 
                label="استاندارد" 
                description="طرح رسمی و شرکتی لومینا با رنگ‌های سازمانی."
                isSelected={settings.invoice.layoutType === 'standard'}
                onClick={() => updateInvoice('layoutType', 'standard')}
            />
            <LayoutOption 
                type="modern" 
                label="مدرن" 
                description="بدون کادر، تایپوگرافی برجسته و مینیمال."
                isSelected={settings.invoice.layoutType === 'modern'}
                onClick={() => updateInvoice('layoutType', 'modern')}
            />
            <LayoutOption 
                type="technical" 
                label="فنی" 
                description="تاکید بر ابعاد، جزییات متریال و گرید مهندسی."
                isSelected={settings.invoice.layoutType === 'technical'}
                onClick={() => updateInvoice('layoutType', 'technical')}
            />
            <LayoutOption 
                type="classic" 
                label="کلاسیک" 
                description="طرح سنتی بازار با خط‌کشی‌های مشخص."
                isSelected={settings.invoice.layoutType === 'classic'}
                onClick={() => updateInvoice('layoutType', 'classic')}
            />
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">اطلاعات سربرگ فاکتور</h3>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-4">
            <InputField 
                label="نام مجموعه / فروشگاه" 
                value={settings.invoice.companyName}
                onChange={(e: any) => updateInvoice('companyName', e.target.value)}
                suffix={<Building2 size={16} />}
            />
             <InputField 
                label="آدرس" 
                value={settings.invoice.companyAddress}
                onChange={(e: any) => updateInvoice('companyAddress', e.target.value)}
                suffix={<MapPin size={16} />}
            />
             <InputField 
                label="تلفن تماس" 
                value={settings.invoice.companyPhone}
                onChange={(e: any) => updateInvoice('companyPhone', e.target.value)}
                suffix={<Phone size={16} />}
            />
            <InputField 
                label="پیوست انتهای فاکتور" 
                value={settings.invoice.footerNote}
                onChange={(e: any) => updateInvoice('footerNote', e.target.value)}
                suffix={<MessageSquare size={16} />}
            />
        </div>
      </div>

      <div className="mt-10 bg-red-50/50 rounded-2xl p-4 border border-red-100 flex items-center justify-between">
        <div className="text-right">
          <h4 className="font-black text-xs text-red-800">خروج از پورتال لایسنس</h4>
          <p className="text-[10px] text-red-500 mt-1">حساب کارگاه از مرورگر پاک شده و به صفحه ورود هدایت می‌شوید.</p>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem('nexwin_user');
            window.location.href = '#/login';
            window.location.reload();
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-200 transition-all flex items-center gap-2 border-none cursor-pointer"
        >
          <LogOut size={14} />
          خروج از سیستم
        </button>
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-400 text-sm">{t('version')} {toPersianDigits("1.2.0")} {t('app_name')}</p>
      </div>
    </div>
  );
};
