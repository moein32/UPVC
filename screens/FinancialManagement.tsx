import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Calendar,
  User,
  Phone,
  MapPin,
  Printer,
  Download,
  X,
  FileText,
  Receipt,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { pricingStore } from '../services/pricingStore';
import { SavedProject } from '../types';
import { toPersianDigits, formatPrice } from '../utils/formatting';

export interface CustomerAccount {
  name: string;
  phone: string;
  address: string;
  projectsCount: number;
  totalPrice: number;
  totalPaid: number;
  totalCash: number;
  totalCheck: number;
  balance: number;
  projects: SavedProject[];
}

export const FinancialManagement = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [financialFilter, setFinancialFilter] = useState<'all' | 'settled' | 'unsettled'>('all');
  const [activeSection, setActiveSection] = useState<'projects' | 'customers'>('projects');
  const [selectedCustomerForReceipt, setSelectedCustomerForReceipt] = useState<CustomerAccount | null>(null);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

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

  const customerAccounts = useMemo(() => {
    const accMap: Record<string, CustomerAccount> = {};
    
    projects.forEach(p => {
      const key = (p.customerName || 'مشتری نامشخص').trim();
      
      let cashPay = 0;
      let checkPay = 0;
      (p.payments || []).forEach(pay => {
        if (pay.type === 'Cash') {
          cashPay += pay.amount;
        } else if (pay.type === 'Check') {
          checkPay += pay.amount;
        }
      });
      const totalPaid = cashPay + checkPay;
      
      if (!accMap[key]) {
        accMap[key] = {
          name: key,
          phone: p.customerPhone || '',
          address: p.address || '',
          projectsCount: 1,
          totalPrice: p.totalPrice,
          totalPaid: totalPaid,
          totalCash: cashPay,
          totalCheck: checkPay,
          balance: p.totalPrice - totalPaid,
          projects: [p]
        };
      } else {
        const entry = accMap[key];
        entry.projectsCount += 1;
        entry.totalPrice += p.totalPrice;
        entry.totalPaid += totalPaid;
        entry.totalCash += cashPay;
        entry.totalCheck += checkPay;
        entry.balance += (p.totalPrice - totalPaid);
        entry.projects.push(p);
        if (!entry.phone && p.customerPhone) entry.phone = p.customerPhone;
        if (!entry.address && p.address) entry.address = p.address;
      }
    });
    
    return Object.values(accMap);
  }, [projects]);

  const filteredCustomerAccounts = useMemo(() => {
    return customerAccounts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (c.phone && c.phone.includes(searchTerm));
      const matchesFinancial = 
        financialFilter === 'all' || 
        (financialFilter === 'settled' && c.balance <= 0) || 
        (financialFilter === 'unsettled' && c.balance > 0);
      
      return matchesSearch && matchesFinancial;
    });
  }, [customerAccounts, searchTerm, financialFilter]);

  const downloadReceiptPDF = async (customerName: string) => {
    if (!receiptRef.current) return;
    setIsGeneratingReceipt(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = await toJpeg(receiptRef.current, { quality: 1.0, pixelRatio: 3 });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`فیش_پرداختی_${customerName}.pdf`);
    } catch (err) {
      console.error("Error generating receipt PDF:", err);
      alert("خطا در تولید پی‌دی‌اف فیش پرداختی");
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

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
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder={activeSection === 'projects' ? "جستجوی نام مشتری..." : "جستجوی نام یا شماره تلفن مشتری..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-2xl py-3 px-12 text-sm focus:ring-2 focus:ring-blue-500 transition-all text-right"
          />
          <Search className="absolute right-4 top-3.5 text-slate-400" size={18} />
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => {
              setActiveSection('projects');
              setSearchTerm('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${activeSection === 'projects' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            حسابرسی پروژه‌ها ({toPersianDigits(projects.length)})
          </button>
          <button 
            onClick={() => {
              setActiveSection('customers');
              setSearchTerm('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${activeSection === 'customers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            حساب مشتریان ({toPersianDigits(customerAccounts.length)})
          </button>
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
              {activeSection === 'projects' ? 'لیست پروژه‌ها و حسابرسی' : 'حسابرسی و وضعیت مشتریان'}
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
            {activeSection === 'projects' ? (
              filteredProjects.length === 0 ? (
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
                            <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-blue-600 transition-colors">
                               {project.customerName}
                               {project.customerPhone && (
                                 <span className="text-xs font-normal text-slate-500 mr-2" dir="ltr">
                                   ({toPersianDigits(project.customerPhone)})
                                 </span>
                               )}
                             </h3>
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
              )
            ) : (
              filteredCustomerAccounts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400">
                   <UserCheck size={36} className="mx-auto mb-3 opacity-20" />
                   <p className="text-xs font-bold">مشتری با فیلترهای فعلی یافت نشد.</p>
                </div>
              ) : (
                filteredCustomerAccounts.map(customer => {
                  const isSettled = customer.balance <= 0;
                  const progress = customer.totalPrice > 0 ? (customer.totalPaid / customer.totalPrice) * 100 : 100;
                  return (
                    <div 
                      key={customer.name}
                      className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:border-blue-100 transition-all relative overflow-hidden group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
                            <span className="p-1.5 bg-slate-50 rounded-lg"><User size={14} className="text-slate-500" /></span>
                            {customer.name}
                          </h3>
                          {customer.phone && (
                            <p className="text-xs text-slate-500 font-bold flex items-center gap-1 mt-1" dir="ltr">
                              📞 {toPersianDigits(customer.phone)}
                            </p>
                          )}
                          {customer.address && (
                            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                              <MapPin size={11} className="text-slate-400" />
                              {customer.address}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                          {toPersianDigits(customer.projectsCount)} پروژه فعال
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4 text-right border-t border-b border-slate-50 py-3">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">مجموع قراردادها:</span>
                          <span className="text-slate-900 font-black">{formatPrice(customer.totalPrice)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400 font-bold">کل مبالغ پرداختی:</span>
                          <span className="text-blue-600 font-black">{formatPrice(customer.totalPaid)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">پرداخت نقدی:</span>
                          <span className="text-emerald-600 font-black">{formatPrice(customer.totalCash)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">پرداخت چکی:</span>
                          <span className="text-amber-600 font-black">{formatPrice(customer.totalCheck)}</span>
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

                      <div className="flex justify-between items-center pt-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">باقیمانده کل بدهی</span>
                          <span className={`text-sm font-black ${isSettled ? 'text-emerald-600' : 'text-red-500'}`}>
                            {isSettled ? 'تسویه کامل' : formatPrice(customer.balance)}
                          </span>
                        </div>
                        <button 
                          onClick={() => setSelectedCustomerForReceipt(customer)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all font-black text-xs shadow-sm hover:shadow"
                        >
                          <Receipt size={14} />
                          نمایش فیش پرداخت
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      </div>

      {/* Customer Receipt Modal */}
      <AnimatePresence>
        {selectedCustomerForReceipt && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-100 rounded-[2rem] w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh]"
            >
              {/* Modal Toolbar Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950 text-sm">صورتحساب و فیش پرداختی مشتری</h3>
                    <p className="text-[10px] text-slate-500 font-bold">مشاهده جزئیات کامل و چاپ صورت وضعیت مالی</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadReceiptPDF(selectedCustomerForReceipt.name)}
                    disabled={isGeneratingReceipt}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-lg shadow-emerald-600/15 disabled:opacity-50"
                  >
                    {isGeneratingReceipt ? (
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Download size={14} />
                    )}
                    دانلود PDF فیش
                  </button>
                  <button 
                    onClick={() => setSelectedCustomerForReceipt(null)}
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Printable Receipt Canvas area */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-100">
                <div 
                  ref={receiptRef}
                  className="bg-white p-8 md:p-10 rounded-[1.5rem] shadow-sm border border-slate-200 max-w-[210mm] mx-auto text-slate-800 text-right leading-relaxed"
                  style={{ width: '100%', minHeight: '297mm' }}
                >
                  {/* Brand & Receipt Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 mb-1">فیش حسابرسی و صورت وضعیت مالی مشتری</h2>
                      <p className="text-xs text-slate-500 font-bold">سامانه مدیریت هوشمند کارگاه نکست‌وین (NexWin)</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-600">تاریخ گزارش: <span className="text-slate-950 font-mono">{toPersianDigits(new Date().toLocaleDateString('fa-IR'))}</span></p>
                      <p className="text-xs font-bold text-slate-600 mt-1">تعداد پروژه: <span className="text-slate-950 font-mono">{toPersianDigits(selectedCustomerForReceipt.projectsCount)} مورد</span></p>
                    </div>
                  </div>

                  {/* Customer Information Cards */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs">
                    <div>
                      <p className="font-bold text-slate-400 mb-1.5">مشخصات خریدار:</p>
                      <h3 className="text-sm font-black text-slate-900 mb-1">{selectedCustomerForReceipt.name}</h3>
                      {selectedCustomerForReceipt.phone && (
                        <p className="text-slate-600 font-bold font-mono" dir="ltr">📞 {toPersianDigits(selectedCustomerForReceipt.phone)}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-400 mb-1.5">محل پروژه / آدرس:</p>
                      <p className="text-slate-800 font-bold">{selectedCustomerForReceipt.address || 'ثبت نشده'}</p>
                    </div>
                  </div>

                  {/* Financial Status Summary Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">جمع کل قراردادها (بدهکاری)</span>
                      <span className="text-base font-black text-slate-950">{formatPrice(selectedCustomerForReceipt.totalPrice)}</span>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-50 flex flex-col justify-between">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">کل مبالغ دریافتی (بستانکاری)</span>
                      <span className="text-base font-black text-blue-600">{formatPrice(selectedCustomerForReceipt.totalPaid)}</span>
                    </div>
                    <div className={`${selectedCustomerForReceipt.balance <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'} p-4 rounded-2xl border border-slate-100 flex flex-col justify-between`}>
                      <span className="text-[10px] font-black opacity-70 uppercase tracking-widest block mb-2">باقیمانده حساب (مانده بدهی)</span>
                      <span className="text-base font-black">
                        {selectedCustomerForReceipt.balance <= 0 ? 'تسویه کامل' : formatPrice(selectedCustomerForReceipt.balance)}
                      </span>
                    </div>
                  </div>

                  {/* Table 1: Projects Breakdown */}
                  <div className="mb-8">
                    <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
                      ریزمشخصات پروژه‌ها و قراردادها
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-black border-b border-slate-200">
                            <th className="p-3">ردیف</th>
                            <th className="p-3">شناسه پروژه</th>
                            <th className="p-3">تاریخ ثبت</th>
                            <th className="p-3">مبلغ کل قرارداد</th>
                            <th className="p-3">دریافتی</th>
                            <th className="p-3">مانده</th>
                            <th className="p-3">وضعیت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedCustomerForReceipt.projects.map((p, index) => {
                            const pPaid = (p.payments || []).reduce((acc, pay) => acc + pay.amount, 0);
                            const pBalance = p.totalPrice - pPaid;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50">
                                <td className="p-3 font-bold text-slate-500">{toPersianDigits(index + 1)}</td>
                                <td className="p-3 font-black text-slate-900 font-mono">{toPersianDigits(p.id.slice(-6))}</td>
                                <td className="p-3 text-slate-600 font-bold">{getPersianMonthYear(p.date)}</td>
                                <td className="p-3 font-black text-slate-950">{formatPrice(p.totalPrice)}</td>
                                <td className="p-3 font-bold text-blue-600">{formatPrice(pPaid)}</td>
                                <td className="p-3 font-bold text-red-500">{formatPrice(pBalance)}</td>
                                <td className="p-3 font-bold">
                                  {p.status === 'Contract' ? 'قرارداد' : p.status === 'Production' ? 'در حال تولید' : 'تحویل شده'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Table 2: Payments Breakdown */}
                  <div className="mb-8">
                    <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-3 bg-emerald-600 rounded-full"></span>
                      جزئیات تراکنش‌ها و پرداخت‌های دریافتی
                    </h4>
                    {selectedCustomerForReceipt.projects.flatMap(p => p.payments || []).length === 0 ? (
                      <div className="p-4 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                        هیچ پرداختی در سیستم ثبت نشده است.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-black border-b border-slate-200">
                              <th className="p-3">ردیف</th>
                              <th className="p-3">تاریخ تراکنش</th>
                              <th className="p-3">نوع پرداخت</th>
                              <th className="p-3">مبلغ پرداختی</th>
                              <th className="p-3">شناسه پروژه مرجع</th>
                              <th className="p-3">جزئیات چک / شماره سند</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedCustomerForReceipt.projects.flatMap(p => 
                              (p.payments || []).map(pay => ({ ...pay, projectRef: p }))
                            ).map((payment, index) => (
                              <tr key={payment.id} className="hover:bg-slate-50/50">
                                <td className="p-3 font-bold text-slate-500">{toPersianDigits(index + 1)}</td>
                                <td className="p-3 text-slate-600 font-bold font-mono">
                                  {toPersianDigits(new Date(payment.date).toLocaleDateString('fa-IR'))}
                                </td>
                                <td className="p-3 font-bold">
                                  {payment.type === 'Cash' ? (
                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">نقدى</span>
                                  ) : (
                                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded">چکى</span>
                                  )}
                                </td>
                                <td className="p-3 font-black text-slate-950">{formatPrice(payment.amount)}</td>
                                <td className="p-3 font-mono text-slate-500">پروژه {toPersianDigits(payment.projectRef.id.slice(-6))}</td>
                                <td className="p-3 font-medium text-slate-600">
                                  {payment.type === 'Check' && payment.checkDetails ? (
                                    <span>
                                      بانک {payment.checkDetails.bankName} • شماره {toPersianDigits(payment.checkDetails.checkNumber)} • سررسید {toPersianDigits(payment.checkDetails.dueDate)}
                                      {payment.checkDetails.isSayad && ' (صیاد)'}
                                    </span>
                                  ) : (
                                    'پرداخت مستقیم نقدی / واریزی'
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Signatures & Seal section */}
                  <div className="grid grid-cols-2 gap-10 mt-12 pt-8 border-t border-slate-200 text-xs">
                    <div className="text-center h-24 flex flex-col justify-between">
                      <span className="font-bold text-slate-500">مهر و امضای کارگاه (نکست‌وین)</span>
                      <span className="font-medium text-slate-300">امضا و تایید وصول مبالغ فوق</span>
                    </div>
                    <div className="text-center h-24 flex flex-col justify-between">
                      <span className="font-bold text-slate-500">امضا و تایید خریدار</span>
                      <span className="font-medium text-slate-300">{selectedCustomerForReceipt.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
