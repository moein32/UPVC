import React, { useState, useEffect } from 'react';
import { Plus, List, Settings as SettingsIcon, Layers, Bell, Hammer, FolderOpen, Download } from 'lucide-react';
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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen pb-24 px-6 pt-12">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('app_name')}</h1>
          <p className="text-slate-500 text-sm font-medium">{today}</p>
        </div>
        <div className="relative">
          <button className="p-3 bg-white rounded-full shadow-lg shadow-slate-200 text-slate-600">
            <Bell size={20} />
          </button>
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-50"></span>
        </div>
      </header>
      
      {/* PWA Install Button - Only shows if installable */}
      {deferredPrompt && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg shadow-blue-500/30">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <Download size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-sm">نصب اپلیکیشن</h3>
                    <p className="text-xs text-blue-100">دسترسی سریع و تمام صفحه</p>
                </div>
            </div>
            <button 
                onClick={handleInstallClick}
                className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-transform"
            >
                نصب کنید
            </button>
        </div>
      )}

      {/* Hero Action */}
      <div 
        onClick={() => navigate('/project-setup')}
        className="w-full h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 relative overflow-hidden shadow-2xl shadow-slate-900/20 mb-10 cursor-pointer group"
      >
        <div className={`relative z-10 h-full flex flex-col justify-between items-start ${i18n.language === 'en' ? 'text-left' : 'text-right'}`}>
          <div className="p-3 bg-white/10 backdrop-blur-md w-fit rounded-xl text-white">
            <Plus size={24} />
          </div>
          <div className="w-full">
            <h2 className="text-white text-xl font-bold mb-1">{t('new_project')}</h2>
            <p className="text-slate-400 text-sm">{t('new_project_desc')}</p>
          </div>
        </div>
        <div className="absolute left-[-20px] top-[-20px] w-40 h-40 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all"></div>
        <img 
          src="https://images.unsplash.com/photo-1503708928676-1cb796a0891e?w=400&q=80" 
          alt="Window" 
          className="absolute left-[-40px] bottom-[-40px] w-48 h-48 object-cover opacity-20 rotate-12 mix-blend-overlay rounded-full" 
        />
      </div>

      <h3 className="text-slate-800 font-bold mb-4 text-lg">{t('management_section')}</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <GlassCard onClick={() => navigate('/profiles')} className="flex flex-col items-center justify-center text-center gap-3 py-6 active:scale-95 transition-transform cursor-pointer">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl mb-1 shadow-sm">
            <Layers size={28} />
          </div>
          <span className="font-bold text-slate-700 text-sm">{t('profile_price')}</span>
        </GlassCard>

        <GlassCard onClick={() => navigate('/glass-hardware')} className="flex flex-col items-center justify-center text-center gap-3 py-6 active:scale-95 transition-transform cursor-pointer">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl mb-1 shadow-sm">
            <Hammer size={28} />
          </div>
          <span className="font-bold text-slate-700 text-sm">{t('glass_hardware')}</span>
        </GlassCard>

        <GlassCard onClick={() => navigate('/projects')} className="flex flex-col items-center justify-center text-center gap-3 py-6 active:scale-95 transition-transform cursor-pointer">
          <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl mb-1 shadow-sm">
            <FolderOpen size={28} />
          </div>
          <span className="font-bold text-slate-700 text-sm">{t('projects')}</span>
        </GlassCard>

        <GlassCard onClick={() => navigate('/settings')} className="flex flex-col items-center justify-center text-center gap-3 py-6 active:scale-95 transition-transform cursor-pointer">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl mb-1 shadow-sm">
            <SettingsIcon size={28} />
          </div>
          <span className="font-bold text-slate-700 text-sm">{t('settings')}</span>
        </GlassCard>
      </div>

      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/60 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <p className="text-sm font-medium text-slate-600">{t('system_status')}</p>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{t('online')}</span>
      </div>
    </div>
  );
};