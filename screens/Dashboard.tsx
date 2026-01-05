import React, { useState, useEffect } from 'react';
import { Plus, Settings as SettingsIcon, Layers, Bell, Hammer, FolderOpen, Download, Banknote, Scissors, Package, Activity } from 'lucide-react';
import { GlassCard } from '../components/UIComponents';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const today = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'fa-IR', { dateStyle: 'full' }).format(new Date());

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
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

  return (
    <div className="min-h-screen pb-24 px-6 pt-12 bg-[#f8fafc] font-['Vazirmatn']">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-10">
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

        {/* Primary Action: New Project - Height and layout optimized for Desktop Refinement */}
        <div 
          onClick={() => navigate('/project-setup')}
          className="w-full h-56 md:h-60 bg-slate-900 rounded-[3rem] relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,31,63,0.3)] mb-10 cursor-pointer group active:scale-[0.97] transition-all duration-500"
        >
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80" 
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
        
        {/* Management Grid - Optimized to 4 columns on Desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div onClick={() => navigate('/production-control')} className="col-span-2 lg:col-span-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-[2rem] flex items-center justify-between px-8 py-7 active:scale-[0.98] transition-transform cursor-pointer text-white shadow-xl shadow-blue-500/30 relative overflow-hidden group">
            <div className="flex items-center gap-5 relative z-10">
              <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner"><Activity size={26} /></div>
              <div>
                <span className="font-black text-base md:text-xl block mb-0.5">کنترل تولید کارگاه</span>
                <span className="text-[10px] md:text-xs text-blue-100 font-medium opacity-70">مدیریت خط تولید و کسر از انبار</span>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest relative z-10 border border-white/10">Live</div>
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-white/5 skew-x-[25deg] translate-x-12 group-hover:translate-x-0 transition-transform duration-700"></div>
          </div>

          <GlassCard onClick={() => navigate('/financial-mgmt')} className="col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl mb-1 shadow-sm border border-rose-100">
              <Banknote size={26} />
            </div>
            <span className="font-black text-xs md:text-sm text-slate-800">مدیریت مالی</span>
          </GlassCard>

          <GlassCard onClick={() => navigate('/projects')} className="col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100">
            <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl mb-1 shadow-sm border border-teal-100"><FolderOpen size={26} /></div>
            <span className="font-black text-xs md:text-sm text-slate-800">لیست پروژه‌ها</span>
          </GlassCard>

          <GlassCard onClick={() => navigate('/profiles')} className="col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-1 shadow-sm border border-indigo-100"><Layers size={26} /></div>
            <span className="font-black text-xs md:text-sm text-slate-800">قیمت پروفیل</span>
          </GlassCard>

          <GlassCard onClick={() => navigate('/glass-hardware')} className="col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100">
            <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl mb-1 shadow-sm border border-orange-100"><Hammer size={26} /></div>
            <span className="font-black text-xs md:text-sm text-slate-800">شیشه و یراق</span>
          </GlassCard>

          <GlassCard onClick={() => navigate('/optimization')} className="col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100">
            <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl mb-1 shadow-sm border border-violet-100"><Scissors size={26} /></div>
            <span className="font-black text-xs md:text-sm text-slate-800">بهینه‌سازی برش</span>
          </GlassCard>

          <GlassCard onClick={() => navigate('/inventory')} className="col-span-1 flex flex-col items-center justify-center gap-3 py-6 md:py-8 active:scale-95 transition-transform cursor-pointer border-slate-100">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl mb-1 shadow-sm border border-emerald-100"><Package size={26} /></div>
            <span className="font-black text-xs md:text-sm text-slate-800">انبارگردانی</span>
          </GlassCard>

          <div onClick={() => navigate('/settings')} className="col-span-2 lg:col-span-2 flex items-center justify-between px-7 py-5 active:scale-[0.98] transition-transform cursor-pointer bg-white border border-slate-100 rounded-[1.5rem] shadow-sm hover:border-blue-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-50 text-slate-500 rounded-xl"><SettingsIcon size={20} /></div>
              <span className="font-black text-slate-800 text-sm">تنظیمات نرم‌افزار</span>
            </div>
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Version 1.2.0</div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md rounded-[1.5rem] p-5 border border-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-200"></div>
            <p className="text-xs font-black text-slate-600">{t('system_status')}</p>
          </div>
          <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-4 py-1.5 rounded-xl uppercase tracking-wider">{t('online')}</span>
        </div>
      </div>
    </div>
  );
};
