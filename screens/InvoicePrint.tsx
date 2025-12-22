
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Settings2 } from 'lucide-react';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem, AppSettings, InvoiceLayoutType } from '../types';
import { BRANDS } from '../constants';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';

export const InvoicePrint = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { projectDetails: ProjectDetails, items: InvoiceItem[] } | null;
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(state?.projectDetails || null);
  const [items, setItems] = useState<InvoiceItem[]>(state?.items || []);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tempLayout, setTempLayout] = useState<InvoiceLayoutType>('technical');

  useEffect(() => {
     const loadedSettings = pricingStore.getSettings();
     setSettings(loadedSettings);
     if (loadedSettings.invoice.layoutType) {
         setTempLayout(loadedSettings.invoice.layoutType);
     }
  }, []);

  if (!projectDetails || items.length === 0) {
      return <div>Loading...</div>;
  }

  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + item.calculations.unitPrice, 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;
  const todayJalali = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date(projectDetails.date));
  const invoiceConfig = settings?.invoice || { companyName: 'فروشگاه لومینا', companyPhone: '', companyAddress: '', footerNote: '' };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="min-h-screen bg-slate-200 p-8 flex flex-col items-center">
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
           
           /* Layout Specific Styles */
           .layout-technical .invoice-table th { background-color: #1e293b !important; color: white !important; }
           .layout-technical .invoice-table td { border-bottom: 1px solid #cbd5e1 !important; }
           
           .layout-modern .invoice-header { background: transparent !important; border-bottom: 4px solid #2563eb; padding-bottom: 1rem; }
           .layout-modern .invoice-title { color: #2563eb !important; font-size: 2.5rem !important; }
           
           .layout-classic .invoice-container { border: 4px double #000 !important; }
           .layout-classic th { border: 1px solid #000 !important; background: #eee !important; color: #000 !important; }
           .layout-classic td { border: 1px solid #000 !important; }
         `}
       </style>

       {/* Toolbar - Hidden in Print */}
       <div className="no-print fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md shadow-sm p-4 z-50 flex justify-between items-center">
           <div className="flex items-center gap-4">
               <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 flex items-center gap-2">
                   <ArrowRight size={20} /> بازگشت
               </button>
               <div className="h-6 w-px bg-slate-200"></div>
               <div className="flex items-center gap-2 text-sm text-slate-600">
                   <Settings2 size={16} />
                   <span>قالب:</span>
                   <select 
                     value={tempLayout} 
                     onChange={(e) => setTempLayout(e.target.value as any)}
                     className="bg-slate-100 border-none rounded-lg py-1 px-3 text-sm font-bold"
                   >
                       <option value="technical">فنی (مهندسی)</option>
                       <option value="modern">مدرن (مینیمال)</option>
                       <option value="standard">استاندارد (رسمی)</option>
                       <option value="classic">کلاسیک (ساده)</option>
                   </select>
               </div>
           </div>
           <button 
             onClick={handlePrint}
             className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-colors"
           >
               <Printer size={20} /> چاپ / ذخیره PDF
           </button>
       </div>
       
       <div className="no-print h-16 w-full"></div>

       {/* A4 Page Container */}
       <div className={`invoice-page layout-${tempLayout} bg-white w-[210mm] min-h-[297mm] shadow-2xl mx-auto relative flex flex-col`}>
           
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
               <div className={`grid grid-cols-2 gap-8 p-4 rounded-xl ${tempLayout === 'technical' ? 'bg-slate-50' : ''}`}>
                   <div>
                       <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-slate-400">مشخصات خریدار</span>
                       <div className="text-lg font-bold text-slate-900">{projectDetails.customerName}</div>
                   </div>
                   <div>
                       <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-slate-400">نشانی پروژه</span>
                       <div className="text-sm font-medium text-slate-700">{projectDetails.address}</div>
                   </div>
               </div>
           </div>

           {/* Items Table */}
           <div className="flex-1 px-10 py-6">
               <table className="invoice-table w-full text-right border-collapse">
                   <thead>
                       <tr className={`text-[11px] font-bold ${tempLayout === 'modern' ? 'border-b-2 border-blue-600 text-blue-600' : 'bg-slate-100 text-slate-700'}`}>
                           <th className="p-3 w-12 text-center">ردیف</th>
                           <th className="p-3 w-40 text-center">طرح فنی</th>
                           <th className="p-3">شرح اقلام و محاسبات</th>
                           <th className="p-3 w-32 text-center">قیمت کل</th>
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
                                       <div className="w-32 h-32 mx-auto border border-slate-200 rounded-lg flex items-center justify-center p-2 bg-slate-50">
                                            <WindowPreview config={item.config} width="100%" height="100%" className="scale-90" />
                                       </div>
                                       <div className="text-[9px] font-bold text-center mt-2 text-slate-500 dir-ltr">
                                           {item.config.width} × {item.config.height} mm
                                       </div>
                                   </td>
                                   <td className="p-4 align-top">
                                       <div className="mb-2 text-xs font-bold text-slate-800">
                                           <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 ml-2">{brandName}</span>
                                           <span>{item.config.type}</span>
                                       </div>
                                       <div className="grid grid-cols-1 gap-y-1">
                                           {item.calculations.details?.map((detail, dIdx) => (
                                               <div key={dIdx} className="flex justify-between text-[10px] border-b border-slate-50 pb-1 last:border-0">
                                                   <span className="text-slate-600">{detail.name}</span>
                                                   <div className="flex gap-4">
                                                       <span className="font-bold text-slate-700">{toPersianDigits(detail.quantity)} {detail.unit}</span>
                                                       <span className="font-mono text-slate-400 w-16 text-left">{formatPrice(detail.totalPrice)}</span>
                                                   </div>
                                               </div>
                                           ))}
                                       </div>
                                   </td>
                                   <td className="p-4 align-top text-left font-black text-slate-800 text-sm">
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
               <div className="flex justify-between items-start gap-10">
                   <div className="flex-1">
                       <h4 className="text-xs font-black uppercase tracking-widest mb-2 opacity-50">شرایط و توضیحات</h4>
                       <p className="text-[10px] leading-relaxed opacity-70 text-justify">
                           {invoiceConfig.footerNote || 'اعتبار این فاکتور ۷۲ ساعت می‌باشد. هزینه حمل و نقل بر عهده خریدار است.'}
                       </p>
                   </div>
                   <div className="w-64 space-y-3">
                       <div className="flex justify-between text-xs opacity-70">
                           <span>جمع کل متریال:</span>
                           <span>{formatPrice(totalMaterialPrice)}</span>
                       </div>
                       <div className="flex justify-between text-xs opacity-70">
                           <span>هزینه نصب ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                           <span>{formatPrice(installationCost)}</span>
                       </div>
                       <div className={`h-px my-2 ${tempLayout === 'technical' ? 'bg-white/20' : 'bg-slate-300'}`}></div>
                       <div className="flex justify-between items-center text-xl font-black">
                           <span>مبلغ نهایی:</span>
                           <span>{formatPrice(finalPrice)}</span>
                       </div>
                   </div>
               </div>
               
               <div className="mt-12 flex justify-between text-center">
                   <div className="w-40 border-t border-dashed border-current pt-4 text-xs font-bold opacity-50">مهر و امضای فروشنده</div>
                   <div className="w-40 border-t border-dashed border-current pt-4 text-xs font-bold opacity-50">تایید و امضای خریدار</div>
               </div>
           </div>
       </div>
       <div className="no-print h-12"></div>
    </div>
  );
};
