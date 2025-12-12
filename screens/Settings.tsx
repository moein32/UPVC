import React, { useState, useEffect } from 'react';
import { ArrowRight, Moon, Globe, FileText, Database, Percent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

  return (
    <div className="min-h-screen bg-slate-50 p-6 pt-10">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 ml-4 bg-white rounded-xl shadow-sm text-slate-700">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">تنظیمات</h1>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">عمومی</h3>
        <SettingItem icon={Moon} label="حالت شب">
             <button 
                onClick={handleToggleDarkMode}
                className={`w-10 h-6 rounded-full relative transition-colors ${settings.darkMode ? 'bg-blue-600' : 'bg-slate-200'}`}
             >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${settings.darkMode ? 'left-1' : 'right-1'}`}></div>
             </button>
        </SettingItem>
        <SettingItem icon={Globe} label="واحد پول" value="تومان" />
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">محاسبات</h3>
        <SettingItem icon={Percent} label="ضریب سود (درصد)">
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
        <SettingItem icon={Database} label="نسخه ضرایب" value="استاندارد ۱۴۰۴" />
        <SettingItem icon={FileText} label="فرمت خروجی" value="PDF" />
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-400 text-sm">نسخه {toPersianDigits("1.1.0")} لومینا</p>
        <p className="text-slate-300 text-xs mt-1">ویژه سال {toPersianDigits("1404")}</p>
      </div>
    </div>
  );
};