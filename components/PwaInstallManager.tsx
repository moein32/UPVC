import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Share, 
  X, 
  Info, 
  Wifi, 
  WifiOff, 
  ArrowDown, 
  Smartphone, 
  Chrome, 
  Check, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Layout,
  PlusSquare,
  Compass
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export const PwaInstallManager = () => {
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  // UI States
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideStep, setGuideStep] = useState(1);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'other'>('other');
  
  // Network States
  const [isOnline, setIsOnline] = useState(true);
  const [showNetworkToast, setShowNetworkToast] = useState(false);
  const [networkToastType, setNetworkToastType] = useState<'online' | 'offline'>('online');

  useEffect(() => {
    // 1. Detect environment
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIos(isIosDevice);
    if (isIosDevice) {
      setDeviceType('ios');
    } else if (isAndroidDevice) {
      setDeviceType('android');
    } else {
      setDeviceType('other');
    }

    const isInStandalone = ('standalone' in window.navigator && (window.navigator as any).standalone === true) || 
                          window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInStandalone);

    // 2. Let's decide if we show the installation banner
    const isDismissed = localStorage.getItem('pwa_install_banner_dismissed_v2');
    if (!isInStandalone && !isDismissed) {
      // Small delay on startup to make it elegant
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isStandalone]);

  useEffect(() => {
    // 3. Listen to Android PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // If we got the native event, force guide/prompt layout to android mode
      setDeviceType('android');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Listen to real-time Network state changes for reliable offline operation
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkToastType('online');
      setShowNetworkToast(true);
      setTimeout(() => setShowNetworkToast(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkToastType('offline');
      setShowNetworkToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deviceType === 'ios') {
      setGuideStep(1);
      setShowGuideModal(true);
    } else if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowInstallBanner(false);
        }
      } catch (err) {
        console.error('Failed to trigger PWA prompt:', err);
        // Fallback to manual guide
        setGuideStep(1);
        setShowGuideModal(true);
      }
    } else {
      // Fallback manual guide for Android/Chrome/Desktop
      setGuideStep(1);
      setShowGuideModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa_install_banner_dismissed_v2', 'true');
  };

  return (
    <>
      {/* 1. NETWORK TOAST (Blu Bank Style - minimalist premium pill) */}
      <AnimatePresence>
        {showNetworkToast && (
          <div className="fixed top-6 left-4 right-4 z-[9999] flex justify-center pointer-events-none font-['Vazirmatn']" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border ${
                networkToastType === 'online' 
                  ? 'bg-slate-950/90 text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-950/95 text-rose-300 border-rose-500/30'
              } backdrop-blur-md max-w-sm w-full`}
            >
              <div className={`p-1.5 rounded-full ${networkToastType === 'online' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {networkToastType === 'online' ? <Wifi size={18} /> : <WifiOff size={18} className="animate-pulse" />}
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs font-bold leading-normal">
                  {networkToastType === 'online' 
                    ? 'ارتباط آنلاین مجددا برقرار شد' 
                    : 'دستگاه شما آفلاین شد (کار آفلاین فعال شد)'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {networkToastType === 'online' 
                    ? 'پلتفرم لایسنس و جداول با سرور همگام شدند.' 
                    : 'بدون اختلال می‌توانید به محاسبات ادامه دهید.'}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. FLOATING BOTTOM PWA INSTALL BANNER (Classic Iranian Fintech Style) */}
      <AnimatePresence>
        {showInstallBanner && !showGuideModal && !isStandalone && (
          <div className="fixed bottom-4 left-4 right-4 z-[999] flex justify-center font-['Vazirmatn'] select-none" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] border border-blue-500/20 p-5 md:p-6 shadow-[0_30px_70px_rgba(0,0,0,0.6)] flex flex-col md:flex-row items-center gap-4 text-white relative overflow-hidden"
            >
              {/* Highlight background shine */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-[40px] pointer-events-none"></div>

              {/* Close Button */}
              <button 
                onClick={handleDismissBanner}
                className="absolute left-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors pointer-events-auto cursor-pointer"
              >
                <X size={14} />
              </button>

              {/* Logo icon with glow */}
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[1.25rem] flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-400/30 p-2">
                <img src="/logo.png" alt="NexWin" className="w-full h-full object-contain rounded-md" />
              </div>

              {/* Text Body */}
              <div className="flex-1 text-center md:text-right pr-0 md:pr-1 pl-4">
                <div className="flex items-center justify-center md:justify-start gap-1.5">
                  <span className="text-sm font-black text-white">نصب رایگان وب‌اپلیکیشن نکس‌وین</span>
                  <Sparkles size={14} className="text-blue-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                  برای دسترسی فوق‌سریع آفلاین، بدون نیاز به بازار و سیب‌اپ، نکس‌وین را به صفحه اصلی اضافه کنید.
                </p>
              </div>

              {/* Install Action */}
              <button
                onClick={handleInstallClick}
                className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.97] transition-all text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/20 cursor-pointer text-center whitespace-nowrap"
              >
                {deviceType === 'ios' ? 'نصب آسان در آیفون' : 'نصب مستقیم نسخه وب‌اپ'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. DETAILED INTERACTIVE GUIDE MODAL (Mimicking Blu Bank PWA Onboarding) */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-transparent backdrop-blur-lg/40 font-['Vazirmatn'] select-none" dir="rtl">
            {/* Backdrop cover */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuideModal(false)}
              className="absolute inset-0 bg-slate-950/60 pointer-events-auto"
            />

            {/* iOS Bottom Sheet Container */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="relative w-full max-w-lg bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] z-10 overflow-hidden flex flex-col max-h-[92vh] pb-[env(safe-area-inset-bottom,20px)]"
            >
              {/* Top Drag Indicator Line */}
              <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto my-3 flex-shrink-0"></div>

              {/* Close Button top-left */}
              <button 
                onClick={() => setShowGuideModal(false)}
                className="absolute left-6 top-5 p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/80 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Content Header */}
              <div className="px-6 pb-2 text-center flex-shrink-0">
                <h3 className="text-lg font-black text-white">راهنمای تصویری نصب وب‌اپلیکیشن</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">سازگار با مرورگر {isIos ? 'Safari آیفون' : 'Chrome و اندروید'}</p>
              </div>

              {/* Segment Toggle Link (iOS vs Android) */}
              <div className="px-6 py-2 flex-shrink-0">
                <div className="bg-slate-950 p-1 rounded-2xl flex border border-white/5">
                  <button 
                    onClick={() => { setDeviceType('ios'); setGuideStep(1); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      deviceType === 'ios' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone size={14} />
                    پیش‌نمایش نصب آیفون (iOS)
                  </button>
                  <button 
                    onClick={() => { setDeviceType('android'); setGuideStep(1); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      deviceType === 'android' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Chrome size={14} />
                    نصب سیستم اندروید / سایر
                  </button>
                </div>
              </div>

              {/* Inner Slideable step screen */}
              <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-none no-scrollbar">
                
                {deviceType === 'ios' ? (
                  /* ================== IOS FLOW ================== */
                  <div className="space-y-6">
                    {/* Mock Safari address UI */}
                    <div className="bg-slate-950 rounded-3xl p-5 border border-white/5 space-y-4">
                      
                      {guideStep === 1 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-4 text-center"
                        >
                          <div className="relative mx-auto w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                            {/* Mock Safari Share bar */}
                            <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-6 text-blue-400">
                              <Compass size={18} className="text-slate-600" />
                              <div className="relative">
                                <div className="absolute inset-[-10px] bg-blue-500/30 rounded-full animate-ping pointer-events-none"></div>
                                <div className="p-2 bg-blue-600/20 rounded-full">
                                  <Share size={20} className="text-blue-400 animate-bounce" />
                                </div>
                              </div>
                              <Layout size={18} className="text-slate-600" />
                            </div>
                            <span className="text-[10px] text-slate-500 block text-center mt-2 font-mono">Safari Browser Toolbar</span>
                          </div>
                          
                          <div className="space-y-1.5 mt-2">
                            <span className="inline-flex px-2.5 py-0.5 bg-blue-500/10 text-blue-400 font-black rounded-lg text-[10px]">مرحله اول</span>
                            <h4 className="text-sm font-black text-slate-200">دکمه اشتراک‌گذاری (Share) را لمس کنید</h4>
                            <p className="text-xs text-slate-400 leading-relaxed px-4">
                              در نوار ابزار پایینی مرورگر سافاری روی نماد <strong className="text-blue-400">شیر (جعبه با فلش رو به بالا)</strong> کلیک فرمایید.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {guideStep === 2 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-4 text-center"
                        >
                          <div className="relative mx-auto w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2">
                            <div className="text-[10px] text-slate-500 text-right pb-1 border-b border-white/5">منوی اکشن مرورگر سافاری</div>
                            <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-800/30 text-slate-400 text-xs">
                              <PlusSquare size={16} />
                              <span className="flex-1 text-right">Add Bookmark</span>
                            </div>
                            <div className="relative flex items-center gap-3 px-2 py-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-white text-xs">
                              <div className="absolute inset-0 bg-blue-500/10 rounded-xl animate-pulse pointer-events-none"></div>
                              <div className="p-1 bg-blue-500/20 text-blue-400 rounded-lg">
                                <PlusSquare size={16} />
                              </div>
                              <span className="flex-1 text-right font-black">Add to Home Screen</span>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                            </div>
                            <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-800/30 text-slate-400 text-xs">
                              <Compass size={16} />
                              <span className="flex-1 text-right">Request Desktop Website</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="inline-flex px-2.5 py-0.5 bg-blue-500/10 text-blue-400 font-black rounded-lg text-[10px]">مرحله دوم</span>
                            <h4 className="text-sm font-black text-slate-200">افزودن به صفحه اصلی را انتخاب نمایید</h4>
                            <p className="text-xs text-slate-400 leading-relaxed px-4">
                              در منوی باز شده به پایین اسکرول کنید و دکمه <strong className="text-white">Add to Home Screen</strong> (افزودن به صفحه اصلی) را کلیک کنید.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {guideStep === 3 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-4 text-center"
                        >
                          <div className="relative mx-auto w-full max-w-[280px] bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                              <span className="text-xs text-slate-500">Add to Home Screen</span>
                              <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg animate-pulse">Add</span>
                            </div>
                            <div className="flex items-center gap-3 mt-3">
                              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl p-1.5">
                                <img src="/logo.png" className="w-full h-full object-contain" />
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-white block">Nexwin</span>
                                <span className="text-[9px] text-slate-500 block font-mono">https://ais-dev-t4plvqmecyo5...</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="inline-flex px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 font-black rounded-lg text-[10px]">مرحله آخر</span>
                            <h4 className="text-sm font-black text-slate-200">دکمه افزودن (Add) را ثبت کنید</h4>
                            <p className="text-xs text-slate-400 leading-relaxed px-4">
                              در بالای صفحه سمت راست و بر روی کادر باز شده، دکمه شکیل <strong className="text-blue-400">Add</strong> یا افزودن را لمس نمایید تا از اجرای آن لذت ببرید.
                            </p>
                          </div>
                        </motion.div>
                      )}

                    </div>

                    {/* Step dots navigation */}
                    <div className="flex items-center justify-between mt-4">
                      <button 
                        disabled={guideStep === 1}
                        onClick={() => setGuideStep(p => Math.max(1, p - 1))}
                        className="p-2.5 rounded-2xl bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                      >
                        <ChevronRight size={16} />
                        مرحله قبل
                      </button>

                      <div className="flex items-center gap-2">
                        {[1, 2, 3].map(step => (
                          <div 
                            key={step} 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              guideStep === step ? 'w-6 bg-blue-500' : 'w-2 bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>

                      {guideStep < 3 ? (
                        <button 
                          onClick={() => setGuideStep(p => Math.min(3, p + 1))}
                          className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black shadow-md shadow-blue-500/10 animate-pulse"
                        >
                          مرحله بعد
                          <ChevronLeft size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => setShowGuideModal(false)}
                          className="p-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black shadow-md shadow-emerald-500/10"
                        >
                          <Check size={16} />
                          متوجه شدم
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ================== ANDROID FLOW ================== */
                  <div className="space-y-6 text-center">
                    <div className="bg-slate-950 rounded-3xl p-6 border border-white/5 space-y-5">
                      <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-1 border border-blue-500/20">
                        <Smartphone size={32} className="animate-pulse" />
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-base font-black text-white">نصب ساده روی سیستم‌عامل اندروید و مرورگر کروم</h4>
                        <p className="text-xs text-slate-400 leading-relaxed px-2">
                          پلتفرم مدیریت نکسوین کاملا آماده نصب می‌باشد. شما با لمس دکمه زیر می‌توانید آن را مستقیماً مانند یک اپلیکیشن بومی پرسرعت روی گوشی خود نصب کنید.
                        </p>
                      </div>

                      {deferredPrompt ? (
                        <button
                          onClick={handleInstallClick}
                          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-black rounded-2xl text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer my-2 flex items-center justify-center gap-2"
                        >
                          <Sparkles size={16} className="text-amber-400 animate-spin" />
                          نصب مستقیم نکس‌وین روی گوشی
                        </button>
                      ) : (
                        <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl space-y-3 text-right">
                          <span className="text-[10px] text-slate-500 block font-bold">🛠️ راهنمای نصب دستی اندروید:</span>
                          <ol className="text-xs text-slate-300 space-y-2 leading-relaxed">
                            <li className="flex items-start gap-1.5">
                              <span className="font-bold text-blue-400">۱.</span>
                              <span>در بالای مرورگر دکمه <strong className="text-white">منو (۳ نقطه)</strong> را کلیک کنید.</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="font-bold text-blue-400">۲.</span>
                              <span>گزینه <strong className="text-white">Install App</strong> یا <strong className="text-white">Add to Home screen</strong> را کلیک نمایید.</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="font-bold text-blue-400">۳.</span>
                              <span>بر روی دکمه تایید نهایی ضربه بزنید تا نسخه کامل نصب و به هوم‌اسکرین اضافه شود.</span>
                            </li>
                          </ol>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => setShowGuideModal(false)}
                      className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer text-xs font-bold border border-slate-700"
                    >
                      بستن کادر راهنما
                    </button>
                  </div>
                )}

              </div>
              
              {/* Bottom Brand Watermark */}
              <div className="text-center pt-2 pb-4 text-[9px] text-slate-600 flex items-center justify-center gap-1.5 flex-shrink-0">
                <span>امنیت تضمین شده توسط سیستم نکس‌وین</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
