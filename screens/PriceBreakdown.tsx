
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Home, Edit2, Trash2, Ruler, FileText, PlusCircle, LayoutGrid, CheckCircle, Maximize2, CheckCircle2, ChevronLeft } from 'lucide-react';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem, AppSettings } from '../types';
import { BRANDS } from '../constants';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';

export const PriceBreakdown = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { projectDetails: ProjectDetails, items: InvoiceItem[] } | null;
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(locationState?.projectDetails || null);
  const [items, setItems] = useState<InvoiceItem[]>(locationState?.items || []);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
     setSettings(pricingStore.getSettings());
     if (projectDetails?.id) {
         const saved = pricingStore.getProjects().find(p => p.id === projectDetails.id);
         if (saved) {
             setItems(saved.items);
             setProjectDetails(saved);
         }
     }
  }, [projectDetails?.id]);

  if (!projectDetails || items.length === 0) {
      return (
          <div className="h-screen flex items-center justify-center flex-col gap-4 bg-slate-50 text-slate-700 p-6 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <LayoutGrid size={40} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">هیچ آیتمی یافت نشد</h2>
              <button onClick={() => navigate('/dashboard')} className="mt-4 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                 <Home size={18} /> بازگشت به خانه
              </button>
          </div>
      )
  }

  const handleEditProject = () => {
    navigate('/project-setup', { state: { projectDetails, isEdit: true } });
  };

  const handleEditItem = (index: number) => {
    navigate('/designer', { state: { projectDetails, items, editIndex: index } });
  };

  const handleDeleteItem = (index: number) => {
    if (window.confirm('آیا از حذف این آیتم مطمئن هستید؟')) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
      const projectToSave = {
        ...projectDetails,
        items: updatedItems,
        totalPrice: updatedItems.reduce((acc, item) => acc + item.calculations.totalPrice, 0),
      };
      pricingStore.saveProject(projectToSave);
      setProjectDetails(projectToSave);
    }
  };

  const handleGoToPrint = () => {
      navigate('/print-invoice', { 
          state: { projectDetails, items } 
      });
  };

  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + item.calculations.unitPrice, 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-80 md:pb-64">
       {/* Top Navigation */}
       <div className="bg-white/80 backdrop-blur-xl px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 z-40 border-b border-slate-200 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-3 bg-slate-100 rounded-2xl text-slate-600 active:scale-95 transition-transform">
          <ArrowRight size={22} />
        </button>
        <div className="text-center">
            <h1 className="font-black text-slate-900 text-lg">خلاصه وضعیت پروژه</h1>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{projectDetails.customerName}</p>
            </div>
        </div>
        <button onClick={handleEditProject} className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl active:scale-95 transition-transform shadow-sm">
            <Edit2 size={20} />
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-10">
        {/* Project Meta Card */}
        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">محل اجرای پروژه</span>
                        <h3 className="text-base font-bold leading-snug max-w-[240px]">{projectDetails.address || 'آدرس ثبت نشده'}</h3>
                    </div>
                    <div className="bg-white/10 p-3 rounded-2xl">
                        <MapPin size={22} className="text-blue-300" />
                    </div>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-white/10">
                    <div className="flex gap-8">
                        <div>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">تاریخ</span>
                            <p className="font-bold text-xs">{toPersianDigits(new Date(projectDetails.date).toLocaleDateString('fa-IR'))}</p>
                        </div>
                        <div>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">تعداد واحد</span>
                            <p className="font-bold text-xs">{toPersianDigits(items.length)} عدد</p>
                        </div>
                    </div>
                    <div className="text-left">
                         <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">وضعیت</span>
                         <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-[9px] font-black border border-blue-500/30">پیش‌فاکتور</div>
                    </div>
                </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Units List */}
        <div className="space-y-12">
            {items.map((item, index) => {
                const brand = BRANDS.find(b => b.id === item.config.profileId);
                return (
                    <div key={item.id} className="relative group">
                        <div className="absolute -top-3 right-8 z-20 bg-white text-slate-900 px-4 py-1.5 rounded-xl font-black shadow-xl border border-slate-100 text-xs">
                           واحد {toPersianDigits(index + 1)}
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
                            {/* Card Header */}
                            <div className="p-6 pb-2 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                                        <span className="text-lg">{brand?.logo}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 text-sm">{brand?.name}</h4>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{item.config.type}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => handleEditItem(index)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100">
                                        <Edit2 size={16}/>
                                    </button>
                                    <button onClick={() => handleDeleteItem(index)} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>

                            {/* Canvas Preview Area */}
                            <div className="p-4">
                                <div className="w-full h-[320px] bg-slate-50 rounded-[2rem] relative flex items-center justify-center overflow-hidden border border-slate-100/50">
                                    {/* Tech Grid Backdrop */}
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                                    
                                    {/* Visual Labels */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                                        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-lg flex items-center gap-2">
                                            <span className="opacity-40">W:</span> {toPersianDigits(item.config.width)}
                                        </div>
                                    </div>
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30 [writing-mode:vertical-lr] rotate-180">
                                        <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-lg flex items-center gap-2">
                                            <span className="opacity-40">H:</span> {toPersianDigits(item.config.height)}
                                        </div>
                                    </div>

                                    <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
                                        <WindowPreview config={item.config} width="100%" height="100%" isThumbnail={true} scale={0.4} />
                                    </div>
                                </div>
                            </div>

                            {/* Unit Price Info */}
                            <div className="px-6 pb-6">
                                <div className="flex justify-between items-center px-5 py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">قیمت برآورد شده</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-lg font-black text-slate-900">{formatPrice(item.calculations.totalPrice)}</span>
                                            <span className="text-[9px] font-bold text-slate-500">تومان</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-[9px] font-black border border-emerald-100">
                                        <CheckCircle size={12} /> تایید فنی
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
      </div>

      {/* FINAL PRICE STICKY DOCK - COMPLETELY REIMAGINED */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pb-8">
        <div className="max-w-xl mx-auto bg-white/80 backdrop-blur-3xl p-5 md:p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/60">
            {/* Header: Price & Status */}
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">مبلغ قابل پرداخت پروژه</span>
                        <div className="flex items-center gap-1 bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-md text-[8px] font-black">
                            <div className="w-1 h-1 bg-emerald-600 rounded-full animate-ping"></div>
                            آماده فاکتور
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-blue-600 tracking-tighter leading-none">{formatPrice(finalPrice)}</span>
                        <span className="text-xs font-black text-slate-500">تومان</span>
                    </div>
                </div>
                <div className="text-left hidden xs:block">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">تعداد کل</div>
                    <div className="text-base font-black text-slate-900 leading-none">{toPersianDigits(items.length)} عدد</div>
                </div>
            </div>
            
            {/* Action Buttons Grid */}
            <div className="flex flex-col gap-3">
                <button 
                    onClick={handleGoToPrint}
                    className="w-full bg-slate-900 text-white h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all hover:bg-slate-800"
                >
                    <Printer size={20} /> مشاهده و دانلود فاکتور رسمی
                </button>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => navigate('/designer', { state: { projectDetails, items } })}
                        className="flex-1 bg-white border border-slate-200 text-slate-700 h-14 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-50"
                    >
                        <PlusCircle size={18} className="text-blue-600" /> افزودن یونیت
                    </button>
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="w-14 bg-white border border-slate-200 text-slate-400 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-all hover:text-slate-600"
                    >
                        <Home size={20} />
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const MapPin = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
