
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

      const fileName = `فاکتور-${projectDetails.customerName}.pdf`;
      
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

  const simplifyMaterialName = (name: string) => {
    return name
      .replace('پروفیل فریم استاندارد', 'فریم')
      .replace('پروفیل فریم', 'فریم')
      .replace('پروفیل سش (Sash) بازشو', 'سش پنجره')
      .replace('پروفیل سش (Sash) درب', 'سش درب')
      .replace('پروفیل سش (Sash)', 'بازشو')
      .replace('شیشه دوجداره صنعتی', 'شیشه دوجداره')
      .replace('شیشه دوجداره', 'شیشه 2ج')
      .replace('گالوانیزه تقویتی', 'گالوانیزه')
      .replace('زهوار (Beading) پروفیل', 'زهوار')
      .replace('پروفیل مولیون', 'مولیون')
      .replace('گالوانیزه و متعلقات فنی', 'گالوانیزه')
      .replace('مجموعه یراق‌آلات بازشو', 'یراق‌آلات')
      .replace('نوار لاستیکی درزگیر (EPDM)', 'لاستیک EPDM');
  };

  const InvoiceHeader = () => (
    <div className={`inv-header shrink-0 px-10 pt-8 pb-4 ${tempLayout === 'classic' ? 'border-b-2 border-slate-900 bg-slate-100' : ''}`}>
        <div className="flex justify-between items-start">
            <div className="text-right">
                <div className="inv-title-box">
                    <h1 className={`mb-1 tracking-tight ${
                        tempLayout === 'classic' ? 'text-2xl font-black text-black' : 
                        tempLayout === 'modern' ? 'text-2xl font-black text-emerald-950 border-r-4 border-emerald-500 pr-3' : 
                        tempLayout === 'technical' ? 'text-2xl font-black text-slate-900 border-r-4 border-blue-600 pr-3' : 
                        'text-xl font-black text-slate-800'
                    }`}>{invoiceConfig.companyName}</h1>
                    {tempLayout === 'modern' && <span className="inv-badge text-[10px] font-black text-emerald-600 uppercase tracking-tighter">راهکارهای صنعتی نکس‌وین</span>}
                    {tempLayout === 'technical' && <span className="inv-badge text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">NEXWIN INDUSTRIAL SOLUTIONS</span>}
                </div>
                <div className="text-[10px] opacity-90 space-y-1 font-bold mt-2 text-slate-700">
                    <div className="flex items-center gap-2"><span>نشانی:</span><span className="text-slate-900 font-extrabold">{invoiceConfig.companyAddress || '---'}</span></div>
                    <div className="flex items-center gap-2"><span>تلفن تماس:</span><span className="text-slate-900 font-extrabold">{toPersianDigits(invoiceConfig.companyPhone) || '---'}</span></div>
                </div>
            </div>
            <div className="flex flex-col items-end text-left pt-1">
                <div className={`text-[11px] font-black px-4 py-2 mb-2 rounded-xl border ${
                    tempLayout === 'technical' ? 'bg-blue-600 text-white border-transparent font-bold' : 
                    tempLayout === 'classic' ? 'border-2 border-slate-900 text-slate-900 font-black bg-slate-200 rounded-none' : 
                    tempLayout === 'modern' ? 'bg-emerald-50 text-emerald-800 border-emerald-100 font-black' :
                    'bg-slate-50 text-slate-800 border-slate-200 font-black'
                }`}>
                    {tempLayout === 'classic' ? 'صورتحساب رسمی فروش' : tempLayout === 'technical' ? 'مشخصات فنی و محاسبات مهندسی' : 'پیش‌فاکتور فنی و برآورد پروژه'}
                </div>
                <div className="text-[10px] font-black space-y-1 opacity-95 text-slate-905">
                    <div className="flex gap-4 justify-between min-w-[150px]"><span>تاریخ صدور:</span><span className="font-extrabold text-slate-800">{todayJalali}</span></div>
                    <div className="flex gap-4 justify-between min-w-[150px]"><span>شماره فاکتور:</span><span className="font-extrabold text-slate-800">{toPersianDigits(projectDetails.id.slice(-6))}</span></div>
                </div>
            </div>
        </div>
    </div>
  );

  const InvoiceFooter = ({ pageNum, totalPages }: { pageNum: number, totalPages: number }) => (
     <div className="inv-footer shrink-0 px-10 pb-6 pt-2 mt-auto">
        <div className="inv-footer-container relative pt-3 border-t border-slate-200">
            <div className="flex justify-between items-end">
                <div className="max-w-[80%]">
                    <p className="text-[9.5px] leading-relaxed text-justify opacity-80 font-bold text-slate-700">
                        {invoiceConfig.footerNote || 'اعتبار این پیش‌فاکتور نکس‌وین ۷۲ ساعت می‌باشد. کلیه محاسبات بر اساس استانداردهای مهندسی UPVC انجام شده است. هرگونه تغییر در ابعاد پس از تایید نهایی بر عهده مشتری می‌باشد.'}
                    </p>
                </div>
                <div className="text-left">
                    <div className={`${tempLayout === 'classic' ? 'bg-slate-300 text-slate-900 border border-slate-900 font-bold rounded-none' : 'bg-slate-900 text-white'} text-[9px] font-black px-4 py-1 rounded-full flex items-center gap-2 shadow-sm`}>
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
      <div className="bg-white w-full h-[1123px] flex flex-col overflow-hidden relative">
        <InvoiceHeader />
        
        {pageIndex === 0 && (
            <div className="px-10 py-1 shrink-0">
                <div className={`${
                    tempLayout === 'classic' ? 'border-2 border-slate-900 rounded-none bg-slate-50' : 
                    tempLayout === 'modern' ? 'bg-gradient-to-r from-emerald-50/40 to-teal-50/10 border-r-4 border-emerald-500 border-y border-l border-slate-200 rounded-2xl' :
                    tempLayout === 'technical' ? 'bg-zinc-50/80 border border-slate-300 rounded-xl font-mono' :
                    'bg-slate-50/50 border border-slate-200 rounded-2xl'
                } p-4 grid grid-cols-2 gap-8`}>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black opacity-55 uppercase tracking-widest block text-slate-500">مشخصات خریدار / کارفرما</span>
                        <div className="text-[13px] font-black text-slate-900">{projectDetails.customerName}</div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black opacity-55 uppercase tracking-widest block text-slate-500">نشانی و محل اجرای پروژه</span>
                        <div className="text-[11px] font-bold text-slate-755 leading-snug">{projectDetails.address || 'آدرس ثبت نشده'}</div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 px-10 pt-2 pb-2 overflow-hidden flex flex-col">
            <div className={`w-full flex-1 flex flex-col ${
                tempLayout === 'classic' ? 'border-2 border-slate-900 rounded-none' : 
                tempLayout === 'modern' ? 'border border-emerald-100 rounded-3xl overflow-hidden' :
                tempLayout === 'technical' ? 'border border-slate-350 rounded-2xl overflow-hidden' :
                'border border-slate-200 rounded-2xl overflow-hidden shadow-sm'
            }`}>
                {/* Header Table */}
                <div className={`flex w-full shrink-0 items-center text-slate-700 font-black text-[11px] ${
                    tempLayout === 'classic' ? 'bg-slate-200 border-b-2 border-slate-900 text-slate-900' : 
                    tempLayout === 'modern' ? 'bg-emerald-50/70 border-b border-emerald-100 text-emerald-950' :
                    tempLayout === 'technical' ? 'bg-slate-100 border-b border-slate-300 text-slate-800' :
                    'bg-slate-50 border-b border-slate-200'
                }`}>
                    <div className="py-3.5 px-2 w-9 text-center border-l border-slate-200 shrink-0">ردیف</div>
                    <div className="py-3.5 px-3 w-[340px] text-center border-x border-slate-200 shrink-0">نقشه فنی و مشخصات ابعادی</div>
                    <div className="py-3.5 px-4 flex-1 text-center">جزئیات متریال مصرفی (شرح کالا، مقدار و قیمت واحد)</div>
                    <div className="py-3.5 px-3 w-[122px] text-center border-r border-slate-200 shrink-0">مجموع ردیف</div>
                </div>
                
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {pageItems.map((item, localIndex) => {
                        const globalIndex = pageIndex * ITEMS_PER_PAGE + localIndex;
                        const brand = BRANDS.find(b => b.id === item.config.profileId);
                        return (
                            <div key={item.id} className={`flex w-full items-stretch border-b last:border-0 h-[270px] break-inside-avoid page-break-inside-avoid ${
                                tempLayout === 'classic' ? 'border-slate-950 border-b-2' : 'border-slate-200'
                            }`}>
                                <div className="p-2 w-9 flex flex-col items-center justify-center text-[11px] font-black text-slate-400 shrink-0 border-l border-slate-200 bg-slate-50/20">{toPersianDigits(globalIndex + 1)}</div>
                                
                                <div className="p-4 w-[340px] shrink-0 flex flex-col items-center justify-center gap-2.5 border-x border-slate-200 bg-slate-50/5">
                                    <div className={`relative w-[95%] h-[150px] flex items-center justify-center overflow-hidden p-2 transition-all ${
                                        tempLayout === 'classic' ? 'bg-white border-2 border-slate-900 rounded-none' :
                                        tempLayout === 'modern' ? 'bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md' :
                                        tempLayout === 'technical' ? 'bg-zinc-50 border border-slate-300 rounded-xl font-mono' :
                                        'bg-white border border-slate-100 rounded-2xl'
                                    }`}>
                                        <div className="w-full h-full flex items-center justify-center scale-[0.98]">
                                            <WindowPreview config={item.config} width="100%" height="100%" isThumbnail={false} scale={0.65} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full justify-center">
                                        <div className="text-[12.5px] font-black text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm" style={{ direction: 'ltr' }}>
                                            {toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)} <span className="text-[9px] text-slate-400 font-bold ml-0.5">میلی‌متر</span>
                                        </div>
                                        <div className="text-[11.5px] font-black text-blue-700 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                                            تعداد: {toPersianDigits(item.quantity)} <span className="text-[9px] text-slate-500 font-bold">عدد</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 flex-1 flex flex-col justify-center overflow-hidden">
                                    <div className="flex items-center gap-2.5 mb-2.5">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tight ${
                                            tempLayout === 'classic' ? 'bg-slate-250 text-slate-900 border border-slate-900 rounded-none' : 
                                            tempLayout === 'modern' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                            tempLayout === 'technical' ? 'bg-slate-800 text-white border-transparent' :
                                            'bg-slate-100 text-slate-800 border border-slate-200'
                                        }`}>{brand?.name}</span>
                                        <span className="text-[10px] font-black text-slate-500 tracking-wide truncate max-w-[200px]">{item.config.type}</span>
                                    </div>
                                    <div className={`overflow-hidden ${
                                        tempLayout === 'classic' ? 'border-2 border-slate-900 rounded-none bg-white' :
                                        tempLayout === 'modern' ? 'border border-emerald-50 rounded-2xl bg-white shadow-xs' :
                                        tempLayout === 'technical' ? 'border border-slate-300 rounded-xl bg-zinc-50' :
                                        'border border-slate-150 rounded-2xl bg-white shadow-xs font-medium'
                                    }`}>
                                        <table className="w-full table-fixed border-collapse text-[9.5px] leading-snug">
                                            <thead>
                                                <tr className={`text-[8.5px] text-slate-400 font-black tracking-wider uppercase border-b ${
                                                    tempLayout === 'classic' ? 'bg-slate-100 border-slate-900 text-slate-800' :
                                                    tempLayout === 'modern' ? 'bg-slate-50/50 border-emerald-50 text-emerald-950' :
                                                    'bg-slate-50/80 border-slate-100'
                                                }`}>
                                                    <th className="px-2.5 py-1 text-right font-black">شرح کالا / متریال</th>
                                                    <th className="px-1 py-1 w-[24%] text-center font-black">مقدار مصرفی</th>
                                                    <th className="px-2.5 py-1 w-[33%] text-left font-black">قیمت واحد</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {item.calculations.details.slice(0, 8).map((detail, dIdx) => (
                                                    <tr key={dIdx} className={`${
                                                        tempLayout === 'classic' ? (dIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50') :
                                                        tempLayout === 'modern' ? (dIdx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/10') :
                                                        (dIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')
                                                    } hover:bg-slate-50/50 transition-colors`}>
                                                        <td className="px-2.5 py-1 font-bold text-slate-700 truncate w-[43%]" style={{ fontFamily: 'Vazirmatn' }}>
                                                            {simplifyMaterialName(detail.name)}
                                                        </td>
                                                        <td className="px-1 py-1 w-[24%] text-center font-black text-slate-600 whitespace-nowrap">
                                                            {toPersianDigits(detail.quantity)} <span className="opacity-60 text-[7px]">{detail.unit}</span>
                                                        </td>
                                                        <td className="px-2.5 py-1 w-[33%] text-left font-black text-slate-900 tracking-tighter whitespace-nowrap">
                                                            {formatPrice(detail.unitPrice)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className={`px-3 flex flex-col items-center justify-center text-center w-[122px] shrink-0 border-r border-slate-200 ${
                                    tempLayout === 'classic' ? 'bg-slate-50 border-slate-900 border-l-2' :
                                    tempLayout === 'modern' ? 'bg-emerald-50/35 border-slate-100' :
                                    tempLayout === 'technical' ? 'bg-zinc-100/50 border-slate-300' :
                                    'bg-slate-50/40'
                                }`}>
                                    <div className="text-[10px] font-black text-slate-450 mb-2 uppercase tracking-widest opacity-80 decoration-slate-300">مبلغ نهایی</div>
                                    <div className={`text-[15.5px] font-black tracking-tight leading-none ${
                                        tempLayout === 'classic' ? 'text-black font-extrabold' :
                                        tempLayout === 'modern' ? 'text-emerald-700' :
                                        tempLayout === 'technical' ? 'text-blue-700' :
                                        'text-slate-900'
                                    }`}>
                                        {formatPrice(item.calculations.totalPrice * item.quantity)}
                                    </div>
                                    <div className="text-[8.5px] font-black text-slate-500 mt-2 uppercase tracking-tighter opacity-75">تومان</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {isLastPage && (
            <div className="inv-total px-10 pt-4 pb-6 shrink-0 bg-white flex flex-col mt-auto relative z-10 before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-slate-200">
                <div className="flex gap-10 items-end justify-between">
                    <div className="flex-1 grid grid-cols-2 gap-8 opacity-80 pb-2 pl-4">
                        <div className="text-center flex flex-col items-center">
                            <span className="text-[9px] font-black block mb-8 text-slate-700 uppercase tracking-widest">مهر و امضاء مجاز واحد فروش</span>
                            <div className="w-28 h-[1px] border-b-2 border-dashed border-slate-400"></div>
                        </div>
                        <div className="text-center flex flex-col items-center">
                            <span className="text-[9px] font-black block mb-8 text-slate-700 uppercase tracking-widest">تایید و امضاء خریدار</span>
                            <div className="w-28 h-[1px] border-b-2 border-dashed border-slate-400"></div>
                        </div>
                    </div>
                    
                    <div className={`totals-box w-[300px] p-4 flex flex-col border shadow-sm ${
                        tempLayout === 'standard' ? 'bg-slate-50/80 border-slate-200 text-slate-900 rounded-3xl' : 
                        tempLayout === 'classic' ? 'bg-slate-50 border-2 border-slate-900 text-slate-900 rounded-none' :
                        tempLayout === 'modern' ? 'bg-emerald-50/50 border-emerald-200 text-slate-900 rounded-3xl shadow-sm' :
                        'bg-slate-900 text-white border-transparent rounded-2xl' /* technical is charcoal dark */
                    }`}>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10.5px] font-bold opacity-90">
                                <span>جمع متریال مصرفی:</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="font-extrabold text-[12px]">{formatPrice(totalMaterialPrice)}</span>
                                    <span className="text-[7.5px] opacity-70">تومان</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] font-bold opacity-90">
                                <span>هزینه نصب ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="font-extrabold text-[12px]">{formatPrice(installationCost)}</span>
                                    <span className="text-[7.5px] opacity-70">تومان</span>
                                </div>
                            </div>
                            <div className="h-px bg-current opacity-20 my-2"></div>
                            <div className="flex justify-between items-end">
                                <span className={`text-[11px] font-black uppercase tracking-widest mb-0.5 ${
                                    tempLayout === 'modern' ? 'text-emerald-700' :
                                    tempLayout === 'technical' ? 'text-blue-400' :
                                    tempLayout === 'classic' ? 'text-black' :
                                    'text-blue-600'
                                }`}>مبلغ نهایی پروژه:</span>
                                <div className="text-left flex flex-col items-end">
                                    <div className="flex items-baseline gap-1.5">
                                        <div className="text-2xl font-black leading-none tracking-tighter">{formatPrice(finalPrice)}</div>
                                        <span className="text-[8.5px] font-black opacity-60 tracking-widest uppercase">تومان</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        <InvoiceFooter pageNum={pageIndex + 1} totalPages={pages.length} />
      </div>
    );
  };

  return (
    <div ref={mainWrapperRef} className="min-h-screen bg-slate-100 flex flex-col items-center font-['Vazirmatn'] relative pb-40 overflow-x-hidden print:bg-white print:pb-0 print:overflow-visible">
       {/* CSS مخصوص پنجره چاپ سیستم و کانتینر اکسپورت */}
       <style>{`
          * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
          }
          @media print {
            @page {
                size: A4;
                margin: 0;
            }
            body {
                background: white !important;
            }
            .no-print {
                display: none !important;
            }
            .invoice-page {
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                width: 210mm !important;
                height: 297mm !important;
                page-break-after: always;
                background-color: white !important;
            }
            .invoice-page * {
                box-shadow: none !important;
                text-shadow: none !important;
            }
            .invoice-page:last-child {
                page-break-after: auto;
            }
            #root {
                overflow: visible !important;
            }
            .export-container {
                display: none !important;
            }
          }
          .export-container .invoice-page * {
            box-shadow: none !important;
            text-shadow: none !important;
          }
       `}</style>

       {/* Toolbar Actions */}
       <div className="no-print sticky top-0 left-0 right-0 z-[60] px-6 py-4 bg-white/90 backdrop-blur-2xl border-b border-slate-200 flex items-center justify-between shadow-sm w-full">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="w-11 h-11 flex items-center justify-center bg-white shadow-sm rounded-2xl text-slate-700 border border-slate-200 active:scale-90 transition-all">
                    <ArrowRight size={20} />
                </button>
                <button onClick={() => navigate('/dashboard')} className="w-11 h-11 flex items-center justify-center bg-white shadow-sm rounded-2xl text-slate-700 border border-slate-200 active:scale-90 transition-all">
                    <Home size={18} />
                </button>
            </div>

            <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
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
                className="w-11 h-11 flex items-center justify-center bg-slate-900 text-white shadow-lg rounded-2xl active:scale-90 transition-all"
            >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
       </div>

       {/* Floating Dock */}
       <div className="no-print fixed bottom-6 left-0 right-0 z-50 px-6 flex flex-col items-center gap-4 pointer-events-none">
            <div className="bg-white/80 backdrop-blur-2xl shadow-2xl border border-white/50 rounded-2xl p-1 flex gap-1 pointer-events-auto">
                {['standard', 'modern', 'technical', 'classic'].map((layout) => (
                    <button key={layout} onClick={() => setTempLayout(layout as InvoiceLayoutType)} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${tempLayout === layout ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {layout === 'standard' ? 'استاندارد' : layout === 'modern' ? 'مدرن' : layout === 'technical' ? 'فنی' : 'کلاسیک'}
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-center gap-3 w-full max-w-[420px] pointer-events-auto">
                <div className="flex-1 bg-slate-900/95 backdrop-blur-2xl shadow-2xl rounded-[2rem] p-2 flex items-center justify-between border border-white/10">
                    <button onClick={handlePrint} className="flex-1 h-12 flex items-center justify-center gap-2 bg-white/10 text-white rounded-full font-black text-[11px] transition-all hover:bg-white/20">
                        <Printer size={18} />
                        <span>چاپ مستقیم</span>
                    </button>
                    
                    <div className="w-px h-6 bg-white/10 mx-1"></div>

                    <button onClick={() => generatePDF(false)} disabled={isGenerating} className="flex-[1.2] mx-1 flex items-center justify-center gap-2 h-12 bg-blue-600 text-white rounded-full font-black text-[11px] transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                        <span>ذخیره PDF</span>
                    </button>

                    <button onClick={() => generatePDF(true)} disabled={isGenerating} className="w-12 h-12 flex items-center justify-center bg-emerald-600 text-white rounded-full transition-all disabled:opacity-50">
                        <Share2 size={20} />
                    </button>
                </div>
            </div>
       </div>

       {/* EXPORT CONTAINER (HIDDEN) */}
       <div className="export-container no-print absolute top-[-10000px] left-[-10000px]">
            {pages.map((pageItems, pageIndex) => (
                <div key={pageIndex} className={`invoice-page layout-${tempLayout}`} style={{ width: '794px', height: '1123px', position: 'relative', backgroundColor: '#fff' }}>
                    <InvoicePageContent pageItems={pageItems} pageIndex={pageIndex} totalPages={pages.length} />
                </div>
            ))}
       </div>

       {/* PREVIEW CONTAINER */}
       <div ref={containerRef} className="w-full flex justify-center pt-10 overflow-visible print:pt-0">
            <div className="relative origin-top transition-transform duration-300 ease-out flex flex-col gap-10 print:gap-0 print:transform-none print:w-auto" style={{ transform: `scale(${scale})`, width: '794px' }}>
                {pages.map((pageItems, pageIndex) => (
                    <div key={pageIndex} className={`invoice-page layout-${tempLayout} border border-slate-200 mb-10 print:mb-0 print:border-none shadow-2xl print:shadow-none`} style={{ width: '794px', height: '1123px', position: 'relative', backgroundColor: '#fff', overflow: 'hidden' }}>
                        <InvoicePageContent pageItems={pageItems} pageIndex={pageIndex} totalPages={pages.length} />
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
};
