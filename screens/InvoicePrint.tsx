
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
        const newScale = Math.min((screenW - 48) / targetW, 1);
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
          <p className="font-bold text-sm">در حال بارگذاری فاکتور...</p>
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
    <div className={`inv-header shrink-0 px-10 py-8 ${tempLayout === 'classic' ? 'border-b-2 border-slate-900' : ''}`}>
        <div className="flex justify-between items-start">
            <div className="text-right">
                <div className="inv-title-box">
                    <h1 className={`${tempLayout === 'classic' ? 'text-3xl font-black' : 'text-2xl font-black'} mb-1 tracking-tight text-slate-800`}>{invoiceConfig.companyName}</h1>
                    {tempLayout === 'modern' && <span className="inv-badge text-[10px] font-bold">پیش‌فاکتور رسمی</span>}
                </div>
                <div className="text-[10px] opacity-80 space-y-0.5 font-bold mt-2 text-slate-700">
                    <div className="flex items-center gap-2"><span>آدرس:</span><span>{invoiceConfig.companyAddress || '---'}</span></div>
                    <div className="flex items-center gap-2"><span>تلفن تماس:</span><span>{toPersianDigits(invoiceConfig.companyPhone) || '---'}</span></div>
                </div>
            </div>
            <div className="flex flex-col items-end text-left">
                <div className={`text-[11px] font-black px-4 py-1.5 mb-3 rounded-lg ${
                    tempLayout === 'technical' ? 'bg-slate-800 text-white' : 
                    tempLayout === 'classic' ? 'border-2 border-slate-900 text-slate-900' : 
                    tempLayout === 'modern' ? 'bg-transparent text-slate-400' :
                    'bg-slate-100 text-slate-800'
                }`}>
                    {tempLayout === 'classic' ? 'صورتحساب فروش کالا' : 'پیش‌فاکتور فروش کالا و خدمات'}
                </div>
                <div className="text-[10px] font-bold space-y-1 opacity-95 text-slate-900">
                    <div className="flex gap-4 justify-between min-w-[150px]"><span>تاریخ:</span><span className="font-black">{todayJalali}</span></div>
                    <div className="flex gap-4 justify-between min-w-[150px]"><span>شماره:</span><span className="font-black">{toPersianDigits(projectDetails.id.slice(-6))}</span></div>
                    <div className="flex gap-4 justify-between min-w-[150px]"><span>مشتری:</span><span className="font-black">{projectDetails.customerName}</span></div>
                </div>
            </div>
        </div>
    </div>
  );

  const InvoiceFooter = ({ pageNum, totalPages }: { pageNum: number, totalPages: number }) => (
     <div className="inv-footer shrink-0 px-10 pb-6 pt-2">
        <div className="inv-footer-container relative pt-3 border-t border-slate-200">
            <div className="flex justify-between items-end">
                <div className="max-w-[80%]">
                    <p className="text-[9px] leading-relaxed text-justify opacity-80 font-bold text-slate-800">
                        {invoiceConfig.footerNote || 'اعتبار این پیش‌فاکتور ۷۲ ساعت می‌باشد. نصب در محل پروژه بر عهده تیم متخصص لومینا است.'}
                    </p>
                </div>
                <div className="text-left">
                    <div className={`${tempLayout === 'classic' ? 'bg-slate-200 text-slate-800' : 'bg-slate-900 text-white'} text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-2`}>
                        <span>صفحه {toPersianDigits(pageNum)} از {toPersianDigits(totalPages)}</span>
                    </div>
                </div>
            </div>
        </div>
     </div>
  );

  const InvoicePageContent = ({ pageItems, pageIndex, totalPages }: any) => (
    <div className="flex flex-col h-full overflow-hidden">
        <InvoiceHeader />
        
        {pageIndex === 0 && (
            <div className="px-10 py-3 shrink-0">
                <div className={`${tempLayout === 'classic' ? 'border-2 border-slate-900' : 'border-2 border-slate-100 bg-slate-50/50'} p-3 grid grid-cols-2 gap-4 rounded-xl`}>
                    <div>
                        <span className="text-[8px] font-black opacity-60 uppercase mb-0.5 block">خریدار</span>
                        <div className="text-sm font-black text-slate-900">{projectDetails.customerName}</div>
                    </div>
                    <div>
                        <span className="text-[8px] font-black opacity-60 uppercase mb-0.5 block">نشانی پروژه</span>
                        <div className="text-[10px] font-bold text-slate-700 truncate">{projectDetails.address || 'ثبت نشده'}</div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 px-10 pt-1 overflow-hidden">
            <table className={`inv-table w-full border-collapse ${tempLayout === 'classic' ? 'border-2 border-slate-900' : ''}`}>
                <thead>
                    <tr className={tempLayout === 'classic' ? 'bg-slate-100 border-b-2 border-slate-900' : 'bg-slate-50'}>
                        <th className={`p-1.5 w-8 text-center border-b-2 border-slate-800 text-[10px] font-black ${tempLayout === 'classic' ? 'border-l-2 border-slate-900' : ''}`}>#</th>
                        <th className={`p-1.5 w-48 text-center border-b-2 border-slate-800 text-[10px] font-black ${tempLayout === 'classic' ? 'border-l-2 border-slate-900' : ''}`}>نقشه و ابعاد</th>
                        <th className={`p-1.5 text-center border-b-2 border-slate-800 text-[10px] font-black ${tempLayout === 'classic' ? 'border-l-2 border-slate-900' : ''}`}>ریز اقلام فنی و محاسبات متریال</th>
                        <th className="p-1.5 w-32 text-center border-b-2 border-slate-800 text-[10px] font-black">جمع ردیف (تومان)</th>
                    </tr>
                </thead>
                <tbody>
                    {pageItems.map((item: any, localIndex: number) => {
                        const globalIndex = pageIndex * ITEMS_PER_PAGE + localIndex;
                        const brand = BRANDS.find(b => b.id === item.config.profileId);
                        return (
                            <tr key={item.id} className={`border-b ${tempLayout === 'classic' ? 'border-slate-900' : 'border-slate-100'} last:border-0`}>
                                <td className={`p-1 font-black text-[10px] text-slate-400 text-center align-top pt-4 ${tempLayout === 'classic' ? 'border-l-2 border-slate-900 text-slate-900' : ''}`}>{toPersianDigits(globalIndex + 1)}</td>
                                <td className={`p-1 align-top pt-4 flex flex-col items-center justify-center gap-1.5 ${tempLayout === 'classic' ? 'border-l-2 border-slate-900' : ''}`}>
                                    <div className="relative w-40 h-40 mx-auto bg-white flex items-center justify-center border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                                        <WindowPreview config={item.config} width="100%" height="100%" isThumbnail={true} scale={0.46} />
                                    </div>
                                    <div className="text-center mt-1 text-[11px] font-black text-slate-900" style={{ direction: 'ltr' }}>
                                      {toPersianDigits(item.config.width)} * {toPersianDigits(item.config.height)}
                                    </div>
                                    <div className="text-center text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1 rounded-full border border-blue-100">
                                      تعداد: {toPersianDigits(item.quantity)} عدد
                                    </div>
                                </td>
                                <td className={`p-1 align-top pt-3 ${tempLayout === 'classic' ? 'border-l-2 border-slate-900' : ''}`}>
                                    <div className="flex items-center justify-center gap-2 mb-1.5">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${tempLayout === 'classic' ? 'bg-slate-200 text-slate-900 border border-slate-900' : 'bg-slate-900 text-white'}`}>{brand?.name}</span>
                                        <span className="text-[10px] font-bold text-slate-500">{item.config.type}</span>
                                    </div>
                                    <table className={`w-full text-[8.5px] border ${tempLayout === 'classic' ? 'border-slate-900' : 'border-slate-100'} rounded-md overflow-hidden bg-white`}>
                                        <thead className={tempLayout === 'classic' ? 'bg-slate-50 border-b border-slate-900' : 'bg-slate-50 border-b border-slate-100'}>
                                            <tr>
                                                <th className={`p-1 text-right text-slate-600 font-black ${tempLayout === 'classic' ? 'border-l border-slate-900' : ''}`}>شرح کالا</th>
                                                <th className={`p-1 text-center text-slate-600 font-black ${tempLayout === 'classic' ? 'border-l border-slate-900' : ''}`}>مقدار</th>
                                                <th className={`p-1 text-center text-slate-600 font-black ${tempLayout === 'classic' ? 'border-l border-slate-900' : ''}`}>واحد</th>
                                                <th className="p-1 text-left text-slate-600 font-black">فی</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {item.calculations.details?.map((detail: any, dIdx: number) => (
                                                <tr key={dIdx} className={`border-b ${tempLayout === 'classic' ? 'border-slate-900' : 'border-slate-50'} last:border-0`}>
                                                    <td className={`p-1 font-bold text-slate-800 ${tempLayout === 'classic' ? 'border-l border-slate-900' : ''}`}>{detail.name}</td>
                                                    <td className={`p-1 text-center text-slate-900 font-black ${tempLayout === 'classic' ? 'border-l border-slate-900' : ''}`}>{toPersianDigits(detail.quantity)}</td>
                                                    <td className={`p-1 text-center text-slate-500 ${tempLayout === 'classic' ? 'border-l border-slate-900' : ''}`}>{detail.unit}</td>
                                                    <td className="p-1 text-left font-black text-slate-900">{formatPrice(detail.unitPrice)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </td>
                                <td className="p-1 text-center align-top pt-14">
                                    <div className="text-[13px] font-black text-slate-900 text-center">{formatPrice(item.calculations.totalPrice * item.quantity)}</div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {pageIndex === totalPages - 1 && (
            <div className="inv-total px-10 py-4 shrink-0 border-t-2 border-slate-200 bg-white z-20">
                <div className="flex gap-6 items-center">
                    <div className="flex-1 flex justify-around items-center opacity-60">
                        <div className="text-center">
                            <span className="text-[9px] font-black block mb-4 text-slate-500">مهر و امضاء فروشنده</span>
                            <div className="w-20 h-0.5 bg-slate-300 mx-auto"></div>
                        </div>
                        <div className="text-center">
                            <span className="text-[9px] font-black block mb-4 text-slate-500">تایید و امضاء خریدار</span>
                            <div className="w-20 h-0.5 bg-slate-300 mx-auto"></div>
                        </div>
                    </div>
                    
                    <div className={`totals-box w-72 p-4 rounded-2xl flex flex-col shadow-lg ${
                        tempLayout === 'standard' ? 'bg-white border-2 border-slate-200 text-slate-900' : 
                        tempLayout === 'classic' ? 'bg-slate-50 border-2 border-slate-900 text-slate-900 shadow-none' :
                        'bg-slate-900 text-white'
                    }`}>
                        <div className="space-y-2">
                            <div className={`flex justify-between text-[11px] font-bold ${tempLayout === 'standard' || tempLayout === 'classic' ? 'text-slate-500' : 'text-slate-400'}`}>
                                <span>مجموع اقلام ({toPersianDigits(items.reduce((acc, i) => acc + i.quantity, 0))} عدد):</span>
                                <span className={`${tempLayout === 'standard' || tempLayout === 'classic' ? 'text-slate-900 font-black' : 'text-white font-black'}`}>{formatPrice(totalMaterialPrice)}</span>
                            </div>
                            <div className={`flex justify-between text-[11px] font-bold ${tempLayout === 'standard' || tempLayout === 'classic' ? 'text-slate-500' : 'text-slate-400'}`}>
                                <span>هزینه نصب ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                                <span className={`${tempLayout === 'standard' || tempLayout === 'classic' ? 'text-slate-900 font-black' : 'text-white font-black'}`}>{formatPrice(installationCost)}</span>
                            </div>
                            <div className={`h-px ${tempLayout === 'standard' || tempLayout === 'classic' ? 'bg-slate-200' : 'bg-white/20'} my-1`}></div>
                            <div className="flex justify-between items-end pt-1">
                                <span className={`text-xs font-black ${tempLayout === 'standard' || tempLayout === 'classic' ? 'text-blue-700' : 'text-blue-400'}`}>جمع کل فاکتور:</span>
                                <div className="text-left">
                                    <div className={`text-2xl font-black leading-none tracking-tight ${tempLayout === 'standard' || tempLayout === 'classic' ? 'text-slate-900' : 'text-white'}`}>{formatPrice(finalPrice)}</div>
                                    <span className={`text-[8px] font-black opacity-50 block mt-1 tracking-widest text-left ${tempLayout === 'standard' || tempLayout === 'classic' ? 'text-slate-500' : 'text-slate-300'}`}>تومان</span>
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
    <div className="min-h-screen bg-[#edf2f7] flex flex-col items-center font-['Vazirmatn'] relative pb-40 overflow-x-hidden">
       <style>
         {`
           @media print {
             @page { size: A4; margin: 0; }
             body { background: white !important; -webkit-print-color-adjust: exact; }
             .no-print { display: none !important; }
             #root > div { padding: 0 !important; background: white !important; }
             .invoice-page { margin: 0 !important; box-shadow: none !important; border: none !important; width: 100% !important; height: 1123px !important; }
           }
           .export-container { position: absolute; top: 0; left: -10000px; width: 794px; pointer-events: none; }
           .invoice-page { width: 794px !important; height: 1123px !important; background-color: #ffffff; color: #1e293b; position: relative; display: flex; flex-direction: column; overflow: hidden; padding: 0; margin: 0; }
           .layout-standard .inv-header { background-color: #fcfcfc; border-bottom: 2px solid #e2e8f0; }
           .layout-technical .inv-header { background-color: #1e293b; color: white; }
           .layout-technical .inv-header * { color: white !important; }
           .layout-classic .inv-table th { background-color: #f8fafc; color: #000; }
           .layout-classic .inv-total { border-top: 2px solid #000; }
         `}
       </style>

       <div className="export-container no-scrollbar no-print">
            {pages.map((pageItems, pageIndex) => (
                <div key={`export-${pageIndex}`} className={`invoice-page layout-${tempLayout}`}>
                    <InvoicePageContent pageItems={pageItems} pageIndex={pageIndex} totalPages={pages.length} />
                </div>
            ))}
       </div>

       {/* FLOATING ZOOM CONTROLS - TOP RIGHT */}
       <div className="no-print fixed top-24 right-6 z-[60] flex flex-col gap-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-1">
            <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><ZoomIn size={18} /></button>
            <button onClick={() => setScale(1)} className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><Maximize size={18} /></button>
            <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><ZoomOut size={18} /></button>
       </div>

       {/* MODERN ACTION OVERLAY */}
       <div className="no-print fixed bottom-6 left-0 right-0 z-[60] px-6 flex flex-col items-center gap-4 pointer-events-none">
            
            {/* Layout Switcher */}
            <div className="bg-white/90 backdrop-blur-2xl shadow-2xl border border-white/50 rounded-2xl p-1 flex gap-1 pointer-events-auto max-w-full overflow-x-auto no-scrollbar">
                {['standard', 'modern', 'technical', 'classic'].map((layout) => (
                    <button key={layout} onClick={() => setTempLayout(layout as InvoiceLayoutType)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${tempLayout === layout ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {layout === 'standard' ? 'استاندارد' : layout === 'modern' ? 'مدرن' : layout === 'technical' ? 'فنی' : 'کلاسیک'}
                    </button>
                ))}
            </div>

            {/* ACTION DOCK - Centered with max-width for mobile */}
            <div className="flex items-center justify-center gap-3 w-full max-w-[340px] pointer-events-auto">
                {/* Back Button */}
                <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center bg-white shadow-xl rounded-full text-slate-800 border border-white/40 active:scale-90 transition-all shrink-0">
                    <ArrowRight size={20} />
                </button>

                {/* Main Action Bar */}
                <div className="flex-1 bg-slate-900/95 backdrop-blur-2xl shadow-2xl rounded-full p-1.5 flex items-center justify-between border border-white/10 gap-2">
                    <button onClick={handlePrint} title="چاپ مستقیم" className="w-11 h-11 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all shrink-0">
                        <Printer size={18} />
                    </button>
                    
                    <button onClick={() => generatePDF(false)} disabled={isGenerating} className="flex-1 flex items-center justify-center gap-2 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-[10px] transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                        <span className="whitespace-nowrap">ذخیره PDF</span>
                    </button>

                    <button onClick={() => generatePDF(true)} disabled={isGenerating} title="اشتراک‌گذاری" className="w-11 h-11 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 shrink-0">
                        <Share2 size={18} />
                    </button>
                </div>
            </div>
       </div>

       {/* RENDERED VIEW */}
       <div ref={containerRef} className="w-full flex justify-center pt-8 px-4 overflow-visible">
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
