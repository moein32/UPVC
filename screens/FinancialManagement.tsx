import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Wallet, 
  ChevronLeft, 
  Search, 
  CheckCircle2, 
  Clock, 
  Factory, 
  TrendingUp, 
  Coins, 
  BarChart3, 
  Filter, 
  Calendar 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pricingStore } from '../services/pricingStore';
import { SavedProject } from '../types';
import { toPersianDigits, formatPrice } from '../utils/formatting';

export const FinancialManagement = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [financialFilter, setFinancialFilter] = useState<'all' | 'settled' | 'unsettled'>('all');

  useEffect(() => {
    setProjects(pricingStore.getProjects().filter(p => p.status !== 'Draft'));
  }, []);

  // Net Profit calculation per project
  const getProjectNetProfit = (project: SavedProject) => {
    let totalProfit = 0;
    const profitPercent = project.profitPercent !== undefined ? project.profitPercent : 20;
    
    if (!project.items || project.items.length === 0) return 0;

    project.items.forEach(item => {
      if (item.calculations && item.calculations.details) {
        item.calculations.details.forEach(detail => {
          const pPrice = detail.purchaseUnitPrice !== undefined 
            ? detail.purchaseUnitPrice 
            : Math.round(detail.unitPrice / (1 + profitPercent / 100));
          const sellingPrice = detail.unitPrice;
          const profitPerUnit = sellingPrice - pPrice;
          totalProfit += Math.round(profitPerUnit * detail.quantity * item.quantity);
        });
      }
    });
    return totalProfit;
  };

  const getPersianMonthYear = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'نامشخص';
      return new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' }).format(d);
    } catch (e) {
      return 'نامشخص';
    }
  };

  // Group months
  const monthsList = Array.from(new Set(projects.map(p => getPersianMonthYear(p.date))))
    .filter(m => m !== 'نامشخص');

  // Filter projects by month and search and financial state
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = selectedMonth === 'all' || getPersianMonthYear(p.date) === selectedMonth;
    
    const totalPaid = (p.payments || []).reduce((acc, pay) => acc + pay.amount, 0);
    const balance = p.totalPrice - totalPaid;
    const isSettled = balance <= 0;

    const matchesFinancial = 
      financialFilter === 'all' || 
      (financialFilter === 'settled' && isSettled) || 
      (financialFilter === 'unsettled' && !isSettled);

    return matchesSearch && matchesMonth && matchesFinancial;
  });

  // Calculate Overall / filtered statistics
  const projectsForStats = projects.filter(p => selectedMonth === 'all' || getPersianMonthYear(p.date) === selectedMonth);

  const totalSales = projectsForStats.reduce((sum, p) => sum + p.totalPrice, 0);
  const totalNetProfit = projectsForStats.reduce((sum, p) => sum + getProjectNetProfit(p), 0);
  
  const totalReceivables = projectsForStats.reduce((sum, p) => {
    const paid = (p.payments || []).reduce((acc, pay) => acc + pay.amount, 0);
    return sum + Math.max(0, p.totalPrice - paid);
  }, 0);

  const totalReceived = totalSales - totalReceivables;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Draft': return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg"><Clock size={12}/> پیش‌فاکتور</span>;
      case 'Contract': return <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg"><CheckCircle2 size={12}/> قرارداد</span>;
      case 'Production': return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg"><Factory size={12}/> در حال تولید</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-right" dir="rtl">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-20 border-b border-slate-100">
        <div className="flex items-center justify-between mb-6">
           <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"><ArrowRight size={20}/></button>
           <h1 className="text-xl font-black text-slate-900">مدیریت مالی و سود دهی</h1>
           <div className="w-10"></div>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="جستجوی نام مشتری..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-2xl py-3 px-12 text-sm focus:ring-2 focus:ring-blue-500 transition-all text-right"
          />
          <Search className="absolute right-4 top-3.5 text-slate-400" size={18} />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Statistics section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" />
              آمار و عملکرد مالی کارگاه
            </h2>
            {/* Month Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">همه دوره‌ها (کل)</option>
                {monthsList.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bento-style KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Overall Sales */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-blue-100 transition-all">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <TrendingUp size={22} />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">فروش ناخالص کل</span>
                <div className="text-base font-black text-slate-900">{formatPrice(totalSales)}</div>
              </div>
            </div>

            {/* KPI 2: Workshop Net Profit */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-emerald-100 transition-all">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Coins size={22} />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">سود خالص کارگاه</span>
                <div className="text-base font-black text-emerald-600">{formatPrice(totalNetProfit)}</div>
              </div>
            </div>

            {/* KPI 3: Receivables */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-red-100 transition-all">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                <Wallet size={22} />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">مطالبات معوقه مشتریان</span>
                <div className="text-base font-black text-red-500">{formatPrice(totalReceivables)}</div>
              </div>
            </div>

            {/* KPI 4: Total Projects */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-purple-100 transition-all">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                <CheckCircle2 size={22} />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">تعداد کل پروژه‌ها</span>
                <div className="text-base font-black text-slate-900">{toPersianDigits(projectsForStats.length)} پروژه</div>
              </div>
            </div>
          </div>

          {/* Visual Progress Chart (Clean UI representation) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-700">تحلیل درآمد و سود کارگاه ({selectedMonth === 'all' ? 'کل زمان‌ها' : selectedMonth})</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>سهم هزینه خرید متریال اولیه</span>
                  <span>{toPersianDigits(totalSales > 0 ? Math.round(((totalSales - totalNetProfit) / totalSales) * 100) : 0)}٪</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-400 transition-all duration-1000" 
                    style={{ width: `${totalSales > 0 ? ((totalSales - totalNetProfit) / totalSales) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold text-emerald-600 mb-1">
                  <span>سهم سود خالص تولیدکننده</span>
                  <span>{toPersianDigits(totalSales > 0 ? Math.round((totalNetProfit / totalSales) * 100) : 0)}٪</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold text-blue-600 mb-1">
                  <span>مجموع مبالغ نقد دریافتی (وصول شده)</span>
                  <span>{toPersianDigits(totalSales > 0 ? Math.round((totalReceived / totalSales) * 100) : 0)}٪</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-1000" 
                    style={{ width: `${totalSales > 0 ? (totalReceived / totalSales) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Filter size={18} className="text-slate-400" />
              لیست پروژه‌ها و حسابرسی
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setFinancialFilter('all')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${financialFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                همه
              </button>
              <button 
                onClick={() => setFinancialFilter('settled')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${financialFilter === 'settled' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                تسویه شده
              </button>
              <button 
                onClick={() => setFinancialFilter('unsettled')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${financialFilter === 'unsettled' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                دارای بدهی
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400">
                 <Wallet size={36} className="mx-auto mb-3 opacity-20" />
                 <p className="text-xs font-bold">پروژه‌ای با فیلترهای فعلی یافت نشد.</p>
              </div>
            ) : (
              filteredProjects.map(project => {
                const totalPaid = (project.payments || []).reduce((acc, p) => acc + p.amount, 0);
                const balance = project.totalPrice - totalPaid;
                const progress = (totalPaid / project.totalPrice) * 100;
                const isSettled = balance <= 0;
                const projectProfit = getProjectNetProfit(project);

                return (
                  <div 
                    key={project.id} 
                    onClick={() => navigate(`/project-financials/${project.id}`)}
                    className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:border-blue-100 transition-all cursor-pointer relative overflow-hidden group"
                  >
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-blue-600 transition-colors">{project.customerName}</h3>
                          <p className="text-[10px] text-slate-400 font-medium">پروژه شماره: {toPersianDigits(project.id.slice(-6))} • تاریخ ثبت: {getPersianMonthYear(project.date)}</p>
                       </div>
                       {getStatusBadge(project.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4 text-right">
                       <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">فروش فاکتور:</span>
                          <span className="text-slate-900">{formatPrice(project.totalPrice)}</span>
                       </div>
                       <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">دریافت شده:</span>
                          <span className="text-blue-600">{formatPrice(totalPaid)}</span>
                       </div>
                       <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">خرید متریال:</span>
                          <span className="text-slate-600">{formatPrice(project.totalPrice - projectProfit)}</span>
                       </div>
                       <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-emerald-600 font-black">سود کارگاه:</span>
                          <span className="text-emerald-600 font-black">{formatPrice(projectProfit)}</span>
                       </div>
                    </div>

                    <div className="space-y-3 mb-4">
                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
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
                       <button className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 rounded-xl transition-colors">
                          <ChevronLeft size={18} />
                       </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
