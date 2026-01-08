
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Loader2, Share2, FileDown, ZoomIn, ZoomOut, Maximize, Minimize, Home } from 'lucide-react';
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
  const mainWrapperRef = useRef<HTMLDivElement>(null);
  
  const state = location.state as { projectDetails: ProjectDetails, items: InvoiceItem[] } | null;
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(state?.projectDetails || null);
  const [items, setItems] = useState<InvoiceItem[]>(state?.items || []);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tempLayout, setTempLayout] = useState<InvoiceLayoutType>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        if (!containerRef.current || isFullscreen) return;
        const screenW = window.innerWidth;
        const targetW = 840; 
        const newScale = Math.min((screenW - 32) / targetW, 1);
        setScale(Math.max(newScale, 0.4));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        mainWrapperRef.current?.requestFullscreen();
        setIsFullscreen(true);
    } else {
        document.exitFullscreen();
        setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const fsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fsChange);
    return () => document.removeEventListener('fullscreenchange', fsChange);
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
  const invoiceConfig = settings?.invoice || { companyName: 'فروشگاه نکس‌وین', companyPhone: '', companyAddress: '', footerNote: '' };

  const ITEMS_PER_PAGE = 3; 
  const pages = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }

  const handlePrint = () => {
    generatePDF(false);
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
      
      if (isShare || /Android/i.test(navigator.userAgent)) {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ 
            files: [file], 
            title: 'فاکتور نکس‌وین', 
            text: `فاکتور مشتری: ${projectDetails.customerName}` 
          });
        } else {
          pdf.save(fileName);
        }
      } else {
        pdf.save(fileName);
      }
    } catch (error) {
      console.error('PDF Error:', error);
      alert('خطا در تولید فایل PDF. لطفا مجددا تلاش کنید.');
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
                    {tempLayout === 'modern' && <span className="inv-badge text-[9px] font-bold text-blue-600">پیش‌فاکتور رسمی نکس‌وین</span>}
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
                    {tempLayout === 'classic' ? 'صورتحساب فروش نهایی' : 'پیش‌فاکتور فروش کالا و خدمات فنی نکس‌وین'}
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
                        {invoiceConfig.footerNote || 'اعتبار این پیش‌فاکتور نکس‌وین ۷۲ ساعت می‌باشد. کلیه قیمت‌ها به تومان بوده و نصب در محل پروژه بر عهده تیم متخصص نکس‌وین است.'}
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

  const InvoicePageContent = ({ pageItems, pageIndex, totalPages }: { pageItems: InvoiceItem[], pageIndex: number, totalPages: number }) => {
    const isLastPage = pageIndex === totalPages - 1;

    return (
      <div className="bg-white w-full h-full flex flex-col overflow-hidden">
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
            <div className={`inv-table w-full border-collapse flex-1 flex flex-col ${tempLayout === 'classic' ? 'border-2 border-slate-900' : ''}`}>
                {/* Fixed Header Row */}
                <div className="block w-full">
                    <div className={`flex w-full ${tempLayout === 'classic' ? 'bg-slate-100 border-b-2 border-slate-900 font-black' : 'bg-slate-50 border-b border-slate-100 font-black'}`}>
                        <div className="p-2 w-12 text-center text-[9px] shrink-0 border-l border-slate-100">#</div>
                        <div className="p-2 w-80 text-center text-[9px] shrink-0 border-x border-slate-100">نقشه فنی و ابعاد (mm)</div>
                        <div className="p-2 flex-1 text-center text-[9px]">ریز اقلام فنی و محاسبات متریال</div>
                        <div className="p-2 w-32 text-center text-[9px] shrink-0 border-r border-slate-100">جمع (تومان)</div>
                    </div>
                </div>
                
                {/* Scrollable/Flexible Body */}
                <div className="block w-full flex-1">
                    {pageItems.map((item, localIndex) => {
                        const globalIndex = pageIndex * ITEMS_PER_PAGE + localIndex;
                        const brand = BRANDS.find(b => b.id === item.config.profileId);
                        return (
                            <div key={item.id} className={`flex w-full items-stretch border-b ${tempLayout === 'classic' ? 'border-slate-900' : 'border-slate-100'} last:border-0 h-[calc(100%/3)] overflow-hidden`}>
                                {/* Row Number Column */}
                                <div className="p-2 w-12 flex flex-col items-center justify-center font-black text-[9px] text-slate-400 shrink-0 border-l border-slate-100">{toPersianDigits(globalIndex + 1)}</div>
                                
                                {/* 1. Technical Drawing Column (Fixed w-80) */}
                                <div className="p-2 w-80 shrink-0 flex flex-col items-center justify-center gap-2 border-x border-slate-100 bg-slate-50/5">
                                    <div className="relative w-64 h-56 mx-auto bg-white flex items-center justify-center border border-slate-50 rounded-xl overflow-hidden shadow-sm">
                                        <WindowPreview config={item.config} width="100%" height="100%" isThumbnail={true} scale={0.65} />
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="text-center text-[12px] font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100" style={{ direction: 'ltr' }}>
                                            {toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)}
                                        </div>
                                        <div className="text-center text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                            تعداد: {toPersianDigits(item.quantity)} عدد
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Technical Details Column (Flexible flex-1) */}
                                <div className="p-4 flex-1 flex flex-col justify-center overflow-hidden">
                                    <div className="flex items-center justify-start gap-2 mb-2 px-1">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${tempLayout === 'classic' ? 'bg-slate-200 text-slate-900 border border-slate-900' : 'bg-slate-900 text-white'}`}>{brand?.name}</span>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight truncate">{item.config.type}</span>
                                    </div>
                                    <div className="bg-white py-1 space-y-1">
                                        {(item.calculations.details && item.calculations.details.length > 0) ? (
                                            item.calculations.details.slice(0, 10).map((detail, dIdx) => (
                                                <div key={dIdx} className="flex items-baseline w-full text-[10px] leading-tight group break-words text-slate-700">
                                                    <span className="shrink-0 font-medium">{detail.name}:</span>
                                                    <span className="mr-1 shrink-0 font-normal">
                                                        {toPersianDigits(detail.quantity)} {detail.unit} × {formatPrice(detail.unitPrice)}
                                                    </span>
                                                    <div className="flex-1 border-b border-dotted border-slate-200 mx-1.5 mb-1 opacity-50"></div>
                                                    <span className="shrink-0 font-black text-slate-900">
                                                        {formatPrice(detail.totalPrice)}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-[10px] text-slate-300 font-bold italic">جزییات فنی یافت نشد</div>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Row Total Column (Fixed w-32) */}
                                <div className="p-2 w-32 shrink-0 flex flex-col items-center justify-center text-center border-r border-slate-100 bg-slate-50/20">
                                    <div className="text-[14px] font-black text-slate-900 tracking-tight leading-none">{formatPrice(item.calculations.totalPrice * item.quantity)}</div>
                                    <div className="text-[7px] font-black text-slate-400 mt-2 uppercase tracking-widest leading-none">مجموع ردیف</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {isLastPage && (
            <div className="inv-total px-10 py-2 shrink-0 border-t-2 border-slate-200 bg-white">
                <div className="flex gap-4 items-center">
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
                    
                    <div className={`totals-box w-64 p-3.5 rounded-2xl flex flex-col shadow-lg ${
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
  };

  return (
    <div ref={mainWrapperRef} className="min-h-screen bg-slate-100 flex flex-col items-center font-['Vazirmatn'] relative pb-40 overflow-x-hidden">
       {/* PREMIUM STICKY ACTION TOOLBAR */}
       <div className="no-print sticky top-0 left-0 right-0 z-[60] px-6 py-4 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 flex items-center justify-between shadow-sm w-full">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="w-11 h-11 flex items-center justify-center bg-white shadow-sm rounded-2xl text-slate-700 border border-slate-200 active:scale-90 transition-all hover:bg-slate-50">
                    <ArrowRight size={20} />
                </button>
                <button onClick={() => navigate('/dashboard')} className="w-11 h-11 flex items-center justify-center bg-white shadow-sm rounded-2xl text-slate-700 border border-slate-200 active:scale-90 transition-all hover:bg-slate-50">
                    <Home size={18} />
                </button>
            </div>

            <div className="flex items-center gap-4 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                <button 
                  onClick={() => setScale(prev => Math.max(0.2, prev - 0.1))} 
                  className="w-10 h-10 flex items-center justify-center bg-white text-slate-600 rounded-xl shadow-sm hover:text-blue-600 transition-colors"
                >
                    <ZoomOut size={18} />
                </button>
                <div className="px-3 min-w-[70px] text-center">
                    <span className="text-xs font-black text-slate-900 tracking-tighter">{Math.round(scale * 100)}%</span>
                </div>
                <button 
                  onClick={() => setScale(prev => Math.min(2, prev + 0.1))} 
                  className="w-10 h-10 flex items-center justify-center bg-white text-slate-600 rounded-xl shadow-sm hover:text-blue-600 transition-colors"
                >
                    <ZoomIn size={18} />
                </button>
            </div>

            <button 
                onClick={toggleFullscreen} 
                className="w-11 h-11 flex items-center justify-center bg-slate-900 text-white shadow-lg rounded-2xl active:scale-90 transition-all hover:bg-slate-800"
            >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
       </div>

       {/* FLOATING ACTION DOCK */}
       <div className="no-print fixed bottom-6 left-0 right-0 z-50 px-6 flex flex-col items-center gap-4 pointer-events-none">
            <div className="bg-white/80 backdrop-blur-2xl shadow-2xl border border-white/50 rounded-2xl p-1 flex gap-1 pointer-events-auto max-w-full overflow-x-auto no-scrollbar">
                {['standard', 'modern', 'technical', 'classic'].map((layout) => (
                    <button key={layout} onClick={() => setTempLayout(layout as InvoiceLayoutType)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${tempLayout === layout ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {layout === 'standard' ? 'استاندارد' : layout === 'modern' ? 'مدرن' : layout === 'technical' ? 'فنی' : 'کلاسیک'}
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-center gap-3 w-full max-w-[340px] pointer-events-auto">
                <div className="flex-1 bg-slate-900/95 backdrop-blur-2xl shadow-2xl rounded-[2rem] p-1.5 flex items-center justify-between border border-white/10">
                    <button onClick={handlePrint} className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                        <Printer size={20} />
                    </button>
                    
                    <button onClick={() => generatePDF(false)} disabled={isGenerating} className="flex-1 mx-2 flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-[11px] transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                        <span>ذخیره PDF</span>
                    </button>

                    <button onClick={() => generatePDF(true)} disabled={isGenerating} className="w-12 h-12 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all disabled:opacity-50">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>
       </div>

       {/* HIDDEN EXPORT CONTAINER */}
       <div className="export-container no-print absolute top-[-10000px] left-[-10000px]">
            {pages.map((pageItems, pageIndex) => (
                <div key={pageIndex} className={`invoice-page layout-${tempLayout}`} style={{ width: '794px', height: '1123px', position: 'relative', backgroundColor: '#fff' }}>
                    <InvoicePageContent pageItems={pageItems} pageIndex={pageIndex} totalPages={pages.length} />
                </div>
            ))}
       </div>

       {/* VISUAL PREVIEW CONTAINER */}
       <div ref={containerRef} className="w-full flex justify-center pt-10 overflow-visible">
            <div className="relative origin-top transition-transform duration-300 ease-out flex flex-col gap-10" style={{ transform: `scale(${scale})`, width: '794px' }}>
                {pages.map((pageItems, pageIndex) => (
                    <div key={pageIndex} className={`invoice-page shadow-2xl layout-${tempLayout} border border-slate-200 mb-10`} style={{ width: '794px', height: '1123px', position: 'relative', backgroundColor: '#fff', overflow: 'hidden' }}>
                        <InvoicePageContent pageItems={pageItems} pageIndex={pageIndex} totalPages={pages.length} />
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
};
