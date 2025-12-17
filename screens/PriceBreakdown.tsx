import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Share2, Printer, Home, Edit2, Trash2 } from 'lucide-react';
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
  }, []);

  if (!projectDetails || items.length === 0) {
      return (
          <div className="h-screen flex items-center justify-center flex-col gap-4 bg-slate-50 text-slate-700">
              <p>هیچ آیتمی یافت نشد.</p>
              <button onClick={() => navigate('/dashboard')} className="text-blue-500">بازگشت به خانه</button>
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
      
      // Update store
      const projectToSave = {
        ...projectDetails,
        items: updatedItems,
        totalPrice: updatedItems.reduce((acc, item) => acc + item.calculations.totalPrice, 0),
      };
      pricingStore.saveProject(projectToSave);

      if (updatedItems.length === 0) {
        navigate('/projects');
      }
    }
  };

  // Calculate Totals
  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + item.calculations.unitPrice, 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;
  const todayJalali = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date(projectDetails.date));

  const invoiceConfig = settings?.invoice || { companyName: 'فروشگاه در و پنجره', companyPhone: '', companyAddress: '', footerNote: '' };

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-24 print:bg-white print:p-0">
       <style>
         {`
           @media print {
             @page { size: A4; margin: 0; }
             body { -webkit-print-color-adjust: exact; background-color: white !important; color: black !important; }
             .no-print { display: none !important; }
             .invoice-container { box-shadow: none !important; border: none !important; border-radius: 0 !important; width: 100% !important; max-width: none !important; min-height: 100vh !important; }
             .invoice-header { background-color: #f8fafc !important; color: black !important; border-bottom: 2px solid #000 !important; }
             .invoice-table th { background-color: #e2e8f0 !important; color: black !important; border: 1px solid #000 !important; }
             .invoice-table td { border: 1px solid #000 !important; }
             .print-table { display: table !important; }
             .mobile-card { display: none !important; }
           }
         `}
       </style>

       <div className="flex items-center justify-between mb-6 pt-4 px-2 no-print">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-white rounded-xl shadow-sm text-slate-700">
          <Home size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900">پیش فاکتور فروش</h1>
        <div className="flex gap-2">
           <button onClick={handleEditProject} className="p-2 bg-blue-50 text-blue-600 rounded-xl shadow-sm">
            <Edit2 size={20} />
          </button>
          <button onClick={() => window.print()} className="p-2 bg-white rounded-xl shadow-sm text-slate-700">
            <Printer size={20} />
          </button>
        </div>
      </div>

      {/* Invoice Container - Responsive */}
      <div className="invoice-container bg-white mx-auto max-w-[210mm] min-h-[297mm] rounded-none md:rounded-sm shadow-xl overflow-hidden print:w-full print:max-w-none print:min-h-0 print:p-8">
        
        {/* Modern Invoice Header */}
        <div className="invoice-header p-8 border-b-2 border-slate-800">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                     <h2 className="text-3xl font-black text-slate-900 mb-2">{invoiceConfig.companyName}</h2>
                     <p className="text-slate-600 text-sm font-medium">{invoiceConfig.companyAddress}</p>
                     <p className="text-slate-600 text-sm font-medium mt-1">تلفن: {toPersianDigits(invoiceConfig.companyPhone)}</p>
                </div>
                <div className="text-left w-48">
                    <div className="bg-slate-900 text-white text-center py-2 px-4 rounded-lg mb-2 font-bold">پیش فاکتور</div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">تاریخ:</span>
                        <span className="font-bold">{todayJalali}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">شماره:</span>
                        <span className="font-bold">{toPersianDigits(projectDetails.id.slice(-6))}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Customer Info Box */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <span className="text-xs text-slate-500 font-bold block mb-1">مشخصات خریدار</span>
                    <div className="text-lg font-bold text-slate-900">{projectDetails.customerName}</div>
                </div>
                <div>
                    <span className="text-xs text-slate-500 font-bold block mb-1">آدرس پروژه</span>
                    <div className="text-sm font-medium text-slate-900">{projectDetails.address}</div>
                </div>
            </div>
        </div>

        {/* Desktop Table (Hidden on Mobile, Visible on Print) */}
        <div className="p-6 hidden md:block print-table w-full">
            <table className="invoice-table w-full text-right border-collapse">
                <thead>
                    <tr className="bg-slate-800 text-white text-xs font-bold">
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3 w-64 text-center">نمای فنی</th>
                        <th className="p-3">شرح اقلام و محاسبات</th>
                        <th className="p-3 w-32 text-center">قیمت کل (تومان)</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => {
                        const brandName = BRANDS.find(b => b.id === item.config.profileId)?.name;
                        return (
                            <React.Fragment key={index}>
                                <tr className="border-b border-slate-300 print:break-inside-avoid">
                                    <td className="p-3 border-l border-slate-200 text-center font-bold text-slate-700 align-top bg-slate-50" rowSpan={2}>
                                        {toPersianDigits(index + 1)}
                                        <div className="mt-4 flex flex-col gap-2 no-print items-center opacity-50 hover:opacity-100">
                                           <button onClick={() => handleEditItem(index)} className="text-blue-600"><Edit2 size={16}/></button>
                                           <button onClick={() => handleDeleteItem(index)} className="text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                    
                                    <td className="p-4 border-l border-slate-200 align-top">
                                        <div className="flex flex-col items-center gap-2">
                                            {/* Increased size from w-32 to w-56 for better A4 visibility */}
                                            <div className="w-56 h-56 flex items-center justify-center">
                                                <WindowPreview config={item.config} width="100%" height="100%" className="!shadow-none" />
                                            </div>
                                            <div className="text-xs font-bold text-center bg-slate-100 px-2 py-1 rounded">
                                                {toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-0 border-l border-slate-200 align-top">
                                        <div className="bg-slate-100 p-2 border-b border-slate-200 text-xs font-bold flex justify-between px-4">
                                            <span className="text-slate-800">سیستم پروفیل: {brandName}</span>
                                            <span className="text-slate-800">تعداد: {toPersianDigits(1)} عدد</span>
                                        </div>
                                        <div className="p-2">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-slate-400 border-b border-slate-100">
                                                        <th className="p-1 text-right font-normal pb-2">شرح کالا</th>
                                                        <th className="p-1 text-center font-normal pb-2">واحد</th>
                                                        <th className="p-1 text-center font-normal pb-2">مقدار</th>
                                                        <th className="p-1 text-left font-normal pb-2">فی</th>
                                                        <th className="p-1 text-left font-normal pb-2">مبلغ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {item.calculations.details?.map((detail, dIdx) => (
                                                        <tr key={dIdx} className="border-b border-slate-50 last:border-0">
                                                            <td className="p-1.5 font-medium text-slate-700">{detail.name}</td>
                                                            <td className="p-1.5 text-center text-slate-500">{detail.unit}</td>
                                                            <td className="p-1.5 text-center font-bold text-slate-800">{toPersianDigits(detail.quantity)}</td>
                                                            <td className="p-1.5 text-left text-slate-500 tracking-tight">{formatPrice(detail.unitPrice)}</td>
                                                            <td className="p-1.5 text-left font-bold text-slate-800 tracking-tight">{formatPrice(detail.totalPrice)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </td>

                                    <td className="p-3 align-top text-left font-bold text-slate-900 bg-slate-50">
                                        <div className="mt-2">{formatPrice(item.calculations.totalPrice)}</div>
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* Mobile Cards (Visible on Mobile, Hidden on Print) */}
        <div className="p-4 md:hidden mobile-card space-y-6">
            {items.map((item, index) => {
                const brandName = BRANDS.find(b => b.id === item.config.profileId)?.name;
                return (
                    <div key={index} className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
                         <div className="bg-slate-800 text-white p-3 flex justify-between items-center text-sm font-bold">
                             <span>آیتم {toPersianDigits(index + 1)}: {brandName}</span>
                             <div className="flex gap-2">
                                <button onClick={() => handleEditItem(index)} className="p-1 bg-white/20 rounded hover:bg-white/40"><Edit2 size={14}/></button>
                                <button onClick={() => handleDeleteItem(index)} className="p-1 bg-red-500/80 rounded hover:bg-red-500"><Trash2 size={14}/></button>
                             </div>
                         </div>
                         
                         <div className="p-4 flex flex-col gap-4">
                             {/* Preview */}
                             <div className="self-center w-full h-48 bg-white rounded border border-slate-100 p-2 flex items-center justify-center mx-auto">
                                 <WindowPreview config={item.config} width="100%" height="100%" className="!shadow-none !border-none" />
                             </div>
                             
                             {/* Breakdown List */}
                             <div className="text-xs space-y-2 bg-slate-50 p-3 rounded-lg">
                                 {item.calculations.details?.map((detail, dIdx) => (
                                     <div key={dIdx} className="flex justify-between border-b border-slate-200 pb-1 last:border-0">
                                         <span className="text-slate-600">{detail.name} ({toPersianDigits(detail.quantity)} {detail.unit})</span>
                                         <span className="font-bold">{formatPrice(detail.totalPrice)}</span>
                                     </div>
                                 ))}
                             </div>
                             
                             <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center font-bold text-slate-800 border border-blue-100">
                                 <span>قیمت کل:</span>
                                 <span>{formatPrice(item.calculations.totalPrice)} تومان</span>
                             </div>
                         </div>
                    </div>
                )
            })}
        </div>

        {/* Footer Totals */}
        <div className="p-8 bg-slate-50 print:bg-white border-t border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex-1 text-xs text-slate-500 leading-relaxed border p-4 rounded-lg bg-white w-full">
                    <p className="font-bold mb-2">شرایط و توضیحات:</p>
                    <p>{invoiceConfig.footerNote}</p>
                    <p className="mt-1">- هزینه حمل و نقل بر عهده خریدار می‌باشد.</p>
                </div>
                
                <div className="w-full md:w-80 space-y-3">
                    <div className="flex justify-between text-slate-600 text-sm">
                        <span>جمع کل پروفیل و یراق:</span>
                        <span className="font-bold">{formatPrice(totalMaterialPrice)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-sm">
                        <span>اجرت نصب و اجرا ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                        <span className="font-bold">{formatPrice(installationCost)}</span>
                    </div>
                    <div className="h-0.5 bg-slate-800 my-2"></div>
                    <div className="flex justify-between items-center text-xl font-black text-slate-900">
                        <span>مبلغ قابل پرداخت:</span>
                        <span>{formatPrice(finalPrice)} تومان</span>
                    </div>
                </div>
            </div>

            {/* Signature Area */}
            <div className="hidden print:flex justify-between px-20 mt-16 mb-8">
                <div className="text-center">
                    <div className="font-bold text-sm mb-12">مهر و امضای فروشنده</div>
                    <div className="w-40 h-0.5 bg-slate-300"></div>
                </div>
                <div className="text-center">
                    <div className="font-bold text-sm mb-12">مهر و امضای خریدار</div>
                    <div className="w-40 h-0.5 bg-slate-300"></div>
                </div>
            </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center no-print pb-10">
        <PrimaryButton onClick={() => window.print()} icon={Share2} className="w-full max-w-sm">
            چاپ / ذخیره PDF
        </PrimaryButton>
      </div>
    </div>
  );
};