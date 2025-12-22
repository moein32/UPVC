
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Home, Edit2, Trash2, Ruler, FileText, PlusCircle, LayoutGrid, ChevronRight } from 'lucide-react';
import { PrimaryButton } from '../components/UIComponents';
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
     // Sync with store in case of direct navigation
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
              <p className="text-slate-500 text-sm max-w-[250px]">پروژه مورد نظر فاقد یونیت طراحی شده است یا اطلاعات در دسترس نیست.</p>
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
          state: { 
              projectDetails, 
              items 
          } 
      });
  };

  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + item.calculations.unitPrice, 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
       {/* Header */}
       <div className="bg-white/80 backdrop-blur-xl px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 z-40 border-b border-slate-200">
        <button onClick={() => navigate(-1)} className="p-3 bg-slate-100 rounded-2xl text-slate-600 active:scale-90 transition-transform">
          <ArrowRight size={22} />
        </button>
        <div className="text-center">
            <h1 className="font-black text-slate-900 text-lg">بازبینی نهایی پروژه</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{projectDetails.customerName}</p>
        </div>
        <button onClick={handleEditProject} className="p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90 transition-transform">
            <Edit2 size={22} />
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Project Info Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[35px] p-7 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-[3px] block mb-1">محل اجرای پروژه</span>
                        <h3 className="text-xl font-bold leading-tight">{projectDetails.address || 'نشانی ثبت نشده است'}</h3>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-xl border border-white/10">
                        <FileText size={24} className="text-blue-400" />
                    </div>
                </div>
                
                <div className="flex items-end justify-between">
                    <div>
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-[3px] block mb-1">تاریخ صدور</span>
                        <p className="font-bold text-sm opacity-90">{toPersianDigits(new Date(projectDetails.date).toLocaleDateString('fa-IR'))}</p>
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-[3px] block mb-1">تعداد یونیت‌ها</span>
                        <p className="font-bold text-sm opacity-90">{toPersianDigits(items.length)} عدد</p>
                    </div>
                </div>
            </div>
            {/* Abstract Decorative Element */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-blue-600/20 rounded-full blur-[60px] group-hover:bg-blue-600/30 transition-all duration-700"></div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between px-2">
            <h2 className="text-slate-900 font-black text-sm uppercase tracking-widest">جزئیات فنی واحدها</h2>
            <div className="h-px bg-slate-200 flex-1 mx-4"></div>
        </div>

        {/* Enhanced Items List */}
        <div className="space-y-10">
            {items.map((item, index) => {
                const brand = BRANDS.find(b => b.id === item.config.profileId);
                return (
                    <div key={item.id} className="relative">
                        {/* Unit Index Badge */}
                        <div className="absolute -top-4 -right-2 z-10 bg-slate-900 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-slate-900/20 border-2 border-white">
                            {toPersianDigits(index + 1)}
                        </div>

                        <div className="bg-white rounded-[45px] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden group">
                            {/* Card Header */}
                            <div className="p-6 pb-2 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-xl shadow-inner">
                                        {brand?.logo || '🏗️'}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 text-base">{brand?.name}</h4>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.config.type}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditItem(index)} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all duration-300">
                                        <Ruler size={18}/>
                                    </button>
                                    <button onClick={() => handleDeleteItem(index)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all duration-300">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>

                            {/* Hero Preview - Significantly Larger & Centered */}
                            <div className="px-6 py-4">
                                <div className="w-full aspect-[4/3] bg-slate-50 rounded-[35px] flex items-center justify-center p-8 border border-slate-100/50 shadow-inner group-hover:bg-slate-100/50 transition-colors duration-500 relative overflow-hidden">
                                    <WindowPreview config={item.config} width="100%" height="100%" className="scale-110" />
                                    
                                    {/* Size labels inside the preview area */}
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-4 py-1 rounded-full border border-slate-200 text-[10px] font-black text-slate-500 tracking-tighter">
                                        {toPersianDigits(item.config.width)} mm
                                    </div>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-md px-2 py-4 rounded-full border border-slate-200 text-[10px] font-black text-slate-500 tracking-tighter [writing-mode:vertical-lr]">
                                        {toPersianDigits(item.config.height)} mm
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer Info */}
                            <div className="p-6 pt-2 flex justify-between items-end">
                                <div>
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">نوع شیشه مصرفی</p>
                                    <p className="font-bold text-slate-700 text-sm">دوجداره ۴-۴ صنعتی</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">قیمت نهایی واحد</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatPrice(item.calculations.totalPrice)}</span>
                                        <span className="text-[10px] font-bold text-slate-400">تومان</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-50">
        <div className="bg-white/90 backdrop-blur-2xl p-6 rounded-[40px] shadow-[0_15px_60px_rgba(0,0,0,0.1)] border border-slate-200/50">
            <div className="flex justify-between items-center mb-6 px-2">
                <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">مبلغ نهایی پروژه</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-blue-600 tracking-tighter">{formatPrice(finalPrice)}</span>
                        <span className="text-xs font-bold text-slate-400">تومان</span>
                    </div>
                </div>
                <div className="text-left">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">وضعیت فاکتور</span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        آماده صدور
                    </span>
                </div>
            </div>
            
            <div className="flex gap-3">
                 <button 
                    onClick={() => navigate('/designer', { state: { projectDetails, items } })}
                    className="flex-1 bg-white border-2 border-slate-100 text-slate-700 h-16 rounded-[24px] font-black text-sm flex items-center justify-center gap-2.5 active:scale-95 transition-all shadow-sm hover:border-blue-200"
                >
                    <PlusCircle size={22} className="text-blue-500" /> افزودن آیتم
                </button>
                <button 
                    onClick={handleGoToPrint}
                    className="flex-[2] bg-blue-600 text-white h-16 rounded-[24px] font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                >
                    <Printer size={22} /> مشاهده نسخه چاپی
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
