
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Download, Settings2, Loader2 } from 'lucide-react';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem, AppSettings, InvoiceLayoutType } from '../types';
import { BRANDS } from '../constants';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';

// Accessing html2pdf from the window object as it's imported via script tag in index.html
declare var html2pdf: any;

export const InvoicePrint = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const state = location.state as { projectDetails: ProjectDetails, items: InvoiceItem[] } | null;
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(state?.projectDetails || null);
  const [items, setItems] = useState<InvoiceItem[]>(state?.items || []);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tempLayout, setTempLayout] = useState<InvoiceLayoutType>('technical');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
     const loadedSettings = pricingStore.getSettings();
     setSettings(loadedSettings);
     if (loadedSettings.invoice.layoutType) {
         setTempLayout(loadedSettings.invoice.layoutType);
     }
  }, []);

  if (!projectDetails || items.length === 0) {
      return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      );
  }

  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + item.calculations.unitPrice, 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;
  const todayJalali = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date(projectDetails.date));
  const invoiceConfig = settings?.invoice || { companyName: 'فروشگاه لومینا', companyPhone: '', companyAddress: '', footerNote: '' };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    
    setIsGenerating(true);
    
    // Ensure fonts are fully loaded to prevent text glitches
    try {
        await document.fonts.ready;
    } catch (e) {
        console.warn('Font loading check failed', e);
    }
    
    const element = invoiceRef.current;
    
    // Configuration for html2pdf
    const opt = {
      margin: 0,
      filename: `Lumina-Invoice-${projectDetails.customerName}-${toPersianDigits(projectDetails.id.slice(-6))}.pdf`,
      // Use PNG for sharper text and shapes, JPEG causes artifacts on text edges
      image: { type: 'png', quality: 1.0 }, 
      html2canvas: { 
        scale: 2, // 2 is usually sufficient for A4, higher causes memory issues
        useCORS: true, 
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
        // logging: true, // debug only
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('خطا در تولید فایل PDF. لطفا دوباره تلاش کنید.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 p-8 flex flex-col items-center overflow-x-hidden">
       <style>
         {`
           @media print {
             @page { 
               size: A4; 
               margin: 0; 
             }
             body { 
               background-color: white !important; 
               -webkit-print-color-adjust: exact !important; 
               print-color-adjust: exact !important;
             }
             .no-print { display: none !important; }
             .invoice-page {
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                width: 210mm !important;
                min-height: 297mm !important;
                border-radius: 0 !important;
             }
           }

           /* CRITICAL FIXES FOR PDF GENERATION */
           .invoice-page * {
               /* Prevents disjointed Persian letters */
               letter-spacing: normal !important;
               font-variant-ligatures: normal !important;
               
               /* Removes backdrop filters which confuse html2canvas */
               backdrop-filter: none !important;
               -webkit-backdrop-filter: none !important;
               
               /* Ensures font rendering is consistent */
               text-rendering: optimizeLegibility !important;
           }

           /* Layout Specific Styles */
           .layout-technical .invoice-table th { background-color: #1e293b !important; color: white !important; }
           .layout-technical .invoice-table td { border-bottom: 1px solid #cbd5e1 !important; }
           
           .layout-modern .invoice-header { background: transparent !important; border-bottom: 4px solid #2563eb; padding-bottom: 1rem; }
           .layout-modern .invoice-title { color: #2563eb !important; font-size: 2.5rem !important; }
           
           .layout-classic .invoice-container { border: 4px double #000 !important; }
           .layout-classic th { border: 1px solid #000 !important; background: #eee !important; color: #000 !important; }
           .layout-classic td { border: 1px solid #000 !important; }

           /* Ensure white background for capture */
           .invoice-page {
             background-color: white !important;
           }
         `}
       </style>

       {/* Toolbar - Hidden in Print */}
       <div className="no-print fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md shadow-lg border-b border-slate-200 p-4 z-50 flex justify-between items-center px-6">
           <div className="flex items-center gap-4">
               <button onClick={() => navigate(-1)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 flex items-center gap-2 transition-colors">
                   <ArrowRight size={20} /> <span className="text-sm font-bold">بازگشت</span>
               </button>
               <div className="h-8 w-px bg-slate-200 mx-2"></div>
               <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                       <Settings2 size={18} />
                   </div>
                   <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 font-black uppercase">انتخاب قالب فاکتور</span>
                       <select 
                         value={tempLayout} 
                         onChange={(e) => setTempLayout(e.target.value as any)}
                         className="bg-transparent border-none p-0 text-sm font-black text-slate-900 focus:ring-0 cursor-pointer"
                       >
                           <option value="technical">فنی (مهندسی)</option>
                           <option value="modern">مدرن (مینیمال)</option>
                           <option value="standard">استاندارد (رسمی)</option>
                           <option value="classic">کلاسیک (ساده)</option>
                       </select>
                   </div>
               </div>
           </div>
           
           <button 
             onClick={handleDownloadPDF}
             disabled={isGenerating}
             className={`
                bg-blue-600 text-white px-8 h-14 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl shadow-blue-500/20 transition-all active:scale-95
                ${isGenerating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}
             `}
           >
               {isGenerating ? (
                 <>
                   <Loader2 className="animate-spin" size={20} /> در حال تولید فایل...
                 </>
               ) : (
                 <>
                   <Download size={20} /> دریافت فایل PDF
                 </>
               )}
           </button>
       </div>
       
       <div className="no-print h-24 w-full"></div>

       {/* A4 Page Container */}
       <div 
         ref={invoiceRef}
         className={`invoice-page layout-${tempLayout} bg-white w-[210mm] min-h-[297mm] shadow-2xl mx-auto relative flex flex-col overflow-hidden`}
         style={{ fontFamily: "'Vazirmatn', sans-serif", direction: 'rtl' }}
        >
           
           {/* Header */}
           <div className={`invoice-header p-10 ${tempLayout === 'technical' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
               <div className="flex justify-between items-start">
                   <div className="flex-1">
                        <h1 className={`invoice-title font-black uppercase tracking-tight mb-2 ${tempLayout === 'technical' ? 'text-4xl text-white' : 'text-3xl text-slate-900'}`}>
                            {invoiceConfig.companyName}
                        </h1>
                        <p className={`text-sm font-medium opacity-80 ${tempLayout === 'technical' ? 'text-slate-300' : 'text-slate-500'}`}>
                            {invoiceConfig.companyAddress}
                        </p>
                        <p className={`text-sm font-medium opacity-80 mt-1 ${tempLayout === 'technical' ? 'text-slate-300' : 'text-slate-500'}`}>
                            تلفن: {toPersianDigits(invoiceConfig.companyPhone)}
                        </p>
                   </div>
                   <div className={`text-left w-48 ${tempLayout === 'classic' ? 'border-2 border-black p-2' : ''}`}>
                       <div className={`text-center py-2 px-4 rounded-lg mb-3 font-bold text-sm tracking-widest uppercase
                           ${tempLayout === 'technical' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}
                       `}>
                           پیش فاکتور
                       </div>
                       <div className="space-y-1 text-xs">
                           <div className="flex justify-between">
                               <span className="opacity-60">تاریخ:</span>
                               <span className="font-bold">{todayJalali}</span>
                           </div>
                           <div className="flex justify-between">
                               <span className="opacity-60">شماره:</span>
                               <span className="font-bold">{toPersianDigits(projectDetails.id.slice(-6))}</span>
                           </div>
                       </div>
                   </div>
               </div>
           </div>

           {/* Customer Info */}
           <div className="px-10 py-6 border-b border-slate-100">
               <div className={`grid grid-cols-2 gap-8 p-6 rounded-3xl ${tempLayout === 'technical' ? 'bg-slate-50' : 'border border-slate-100'}`}>
                   <div>
                       <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-slate-400">مشخصات خریدار</span>
                       <div className="text-lg font-bold text-slate-900">{projectDetails.customerName}</div>
                   </div>
                   <div>
                       <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-slate-400">نشانی پروژه</span>
                       <div className="text-sm font-medium text-slate-700">{projectDetails.address || 'نشانی ثبت نشده است'}</div>
                   </div>
               </div>
           </div>

           {/* Items Table */}
           <div className="flex-1 px-10 py-6">
               <table className="invoice-table w-full text-right border-collapse">
                   <thead>
                       <tr className={`text-[11px] font-bold ${tempLayout === 'modern' ? 'border-b-2 border-blue-600 text-blue-600' : 'bg-slate-100 text-slate-700'}`}>
                           <th className="p-4 w-12 text-center">ردیف</th>
                           <th className="p-4 w-44 text-center">طرح فنی</th>
                           <th className="p-4">شرح اقلام و محاسبات</th>
                           <th className="p-4 w-36 text-center">قیمت کل</th>
                       </tr>
                   </thead>
                   <tbody>
                       {items.map((item, index) => {
                           const brandName = BRANDS.find(b => b.id === item.config.profileId)?.name;
                           return (
                               <tr key={index} className="border-b border-slate-100 break-inside-avoid">
                                   <td className="p-4 text-center font-bold text-slate-400 align-top text-sm">
                                       {toPersianDigits(index + 1)}
                                   </td>
                                   <td className="p-4 align-top">
                                       <div className="w-36 h-36 mx-auto border border-slate-200 rounded-2xl flex items-center justify-center p-2 bg-slate-50">
                                            <WindowPreview config={item.config} width="100%" height="100%" className="scale-90" />
                                       </div>
                                       <div className="text-[10px] font-black text-center mt-3 text-slate-500 uppercase tracking-tighter">
                                           {toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)} mm
                                       </div>
                                   </td>
                                   <td className="p-4 align-top">
                                       <div className="mb-3 text-xs font-black text-slate-800 flex items-center gap-2">
                                           <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{brandName}</span>
                                           <span>{item.config.type}</span>
                                       </div>
                                       <div className="grid grid-cols-1 gap-y-1.5">
                                           {item.calculations.details?.map((detail, dIdx) => (
                                               <div key={dIdx} className="flex justify-between text-[10px] border-b border-slate-50 pb-1.5 last:border-0">
                                                   <span className="text-slate-500 font-medium">{detail.name}</span>
                                                   <div className="flex gap-4">
                                                       <span className="font-bold text-slate-700">{toPersianDigits(detail.quantity)} {detail.unit}</span>
                                                       <span className="font-black text-slate-900 w-20 text-left tracking-tighter">{formatPrice(detail.totalPrice)}</span>
                                                   </div>
                                               </div>
                                           ))}
                                       </div>
                                   </td>
                                   <td className="p-4 align-top text-left font-black text-slate-900 text-base bg-slate-50/30">
                                       {formatPrice(item.calculations.totalPrice)}
                                   </td>
                               </tr>
                           );
                       })}
                   </tbody>
               </table>
           </div>

           {/* Footer */}
           <div className={`mt-auto p-10 break-inside-avoid ${tempLayout === 'technical' ? 'bg-slate-900 text-white' : 'bg-slate-50 border-t border-slate-200'}`}>
               <div className="flex flex-col md:flex-row justify-between items-start gap-12">
                   <div className="flex-1">
                       <h4 className="text-[10px] font-black uppercase tracking-[3px] mb-4 opacity-50">شرایط و توضیحات فاکتور</h4>
                       <p className="text-[11px] leading-relaxed opacity-70 text-justify">
                           {invoiceConfig.footerNote || 'اعتبار این فاکتور ۷۲ ساعت می‌باشد. هزینه حمل و نقل بر عهده خریدار است.'}
                       </p>
                       
                       <div className="mt-12 flex justify-between text-center">
                          <div className="flex flex-col items-center">
                              <div className="w-40 h-px bg-current opacity-20 mb-4"></div>
                              <span className="text-[10px] font-black uppercase opacity-40">مهر و امضای فروشنده</span>
                          </div>
                          <div className="flex flex-col items-center">
                              <div className="w-40 h-px bg-current opacity-20 mb-4"></div>
                              <span className="text-[10px] font-black uppercase opacity-40">تایید و امضای خریدار</span>
                          </div>
                       </div>
                   </div>

                   <div className="w-full md:w-80 space-y-4">
                       <div className="flex justify-between text-sm opacity-60">
                           <span className="font-bold">مجموع کل متریال:</span>
                           <span className="font-black">{formatPrice(totalMaterialPrice)}</span>
                       </div>
                       <div className="flex justify-between text-sm opacity-60">
                           <span className="font-bold">هزینه نصب ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                           <span className="font-black">{formatPrice(installationCost)}</span>
                       </div>
                       <div className={`h-px my-4 ${tempLayout === 'technical' ? 'bg-white/10' : 'bg-slate-300'}`}></div>
                       <div className="flex justify-between items-center">
                           <span className="text-base font-bold opacity-60">مبلغ نهایی قابل پرداخت:</span>
                           <div className="text-left">
                               <div className="text-3xl font-black tracking-tighter">{formatPrice(finalPrice)}</div>
                               <span className="text-[10px] font-black uppercase opacity-50 block mt-1">Tomans / تومان</span>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
       </div>
       <div className="no-print h-20"></div>
    </div>
  );
};
