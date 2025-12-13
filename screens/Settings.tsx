import React, { useState, useEffect } from 'react';
import { ArrowRight, Moon, Globe, FileText, Database, Percent, Languages } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toPersianDigits } from '../utils/formatting';
import { pricingStore, AppSettings } from '../services/pricingStore';

const SettingItem = ({ icon: Icon, label, value, children }: any) => (
  <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 mb-3">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
        <Icon size={18} />
      </div>
      <span className="font-medium text-slate-700">{label}</span>
    </div>
    <div className="text-slate-400 text-sm flex items-center gap-2">
      {children || value}
    </div>
  </div>
);

export const Settings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>({ darkMode: false, priceCoefficient: 0, currency: 'تومان' });

  useEffect(() => {
    setSettings(pricingStore.getSettings());
  }, []);

  const handleToggleDarkMode = () => {
    const newSettings = { ...settings, darkMode: !settings.darkMode };
    setSettings(newSettings);
    pricingStore.saveSettings(newSettings);
  };

  const handleCoefficientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const newSettings = { ...settings, priceCoefficient: val };
    setSettings(newSettings);
    pricingStore.saveSettings(newSettings);
  };

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-10">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 mx-4 bg-white rounded-xl shadow-sm text-slate-700">
          <ArrowRight size={20} className={i18n.language === 'en' ? 'rotate-180' : ''} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">{t('settings')}</h1>
      </div>

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
        <SettingItem icon={Globe} label={t('currency')} value={t('toman')} />
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">{t('calculations')}</h3>
        <SettingItem icon={Percent} label={t('profit_coefficient')}>
             <div className="flex items-center gap-2">
                 <input 
                    type="number" 
                    value={settings.priceCoefficient}
                    onChange={handleCoefficientChange}
                    className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold text-slate-800 outline-none focus:border-blue-500"
                 />
                 <span>%</span>
             </div>
        </SettingItem>
        <SettingItem icon={Database} label={t('coefficient_version')} value={`1404 ${t('standard', {defaultValue: ''})}`} />
        <SettingItem icon={FileText} label={t('output_format')} value="PDF" />
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-400 text-sm">{t('version')} {toPersianDigits("1.1.0")} {t('app_name')}</p>
        <p className="text-slate-300 text-xs mt-1">{t('year')} {toPersianDigits("1404")}</p>
      </div>
    </div>
  );
};