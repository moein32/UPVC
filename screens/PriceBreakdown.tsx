
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Share2, Printer, Home, Edit2, Trash2, ChevronLeft, Ruler } from 'lucide-react';
import { PrimaryButton } from '../components/UIComponents';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem, AppSettings, InvoiceLayoutType } from '../types';
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
  }, []);

  if (!projectDetails || items.length === 0) {
      return (
          <div className="h-screen flex items-center justify-center flex-col gap-4 bg-slate-50 text-slate-700">
              <p>هیچ آیتمی یافت نشد.</p>
              <button onClick={() => navigate('/dashboard')} className="text-blue-500 flex items-center gap-2">
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
    if (window.confirm('آیا از حذف این آیتم از فاکتور مطمئن هستید؟')) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
      const projectToSave = {
        ...projectDetails,
        items: updatedItems,
        totalPrice: updatedItems.reduce((acc, item) => acc + item.calculations.totalPrice, 0),
      };
      pricingStore.saveProject(projectToSave);
      if (updatedItems.length === 0) navigate('/projects');
    }
  };

  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + item.calculations.unitPrice, 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;
  const todayJalali = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date(projectDetails.date));

  const invoiceConfig = settings?.invoice || { companyName: 'فروشگاه لومینا', companyPhone: '', companyAddress: '', footerNote: '', layoutType: 'technical' as InvoiceLayoutType };
  const layout = invoiceConfig.layoutType || 'technical';

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-24 print:bg-white print:p-0">
       <style>
         {`
           @media print {
             @page { 
               size: A4; 
               margin: 5mm; 
             }
             body { 
               -webkit-print-color-adjust: exact; 
               background-color: white !important; 
               font-family: 'Vazirmatn', sans-serif !important;
               margin: 0 !important;
               padding: 0 !important;
             }
             .no-print { display: none !important; }
             
             .invoice-container { 
                box-shadow: none !important; 
                border: none !important; 
                border-radius: 0 !important; 
                padding: 10mm !important;
                margin: 0 !important;
                
                /* Precise 70% Scaling for A4 Compatibility */
                width: 142.85% !important; /* Calculation: 100% / 0.7 = 142.85% */
                transform: scale(0.7);
                transform-origin: top right; /* Critical for RTL layout alignment */
                
                min-height: auto !important;
                overflow: visible !important;
             }
             
             .print-table { display: table !important; width: 100% !important; }
             .mobile-card { display: none !important; }
             
             /* High contrast for clear dimensions in print */
             * { color-adjust: exact; -webkit-print-color-adjust: exact; }
             th, td { border-color: #cbd5e1 !important; }
           }

           /* Layout Specific UI (On-Screen Only) */
           .layout-modern .invoice-header { border-bottom: 4px solid #3b82f6; background: transparent !important; padding: 2rem 0; }
           .layout-technical .invoice-table { border: 1px solid #1e293b; }
           .layout-technical th, .layout-technical td { border: 1px solid #e2e8f0 !important; font-family: 'Vazirmatn', sans-serif; }
           .layout-technical .invoice-header { background: #1e293b !important; color: white !important; }
           .layout-technical .invoice-header * { color: white !important; }
         `}
       </style>

       <div className="flex items-center justify-between mb-6 pt-4 px-2 no-print">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-white rounded-xl shadow-sm text-slate-700">
          <ChevronLeft size={20} className="rotate-180" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">پیش فاکتور نهایی</h1>
        <div className="flex gap-2">
           <button onClick={handleEditProject} className="p-2 bg-blue-50 text-blue-600 rounded-xl shadow-sm" title="ویرایش اطلاعات کلی پروژه">
            <Edit2 size={20} />
          </button>
          <button onClick={() => window.print()} className="p-2 bg-white rounded-xl shadow-sm text-slate-700" title="چاپ فاکتور">
            <Printer size={20} />
          </button>
        </div>
      </div>

      <div className={`invoice-container layout-${layout} bg-white mx-auto max-w-[210mm] min-h-[297mm] rounded-none md:rounded-3xl shadow-2xl overflow-hidden print:w-full print:max-w-none print:min-h-0 print:p-8 transition-all`}>
        
        {/* Invoice Header */}
        <div className="invoice-header p-8 border-b-2 border-slate-800 bg-slate-50/50">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                     <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">{invoiceConfig.companyName}</h2>
                     <p className="text-slate-600 text-sm font-medium">{invoiceConfig.companyAddress}</p>
                     <p className="text-slate-600 text-sm font-medium mt-1">تلفن: {toPersianDigits(invoiceConfig.companyPhone)}</p>
                </div>
                <div className="text-left w-52">
                    <div className="bg-slate-900 text-white text-center py-2 px-4 rounded-xl mb-3 font-bold text-sm tracking-widest uppercase">پیش فاکتور</div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">تاریخ:</span>
                            <span className="font-bold">{todayJalali}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">شماره پروژه:</span>
                            <span className="font-bold">{toPersianDigits(projectDetails.id.slice(-6))}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Customer Box */}
        <div className="p-6 customer-box border-b border-slate-100">
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">مشخصات خریدار</span>
                    <div className="text-lg font-bold text-slate-900">{projectDetails.customerName}</div>
                </div>
                <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">نشانی پروژه</span>
                    <div className="text-xs font-medium text-slate-700">{projectDetails.address}</div>
                </div>
            </div>
        </div>

        {/* Desktop/Print Table */}
        <div className="p-6 hidden md:block print-table w-full">
            <table className="invoice-table w-full text-right border-collapse">
                <thead>
                    <tr className="bg-slate-800 text-white text-[11px] font-bold">
                        <th className="p-4 w-12 text-center">ردیف</th>
                        <th className="p-4 w-48 text-center">طراحی فنی</th>
                        <th className="p-4">ریز محاسبات و شرح کالا</th>
                        <th className="p-4 w-36 text-center">مبلغ ردیف</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => {
                        const brandName = BRANDS.find(b => b.id === item.config.profileId)?.name;
                        return (
                            <tr key={index} className="border-b border-slate-100 print:break-inside-avoid group">
                                <td className="p-4 text-center font-bold text-slate-400 align-top text-sm relative">
                                    {toPersianDigits(index + 1)}
                                    <div className="mt-4 flex flex-col gap-2 no-print items-center opacity-100 transition-opacity">
                                       <button onClick={() => handleEditItem(index)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="ویرایش ابعاد و طراحی">
                                          <Ruler size={16}/>
                                       </button>
                                       <button onClick={() => handleDeleteItem(index)} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm" title="حذف این ردیف">
                                          <Trash2 size={16}/>
                                       </button>
                                    </div>
                                </td>
                                
                                <td className="p-4 align-top">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-44 h-44 bg-slate-50 rounded-2xl flex items-center justify-center p-2 border border-slate-100">
                                            <WindowPreview config={item.config} width="100%" height="100%" className="scale-90" />
                                        </div>
                                        <div className="text-[10px] font-bold text-center text-slate-500 uppercase">
                                            {toPersianDigits(item.config.width)}×{toPersianDigits(item.config.height)} MM
                                        </div>
                                        <button onClick={() => handleEditItem(index)} className="no-print mt-1 text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                            <Edit2 size={10} /> ویرایش ابعاد
                                        </button>
                                    </div>
                                </td>

                                <td className="p-0 align-top">
                                    <div className="bg-slate-50/50 p-2 border-b border-slate-100 text-[10px] font-bold flex justify-between px-4">
                                        <span className="text-blue-600">برند پروفیل: {brandName}</span>
                                        <span className="text-slate-500">تیپ: {item.config.type}</span>
                                    </div>
                                    <div className="p-2">
                                        <table className="w-full text-[10px]">
                                            <thead>
                                                <tr className="text-slate-400 border-b border-slate-50">
                                                    <th className="p-1 text-right font-bold pb-2">شرح قطعه / خدمات</th>
                                                    <th className="p-1 text-center font-bold pb-2">واحد</th>
                                                    <th className="p-1 text-center font-bold pb-2">مقدار</th>
                                                    <th className="p-1 text-left font-bold pb-2">مبلغ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.calculations.details?.map((detail, dIdx) => (
                                                    <tr key={dIdx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                                                        <td className="p-1.5 font-medium text-slate-700">{detail.name}</td>
                                                        <td className="p-1.5 text-center text-slate-400">{detail.unit}</td>
                                                        <td className="p-1.5 text-center font-bold text-slate-800">{toPersianDigits(detail.quantity)}</td>
                                                        <td className="p-1.5 text-left font-bold text-slate-900 tracking-tight">{formatPrice(detail.totalPrice)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </td>

                                <td className="p-4 align-top text-left font-black text-slate-900 bg-slate-50/30">
                                    <div className="mt-1">{formatPrice(item.calculations.totalPrice)}</div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* Mobile View Card List (Hidden in Print) */}
        <div className="p-4 md:hidden mobile-card space-y-4">
            {items.map((item, index) => {
                const brandName = BRANDS.find(b => b.id === item.config.profileId)?.name;
                return (
                    <div key={index} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                         <div className="p-4 flex justify-between items-center border-b border-slate-50 bg-slate-50/50">
                             <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900">ردیف {toPersianDigits(index + 1)}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{brandName} - {item.config.type}</span>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => handleEditItem(index)} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 active:scale-90 transition-all">
                                    <Ruler size={16}/>
                                </button>
                                <button onClick={() => handleDeleteItem(index)} className="p-2.5 bg-red-50 text-red-500 rounded-xl active:scale-90 transition-all">
                                    <Trash2 size={16}/>
                                </button>
                             </div>
                         </div>
                         <div className="p-4 flex gap-4 items-center">
                             <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center p-1 border border-slate-100">
                                 <WindowPreview config={item.config} width="100%" height="100%" />
                             </div>
                             <div className="flex-1">
                                 <div className="text-[10px] text-slate-400 mb-1 font-bold">ابعاد نهایی: {toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)}</div>
                                 <div className="text-lg font-black text-slate-900">{formatPrice(item.calculations.totalPrice)} <span className="text-[10px] font-normal">تومان</span></div>
                             </div>
                         </div>
                    </div>
                )
            })}
        </div>

        {/* Footer Summary */}
        <div className="p-8 bg-slate-900 text-white print:bg-white print:text-slate-900 print:border-t print:border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex-1 border border-white/10 print:border-slate-200 p-6 rounded-3xl bg-white/5 print:bg-slate-50 w-full">
                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 print:text-blue-600 mb-4 underline">شرایط و توضیحات فاکتور:</h4>
                    <p className="text-[10px] leading-relaxed text-slate-300 print:text-slate-600">{invoiceConfig.footerNote}</p>
                    <div className="mt-6 flex gap-8">
                        <div className="text-center">
                            <div className="text-[9px] text-slate-500 mb-8 uppercase font-bold">مهر و امضای فروشنده</div>
                            <div className="w-32 h-px bg-white/20 print:bg-slate-300 mx-auto"></div>
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] text-slate-500 mb-8 uppercase font-bold">تایید و امضای خریدار</div>
                            <div className="w-32 h-px bg-white/20 print:bg-slate-300 mx-auto"></div>
                        </div>
                    </div>
                </div>
                
                <div className="w-full md:w-80 space-y-4">
                    <div className="flex justify-between text-slate-400 print:text-slate-500 text-sm">
                        <span>مجموع متریال و یراق:</span>
                        <span className="font-bold text-white print:text-slate-900">{formatPrice(totalMaterialPrice)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 print:text-slate-500 text-sm">
                        <span>اجرت نصب ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                        <span className="font-bold text-white print:text-slate-900">{formatPrice(installationCost)}</span>
                    </div>
                    <div className="h-px bg-white/10 print:bg-slate-200 my-4"></div>
                    <div className="flex justify-between items-center text-2xl font-black text-blue-400 print:text-blue-700">
                        <span className="text-lg text-white print:text-slate-900">مبلغ قابل پرداخت:</span>
                        <div className="text-left">
                            {formatPrice(finalPrice)}
                            <span className="block text-[10px] text-slate-500 font-normal mt-1 uppercase">Toman / تومان</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center no-print pb-12">
        <button 
            onClick={() => navigate('/designer', { state: { projectDetails, items } })}
            className="bg-slate-800 text-white py-4 px-8 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
            <Ruler size={20} /> افزودن ردیف جدید
        </button>
        <PrimaryButton onClick={() => window.print()} icon={Printer} className="w-full md:w-auto md:min-w-[250px] shadow-2xl">
            چاپ و دریافت PDF
        </PrimaryButton>
      </div>
    </div>
  );
};
