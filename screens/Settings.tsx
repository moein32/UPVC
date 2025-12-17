
import React, { useState, useEffect } from 'react';
import { ArrowRight, Moon, Globe, FileText, Database, Percent, Languages, Building2, MapPin, Phone, MessageSquare, Layout, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toPersianDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { AppSettings, InvoiceLayoutType } from '../types';
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
             {/* Simple visual cues for layout type */}
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

      <div className="mt-12 text-center">
        <p className="text-slate-400 text-sm">{t('version')} {toPersianDigits("1.2.0")} {t('app_name')}</p>
      </div>
    </div>
  );
};
