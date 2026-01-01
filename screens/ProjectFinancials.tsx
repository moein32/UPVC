
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Trash2, Calendar, CreditCard, Banknote, ShieldCheck, CheckCircle, Factory, FileText, Info } from 'lucide-react';
import { pricingStore } from '../services/pricingStore';
import { SavedProject, Payment } from '../types';
import { formatPrice, toPersianDigits, toEnglishDigits } from '../utils/formatting';
import { PrimaryButton, InputField } from '../components/UIComponents';

export const ProjectFinancials = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<SavedProject | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  
  // Payment Form State
  const [paymentType, setPaymentType] = useState<'Cash' | 'Check'>('Cash');
  const [amount, setAmount] = useState('');
  const [checkNum, setCheckNum] = useState('');
  const [bankName, setBankName] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    const loaded = pricingStore.getProjects().find((p: any) => p.id === id);
    if (loaded) setProject(loaded);
    else navigate('/financial-mgmt');
  }, [id, navigate]);

  const handleAddPayment = () => {
    if (!project || !amount) return;
    const newPayment: Payment = {
      id: Date.now().toString(),
      amount: Number(toEnglishDigits(amount)),
      date: new Date().toISOString(),
      type: paymentType,
      checkDetails: paymentType === 'Check' ? {
        checkNumber: checkNum,
        bankName: bankName,
        dueDate: dueDate,
        isSayad: true
      } : undefined
    };

    const updated = {
      ...project,
      payments: [...(project.payments || []), newPayment]
    };
    setProject(updated);
    pricingStore.saveProject(updated);
    setShowAddPayment(false);
    resetForm();
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!project || !window.confirm('آیا از حذف این تراکنش اطمینان دارید؟')) return;
    const updated = {
      ...project,
      payments: project.payments.filter(p => p.id !== paymentId)
    };
    setProject(updated);
    pricingStore.saveProject(updated);
  };

  const resetForm = () => {
    setAmount(''); setCheckNum(''); setBankName(''); setDueDate('');
  };

  if (!project) return null;

  const totalPaid = (project.payments || []).reduce((acc, p) => acc + p.amount, 0);
  const balance = project.totalPrice - totalPaid;
  const isSettled = balance <= 0;

  const getStatusLabel = (s: string) => {
      switch(s) {
          case 'Draft': return 'پیش‌فاکتور';
          case 'Contract': return 'قرارداد رسمی';
          case 'Production': return 'در حال تولید';
          case 'Produced': return 'تولید شده';
          default: return s;
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="bg-slate-900 text-white p-6 pt-12 rounded-b-[40px] shadow-2xl">
        <div className="flex items-center justify-between mb-8">
           <button onClick={() => navigate('/financial-mgmt')} className="p-2 bg-white/10 rounded-xl"><ArrowRight size={20}/></button>
           <h1 className="text-lg font-bold">جزئیات مالی پروژه</h1>
           <div className="w-10"></div>
        </div>

        <div className="text-center mb-8">
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">باقیمانده کل بدهی</p>
           <h2 className={`text-4xl font-black ${isSettled ? 'text-emerald-400' : 'text-white'}`}>
             {isSettled ? 'تسویه کامل' : formatPrice(balance)}
           </h2>
           {!isSettled && <span className="text-[10px] text-slate-500 font-medium">تومان</span>}
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] text-slate-400 mb-1">مبلغ قرارداد</p>
              <p className="font-bold">{formatPrice(project.totalPrice)}</p>
           </div>
           <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <p className="text-[10px] text-slate-400 mb-1">کل دریافتی</p>
              <p className="font-bold text-blue-400">{formatPrice(totalPaid)}</p>
           </div>
        </div>
      </div>

      <div className="p-6">
        {/* Read-Only Status Indicator */}
        <div className="mb-10 bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
               <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Info size={20}/></div>
               <div>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">وضعیت فعلی پروژه</p>
                   <p className="font-black text-slate-900">{getStatusLabel(project.status)}</p>
               </div>
           </div>
           <button onClick={() => navigate('/projects')} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">مدیریت وضعیت</button>
        </div>

        {/* Payments List */}
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">تاریخچه پرداختی‌ها</h3>
           <button 
             onClick={() => setShowAddPayment(true)}
             className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl"
           >
              <Plus size={16}/> ثبت دریافتی جدید
           </button>
        </div>

        <div className="space-y-3">
           {(project.payments || []).length === 0 ? (
             <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400 text-sm">تراکنشی یافت نشد.</div>
           ) : (
             project.payments.map(p => (
               <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className={`p-3 rounded-xl ${p.type === 'Cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {p.type === 'Cash' ? <Banknote size={20}/> : <CreditCard size={20}/>}
                     </div>
                     <div>
                        <p className="font-bold text-slate-900 text-sm">{p.type === 'Cash' ? 'نقدی' : `چک صیادی - ${p.checkDetails?.bankName}`}</p>
                        <p className="text-[10px] text-slate-400">{p.type === 'Check' ? `شماره: ${toPersianDigits(p.checkDetails?.checkNumber)} | سررسید: ${toPersianDigits(p.checkDetails?.dueDate)}` : toPersianDigits(new Date(p.date).toLocaleDateString('fa-IR'))}</p>
                     </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                     <span className="font-black text-slate-800">{formatPrice(p.amount)}</span>
                     <button onClick={() => handleDeletePayment(p.id)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>

      {showAddPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black text-slate-900">ثبت دریافتی جدید</h2>
                 <button onClick={() => setShowAddPayment(false)} className="p-2 bg-slate-100 rounded-full text-slate-400">×</button>
              </div>

              <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-2xl">
                 <button onClick={() => setPaymentType('Cash')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${paymentType === 'Cash' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>نقد / واریز</button>
                 <button onClick={() => setPaymentType('Check')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${paymentType === 'Check' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>چک صیادی</button>
              </div>

              <div className="space-y-4 mb-8">
                 <InputField label="مبلغ پرداختی (تومان)" type="number" value={amount} onChange={(e:any) => setAmount(e.target.value)} />
                 {paymentType === 'Check' && (
                    <>
                       <div className="grid grid-cols-2 gap-4">
                          <InputField label="بانک صادرکننده" value={bankName} onChange={(e:any) => setBankName(e.target.value)} />
                          <InputField label="شماره چک" value={checkNum} onChange={(e:any) => setCheckNum(e.target.value)} />
                       </div>
                       <InputField label="تاریخ سررسید" value={dueDate} onChange={(e:any) => setDueDate(e.target.value)} />
                    </>
                 )}
              </div>

              <PrimaryButton fullWidth onClick={handleAddPayment}>تایید و ثبت در سیستم</PrimaryButton>
           </div>
        </div>
      )}
    </div>
  );
};
