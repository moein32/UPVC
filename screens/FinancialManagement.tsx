
import React, { useState, useEffect } from 'react';
import { ArrowRight, Wallet, ChevronLeft, Search, CheckCircle2, Clock, Factory } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pricingStore } from '../services/pricingStore';
import { SavedProject } from '../types';
import { toPersianDigits, formatPrice } from '../utils/formatting';

export const FinancialManagement = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setProjects(pricingStore.getProjects());
  }, []);

  const filteredProjects = projects.filter(p => 
    p.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Draft': return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg"><Clock size={12}/> پیش‌فاکتور</span>;
      case 'Contract': return <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg"><CheckCircle2 size={12}/> قرارداد</span>;
      case 'Production': return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg"><Factory size={12}/> در حال تولید</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between mb-6">
           <button onClick={() => navigate('/dashboard')} className="p-2 bg-slate-100 rounded-xl text-slate-700"><ArrowRight size={20}/></button>
           <h1 className="text-xl font-black text-slate-900">مدیریت مالی</h1>
           <div className="w-10"></div>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="جستجوی نام مشتری..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-2xl py-3 px-12 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <Search className="absolute right-4 top-3.5 text-slate-400" size={18} />
        </div>
      </div>

      <div className="p-6 space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
             <Wallet size={48} className="mx-auto mb-4 opacity-20" />
             <p>پروژه‌ای برای نمایش یافت نشد.</p>
          </div>
        ) : (
          filteredProjects.map(project => {
            const totalPaid = (project.payments || []).reduce((acc, p) => acc + p.amount, 0);
            const balance = project.totalPrice - totalPaid;
            const progress = (totalPaid / project.totalPrice) * 100;
            const isSettled = balance <= 0;

            return (
              <div 
                key={project.id} 
                onClick={() => navigate(`/project-financials/${project.id}`)}
                className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 active:scale-95 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <h3 className="font-bold text-slate-900 text-lg mb-1">{project.customerName}</h3>
                      <p className="text-[10px] text-slate-400 font-medium">پروژه شماره: {toPersianDigits(project.id.slice(-6))}</p>
                   </div>
                   {getStatusBadge(project.status)}
                </div>

                <div className="space-y-3 mb-4">
                   <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">مبلغ کل پروژه</span>
                      <span className="text-slate-900">{formatPrice(project.totalPrice)}</span>
                   </div>
                   <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">مجموع دریافتی</span>
                      <span className="text-blue-600">{formatPrice(totalPaid)}</span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${isSettled ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                   </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                   <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">باقیمانده بدهی</span>
                      <span className={`text-sm font-black ${isSettled ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isSettled ? 'تسویه کامل' : formatPrice(balance)}
                      </span>
                   </div>
                   <button className="p-2 bg-slate-50 rounded-xl text-slate-400 group-active:text-blue-600">
                      <ChevronLeft size={20} className="rotate-180" />
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
