
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Home, Edit2, Trash2, LayoutGrid, MapPin, X, Check, AlertCircle, Save, DollarSign } from 'lucide-react';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem, AppSettings, InvoiceDetail } from '../types';
import { BRANDS } from '../constants';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { motion, AnimatePresence } from 'framer-motion';

export const PriceBreakdown = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { projectDetails: ProjectDetails, items: InvoiceItem[] } | null;
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(locationState?.projectDetails || null);
  const [items, setItems] = useState<InvoiceItem[]>(locationState?.items || []);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  // Modal State
  const [showPriceReview, setShowPriceReview] = useState(false);
  const [editingMaterials, setEditingMaterials] = useState<InvoiceDetail[]>([]);

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

  // --- LOGIC TO AGGREGATE MATERIALS ---
  const handleOpenReview = () => {
    // Collect all details from all items
    const allDetails: InvoiceDetail[] = [];
    items.forEach(unit => {
        unit.calculations.details.forEach(detail => {
            const existing = allDetails.find(d => d.name === detail.name);
            if (existing) {
                existing.quantity += (detail.quantity * unit.quantity);
                existing.totalPrice = Math.round(existing.quantity * existing.unitPrice);
            } else {
                allDetails.push({
                    ...detail,
                    quantity: detail.quantity * unit.quantity,
                    totalPrice: Math.round((detail.quantity * unit.quantity) * detail.unitPrice)
                });
            }
        });
    });
    setEditingMaterials(allDetails);
    setShowPriceReview(true);
  };

  const handleUpdateUnitPrice = (index: number, newPrice: number) => {
    const updated = [...editingMaterials];
    updated[index].unitPrice = newPrice;
    updated[index].totalPrice = Math.round(updated[index].quantity * newPrice);
    setEditingMaterials(updated);
  };

  const handleConfirmFinalPrint = () => {
    // To maintain consistency, we update the original items' calculations 
    // with new unit prices before passing to print page
    const updatedItems = items.map(unit => {
        const newDetails = unit.calculations.details.map(d => {
            const matchingReview = editingMaterials.find(rm => rm.name === d.name);
            if (matchingReview) {
                return {
                    ...d,
                    unitPrice: matchingReview.unitPrice,
                    totalPrice: Math.round(d.quantity * matchingReview.unitPrice)
                };
            }
            return d;
        });
        
        const newUnitPrice = newDetails.reduce((sum, d) => sum + d.totalPrice, 0);
        
        return {
            ...unit,
            calculations: {
                ...unit.calculations,
                details: newDetails,
                totalPrice: newUnitPrice,
                unitPrice: newUnitPrice
            }
        };
    });

    navigate('/print-invoice', { 
        state: { projectDetails, items: updatedItems } 
    });
  };

  const handleDeleteItem = (index: number) => {
    if (window.confirm('آیا از حذف این آیتم مطمئن هستید؟')) {
      const updatedItems = items.filter((_, i) => i !== index);
      const totalMaterialPrice = updatedItems.reduce((acc, item) => acc + (item.calculations.unitPrice * item.quantity), 0);
      const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
      const finalProjectPrice = totalMaterialPrice + installationCost;
      const projectToSave = { ...projectDetails, items: updatedItems, totalPrice: finalProjectPrice };
      pricingStore.saveProject(projectToSave);
      setItems(updatedItems);
      setProjectDetails(projectToSave);
    }
  };

  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + (item.calculations.unitPrice * item.quantity), 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;

  // Review Modal Total
  const reviewSubtotal = editingMaterials.reduce((sum, m) => sum + m.totalPrice, 0);
  const reviewInstall = Math.round(reviewSubtotal * (projectDetails.installPercent / 100));

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-80 md:pb-64 lg:pb-72">
       {/* Top Navigation */}
       <div className="bg-white/80 backdrop-blur-xl px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 z-40 border-b border-slate-200 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-3 bg-slate-100 rounded-2xl text-slate-600 active:scale-95 transition-transform">
          <ArrowRight size={22} />
        </button>
        <div className="text-center">
            <h1 className="font-black text-slate-900 text-lg md:text-xl">خلاصه وضعیت پروژه</h1>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{projectDetails.customerName}</p>
            </div>
        </div>
        <button onClick={() => navigate('/project-setup', { state: { projectDetails, isEdit: true } })} className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl active:scale-95 transition-transform shadow-sm">
            <Edit2 size={20} />
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12 space-y-12">
        {/* Project Meta Card */}
        <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden max-w-4xl mx-auto">
            <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">محل اجرای پروژه</span>
                        <h3 className="text-base md:text-xl font-bold leading-snug max-w-md">{projectDetails.address || 'آدرس ثبت نشده'}</h3>
                    </div>
                    <div className="bg-white/10 p-3 md:p-4 rounded-2xl">
                        <MapPin size={22} className="text-blue-300 md:size-26" />
                    </div>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-white/10">
                    <div className="flex gap-8 md:gap-12">
                        <div>
                            <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">تاریخ</span>
                            <p className="font-bold text-xs md:text-sm">{toPersianDigits(new Date(projectDetails.date).toLocaleDateString('fa-IR'))}</p>
                        </div>
                        <div>
                            <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">تعداد کل واحد</span>
                            <p className="font-bold text-xs md:text-sm">{toPersianDigits(items.reduce((acc, i) => acc + i.quantity, 0))} عدد</p>
                        </div>
                    </div>
                    <div className="text-left">
                         <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">وضعیت</span>
                         <div className="bg-blue-500/20 text-blue-300 px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black border border-blue-500/30">پیش‌فاکتور</div>
                    </div>
                </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Units Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item, index) => (
                <div key={item.id} className="relative group">
                    <div className="absolute -top-3 right-6 z-20 bg-white text-slate-900 px-4 py-1.5 rounded-xl font-black shadow-xl border border-slate-100 text-xs flex items-center gap-2">
                       واحد {toPersianDigits(index + 1)} 
                       <span className="text-blue-600 bg-blue-50 px-2 rounded-lg">تعداد: {toPersianDigits(item.quantity)}</span>
                    </div>
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full hover:shadow-xl transition-all duration-500">
                        <div className="p-6 pb-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-inner">
                                    <span className="text-lg">{BRANDS.find(b => b.id === item.config.profileId)?.logo}</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-900 text-sm">{BRANDS.find(b => b.id === item.config.profileId)?.name}</h4>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{item.config.type}</p>
                                </div>
                            </div>
                            <div className="flex gap-1.5">
                                <button onClick={() => navigate('/designer', { state: { projectDetails, items, editIndex: index } })} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"><Edit2 size={14}/></button>
                                <button onClick={() => handleDeleteItem(index)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                            </div>
                        </div>
                        <div className="p-4 flex-1">
                            <div className="w-full h-[280px] bg-slate-50/50 rounded-[2rem] relative flex items-center justify-center overflow-hidden border border-slate-100/50">
                                <WindowPreview config={item.config} width="100%" height="100%" isThumbnail={true} scale={0.4} />
                            </div>
                        </div>
                        <div className="px-6 pb-6 mt-auto">
                            <div className="flex justify-between items-center px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">قیمت واحد</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-base font-black text-slate-900">{formatPrice(item.calculations.totalPrice)}</span>
                                        <span className="text-[8px] font-bold text-slate-500">تومان</span>
                                    </div>
                                </div>
                                <div className="text-left flex flex-col items-end">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">جمع این تیپ</span>
                                    <div className="text-xs font-black text-blue-600 tracking-tight">{formatPrice(item.calculations.totalPrice * item.quantity)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* FINAL PRICE STICKY DOCK */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pb-8">
        <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-3xl p-5 md:p-8 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 px-2 gap-4">
                <div className="space-y-1 text-center md:text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">مبلغ نهایی کل قرارداد</span>
                    <div className="flex items-baseline justify-center md:justify-start gap-2">
                        <span className="text-3xl md:text-5xl font-black text-blue-600 tracking-tighter leading-none">{formatPrice(finalPrice)}</span>
                        <span className="text-xs md:text-sm font-black text-slate-500">تومان</span>
                    </div>
                </div>
                <div className="text-center md:text-left">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">خلاصه فنی پروژه</div>
                    <div className="text-base md:text-xl font-black text-slate-900 leading-none">{toPersianDigits(items.reduce((acc, i) => acc + i.quantity, 0))} یونیت سفارشی</div>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
                <button 
                    onClick={handleOpenReview}
                    className="w-full md:flex-[2] bg-slate-900 text-white h-14 md:h-16 rounded-2xl md:rounded-3xl font-black text-lg flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                >
                    <Printer size={22} /> مشاهده و صدور فاکتور نهایی
                </button>
                <div className="flex flex-1 gap-2">
                    <button onClick={() => navigate('/designer', { state: { projectDetails, items } })} className="flex-1 bg-white border border-slate-200 text-slate-700 h-14 md:h-16 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all">افزودن یونیت</button>
                    <button onClick={() => navigate('/dashboard')} className="w-14 bg-white border border-slate-200 text-slate-400 h-14 md:h-16 rounded-2xl flex items-center justify-center active:scale-95 transition-all"><Home size={22} /></button>
                </div>
            </div>
        </div>
      </div>

      {/* PRICE REVIEW MODAL */}
      <AnimatePresence>
        {showPriceReview && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200"><DollarSign size={24}/></div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900">بازبینی و ویرایش قیمت‌ها</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manual Price Override Engine</p>
                            </div>
                        </div>
                        <button onClick={() => setShowPriceReview(false)} className="p-2 bg-white rounded-full text-slate-400 shadow-sm"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 no-scrollbar">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3 mb-4">
                            <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] md:text-xs text-blue-800 font-bold leading-relaxed">
                                در این بخش می‌توانید قیمت واحد هر قطعه را برای کل پروژه تغییر دهید. با کلیک بر روی عدد قیمت، مقدار جدید را وارد کنید. محاسبات فاکتور نهایی بر اساس این مقادیر خواهد بود.
                            </p>
                        </div>

                        <div className="space-y-2">
                            {editingMaterials.map((material, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:border-blue-200 transition-colors">
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black text-slate-800">{material.name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">مقدار کل: {toPersianDigits(material.quantity.toFixed(2))} {material.unit}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 justify-between md:justify-end">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[8px] font-black text-slate-300 uppercase mb-0.5">قیمت واحد (تومان)</span>
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    value={material.unitPrice}
                                                    onChange={(e) => handleUpdateUnitPrice(idx, Number(e.target.value))}
                                                    className="bg-slate-100 border-none rounded-xl px-3 py-2 text-sm font-black text-slate-900 w-32 text-center focus:ring-2 focus:ring-blue-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end min-w-[100px]">
                                            <span className="text-[8px] font-black text-slate-300 uppercase mb-0.5">جمع ردیف</span>
                                            <span className="text-sm font-black text-slate-900">{formatPrice(material.totalPrice)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 md:p-8 bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="grid grid-cols-2 gap-8 w-full md:w-auto">
                            <div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">جمع متریال</span>
                                <div className="text-xl font-black">{formatPrice(reviewSubtotal)} <span className="text-[8px] opacity-40">تومان</span></div>
                            </div>
                            <div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">هزینه نصب ({toPersianDigits(projectDetails.installPercent)}٪)</span>
                                <div className="text-xl font-black text-emerald-400">{formatPrice(reviewInstall)} <span className="text-[8px] opacity-40 text-white">تومان</span></div>
                            </div>
                        </div>
                        <button 
                            onClick={handleConfirmFinalPrint}
                            className="w-full md:w-auto px-10 py-5 bg-blue-600 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all hover:bg-blue-500"
                        >
                            <Save size={20} /> تایید نهایی و صدور فاکتور
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
