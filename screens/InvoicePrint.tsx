
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Loader2, Share2, ZoomIn, ZoomOut, Maximize, FileDown } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem, AppSettings, InvoiceLayoutType } from '../types';
import { BRANDS } from '../constants';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';

export const InvoicePrint = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const scaledWrapperRef = useRef<HTMLDivElement>(null);
  
  const state = location.state as { projectDetails: ProjectDetails, items: InvoiceItem[] } | null;
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(state?.projectDetails || null);
  const [items, setItems] = useState<InvoiceItem[]>(state?.items || []);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tempLayout, setTempLayout] = useState<InvoiceLayoutType>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
     window.scrollTo(0, 0);
     const loadedSettings = pricingStore.getSettings();
     setSettings(loadedSettings);
     if (loadedSettings.invoice.layoutType) {
         setTempLayout(loadedSettings.invoice.layoutType);
     }
  }, []);

  useLayoutEffect(() => {
    const handleResize = () => {
        if (!containerRef.current) return;
        const screenW = window.innerWidth;
        const targetW = 840; 
        const newScale = Math.min((screenW - 32) / targetW, 1);
        setScale(Math.max(newScale, 0.4));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!projectDetails || items.length === 0) {
      return (
        <div className="h-screen flex items-center justify-center bg-slate-50 flex-col gap-4 text-slate-400">
          <Loader2 className="animate-spin" size={32} />
          <p className="font-bold text-sm">در حال پردازش داده‌ها...</p>
        </div>
      );
  }

  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + (item.calculations.unitPrice * item.quantity), 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;
  const todayJalali = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date(projectDetails.date));
  const invoiceConfig = settings?.invoice || { companyName: 'فروشگاه لومینا', companyPhone: '', companyAddress: '', footerNote: '' };

  const ITEMS_PER_PAGE = 3; 
  const pages = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }

  const handlePrint = () => {
    window.print();
  };

  const generatePDF = async (isShare = false) => {
    setIsGenerating(true);
    const pageElements = document.querySelectorAll('.export-container .invoice-page');
    if (!pageElements.length) {
        setIsGenerating(false);
        return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageElements.length; i++) {
         if (i > 0) pdf.addPage();
         const node = pageElements[i] as HTMLElement;
         const imgData = await toJpeg(node, {
            quality: 0.95,
            pixelRatio: 2.5,
            backgroundColor: '#ffffff',
            canvasWidth: 794,
            canvasHeight: 1123,
         });
         pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const fileName = `Invoice-${projectDetails.customerName}.pdf`;
      if (isShare) {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'فاکتور لومینا', text: projectDetails.customerName });
        } else {
          pdf.save(fileName);
        }
      } else {
        pdf.save(fileName);
      }
    } catch (error) {
      console.error('PDF Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const InvoiceHeader = () => (
    <div className={`inv-header shrink-0 px-10 pt-6 pb-3 ${tempLayout === 'classic' ? 'border-b-2 border-slate-900' : ''}`}>
        <div className={`flex justify-between items-start`}>
            <div className="text-right">
                <div className="inv-title-box">
                    <h1 className={`${tempLayout === 'classic' ? 'text-2xl font-black' : 'text-xl font-black'} mb-0.5 tracking-tight text-slate-800`}>{invoiceConfig.companyName}</h1>
                    {tempLayout === 'modern' && <span className="inv-badge text-[9px] font-bold text-blue-600">پیش‌فاکتور رسمی لومینا</span>}
                </div>
                <div className="text-[9px] opacity-80 space-y-0.5 font-bold mt-1.5 text-slate-700">
                    <div className="flex items-center gap-2"><span>آدرس:</span><span>{invoiceConfig.companyAddress || '---'}</span></div>
                    <div className="flex items-center gap-2"><span>تلفن تماس:</span><span>{toPersianDigits(invoiceConfig.companyPhone) || '---'}</span></div>
                </div>
            </div>
            <div className={`flex flex-col items-end text-left pt-1`}>
                <div className={`text-[10px] font-black px-4 py-1.5 mb-2 rounded-lg shadow-sm ${
                    tempLayout === 'technical' ? 'bg-slate-800 text-white' : 
                    tempLayout === 'classic' ? 'border-2 border-slate-900 text-slate-900' : 
                    'bg-slate-100 text-slate-800'
                }`}>
                    {tempLayout === 'classic' ? 'صورتحساب فروش نهایی' : 'پیش‌فاکتور فروش کالا و خدمات فنی'}
                </div>
                <div className="text-[9px] font-bold space-y-0.5 opacity-95 text-slate-900">
                    <div className="flex gap-4 justify-between min-w-[140px]"><span>تاریخ صدور:</span><span className="font-black">{todayJalali}</span></div>
                    <div className="flex gap-4 justify-between min-w-[140px]"><span>شماره فاکتور:</span><span className="font-black">{toPersianDigits(projectDetails.id.slice(-6))}</span></div>
                </div>
            </div>
        </div>
    </div>
  );

  const InvoiceFooter = ({ pageNum, totalPages }: { pageNum: number, totalPages: number }) => (
     <div className="inv-footer shrink-0 px-10 pb-4 pt-1">
        <div className="inv-footer-container relative pt-2 border-t border-slate-100">
            <div className="flex justify-between items-end">
                <div className="max-w-[80%]">
                    <p className="text-[8px] leading-relaxed text-justify opacity-60 font-bold text-slate-800">
                        {invoiceConfig.footerNote || 'اعتبار این پیش‌فاکتور ۷۲ ساعت می‌باشد. کلیه قیمت‌ها به تومان بوده و نصب در محل پروژه بر عهده تیم لومینا است.'}
                    </p>
                </div>
                <div className="text-left">
                    <div className={`${tempLayout === 'classic' ? 'bg-slate-200 text-slate-800 border border-slate-900' : 'bg-slate-900 text-white'} text-[8px] font-black px-3 py-0.5 rounded-full flex items-center gap-2 shadow-sm`}>
                        <span>صفحه {toPersianDigits(pageNum)} از {toPersianDigits(totalPages)}</span>
                    </div>
                </div>
            </div>
        </div>
     </div>
  );

  const InvoicePageContent = ({ pageItems, pageIndex, totalPages }: any) => (
    <div className={`flex flex-col h-full overflow-hidden bg-white`}>
        <InvoiceHeader />
        
        {pageIndex === 0 && (
            <div className="px-10 py-2 shrink-0">
                <div className={`${tempLayout === 'classic' ? 'border-2 border-slate-900' : 'inv-card border border-slate-100 bg-slate-50/50'} p-3 grid grid-cols-2 gap-6 rounded-2xl`}>
                    <div>
                        <span className="text-[8px] font-black opacity-50 uppercase mb-0.5 block">خریدار / کارفرما</span>
                        <div className="text-xs font-black text-slate-900">{projectDetails.customerName}</div>
                    </div>
                    <div>
                        <span className="text-[8px] font-black opacity-50 uppercase mb-0.5 block">نشانی محل اجرا</span>
                        <div className="text-[9px] font-bold text-slate-700 leading-tight">{projectDetails.address || 'ثبت نشده'}</div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 px-10 pt-1 overflow-hidden flex flex-col">
            <table className={`inv-table w-full border-collapse flex-1 flex flex-col ${tempLayout === 'classic' ? 'border-2 border-slate-900' : ''}`}>
                <thead className="block w-full">
                    <tr className={`flex w-full ${tempLayout === 'classic' ? 'bg-slate-100 border-b-2 border-slate-900' : 'bg-slate-50 border-b border-slate-100'}`}>
                        <th className="p-2 w-10 text-center text-[9px] font-black shrink-0">#</th>
                        <th className="p-2 w-56 text-center text-[9px] font-black shrink-0 border-x border-slate-100">نقشه فنی و ابعاد (mm)</th>
                        <th className="p-2 flex-1 text-center text-[9px] font-black shrink-0">ریز اقلام فنی و محاسبات متریال</th>
                        <th className="p-2 w-32 text-center text-[9px] font-black shrink-0 border-r border-slate-100">جمع (تومان)</th>
                    </tr>
                </thead>
                <tbody className="block w-full flex-1">
                    {pageItems.map((item: any, localIndex: number) => {
                        const globalIndex = pageIndex * ITEMS_PER_PAGE + localIndex;
                        const brand = BRANDS.find(b => b.id === item.config.profileId);
                        return (
                            <tr key={item.id} className={`flex w-full items-stretch border-b ${tempLayout === 'classic' ? 'border-slate-900' : 'border-slate-100'} last:border-0 h-[calc(100%/3)]`}>
                                <td className="p-2 w-10 flex flex-col items-center justify-center font-black text-[9px] text-slate-400 shrink-0">{toPersianDigits(globalIndex + 1)}</td>
                                <td className="p-2 w-56 shrink-0 flex flex-col items-center justify-center gap-2 border-x border-slate-100">
                                    <div className="relative w-44 h-44 mx-auto bg-white flex items-center justify-center border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                        <WindowPreview config={item.config} width="100%" height="100%" isThumbnail={true} scale={0.52} />
                                    </div>
                                    <div className="text-center mt-1 text-[11px] font-black text-slate-900" style={{ direction: 'ltr' }}>
                                      {toPersianDigits(item.config.width)} * {toPersianDigits(item.config.height)}
                                    </div>
                                    <div className="text-center text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-100">
                                      تعداد: {toPersianDigits(item.quantity)} عدد
                                    </div>
                                </td>
                                <td className="p-2 flex-1 flex flex-col justify-center gap-2">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <span className={`px-3 py-0.5 rounded-md text-[8px] font-black ${tempLayout === 'classic' ? 'bg-slate-200 text-slate-900 border border-slate-900' : 'bg-slate-900 text-white'}`}>{brand?.name}</span>
                                        <span className="text-[9px] font-bold text-slate-500">{item.config.type}</span>
                                    </div>
                                    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm mx-2">
                                        <table className="w-full text-[8px]">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="p-1 text-right text-slate-600 font-black">شرح کالا</th>
                                                    <th className="p-1 text-center text-slate-600 font-black">مقدار</th>
                                                    <th className="p-1 text-left text-slate-600 font-black">فی</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.calculations.details?.slice(0, 5).map((detail: any, dIdx: number) => (
                                                    <tr key={dIdx} className="border-b border-slate-50 last:border-0">
                                                        <td className="p-1 font-bold text-slate-800">{detail.name}</td>
                                                        <td className="p-1 text-center text-slate-900 font-black">{toPersianDigits(detail.quantity)} {detail.unit}</td>
                                                        <td className="p-1 text-left font-black text-slate-900">{formatPrice(detail.unitPrice)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </td>
                                <td className="p-2 w-32 shrink-0 flex flex-col items-center justify-center text-center border-r border-slate-100">
                                    <div className="text-[13px] font-black text-slate-900 tracking-tight">{formatPrice(item.calculations.totalPrice * item.quantity)}</div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {pageIndex === totalPages - 1 && (
            <div className="inv-total px-10 py-2 shrink-0 border-t-2 border-slate-200 bg-white">
                <div className="flex gap-4 items-center">
                    {/* Signatures */}
                    <div className="flex-1 flex justify-around items-center opacity-40">
                        <div className="text-center">
                            <span className="text-[8px] font-black block mb-8 text-slate-500">مهر و امضاء فروشنده</span>
                            <div className="w-20 h-0.5 bg-slate-300 mx-auto"></div>
                        </div>
                        <div className="text-center">
                            <span className="text-[8px] font-black block mb-8 text-slate-500">تایید و امضاء خریدار</span>
                            <div className="w-20 h-0.5 bg-slate-300 mx-auto"></div>
                        </div>
                    </div>
                    
                    {/* Compact Total Box */}
                    <div className={`totals-box w-60 p-3.5 rounded-2xl flex flex-col shadow-lg ${
                        tempLayout === 'standard' ? 'bg-white border border-slate-200 text-slate-900' : 
                        tempLayout === 'classic' ? 'bg-slate-50 border-2 border-slate-900 text-slate-900 shadow-none' :
                        'bg-slate-900 text-white'
                    }`}>
                        <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-bold opacity-60">
                                <span>مجموع اقلام:</span>
                                <span className="font-black">{formatPrice(totalMaterialPrice)}</span>
                            </div>
                            <div className="flex justify-between text-[9px] font-bold opacity-60">
                                <span>هزینه نصب ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                                <span className="font-black">{formatPrice(installationCost)}</span>
                            </div>
                            <div className="h-px bg-current opacity-10 my-1"></div>
                            <div className="flex justify-between items-end pt-0.5">
                                <span className="text-[10px] font-black text-blue-600">جمع کل فاکتور:</span>
                                <div className="text-left">
                                    <div className="text-xl font-black leading-none tracking-tight">{formatPrice(finalPrice)}</div>
                                    <span className="text-[7px] font-black opacity-40 block mt-0.5 tracking-widest text-left uppercase">تومان</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        <InvoiceFooter pageNum={pageIndex + 1} totalPages={totalPages} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center font-['Vazirmatn'] relative pb-40 overflow-x-hidden">
       <style>
         {`
           @media print {
             @page { size: A4; margin: 0; }
             body { background: white !important; -webkit-print-color-adjust: exact; }
             .no-print { display: none !important; }
             #root > div { padding: 0 !important; background: white !important; }
             .invoice-page { margin: 0 !important; box-shadow: none !important; border: none !important; width: 100% !important; height: 1123px !important; }
             .origin-top { transform: scale(1) !important; }
           }
           .export-container { position: absolute; top: 0; left: -10000px; width: 794px; pointer-events: none; }
           .invoice-page { width: 794px !important; height: 1123px !important; background-color: #ffffff; color: #1e293b; position: relative; display: flex; flex-direction: column; overflow: hidden; padding: 0; margin: 0; }
           
           .layout-standard .inv-header { background-color: #fafafa; border-bottom: 2px solid #f1f5f9; }
           .layout-technical .inv-header { background-color: #1e293b; color: white; }
           .layout-technical .inv-header * { color: white !important; }
           .layout-classic .inv-total { border-top-width: 3px; border-color: #000; }
         `}
       </style>

       <div className="export-container no-scrollbar no-print">
            {pages.map((pageItems, pageIndex) => (
                <div key={`export-${pageIndex}`} className={`invoice-page layout-${tempLayout}`}>
                    <InvoicePageContent pageItems={pageItems} pageIndex={pageIndex} totalPages={pages.length} />
                </div>
            ))}
       </div>

       {/* FLOATING ZOOM CONTROLS */}
       <div className="no-print fixed top-24 right-6 z-50 flex flex-col gap-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-1">
            <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><ZoomIn size={18} /></button>
            <button onClick={() => setScale(1)} className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><Maximize size={18} /></button>
            <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><ZoomOut size={18} /></button>
       </div>

       {/* MODERN ACTION OVERLAY */}
       <div className="no-print fixed bottom-6 left-0 right-0 z-50 px-6 flex flex-col items-center gap-4 pointer-events-none">
            <div className="bg-white/80 backdrop-blur-2xl shadow-2xl border border-white/50 rounded-2xl p-1 flex gap-1 pointer-events-auto max-w-full overflow-x-auto no-scrollbar">
                {['standard', 'modern', 'technical', 'classic'].map((layout) => (
                    <button key={layout} onClick={() => setTempLayout(layout as InvoiceLayoutType)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${tempLayout === layout ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {layout === 'standard' ? 'استاندارد' : layout === 'modern' ? 'مدرن' : layout === 'technical' ? 'فنی' : 'کلاسیک'}
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-center gap-3 w-full max-w-[340px] pointer-events-auto">
                <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center bg-white shadow-xl rounded-full text-slate-800 border border-white/40 active:scale-90 transition-all">
                    <ArrowRight size={20} />
                </button>

                <div className="flex-1 bg-slate-900/95 backdrop-blur-2xl shadow-2xl rounded-full p-1.5 flex items-center justify-between border border-white/10">
                    <button onClick={handlePrint} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                        <Printer size={18} />
                    </button>
                    
                    <button onClick={() => generatePDF(false)} disabled={isGenerating} className="flex-1 mx-2 flex items-center justify-center gap-2 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-[10px] transition-all disabled:opacity-50">
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                        <span>ذخیره PDF</span>
                    </button>

                    <button onClick={() => generatePDF(true)} disabled={isGenerating} className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all disabled:opacity-50">
                        <Share2 size={18} />
                    </button>
                </div>
            </div>
       </div>

       <div ref={containerRef} className="w-full flex justify-center pt-8 overflow-visible">
            <div ref={scaledWrapperRef} className="relative origin-top transition-transform duration-300 ease-out flex flex-col gap-10" style={{ transform: `scale(${scale})`, width: '794px' }}>
                {pages.map((pageItems, pageIndex) => (
                    <div key={pageIndex} className={`invoice-page shadow-2xl layout-${tempLayout} border border-slate-200`}>
                        <InvoicePageContent pageItems={pageItems} pageIndex={pageIndex} totalPages={pages.length} />
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
};
