
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Moon, Globe, FileText, Database, Percent, Languages, Building2, MapPin, Phone, MessageSquare, Layout, CheckCircle2, LogOut, Sparkles, ShieldCheck, Award, Zap, UserCheck, CreditCard, Key, Download, Upload, AlertCircle, CloudLightning, Shield, RefreshCw } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for backup and sync tracking
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('nexwin_last_successful_sync'));

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

  const showBackupMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setBackupMsg({ text, type });
    setTimeout(() => {
      setBackupMsg(null);
    }, 5000);
  };

  // 1. Export local backup (.nxb file)
  const handleExportNxbFile = () => {
    try {
      showBackupMessage('در حال گردآوری داده‌ها و فشرده‌سازی لایه‌های اطلاعاتی کارگاه...', 'info');

      const backupObj = {
        type: 'NEXWIN_USER_BACKUP',
        version: '1.2.0',
        createdAt: new Date().toISOString(),
        licenseId: currentUser?.id || 'GUEST',
        companyName: currentUser?.company_name || 'کارگاه نکس‌وین',
        data: {
          projects: JSON.parse(localStorage.getItem('lumina_projects') || '[]'),
          settings: JSON.parse(localStorage.getItem('lumina_settings') || '{}'),
          brands: JSON.parse(localStorage.getItem('lumina_brands') || '[]'),
          glass: JSON.parse(localStorage.getItem('lumina_glass') || '[]'),
          hardware: JSON.parse(localStorage.getItem('lumina_hardware') || '[]'),
        }
      };

      const jsonStr = JSON.stringify(backupObj);
      // UTF-8 supportive base64 encoding
      const base64Str = btoa(unescape(encodeURIComponent(jsonStr)));
      
      const fileContent = `-----NEXWIN UPVC SYSTEM BACKUP FILE-----\n` +
                          `VERSION: 1.2.0\n` +
                          `LICENSE: ${backupObj.licenseId}\n` +
                          `DATE: ${backupObj.createdAt}\n` +
                          `========================================\n` +
                          base64Str + 
                          `\n========================================`;

      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const dateStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
      const fileName = `nexwin_backup_${currentUser?.id || 'workshop'}_${dateStr}.nxb`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showBackupMessage('فایل پشتیبان کارگاهی با موفقیت تولید و دانلود گردید.', 'success');
    } catch (e: any) {
      console.error('Failed to export local backup:', e);
      showBackupMessage('اختلال در صدور فایل اطلاعات: ' + e?.message, 'error');
    }
  };

  // 2. Import local backup from .nxb file
  const handleImportNxbFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verify extension
    if (!file.name.endsWith('.nxb')) {
      showBackupMessage('قالب فایل نامعتبر است! لطفا فقط فایلی با پسوند .nxb را انتخاب کنید.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        // Strip and grab anything between delimiters
        const lines = text.split('\n');
        let base64Content = '';
        let insideDataSection = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('=====')) {
            insideDataSection = !insideDataSection;
            continue;
          }
          if (insideDataSection) {
            base64Content += line;
          }
        }

        if (!base64Content) {
          // Fallback to find long non-spaced block
          base64Content = lines.find(line => line.length > 50 && !line.includes(' ')) || '';
        }

        if (!base64Content) {
          throw new Error('سیستم قادر به تشخیص گرید رمزنگاری اطلاعات نیست.');
        }

        // Decode UTF-8 string from Base64
        const jsonStr = decodeURIComponent(escape(atob(base64Content.trim())));
        const backupObj = JSON.parse(jsonStr);

        if (backupObj.type !== 'NEXWIN_USER_BACKUP' || !backupObj.data) {
          throw new Error('ساختار کلیدهای درونی بسته معتبر نیست.');
        }

        const data = backupObj.data;

        // Hydrate local storages
        if (data.projects && Array.isArray(data.projects)) {
          localStorage.setItem('lumina_projects', JSON.stringify(data.projects));
        }
        if (data.settings && typeof data.settings === 'object') {
          localStorage.setItem('lumina_settings', JSON.stringify(data.settings));
          setSettings(data.settings);
        }
        if (data.brands && Array.isArray(data.brands)) {
          localStorage.setItem('lumina_brands', JSON.stringify(data.brands));
        }
        if (data.glass && Array.isArray(data.glass)) {
          localStorage.setItem('lumina_glass', JSON.stringify(data.glass));
        }
        if (data.hardware && Array.isArray(data.hardware)) {
          localStorage.setItem('lumina_hardware', JSON.stringify(data.hardware));
        }

        showBackupMessage('مخازن محلی با موفقیت بازیابی شد! راه اندازی مجدد بوم...', 'success');
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        console.error('Failed to restore archive:', err);
        showBackupMessage('شکست در خواندن فایل: اطلاعات رمزگذاری شده تخریب گردیده است.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // 3. Sync and push projects to Supabase central
  const handleCloudBackupSync = async () => {
    if (!navigator.onLine) {
      showBackupMessage('سیستم آفلاین است. لطفا اتصال اینترنت را بررسی نمایید.', 'error');
      return;
    }
    
    setIsSyncing(true);
    showBackupMessage('در حال اتصال ایمن به هسته محاسباتی ابر نکس‌وین...', 'info');

    try {
      const { fetchLocalSavedProjects, syncProjectToCloud } = await import('../services/syncService');
      const projects = fetchLocalSavedProjects();
      
      if (projects.length === 0) {
        showBackupMessage('پروژه ذخیره شده‌ای جهت آپلود ابری یافت نگردید.', 'info');
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      for (const proj of projects) {
        if (currentUser) {
          proj.userLicenseId = currentUser.id;
        }
        const res = await syncProjectToCloud(proj);
        if (res.success) {
          successCount++;
        }
      }

      const timestamp = new Date().toISOString();
      localStorage.setItem('nexwin_last_successful_sync', timestamp);
      setLastSync(timestamp);
      
      showBackupMessage(`مجموعاً ${successCount} پروژه با موفقیت در بانک ابری نکس‌وین یکپارچه‌ شد.`, 'success');
    } catch (err: any) {
      console.error('Cloud upload failure:', err);
      showBackupMessage('خطا در همگام‌سازی ابری: ' + (err?.message || 'خطای سرور'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Restore/download user projects from Supabase
  const handleCloudRestore = async () => {
    if (!currentUser?.id) {
      showBackupMessage('خطا: لایسنس کارگاهی معتبری برای همگام‌سازی یافت نشد.', 'error');
      return;
    }

    if (!navigator.onLine) {
      showBackupMessage('عدم دسترسی به اینترنت! اتصال دستگاه را تایید نمایید.', 'error');
      return;
    }

    setIsRestoring(true);
    showBackupMessage('در حال بررسی و دریافت نسخه‌های پروژه از مخزن ابری نکس‌وین...', 'info');

    try {
      const { fetchUserProjectsFromCloud } = await import('../services/syncService');
      const pulledProjects = await fetchUserProjectsFromCloud(currentUser.id);
      
      if (pulledProjects && Array.isArray(pulledProjects)) {
        localStorage.setItem('lumina_projects', JSON.stringify(pulledProjects));
        showBackupMessage(`پروژه‌های کارگاه (${pulledProjects.length} طرح) با موفقیت بازیابی و با کش هماهنگ شد.`, 'success');
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showBackupMessage('هیچ پروژه‌ای در فضای ابری برای این لایسنس ثبت نشده است.', 'info');
      }
    } catch (err: any) {
      console.error('Cloud pull/restore failure:', err);
      showBackupMessage('خطا در فرآیند بازیابی: ' + (err?.message || 'اختلال شبکه'), 'error');
    } finally {
      setIsRestoring(false);
    }
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

      {/* مشخصات ساده و شناسنامه واحد صنفی فعال */}
      {currentUser && (
        <div className="mb-8 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-right font-['Vazirmatn']">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Shield size={16} className="text-blue-500" />
              <span>اطلاعات تفصیلی کارگاه فعال</span>
            </h3>
            <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-lg border border-emerald-100">
              لایسنس کارگاهی فعال ✔️
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex flex-col gap-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
              <span className="text-[10px] text-slate-400">نام کارگاه / واحد تجاری:</span>
              <span className="font-bold text-slate-800">{currentUser.company_name}</span>
            </div>
            <div className="flex flex-col gap-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
              <span className="text-[10px] text-slate-400">مدیریت / تکنسین مسئول:</span>
              <span className="font-bold text-slate-800">{currentUser.owner_name}</span>
            </div>
            <div className="flex flex-col gap-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
              <span className="text-[10px] text-slate-400">شماره تماس تایید شده:</span>
              <span className="font-mono font-bold text-slate-800 text-left">{currentUser.phone_number}</span>
            </div>
            <div className="flex flex-col gap-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
              <span className="text-[10px] text-slate-400">کد اختصاصی پروانه (License ID):</span>
              <span className="font-mono font-bold text-blue-600 text-left">{currentUser.id}</span>
            </div>
          </div>
        </div>
      )}

      {/* بخش ارتقای لایسنس به دلیل جداسازی نرم‌افزار مدیریتی حذف گردید */}

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



      <div className="mb-8 font-['Vazirmatn']">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1 font-['Vazirmatn']">طراحی خروجی فاکتور (PDF)</h3>
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

      {/* سامانه پیشرفته مدیریت یکپارچه پشتیبان‌گیری و بازیابی اطلاعات کارگاه (آفلاین و ابری) */}
      <div className="mb-8 font-['Vazirmatn'] border-t border-slate-100 pt-8" id="backup-sync-management">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">سامانه پشتیبان‌گیری و همگام‌سازی کارگاه</h3>
        
        {backupMsg && (
          <div className={`mb-4 p-4 rounded-xl text-xs font-bold flex items-center gap-2 text-right border transition-all ${
            backupMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
            backupMsg.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-100' :
            'bg-blue-50 text-blue-700 border-blue-100'
          }`}>
            <AlertCircle size={15} />
            <span>{backupMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* گرید چپ: پشتیبان‌گیری و بازیابی دستی با پسوند .nxb (سبک و آفلاین) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="text-right mb-4">
              <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-600 font-black mb-2">فایل فشرده محلی (.nxb)</span>
              <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <FileText size={16} className="text-indigo-500" />
                آرشیوگیری و بازنشانی دستی آفلاین
              </h4>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                صدور و ورود اطلاعات کامل کارگاه شامل پروژه‌ها، فرم‌های محاسباتی، لیست‌های قیمت شیشه/یراق/پروفیل و تنظیمات فاکتور بر روی حافظه دستگاه در چند ثانیه به صورت فایل متنی فشرده (.nxb).
              </p>
            </div>
            
            <div className="flex gap-2.5">
              <button 
                onClick={handleExportNxbFile}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
              >
                <Download size={13} />
                تهیه فایل پشتیبان (.nxb)
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer"
              >
                <Upload size={13} />
                بازیابی اطلاعات (.nxb)
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportNxbFile} 
                accept=".nxb" 
                className="hidden" 
              />
            </div>
          </div>

          {/* گرید راست: همگام‌سازی ابری امن زنده با Supabase */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="text-right mb-4">
              <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-600 font-black mb-2">بانک ابری امن (Supabase)</span>
              <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <Database size={16} className="text-emerald-500" />
                همگام‌سازی و همسان‌سازی زنده ابری
              </h4>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                بروزرسانی زنده پرونده پروژه‌ها بر روی مخزن اصلی دیتابیس Supabase جهت بازیابی اتوماتیک پروژه‌ها در صورت فرمت دستگاه یا تغییر ابزارهای کاری.
              </p>
              
              <div className="mt-3.5 flex items-center gap-1.5 justify-end text-[9px] text-slate-400">
                <span className="font-bold flex items-center gap-1">⏱️ آخرین همگام‌سازی موفق با ابر:</span>
                <span className="font-mono text-emerald-600 font-extrabold">
                  {lastSync ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lastSync)) : 'هرگز هماهنگ نشده'}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button 
                onClick={handleCloudBackupSync}
                disabled={isSyncing}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 active:scale-95 text-white rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
              >
                <CloudLightning size={13} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "در حال انتقال..." : "پشتیبان‌گیری در ابر"}
              </button>
              
              <button 
                onClick={handleCloudRestore}
                disabled={isRestoring}
                className="flex-1 py-3 bg-emerald-50 hover:bg-emerald-100 disabled:bg-slate-100 text-emerald-700 disabled:text-slate-400 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2 border border-emerald-200 cursor-pointer"
              >
                <RefreshCw size={13} className={isRestoring ? "animate-spin" : ""} />
                {isRestoring ? "در حال دریافت..." : "بازیابی مجدد از ابر"}
              </button>
            </div>
          </div>
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
