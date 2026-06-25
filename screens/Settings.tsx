
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Moon, Globe, FileText, Database, Percent, Languages, Building2, MapPin, Phone, MessageSquare, Layout, CheckCircle2, LogOut, Sparkles, ShieldCheck, Award, Zap, UserCheck, CreditCard, Key, Download, Upload, AlertCircle, CloudLightning, Shield, RefreshCw, Smartphone, Monitor, Trash2, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toPersianDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { AppSettings, InvoiceLayoutType, AppUser } from '../types';
import { InputField } from '../components/UIComponents';
import { fetchActiveSessions, revokeSession, getDeviceLimit, DeviceSession } from '../services/sessionService';
import { initiateZibalPayment } from '../services/paymentService';

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

  // Active sessions management
  const [activeSessionsList, setActiveSessionsList] = useState<DeviceSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Profile editing and tier upgrading states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editTier, setEditTier] = useState<'bronze' | 'silver' | 'gold'>('bronze');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState<string | null>(null);
  const [showSimulatedPortal, setShowSimulatedPortal] = useState(false);
  const [simOtpTimer, setSimOtpTimer] = useState(60);
  const [simOtpRequested, setSimOtpRequested] = useState(false);
  const [simCardNo, setSimCardNo] = useState('');
  const [simCvv, setSimCvv] = useState('');
  const [simPin, setSimPin] = useState('');
  const [finalPayableAmount, setFinalPayableAmount] = useState(0);

  // شمارش معکوس رمز پویای آزمایشی درگاه شبیه‌ساز زیبال در صفحه تنظیمات
  useEffect(() => {
    let interval: any;
    if (showSimulatedPortal && simOtpTimer > 0) {
      interval = setInterval(() => {
        setSimOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showSimulatedPortal, simOtpTimer]);

  useEffect(() => {
    if (currentUser) {
      setEditCompanyName(currentUser.company_name || '');
      setEditOwnerName(currentUser.owner_name || '');
      setEditTier(currentUser.tier || 'bronze');
    }
  }, [currentUser]);

  const getRemainingDays = (user: AppUser): number => {
    if (user.is_trial && user.trial_start_date) {
      const start = new Date(user.trial_start_date);
      const elapsed = Date.now() - start.getTime();
      const remainingMs = Math.max(0, (7 * 24 * 60 * 60 * 1000) - elapsed);
      return Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    }
    
    if ((user as any).expiry_timestamp) {
      const remainingMs = Math.max(0, (user as any).expiry_timestamp - Date.now());
      return Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    }
    
    if (user.expiry_date) {
      if (user.expiry_date.includes('بدون منقضی') || user.expiry_date.includes('۳ ساله') || user.expiry_date.includes('3 ساله')) {
        return 30;
      }
      
      try {
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        let clean = user.expiry_date;
        for (let i = 0; i < 10; i++) {
          clean = clean.replace(new RegExp(farsiDigits[i], 'g'), String(i));
        }
        
        const match = clean.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        if (match) {
          const jYear = parseInt(match[1], 10);
          const jMonth = parseInt(match[2], 10);
          const jDay = parseInt(match[3], 10);
          
          const currentJYear = 1405;
          const currentJMonth = 4;
          const currentJDay = 4;
          
          const totalDaysTarget = jYear * 365 + jMonth * 30 + jDay;
          const totalDaysCurrent = currentJYear * 365 + currentJMonth * 30 + currentJDay;
          const diff = totalDaysTarget - totalDaysCurrent;
          if (diff > 0 && diff < 150) {
            return diff;
          }
        }
      } catch (err) {
        console.warn('Failed to parse Farsi expiry_date:', err);
      }
    }
    
    return 20;
  };

  const getTierPrice = (tier: 'bronze' | 'silver' | 'gold'): number => {
    if (tier === 'gold') return 790000;
    if (tier === 'silver') return 450000;
    return 200000;
  };

  const getTierDailyPrice = (tier: 'bronze' | 'silver' | 'gold'): number => {
    return Math.floor(getTierPrice(tier) / 30);
  };

  const getTierWeight = (t: string) => {
    if (t === 'gold') return 3;
    if (t === 'silver') return 2;
    return 1;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!editCompanyName.trim()) {
      showBackupMessage('نام کارگاه نمی‌تواند خالی باشد.', 'error');
      return;
    }
    if (!editOwnerName.trim()) {
      showBackupMessage('نام مدیریت نمی‌تواند خالی باشد.', 'error');
      return;
    }

    setIsProfileSaving(true);
    const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const isTierChanged = editTier !== currentUser.tier;

    if (isTierChanged) {
      if (getTierWeight(editTier) < getTierWeight(currentUser.tier)) {
        showBackupMessage('تنزل سطح اشتراک لایسنس به صورت خودکار امکان‌پذیر نیست. لطفا با پشتیبانی تماس بگیرید.', 'error');
        setIsProfileSaving(false);
        return;
      }

      // It is an UPGRADE! Redirect to gateway instead of saving directly for free!
      try {
        const remainingDays = getRemainingDays(currentUser);
        const unusedValue = remainingDays * getTierDailyPrice(currentUser.tier);
        const discount = Math.floor(unusedValue * 0.5);
        const baseNewPrice = getTierPrice(editTier);
        const finalPayable = Math.max(10000, baseNewPrice - discount);
        const extraValue = unusedValue - discount;
        const extraDays = Math.round(extraValue / getTierDailyPrice(editTier));
        const totalDurationDays = 30 + extraDays;

        // Save pending signup data for upgrading
        const pendingData = {
          isUpgrade: true,
          userId: currentUser.id,
          ownerName: editOwnerName.trim(),
          companyName: editCompanyName.trim(),
          phoneDigits: currentUser.phone_number,
          tier: editTier,
          amountTomans: finalPayable,
          newDurationDays: totalDurationDays
        };
        localStorage.setItem('nexwin_pending_signup', JSON.stringify(pendingData));

        showBackupMessage('در حال اتصال به درگاه پرداخت ایمن زیبال جهت ارتقای حساب...', 'info');

        const res = await initiateZibalPayment({
          amountTomans: finalPayable,
          phoneNumber: currentUser.phone_number,
          description: `ارتقای لایسنس نکس‌وین به ${editTier === 'gold' ? 'طلایی' : 'نقره‌ای'} (${totalDurationDays} روز)`,
          userTier: editTier,
          ownerName: editOwnerName.trim(),
          companyName: editCompanyName.trim()
        });

        setFinalPayableAmount(finalPayable);
        if (res.success) {
          if (res.redirectUrl) {
            // ذخیره کردن آدرس درگاه پرداخت زیبال جهت نمایش کارت انتقال امن
            setPaymentRedirectUrl(res.redirectUrl);
            // تلاش جهت باز کردن مستقیم در پنجره جدید به عنوان سهولت کاربری
            window.open(res.redirectUrl, '_blank');
          } else if (res.authority) {
            localStorage.setItem('nexwin_pending_authority', res.authority);
            setShowSimulatedPortal(true);
          }
        } else {
          showBackupMessage(res.message || 'اتصال به درگاه پرداخت با خطا مواجه شد. لطفاً دوباره تلاش کنید.', 'error');
        }
      } catch (err: any) {
        console.error('Failed to initiate upgrade payment:', err);
        showBackupMessage('خطایی در اتصال به درگاه رخ داد.', 'error');
      } finally {
        setIsProfileSaving(false);
      }
      return;
    }

    // Normal profile update (without tier changes)
    const updatedUser: AppUser = {
      ...currentUser,
      company_name: editCompanyName.trim(),
      owner_name: editOwnerName.trim(),
    };

    try {
      // ۱. به‌روزرسانی محلی لایسنس
      localStorage.setItem('nexwin_user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      // ۲. هماهنگ‌سازی با سوپابیس (در صورت فعال بودن)
      if (VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY && !VITE_SUPABASE_URL.includes('YOUR_SUPABASE') && VITE_SUPABASE_URL !== 'zibal' && VITE_SUPABASE_URL.trim() !== '') {
        const cleanUrl = VITE_SUPABASE_URL.endsWith('/') ? VITE_SUPABASE_URL.slice(0, -1) : VITE_SUPABASE_URL;
        const res = await fetch(`${cleanUrl}/rest/v1/app_users?id=eq.${encodeURIComponent(currentUser.id)}`, {
          method: 'PATCH',
          headers: {
            'apikey': VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            owner_name: updatedUser.owner_name,
            company_name: updatedUser.company_name,
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error('Supabase profile update failed:', errText);
          showBackupMessage('تغییرات به صورت آفلاین ذخیره شد، هماهنگ‌سازی ابری با تاخیر انجام می‌شود.', 'info');
        } else {
          showBackupMessage('مشخصات کارگاه شما با موفقیت در فضای ابری به‌روزرسانی شد.', 'success');
        }
      } else {
        showBackupMessage('مشخصات کارگاه شما به صورت آفلاین با موفقیت ذخیره گردید.', 'success');
      }

      setIsEditingProfile(false);
      loadSessions(updatedUser.id);
    } catch (err: any) {
      console.error('Failed to update user profile:', err);
      showBackupMessage('خطایی در هنگام به‌روزرسانی رخ داد. مجدداً تلاش کنید.', 'error');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const loadSessions = async (userId: string) => {
    setSessionsLoading(true);
    try {
      const list = await fetchActiveSessions(userId);
      setActiveSessionsList(list);
    } catch (e) {
      console.error('Failed to load active sessions:', e);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    setSettings(pricingStore.getSettings());

    const userStr = localStorage.getItem('nexwin_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as AppUser;
        setCurrentUser(user);
        loadSessions(user.id);
      } catch (e) {
        console.error('Failed to parse user state in Settings:', e);
      }
    }
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    if (!currentUser) return;
    const confirmRevoke = window.confirm('آیا مایل به قطع اتصال این دستگاه از حساب کاربری خود هستید؟');
    if (!confirmRevoke) return;

    try {
      const success = await revokeSession(currentUser.id, sessionId);
      if (success) {
        // If they revoked the current device, log them out
        const isCurrent = activeSessionsList.find(s => s.id === sessionId)?.is_current;
        if (isCurrent) {
          localStorage.removeItem('nexwin_user');
          window.location.href = '#/login';
          window.location.reload();
          return;
        }
        await loadSessions(currentUser.id);
        showBackupMessage('اتصال دستگاه با موفقیت قطع گردید.', 'success');
      } else {
        showBackupMessage('خطا در قطع اتصال دستگاه.', 'error');
      }
    } catch (e) {
      showBackupMessage('خطا در برقراری ارتباط با سرور.', 'error');
    }
  };



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
      let failCount = 0;
      let lastErrorMessage = '';

      for (const proj of projects) {
        if (currentUser) {
          proj.userLicenseId = currentUser.id;
        }
        const res = await syncProjectToCloud(proj);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
          lastErrorMessage = res.message || 'خطای اتصال به پایگاه داده ابری';
        }
      }

      const timestamp = new Date().toISOString();
      if (successCount > 0) {
        localStorage.setItem('nexwin_last_successful_sync', timestamp);
        setLastSync(timestamp);
        if (failCount > 0) {
          showBackupMessage(`مجموعاً ${successCount} پروژه با موفقیت یکپارچه شد. دیتای ${failCount} پروژه به علت تداخل ارسال نگردید: ${lastErrorMessage}`, 'info');
        } else {
          showBackupMessage(`مجموعاً ${successCount} پروژه با موفقیت در بانک ابری نکس‌وین یکپارچه‌ شد.`, 'success');
        }
      } else {
        showBackupMessage(`شکست در همگام‌سازی ابری: ${lastErrorMessage}`, 'error');
      }
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Shield size={16} className="text-blue-500" />
              <span>اطلاعات تفصیلی و لایسنس کارگاه فعال</span>
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-lg border border-emerald-100">
                لایسنس کارگاه فعال ✔️
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(!isEditingProfile);
                  setEditCompanyName(currentUser.company_name || '');
                  setEditOwnerName(currentUser.owner_name || '');
                  setEditTier(currentUser.tier || 'bronze');
                }}
                className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 border border-blue-200/50 cursor-pointer"
              >
                <Sparkles size={13} className="text-blue-500 animate-pulse" />
                {isEditingProfile ? 'انصراف از ویرایش ×' : 'ارتقای اشتراک و ویرایش اطلاعات ⚡'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-1">
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
              <span className="text-[10px] text-slate-400">سطح اشتراک فعال:</span>
              <span className="font-bold text-blue-600">
                {currentUser.tier === 'bronze' ? 'برنز (فروشگاهی)' : currentUser.tier === 'silver' ? 'نقره‌ای (کارگاهی)' : 'طلایی (مدیریتی)'}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {isEditingProfile && (
              <motion.form
                onSubmit={handleSaveProfile}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 pt-5 border-t border-dashed border-slate-200 space-y-5 overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ویرایش نام کارگاه */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 block">نام کارگاه / واحد تجاری</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 size={16} />
                      </div>
                      <input
                        type="text"
                        value={editCompanyName}
                        onChange={(e) => setEditCompanyName(e.target.value)}
                        placeholder="نام واحد تجاری یا کارگاه خود را وارد کنید"
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right"
                        required
                      />
                    </div>
                  </div>

                  {/* ویرایش نام مدیریت */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 block">نام مدیریت / کارفرما مسئول</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <UserCheck size={16} />
                      </div>
                      <input
                        type="text"
                        value={editOwnerName}
                        onChange={(e) => setEditOwnerName(e.target.value)}
                        placeholder="نام و نام خانوادگی مدیر مسئول"
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-right"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* انتخاب سطح اشتراک */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 block flex items-center gap-1">
                    <Zap size={14} className="text-amber-500 animate-bounce" />
                    <span>انتخاب سطح اشتراک و ارتقای لایسنس کارگاهی</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* سطح برنز */}
                    <div
                      onClick={() => setEditTier('bronze')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-right ${
                        editTier === 'bronze'
                          ? 'border-amber-500/80 bg-amber-50/20'
                          : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black text-amber-700 flex items-center gap-1">
                            <Award size={14} />
                            برنز (فروشگاهی)
                          </span>
                          {editTier === 'bronze' && <CheckCircle2 size={15} className="text-amber-500" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          مناسب برای دفاتر فروش و پاسخگویی سریع به مشتریان جهت صدور پیش‌فاکتور.
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100/50">
                        <span className="text-[9px] text-slate-400 font-bold">دستگاه‌های مجاز:</span>
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-lg">۱ دستگاه</span>
                      </div>
                    </div>

                    {/* سطح نقره ای */}
                    <div
                      onClick={() => setEditTier('silver')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-right ${
                        editTier === 'silver'
                          ? 'border-slate-400 bg-slate-50'
                          : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                            <Sparkles size={14} className="text-slate-400" />
                            نقره‌ای (کارگاهی)
                          </span>
                          {editTier === 'silver' && <CheckCircle2 size={15} className="text-slate-500" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          بسیار مناسب برای کارگاه‌های تولیدی متوسط با بخش طراحی و پاسخگویی مجزا.
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100/50">
                        <span className="text-[9px] text-slate-400 font-bold">دستگاه‌های مجاز:</span>
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-lg">۲ دستگاه</span>
                      </div>
                    </div>

                    {/* سطح طلایی */}
                    <div
                      onClick={() => setEditTier('gold')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between text-right ${
                        editTier === 'gold'
                          ? 'border-blue-600 bg-blue-50/10'
                          : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black text-blue-700 flex items-center gap-1">
                            <ShieldCheck size={14} className="text-blue-500 animate-pulse" />
                            طلایی (مدیریتی)
                          </span>
                          {editTier === 'gold' && <CheckCircle2 size={15} className="text-blue-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          کامل‌ترین دسترسی نکس‌وین؛ دارای کلیه بخش‌های محاسبات، نقشه‌ها، و لایسنس کارفرمایی.
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100/50">
                        <span className="text-[9px] text-slate-400 font-bold">دستگاه‌های مجاز:</span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg">۳ دستگاه</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* بخش محاسبه هزینه ارتقا به شکل زنده */}
                {currentUser && editTier !== currentUser.tier && (() => {
                  const isUpgrade = getTierWeight(editTier) > getTierWeight(currentUser.tier);
                  if (!isUpgrade) return null;

                  const remainingDays = getRemainingDays(currentUser);
                  const unusedValue = remainingDays * getTierDailyPrice(currentUser.tier);
                  const discount = Math.floor(unusedValue * 0.5);
                  const baseNewPrice = getTierPrice(editTier);
                  const finalPayable = Math.max(10000, baseNewPrice - discount);
                  const extraValue = unusedValue - discount;
                  const extraDays = Math.round(extraValue / getTierDailyPrice(editTier));
                  const totalDurationDays = 30 + extraDays;

                  const tierLabels: Record<string, string> = {
                    bronze: 'برنزی',
                    silver: 'نقره‌ای',
                    gold: 'طلایی'
                  };

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-5 text-right space-y-3.5 my-4"
                    >
                      <div className="flex items-center gap-2 text-blue-800 font-extrabold text-xs mb-1">
                        <CreditCard size={15} className="text-blue-600" />
                        <span>جزئیات و شفافیت محاسبه مابه‌التفاوت ارتقای اشتراک</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-slate-100">
                            <span className="text-slate-500">روزهای باقی‌مانده طرح فعلی:</span>
                            <span className="font-extrabold text-slate-800 font-mono">{toPersianDigits(remainingDays)} روز</span>
                          </div>
                          <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-slate-100">
                            <span className="text-slate-500">ارزش باقیمانده لایسنس {tierLabels[currentUser.tier]}:</span>
                            <span className="font-extrabold text-slate-800">{toPersianDigits(unusedValue.toLocaleString())} تومان</span>
                          </div>
                          <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 text-emerald-800">
                            <span className="font-bold">تخفیف کسرشده از فاکتور (۵۰٪):</span>
                            <span className="font-black">-{toPersianDigits(discount.toLocaleString())} تومان</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-slate-100">
                            <span className="text-slate-500">هزینه ۳۰ روزه طرح جدید ({tierLabels[editTier]}):</span>
                            <span className="font-extrabold text-slate-800">{toPersianDigits(baseNewPrice.toLocaleString())} تومان</span>
                          </div>
                          <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-lg border border-blue-100 text-blue-800">
                            <span className="font-bold">روزهای اعتبار هدیه اضافه (۵۰٪):</span>
                            <span className="font-black">+{toPersianDigits(extraDays)} روز</span>
                          </div>
                          <div className="flex justify-between items-center bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 text-indigo-800">
                            <span className="font-bold">مدت زمان اعتبار طرح ارتقا یافته:</span>
                            <span className="font-black">{toPersianDigits(totalDurationDays)} روز ({toPersianDigits(30)} روز پایه + {toPersianDigits(extraDays)} روز هدیه)</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-dashed border-blue-200/60 flex flex-col sm:flex-row justify-between items-center gap-2.5">
                        <div className="text-[10px] text-slate-500 leading-normal max-w-sm">
                          💡 فرمول محاسبه عادلانه: ۵۰٪ از ارزش روزهای استفاده‌نشده طرح فعلی شما مستقیماً از قیمت طرح جدید کسر شده و ۵۰٪ باقیمانده به صورت روزهای اعتبار اضافه (هدیه) به انتهای لایسنس جدید شما افزوده می‌شود.
                        </div>
                        <div className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex flex-col items-center sm:items-end">
                          <span className="text-[9px] opacity-80">مبلغ نهایی مابه‌التفاوت جهت تسویه:</span>
                          <span className="text-xs font-black">{toPersianDigits(finalPayable.toLocaleString())} تومان</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* دکمه ذخیره */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isProfileSaving}
                    className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 flex items-center gap-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer border-none"
                  >
                    {isProfileSaving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>در حال اتصال به درگاه پرداخت...</span>
                      </>
                    ) : (
                      <>
                        {currentUser && editTier !== currentUser.tier && getTierWeight(editTier) > getTierWeight(currentUser.tier) ? (
                          <>
                            <CreditCard size={14} />
                            <span>انتقال به درگاه زیبال و ارتقای لایسنس 💳</span>
                          </>
                        ) : (
                          <>
                            <span>ذخیره تغییرات و ارتقای لایسنس 💾</span>
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
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

      {/* بخش مدیریت دستگاه‌ها و نشست‌های فعال */}
      {currentUser && (
        <div className="mb-8 font-['Vazirmatn'] border-t border-slate-100 pt-8">
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">دستگاه‌ها و نشست‌های فعال</h3>
            <span className="text-[10px] font-bold text-slate-500">
              حد مجاز: {toPersianDigits(getDeviceLimit(currentUser.tier))} دستگاه
              {currentUser.tier === 'bronze' && ' (فروشگاهی)'}
              {currentUser.tier === 'silver' && ' (کارگاهی)'}
              {currentUser.tier === 'gold' && ' (مدیریتی)'}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="mb-4 pb-3 border-b border-slate-100 text-right">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                لیست مرورگرها و دستگاه‌هایی که به حساب کاربری شما متصل هستند. شما می‌توانید هر زمان مایل بودید، اتصال دستگاه‌های دیگر را قطع کنید.
              </p>
            </div>

            {sessionsLoading ? (
              <div className="py-6 flex justify-center items-center gap-2">
                <RefreshCw size={16} className="text-blue-500 animate-spin" />
                <span className="text-xs text-slate-400">در حال دریافت لیست نشست‌های فعال...</span>
              </div>
            ) : activeSessionsList.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">هیچ نشستی یافت نشد.</div>
            ) : (
              <div className="space-y-3">
                {activeSessionsList.map((session) => (
                  <div 
                    key={session.id} 
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      session.is_current 
                        ? 'border-blue-100 bg-blue-50/20' 
                        : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${session.is_current ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                        {session.device_name.toLowerCase().includes('windows') || session.device_name.toLowerCase().includes('mac') ? (
                          <Monitor size={18} />
                        ) : (
                          <Smartphone size={18} />
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800">{session.device_name}</span>
                          {session.is_current && (
                            <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md">همین دستگاه</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-400">
                            آخرین فعالیت: {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(session.last_active))}
                          </span>
                          {session.ip_address && (
                            <>
                              <span className="text-slate-300 text-[10px] hidden sm:inline">•</span>
                              <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Globe size={9} className="text-blue-500" />
                                {session.ip_address}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session.id)}
                      className={`p-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer border-none ${
                        session.is_current ? 'text-slate-300 hover:text-slate-400' : 'text-slate-400'
                      }`}
                      title={session.is_current ? "خروج از حساب" : "قطع اتصال دستگاه"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


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

      {/* درگاه شبکه‌ای شبیه‌ساز پرداخت شتاب زیبال و شاپرک */}
      <AnimatePresence>
        {showSimulatedPortal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0a0f1d]/95 z-[120] flex items-center justify-center p-4 overflow-y-auto font-['Vazirmatn'] select-none text-slate-800"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden text-right"
            >
              {/* هدر شاپرک */}
              <div className="bg-gradient-to-r from-teal-700 via-slate-800 to-sky-800 p-5 px-6 text-white flex justify-between items-center border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-white text-base">💳</div>
                  <div>
                    <h2 className="text-sm font-black tracking-tight">دروازه پرداخت الکترونیکی زیبال</h2>
                    <p className="text-[10px] text-teal-200 mt-0.5">شبکه تبادل اطلاعات بانکی ایران (شاپرک)</p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-xs bg-black/20 text-teal-300 font-bold px-3 py-1.5 rounded-full border border-teal-500/20">اتصال امن (SSL)</span>
                </div>
              </div>

              {/* خلاصه فاکتور */}
              <div className="bg-slate-50 p-5 px-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold leading-normal">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">پذیرنده دیجیتال:</span>
                    <span className="text-slate-900 font-black">پلتفرم محاسباتی دوجداره نکس‌وین (NexWin)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">مجموعه خریدار:</span>
                    <span className="text-slate-900 font-black">{editCompanyName || 'کارگاه صنعتی جدید'}</span>
                  </div>
                </div>
                <div className="space-y-2 border-r border-slate-200 pr-0 md:pr-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">بسته اشتراکی:</span>
                    <span className="text-blue-700 font-black">
                      {editTier === 'gold' ? 'طلایی نامحدود' : editTier === 'silver' ? 'نقره‌ای خط تولید' : 'برنزی محاسباتی'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">مجموع کل فاکتور:</span>
                    <span className="text-emerald-600 font-black text-sm">
                      {toPersianDigits(finalPayableAmount * 10)} ریال ({toPersianDigits(finalPayableAmount)} تومان)
                    </span>
                  </div>
                </div>
              </div>

              {/* فرم مشخصات کارت شتاب */}
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* قسمت چپ: کارت شتاب فیزیکی دمو */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-[240px] aspect-[1.58] bg-gradient-to-tr from-sky-700 via-indigo-700 to-indigo-900 rounded-2xl p-4 text-white relative shadow-lg overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 left-0 bottom-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1),transparent_40%)]"></div>
                    <div className="flex justify-between items-center z-10">
                      <span className="text-[10px] font-black tracking-widest opacity-80">عضو شبکه شتاب IRAN</span>
                      <span className="text-yellow-400 font-black text-xs">نکس‌بانک ★</span>
                    </div>

                    <div className="my-3 z-10 text-center font-mono text-base font-bold tracking-widest leading-none drop-shadow-md text-slate-100 select-all">
                      {simCardNo ? toPersianDigits(simCardNo.replace(/(\d{4})/g, '$1 ').trim()) : '۶۲۷۴  ۱۲۳۴  ۵۶۷۸  ۹۰۱۲'}
                    </div>

                    <div className="flex justify-between items-end z-10 leading-none">
                      <div className="text-right">
                        <span className="text-[7px] text-slate-300 block">صاحب کارت:</span>
                        <span className="text-[10px] font-bold mt-0.5 block">{editOwnerName || 'مدیر محترم کارگاه'}</span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-[7px] text-slate-300 block">CVV2:</span>
                        <span className="text-[10px] font-bold mt-0.5 block">{simCvv || '***'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center bg-slate-100 p-3 rounded-xl border border-slate-200 max-w-[240px]">
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed text-justify">
                      💡 این درگاه برای شبیه‌سازی دقیق زیبال تعبیه شده است. اطلاعات ورودی الزامی به کارت واقعی نداشته و شما می‌توانید دکمه پرداخت موفق آزمایشی را مستقیماً بزنید.
                    </p>
                  </div>
                </div>

                {/* سمت راست: ورودی‌ها */}
                <div className="md:col-span-7 space-y-4">
                  {/* شماره کارت */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-600 block">شماره کارت ۱۶ رقمی</label>
                    <input
                      type="text"
                      className="w-full text-center px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm tracking-widest font-black focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 transition-all"
                      placeholder="6274-XXXX-XXXX-XXXX"
                      maxLength={16}
                      value={simCardNo}
                      onChange={(e) => setSimCardNo(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  {/* CVV2  و تاریخ انقضاء */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-600 block">کد امنیتی CVV2</label>
                      <input
                        type="password"
                        className="w-full text-center px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 transition-all text-sm"
                        placeholder="***"
                        maxLength={4}
                        value={simCvv}
                        onChange={(e) => setSimCvv(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-600 block">تاریخ انقضاء (ماه/سال)</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          className="w-full text-center py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold"
                          placeholder="ماه"
                          maxLength={2}
                        />
                        <input
                          type="text"
                          className="w-full text-center py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-indigo-500 focus:bg-white text-xs font-bold"
                          placeholder="سال"
                          maxLength={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* رمز دوم پویا شتاب */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-600 block">رمز دوم اینترنتی (پویا)</label>
                    <div className="flex gap-2.5">
                      <input
                        type="password"
                        className="flex-1 text-center px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 tracking-wider transition-all text-sm"
                        placeholder="رمز پویا"
                        maxLength={8}
                        value={simPin}
                        onChange={(e) => setSimPin(e.target.value.replace(/\D/g, ''))}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSimOtpRequested(true);
                          setSimOtpTimer(60);
                          setSimPin('98320'); // کلمه پیش‌فرض اتوماتیک
                          alert('کد شبیه‌ساز رمز یکبار مصرف به گوشی شما پیامک شد: 98320');
                        }}
                        disabled={simOtpRequested && simOtpTimer > 0}
                        className={`px-4.5 rounded-xl text-[10px] font-black transition-all border cursor-pointer border-indigo-600 whitespace-nowrap ${
                          simOtpRequested && simOtpTimer > 0
                            ? 'bg-slate-100 text-slate-400 border-slate-200'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {simOtpRequested && simOtpTimer > 0 ? `ارسال مجدد (${simOtpTimer} ثانیه)` : 'درخواست رمز پویا'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* اکشن بار نهایی زیرگاه پرداخت شتاب */}
              <div className="bg-slate-100 p-5 px-6 flex flex-col md:flex-row gap-3 justify-between items-center border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    // انصراف از به پرداخت
                    const auth = localStorage.getItem('nexwin_pending_authority') || 'SIM-AUTH';
                    window.location.href = `${window.location.origin}/#/payment-callback?Status=NOK&Authority=${auth}`;
                  }}
                  className="w-full md:w-auto px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer"
                >
                  انصراف و ابطال فاکتور پرداخت ✕
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // پرداخت موفق با موفقیت
                    const auth = localStorage.getItem('nexwin_pending_authority') || 'SIM-AUTH';
                    window.location.href = `${window.location.origin}/#/payment-callback?Status=OK&Authority=${auth}`;
                  }}
                  className="w-full md:w-auto px-10 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition-all border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>پرداخت موفقیت‌آمیز آزمایشی (سریع)</span>
                  <Check size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* صفحه هوشمند انتقال امن و مستقیم به درگاه رسمی زیبال */}
      <AnimatePresence>
        {paymentRedirectUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[130] flex items-center justify-center p-4 font-['Vazirmatn'] text-slate-800"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden text-right p-8 relative flex flex-col items-center border border-slate-100"
            >
              {/* انیمیشن یا آیکون تپنده */}
              <div className="relative mb-6 flex justify-center items-center">
                <span className="absolute inline-flex h-16 w-16 rounded-full bg-blue-400 opacity-20 animate-ping"></span>
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold shadow-sm relative z-10">
                  💳
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 text-center mb-2">در حال انتقال به درگاه پرداخت زیبال</h3>
              <p className="text-xs text-slate-500 text-center leading-relaxed mb-6 font-medium">
                در حال اتصال امن به شبکه شاپرک... شما موقتاً جهت واریز وجه به سامانه رسمی زیبال هدایت میشوید و پس از پرداخت، به صورت خودکار به نکسوین بازخواهید گشت تا لایسنس شما فعال شود.
              </p>

              <div className="w-full space-y-3">
                <a
                  href={paymentRedirectUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    // بعد از باز شدن لینک، پنجره انتقال را می‌بندیم تا روند از سمت کاربر قابل کنترل باشد
                    setPaymentRedirectUrl(null);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black transition-all shadow-lg flex items-center justify-center gap-2 hover:shadow-indigo-500/20 text-center select-none"
                >
                  <span>ورود به درگاه پرداخت رسمی زیبال</span>
                  <Check size={16} />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    // انصراف
                    setPaymentRedirectUrl(null);
                  }}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all border-none cursor-pointer text-center"
                >
                  انصراف و بازگشت
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 w-full text-center">
                <span className="text-[10px] text-slate-400 font-extrabold flex items-center justify-center gap-1.5">
                  🛡️ اتصال ۱۰۰٪ امن و مستقیم به درگاه پرداخت تحت پروتکل SSL بانکی
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
