import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Share2, Printer, Home, Edit2, Trash2 } from 'lucide-react';
import { PrimaryButton } from '../components/UIComponents';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem } from '../types';
import { BRANDS } from '../constants';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';

export const PriceBreakdown = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { projectDetails: ProjectDetails, items: InvoiceItem[] } | null;
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(locationState?.projectDetails || null);
  const [items, setItems] = useState<InvoiceItem[]>(locationState?.items || []);

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

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-24 print:bg-white print:p-0">
       <style>
         {`
           @media print {
             @page { size: A4; margin: 10mm; }
             body { -webkit-print-color-adjust: exact; background-color: white !important; color: black !important; }
             .no-print { display: none !important; }
             .invoice-container { box-shadow: none !important; border: 2px solid #000 !important; border-radius: 0 !important; width: 100% !important; max-width: none !important; min-height: 0 !important; }
             .invoice-header { background-color: #f1f5f9 !important; color: black !important; border-bottom: 2px solid #000 !important; }
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
      <div className="invoice-container bg-white mx-auto max-w-[210mm] min-h-[297mm] rounded-none md:rounded-sm shadow-xl overflow-hidden print:w-full print:max-w-none print:min-h-0">
        
        {/* Header Section */}
        <div className="invoice-header bg-slate-800 text-white p-6 print:p-4 flex justify-between items-start border-b-4 border-blue-500">
            <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-extrabold mb-1 print:text-black">{projectDetails.companyName}</h2>
                <p className="text-slate-300 print:text-slate-600 text-sm">سیستم‌های در و پنجره دوجداره UPVC</p>
            </div>
            <div className="text-left">
                <div className="inline-block bg-white/10 print:bg-slate-200 print:text-black rounded px-3 py-1 text-sm mb-1">پیش فاکتور</div>
                <div className="text-lg font-bold print:text-black">{todayJalali}</div>
                <div className="text-xs text-slate-400 print:text-slate-600">شماره: {toPersianDigits(projectDetails.id.slice(-6))}</div>
            </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-300">
            <div className="p-4 border-b md:border-b-0 md:border-l border-slate-300">
                <span className="text-xs text-slate-500 block mb-1">نام مشتری</span>
                <span className="font-bold text-slate-900 text-lg">{projectDetails.customerName}</span>
            </div>
            <div className="p-4">
                <span className="text-xs text-slate-500 block mb-1">آدرس پروژه</span>
                <span className="font-bold text-slate-900 text-sm">{projectDetails.address}</span>
            </div>
        </div>

        {/* Desktop Table (Hidden on Mobile, Visible on Print) */}
        <div className="p-4 print:p-2 hidden md:block print-table">
            <table className="invoice-table w-full text-right border-collapse">
                <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs font-bold">
                        <th className="p-2 border border-slate-300 w-12 text-center">ردیف</th>
                        <th className="p-2 border border-slate-300 w-32 text-center">تصویر / ابعاد</th>
                        <th className="p-2 border border-slate-300">شرح کالا و خدمات</th>
                        <th className="p-2 border border-slate-300 w-32 text-center">قیمت کل (تومان)</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => {
                        const brandName = BRANDS.find(b => b.id === item.config.profileId)?.name;
                        return (
                            <React.Fragment key={index}>
                                <tr className="border border-slate-300 print:break-inside-avoid">
                                    <td className="p-2 border border-slate-300 text-center font-bold text-slate-700 align-top" rowSpan={2}>
                                        {toPersianDigits(index + 1)}
                                        <div className="mt-2 flex flex-col gap-1 no-print">
                                           <button onClick={() => handleEditItem(index)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 size={12}/></button>
                                           <button onClick={() => handleDeleteItem(index)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={12}/></button>
                                        </div>
                                    </td>
                                    
                                    <td className="p-2 border border-slate-300 align-top">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="border border-slate-200 rounded p-1 bg-slate-50 w-24 h-28 flex items-center justify-center">
                                                <WindowPreview config={item.config} width="100%" height="100%" className="!shadow-none !border" />
                                            </div>
                                            <div className="text-[10px] font-bold text-center">
                                                {toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-0 border border-slate-300 align-top">
                                        <div className="bg-slate-50 p-2 border-b border-slate-200 text-xs font-bold flex justify-between">
                                            <span>سیستم: {brandName} | مدل: {item.config.type}</span>
                                            <span>تعداد: ۱ عدد</span>
                                        </div>
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-slate-500 border-b border-slate-200">
                                                    <th className="p-1 text-right font-normal">شرح</th>
                                                    <th className="p-1 text-center font-normal w-12">واحد</th>
                                                    <th className="p-1 text-center font-normal w-12">مقدار</th>
                                                    <th className="p-1 text-left font-normal w-20">فی</th>
                                                    <th className="p-1 text-left font-normal w-24">مبلغ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.calculations.details?.map((detail, dIdx) => (
                                                    <tr key={dIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                        <td className="p-1.5 pr-2 font-medium">{detail.name}</td>
                                                        <td className="p-1.5 text-center text-slate-500">{detail.unit}</td>
                                                        <td className="p-1.5 text-center font-bold">{toPersianDigits(detail.quantity)}</td>
                                                        <td className="p-1.5 text-left text-slate-500">{formatPrice(detail.unitPrice)}</td>
                                                        <td className="p-1.5 text-left font-bold text-slate-700">{formatPrice(detail.totalPrice)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </td>

                                    <td className="p-2 border border-slate-300 align-middle text-left font-bold text-slate-900 bg-slate-50">
                                        {formatPrice(item.calculations.totalPrice)}
                                    </td>
                                </tr>
                                <tr className="h-2 border-none bg-white"><td colSpan={4}></td></tr>
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
                    <div key={index} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                         <div className="bg-slate-200 p-2 flex justify-between items-center text-sm font-bold">
                             <span>آیتم {toPersianDigits(index + 1)}: {brandName}</span>
                             <div className="flex gap-2">
                                <button onClick={() => handleEditItem(index)} className="p-1 bg-white rounded"><Edit2 size={14}/></button>
                                <button onClick={() => handleDeleteItem(index)} className="p-1 bg-white text-red-500 rounded"><Trash2 size={14}/></button>
                             </div>
                         </div>
                         
                         <div className="p-4 flex flex-col gap-4">
                             {/* Preview */}
                             <div className="self-center w-48 h-48 bg-white rounded border border-slate-200 p-2 flex items-center justify-center mx-auto">
                                 <WindowPreview config={item.config} width="100%" height="100%" className="!shadow-none !border-none" />
                             </div>
                             <div className="text-center text-xs font-bold">
                                ابعاد: {toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)}
                             </div>

                             {/* Breakdown List */}
                             <div className="text-xs space-y-2">
                                 {item.calculations.details?.map((detail, dIdx) => (
                                     <div key={dIdx} className="flex justify-between border-b border-slate-200 pb-1">
                                         <span className="text-slate-600">{detail.name} ({toPersianDigits(detail.quantity)} {detail.unit})</span>
                                         <span className="font-bold">{formatPrice(detail.totalPrice)}</span>
                                     </div>
                                 ))}
                             </div>
                             
                             <div className="bg-blue-50 p-3 rounded flex justify-between items-center font-bold text-slate-800">
                                 <span>قیمت کل:</span>
                                 <span>{formatPrice(item.calculations.totalPrice)} تومان</span>
                             </div>
                         </div>
                    </div>
                )
            })}
        </div>

        {/* Footer Totals */}
        <div className="flex justify-end p-6 print:p-2">
            <div className="w-full md:w-80 space-y-2 text-sm border border-slate-300 rounded p-4 bg-slate-50 print:bg-white print:border-black">
                <div className="flex justify-between text-slate-600 print:text-black">
                    <span>جمع کل مصالح:</span>
                    <span className="font-bold">{formatPrice(totalMaterialPrice)}</span>
                </div>
                <div className="flex justify-between text-slate-600 print:text-black">
                    <span>نصب و اجرا ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                    <span className="font-bold">{formatPrice(installationCost)}</span>
                </div>
                <div className="h-px bg-slate-300 my-2 print:bg-black"></div>
                <div className="flex justify-between items-center text-lg bg-blue-50 p-2 rounded print:bg-white">
                    <span className="font-bold text-slate-900 print:text-black">مبلغ قابل پرداخت:</span>
                    <span className="font-bold text-blue-600 print:text-black">{formatPrice(finalPrice)}</span>
                </div>
                <div className="text-[10px] text-center text-slate-400 mt-2 print:text-black">قیمت ها به تومان می باشد</div>
            </div>
        </div>

        {/* Signature Area for Print */}
        <div className="hidden print:flex justify-between px-10 mt-10 mb-10">
            <div className="text-center">
                <div className="font-bold text-sm mb-10">مهر و امضای فروشنده</div>
                <div className="w-32 h-px bg-black/20"></div>
            </div>
            <div className="text-center">
                <div className="font-bold text-sm mb-10">مهر و امضای خریدار</div>
                <div className="w-32 h-px bg-black/20"></div>
            </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center no-print pb-10">
        <PrimaryButton onClick={() => window.print()} icon={Share2} className="w-full max-w-sm">
            چاپ / اشتراک گذاری فاکتور
        </PrimaryButton>
      </div>
    </div>
  );
};