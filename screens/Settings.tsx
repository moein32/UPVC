import React, { useState, useEffect } from 'react';
import { ArrowRight, Moon, Globe, FileText, Database, Percent, Languages, Building2, MapPin, Phone, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toPersianDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { AppSettings } from '../types';
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

export const Settings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    setSettings(pricingStore.getSettings());
  }, []);

  const save = (newSettings: AppSettings) => {
    setSettings(newSettings);
    pricingStore.saveSettings(newSettings);
  };

  const handleToggleDarkMode = () => {
    if (!settings) return;
    save({ ...settings, darkMode: !settings.darkMode });
  };

  const handleCoefficientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    save({ ...settings, priceCoefficient: Number(e.target.value) });
  };
  
  const updateInvoice = (field: keyof AppSettings['invoice'], value: string) => {
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
                label="پیوشت انتهای فاکتور" 
                value={settings.invoice.footerNote}
                onChange={(e: any) => updateInvoice('footerNote', e.target.value)}
                suffix={<MessageSquare size={16} />}
            />
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-400 text-sm">{t('version')} {toPersianDigits("1.1.0")} {t('app_name')}</p>
        <p className="text-slate-300 text-xs mt-1">{t('year')} {toPersianDigits("1404")}</p>
      </div>
    </div>
  );
};