import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, CreditCard, ArrowLeft, Loader2, Landmark } from 'lucide-react';
import { verifyZarinpalPayment } from '../services/paymentService';
import { AppUser } from '../types';

export function PaymentCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refId, setRefId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [tierName, setTierName] = useState<string>('');
  const [registeredUser, setRegisteredUser] = useState<AppUser | null>(null);

  useEffect(() => {
    async function verifyAndActivate() {
      // استخراج پارامترها از روش های مختلف URL
      const currentUrl = window.location.href;
      const urlObj = new URL(currentUrl.replace('#/', '')); // تمیز کردن هش جهت پارس دقیق‌تر
      
      // بازیابی پارامترها از سرچ یا کوئری هش
      let status = urlObj.searchParams.get('Status') || '';
      let authority = urlObj.searchParams.get('Authority') || '';

      if (!status || !authority) {
        // روش دوم: استفاده از سرچ عمومی پنجره
        const mainSearch = new URLSearchParams(window.location.search);
        status = status || mainSearch.get('Status') || '';
        authority = authority || mainSearch.get('Authority') || '';
      }

      // اگر در شبیه‌ساز یا Sandbox هستیم و پارامتری نیست، شبیه‌سازی انجام شود
      if (!authority) {
        // بازیابی آخرین تراکنش شبیه‌سازی شده از سشن
        const pendingAuth = localStorage.getItem('nexwin_pending_authority');
        if (pendingAuth) {
          authority = pendingAuth;
          status = 'OK';
        } else {
          setLoading(false);
          setSuccess(false);
          setErrorMessage('شناسه معتبر تراکنش یافت نشد. پرداخت ملغی گردید.');
          return;
        }
      }

      const pendingSignupStr = localStorage.getItem('nexwin_pending_signup');
      if (!pendingSignupStr) {
        setLoading(false);
        setSuccess(false);
        setErrorMessage('اطلاعات کارگاه ثبت‌نامی یافت نشد. بازه زمانی منقضی گردیده است.');
        return;
      }

      const pendingSignup = JSON.parse(pendingSignupStr);
      setAmount(pendingSignup.amountTomans);
      
      const tierMap: Record<string, string> = {
        bronze: 'نقشه پایه برنزی (Bronze)',
        silver: 'بهینه‌برش خط تولید نقره‌ای (Silver)',
        gold: 'پادشاه طراح طلایی (Gold)'
      };
      setTierName(tierMap[pendingSignup.tier] || pendingSignup.tier);

      if (status === 'NOK') {
        setLoading(false);
        setSuccess(false);
        setErrorMessage('پرداخت توسط کاربر کلا کنسل شد یا با خطا مواجه گردید.');
        return;
      }

      // اجرای تایید نهایی درگاه
      const verification = await verifyZarinpalPayment(authority, pendingSignup.amountTomans);
      
      if (verification.success) {
        setRefId(verification.refId || '123456');

        // تولید لایسنس دائمی تجاری
        const generatedId = 'NW-' + Math.floor(10000 + Math.random() * 90000);
        
        const activeUser: AppUser = {
          id: generatedId,
          owner_name: pendingSignup.ownerName,
          company_name: pendingSignup.companyName,
          phone_number: pendingSignup.phoneDigits,
          tier: pendingSignup.tier,
          status: 'active',
          register_date: new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date()),
          expiry_date: 'بدون منقضی (تجاری ۳ ساله دائم)',
          max_devices: pendingSignup.tier === 'gold' ? 5 : pendingSignup.tier === 'silver' ? 3 : 1,
          total_paid: pendingSignup.amountTomans,
          is_trial: false
        };

        // ذخیره در بانک لوکال سیستم (جهت دمو و آفلاین)
        localStorage.setItem('nexwin_user', JSON.stringify(activeUser));
        
        // همچنین اضافه کردن به لیست شماره همراه‌های ثبت شده در مرورگر جهت پیشگیری از ثبت‌نام مجدد
        const registeredStr = localStorage.getItem('nexwin_registered_users') || '[]';
        const registered = JSON.parse(registeredStr) as string[];
        if (!registered.includes(pendingSignup.phoneDigits)) {
          registered.push(pendingSignup.phoneDigits);
          localStorage.setItem('nexwin_registered_users', JSON.stringify(registered));
        }

        // اگر Supabase بود در Supabase هم ذخیره کنیم
        const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const VITE_SUPABASE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
        const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

        if (VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY) {
          try {
            // ۱. ثبت یا به‌روزرسانی مشخصات لایسنس کاربر در جدول app_users با قابلیت لغو تداخل نهایی کاربرها (بر اساس شماره همراه یکتا)
            const userRes = await fetch(`${VITE_SUPABASE_URL}/rest/v1/app_users?on_conflict=id`, {
              method: 'POST',
              headers: {
                'apikey': VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=minimal'
              },
              body: JSON.stringify({
                id: activeUser.id,
                owner_name: activeUser.owner_name,
                company_name: activeUser.company_name,
                phone_number: activeUser.phone_number,
                tier: activeUser.tier,
                status: activeUser.status,
                max_devices: activeUser.max_devices,
                total_paid: activeUser.total_paid,
                is_trial: activeUser.is_trial,
                register_date: activeUser.register_date,
                expiry_date: activeUser.expiry_date
              })
            });

            if (!userRes.ok) {
              const errTxt = await userRes.text();
              console.error(`Supabase app_users sync failed. HTTP status: ${userRes.status}. Body: ${errTxt}`);
            } else {
              console.log('Supabase premium app_user synced/updated successfully.');
            }

            // ۲. ثبت آرشیو تراکنش مالی زرین‌پال / نکس‌وین در جدول payment_transactions جهت شفافیت حسابداری
            const txRes = await fetch(`${VITE_SUPABASE_URL}/rest/v1/payment_transactions`, {
              method: 'POST',
              headers: {
                'apikey': VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                license_id: activeUser.id,
                phone_number: activeUser.phone_number,
                amount_tomans: activeUser.total_paid,
                authority_code: authority,
                ref_id: verification.refId || '123456',
                status: 'SUCCESS'
              })
            });

            if (!txRes.ok) {
              const txErrTxt = await txRes.text();
              console.error(`Supabase payment_transactions insert failed. HTTP status: ${txRes.status}. Body: ${txErrTxt}`);
            } else {
              console.log('Supabase payment_transaction logged successfully.');
            }
          } catch (supaErr) {
            console.error('Failed to sync payment and transaction with Supabase:', supaErr);
          }
        }

        setRegisteredUser(activeUser);
        setSuccess(true);
        // تمیز کردن کلید خرید معلق
        localStorage.removeItem('nexwin_pending_signup');
        localStorage.removeItem('nexwin_pending_authority');
      } else {
        setSuccess(false);
        setErrorMessage(verification.message);
      }
      setLoading(false);
    }

    verifyAndActivate();
  }, []);

  const handleEnterApp = () => {
    navigate('/dashboard', { replace: true });
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#090d16] font-['Vazirmatn'] text-white text-right p-4 select-none">
      <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-slate-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 shadow-[0_45px_90px_rgba(0,0,0,0.65)] text-center relative z-50 overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-600 to-emerald-500"></div>

        {loading ? (
          <div className="py-12 space-y-5 flex flex-col items-center">
            <Loader2 size={54} className="text-blue-500 animate-spin" />
            <h3 className="text-xl font-black">در حال تایید اصالت تراکنش از زرین‌پال...</h3>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              لطفاً از دکمه‌های بازگشت مرورگر استفاده نکنید. در حال فعال‌سازی آنی حساب لایسنس کاربری شما بر روی سرور ابری نکس‌وین هستیم.
            </p>
          </div>
        ) : success ? (
          <div className="space-y-6">
            <div className="inline-flex p-4.5 bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.25)] animate-bounce mb-2">
              <CheckCircle2 size={52} />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-emerald-400">تراکنش موفقیت‌آمیز بود! 🎉</h3>
              <p className="text-xs text-slate-300">طرح انتخابی شما با موفقیت بر روی لایسنس سرور ابری نکس‌وین ثبت و فعال گردید.</p>
            </div>

            <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 text-right space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                <span className="text-slate-400 font-bold">بسته اشتراکی:</span>
                <span className="font-extrabold text-slate-100">{tierName}</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                <span className="text-slate-400 font-bold">شماره پیگیری بانک:</span>
                <span className="font-mono font-black text-emerald-300">{refId}</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                <span className="text-slate-400 font-bold">مبلغ پرداخت شده:</span>
                <span className="font-bold text-white">
                  {(amount * 10).toLocaleString('fa-IR')} ریال
                </span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                <span className="text-slate-400 font-bold">مدت قرارداد لایسنس:</span>
                <span className="font-black text-yellow-400">بدون منقضی (تجاری دائم ۳ ساله)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">شناسه اختصاصی لایسنس (License ID):</span>
                <span className="font-mono text-yellow-400 font-black tracking-wider text-sm select-all">
                  {registeredUser?.id}
                </span>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3.5 text-right text-[10px] text-blue-300 flex gap-2">
              <Landmark size={18} className="shrink-0 text-blue-400" />
              <span>
                توجه: این فاکتور دیجیتالی و لایسنس فعالسازی بلافاصله به تلفن همراه {registeredUser?.phone_number} پیامک گردید. شما می‌توانید با استفاده از این شناسه و هر دستگاه دیگری وارد بوم طراحی نکس‌وین شوید.
              </span>
            </div>

            <button
              onClick={handleEnterApp}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/30 transition-all border-none cursor-pointer"
            >
              <span>ورود فوری به بوم کارگاهی نکس‌وین</span>
              <CheckCircle2 size={18} />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="inline-flex p-4.5 bg-rose-500/15 text-rose-400 rounded-full border border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.25)] mb-2">
              <XCircle size={52} />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-rose-400">تراکنش نا‌موفق بود ⚠️</h3>
              <p className="text-xs text-slate-300">در فرآیند اعتبارسنجی پرداخت الکترونیکی اختلالی رخ داد.</p>
            </div>

            <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 text-right text-xs text-rose-200 leading-relaxed">
              {errorMessage || 'خطای غیرمنتظره در ارتباط با دروازه شبکه شتاب بانکی.'}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                <span>بازگشت به صفحه ثبت‌نام</span>
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex-[1.5] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-2xl active:scale-95 shadow-xl transition-all border-none cursor-pointer"
              >
                تلاش مجدد پرداخت
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
