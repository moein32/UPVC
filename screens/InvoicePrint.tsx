
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Loader2, Share2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
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
        <div className="h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
          <Loader2 className="animate-spin text-slate-900" size={40} />
          <p className="text-slate-500 font-medium text-sm">در حال بارگذاری اطلاعات...</p>
        </div>
      );
  }

  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + (item.calculations.unitPrice * item.quantity), 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;
  const todayJalali = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date(projectDetails.date));
  const invoiceConfig = settings?.invoice || { companyName: 'فروشگاه لومینا', companyPhone: '', companyAddress: '', footerNote: '' };

  // Optimized for 3 items to fit on a single A4 page
  const ITEMS_PER_PAGE = 3; 
  const pages = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }

  const generatePDF = async (isShare = false) => {
    setIsGenerating(true);
    const pageElements = document.querySelectorAll('.export-container .invoice-page');
    if (!pageElements.length) {
        setIsGenerating(false);
        return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageElements.length; i++) {
         if (i > 0) pdf.addPage();
         
         const node = pageElements[i] as HTMLElement;
         
         const imgData = await toJpeg(node, {
            quality: 1.0,
            pixelRatio: 2.5,
            backgroundColor: '#ffffff',
            canvasWidth: 794,
            canvasHeight: 1123,
         });
         
         pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'SLOW');
      }

      const fileName = `Invoice-${projectDetails.customerName}.pdf`;
      if (isShare) {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'پیش‌فاکتور لومینا', text: projectDetails.customerName });
        } else {
          pdf.save(fileName);
        }
      } else {
        pdf.save(fileName);
      }
    } catch (error) {
      console.error('PDF Error:', error);
      alert('خطا در تولید فایل PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const InvoiceHeader = () => (
    <div className="inv-header shrink-0">
        <div className={`flex ${tempLayout === 'classic' ? 'flex-col items-center gap-4' : 'justify-between items-start'}`}>
            <div className={`${tempLayout === 'classic' ? 'text-center' : 'text-right'}`}>
                <div className="inv-title-box">
                    <h1 className="text-2xl font-black mb-1 tracking-tight text-slate-800">{invoiceConfig.companyName}</h1>
                    {tempLayout === 'modern' && <span className="inv-badge text-[10px] font-bold">پیش‌فاکتور رسمی</span>}
                </div>
                <div className="text-[10px] opacity-80 space-y-0.5 font-bold mt-1 text-slate-700">
                    <div className="flex items-center gap-2">
                        <span>آدرس:</span>
                        <span>{invoiceConfig.companyAddress || '---'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>تلفن تماس:</span>
                        <span>{toPersianDigits(invoiceConfig.companyPhone) || '---'}</span>
                    </div>
                </div>
            </div>
            <div className={`flex flex-col ${tempLayout === 'classic' ? 'items-center w-full border-t border-slate-700 pt-3 mt-1' : 'items-end text-left'}`}>
                {tempLayout !== 'modern' && (
                    <div className={`text-[11px] font-black px-4 py-1.5 mb-2 rounded-lg ${tempLayout === 'technical' ? 'bg-slate-800 text-white' : tempLayout === 'classic' ? 'border-2 border-slate-800' : 'bg-slate-100'}`}>
                        پیش‌فاکتور فروش کالا و خدمات
                    </div>
                )}
                <div className="text-[10px] font-bold space-y-0.5 opacity-95 text-slate-900">
                    <div className="flex gap-4 justify-between min-w-[150px]">
                        <span>تاریخ:</span>
                        <span className="font-black">{todayJalali}</span>
                    </div>
                    <div className="flex gap-4 justify-between min-w-[150px]">
                        <span>شماره:</span>
                        <span className="font-black">{toPersianDigits(projectDetails.id.slice(-6))}</span>
                    </div>
                    <div className="flex gap-4 justify-between min-w-[150px]">
                        <span>مشتری:</span>
                        <span className="font-black">{projectDetails.customerName}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  const InvoiceFooter = ({ pageNum, totalPages }: { pageNum: number, totalPages: number }) => (
     <div className="inv-footer shrink-0">
        <div className="inv-footer-container relative pt-3 border-t border-slate-200">
            <div className="flex justify-between items-end">
                <div className="max-w-[80%]">
                    <p className="text-[9px] leading-relaxed text-justify opacity-80 font-bold text-slate-800">
                        {invoiceConfig.footerNote || 'اعتبار این پیش‌فاکتور ۷۲ ساعت می‌باشد. نصب در محل پروژه بر عهده تیم متخصص لومینا است.'}
                    </p>
                </div>
                <div className="text-left">
                        <div className="bg-slate-900 text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-2">
                            <span>صفحه {toPersianDigits(pageNum)} از {toPersianDigits(totalPages)}</span>
                        </div>
                </div>
            </div>
        </div>
     </div>
  );

  const InvoicePageContent = ({ pageItems, pageIndex, totalPages }: any) => (
    <div className={`flex flex-col h-full overflow-hidden ${tempLayout === 'classic' ? 'classic-border-frame' : ''}`}>
        <InvoiceHeader />
        
        {pageIndex === 0 && (
            <div className="px-10 py-3 shrink-0">
                <div className="inv-card p-3 grid grid-cols-2 gap-4 border-2 border-slate-100 rounded-xl bg-slate-50/50">
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
            <table className="inv-table w-full border-collapse">
                <thead>
                    <tr className="bg-slate-50">
                        <th className="p-1.5 w-8 text-center border-b-2 border-slate-800 text-[10px] font-black">#</th>
                        <th className="p-1.5 w-44 text-center border-b-2 border-slate-800 text-[10px] font-black">نقشه و ابعاد</th>
                        <th className="p-1.5 text-center border-b-2 border-slate-800 text-[10px] font-black">ریز اقلام فنی و محاسبات متریال</th>
                        <th className="p-1.5 w-32 text-center border-b-2 border-slate-800 text-[10px] font-black">جمع ردیف (تومان)</th>
                    </tr>
                </thead>
                <tbody>
                    {pageItems.map((item: any, localIndex: number) => {
                        const globalIndex = pageIndex * ITEMS_PER_PAGE + localIndex;
                        const brand = BRANDS.find(b => b.id === item.config.profileId);
                        return (
                            <tr key={item.id} className="border-b border-slate-100 last:border-0">
                                <td className="p-1 font-black text-[10px] text-slate-400 text-center align-top pt-4">{toPersianDigits(globalIndex + 1)}</td>
                                <td className="p-1 align-top pt-4 flex flex-col items-center gap-1">
                                    <div className="relative w-36 h-36 mx-auto bg-white flex items-center justify-center border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                                        <WindowPreview 
                                          config={item.config} 
                                          width="100%" 
                                          height="100%" 
                                          isThumbnail={true} 
                                          scale={0.42} 
                                        />
                                    </div>
                                    <div className="text-center mt-1 text-[10px] font-black text-slate-900" style={{ direction: 'ltr' }}>
                                      {toPersianDigits(item.config.width)} * {toPersianDigits(item.config.height)}
                                    </div>
                                    <div className="text-center text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-100">
                                      تعداد: {toPersianDigits(item.quantity)} عدد
                                    </div>
                                </td>
                                <td className="p-1 align-top pt-3">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[8px] font-black">{brand?.name}</span>
                                        <span className="text-[9px] font-bold text-slate-500">{item.config.type}</span>
                                    </div>
                                    <table className="w-full text-[8.5px] border border-slate-100 rounded-md overflow-hidden bg-white">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="p-1 text-right text-slate-600 font-black">شرح کالا</th>
                                                <th className="p-1 text-center text-slate-600 font-black">مقدار</th>
                                                <th className="p-1 text-center text-slate-600 font-black">واحد</th>
                                                <th className="p-1 text-left text-slate-600 font-black">فی</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {item.calculations.details?.map((detail: any, dIdx: number) => (
                                                <tr key={dIdx} className="border-b border-slate-50 last:border-0">
                                                    <td className="p-1 font-bold text-slate-800">{detail.name}</td>
                                                    <td className="p-1 text-center text-slate-900 font-black">{toPersianDigits(detail.quantity)}</td>
                                                    <td className="p-1 text-center text-slate-500">{detail.unit}</td>
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
                    <div className="flex-1">
                        <div className="flex justify-around items-center opacity-60">
                            <div className="text-center">
                                <span className="text-[9px] font-black block mb-4 text-slate-500">مهر و امضاء فروشنده</span>
                                <div className="w-20 h-0.5 bg-slate-300 mx-auto"></div>
                            </div>
                            <div className="text-center">
                                <span className="text-[9px] font-black block mb-4 text-slate-500">تایید و امضاء خریدار</span>
                                <div className="w-20 h-0.5 bg-slate-300 mx-auto"></div>
                            </div>
                        </div>
                    </div>
                    <div className="totals-box w-72 p-4 rounded-2xl flex flex-col bg-slate-900 text-white shadow-lg">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400">
                                <span>مجموع اقلام ({toPersianDigits(items.reduce((acc, i) => acc + i.quantity, 0))} عدد):</span>
                                <span className="text-white font-black">{formatPrice(totalMaterialPrice)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-400">
                                <span>هزینه نصب ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                                <span className="text-white font-black">{formatPrice(installationCost)}</span>
                            </div>
                            <div className="h-px bg-white/20 my-1"></div>
                            <div className="flex justify-between items-end pt-1">
                                <span className="text-xs font-black text-blue-400">جمع کل فاکتور:</span>
                                <div className="text-left">
                                    <div className="text-2xl font-black text-white leading-none tracking-tight">{formatPrice(finalPrice)}</div>
                                    <span className="text-[8px] font-black opacity-50 block mt-1 tracking-widest text-left">تومان</span>
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
    <div className="min-h-screen bg-slate-200/50 flex flex-col items-center overflow-x-hidden font-['Vazirmatn'] relative pb-32">
       <style>
         {`
           @media print {
             @page { size: A4; margin: 0; }
             body { background: white; }
             .no-print { display: none !important; }
           }
           
           .export-container { 
             position: absolute; 
             top: 0; 
             left: -10000px; 
             width: 794px; 
             visibility: visible;
             pointer-events: none;
           }
           
           .invoice-page { 
             width: 794px !important; 
             height: 1123px !important; 
             background-color: #ffffff; 
             color: #1e293b; 
             box-sizing: border-box; 
             position: relative; 
             display: flex; 
             flex-direction: column; 
             overflow: hidden; 
             padding: 0;
             margin: 0;
           }
           
           .invoice-page * { font-family: 'Vazirmatn', sans-serif; box-sizing: border-box; }
           .inv-footer { padding: 0 40px 15px 40px; }
           
           .layout-standard .inv-header { background-color: #f8fafc; border-bottom: 3px solid #0f172a; padding: 25px 40px; }
           .layout-standard .inv-table th { background-color: #0f172a; color: white; font-size: 10px; }
           
           .layout-modern .inv-header { padding: 25px 40px 10px 40px; }
           .layout-modern .inv-badge { background-color: #3b82f6; color: white; padding: 5px 12px; border-radius: 100px; }
           .layout-modern .inv-total { border-radius: 1.5rem; margin: 10px 40px; }

           .layout-technical .inv-header { background-color: #1e293b; color: white; padding: 25px 40px; }
           .layout-technical .inv-header * { color: white !important; }

           .layout-classic .classic-border-frame { border: 2px solid #171717; margin: 15px; flex: 1; display: flex; flex-direction: column; height: calc(100% - 30px) !important; }
           .layout-classic .inv-header { border-bottom: 2px solid #171717; padding: 20px; }
         `}
       </style>

       <div className="export-container no-scrollbar">
            {pages.map((pageItems, pageIndex) => (
                <div key={`export-${pageIndex}`} className={`invoice-page layout-${tempLayout}`}>
                    <InvoicePageContent pageItems={pageItems} pageIndex={pageIndex} totalPages={pages.length} />
                </div>
            ))}
       </div>

       <div className="no-print fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 w-full px-4 max-w-2xl pointer-events-none">
            <div className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/50 rounded-2xl p-2 flex gap-1 pointer-events-auto">
                 {['standard', 'modern', 'technical', 'classic'].map((layout) => (
                     <button key={layout} onClick={() => setTempLayout(layout as InvoiceLayoutType)} className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${tempLayout === layout ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {layout === 'standard' && 'استاندارد'}
                        {layout === 'modern' && 'مدرن'}
                        {layout === 'technical' && 'فنی'}
                        {layout === 'classic' && 'کلاسیک'}
                     </button>
                 ))}
            </div>
            <div className="bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-full p-2 flex items-center gap-2 pointer-events-auto">
                <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"><ArrowRight size={20} /></button>
                <div className="w-px h-8 bg-white/20 mx-1"></div>
                <button onClick={() => generatePDF(false)} disabled={isGenerating} className="flex items-center gap-2 px-8 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-sm transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                    <span>خروجی PDF</span>
                </button>
                <button onClick={() => generatePDF(true)} disabled={isGenerating} className="w-12 h-12 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"><Share2 size={20} /></button>
                <div className="w-px h-8 bg-white/20 mx-1"></div>
                <div className="flex bg-white/10 rounded-full p-1">
                    <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full"><ZoomOut size={16} /></button>
                    <button onClick={() => setScale(1)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full"><Maximize size={16} /></button>
                    <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full"><ZoomIn size={16} /></button>
                </div>
            </div>
       </div>

       <div ref={containerRef} className="w-full flex justify-center pt-8 pb-48 overflow-visible">
            <div ref={scaledWrapperRef} className="relative origin-top transition-transform duration-200 ease-out flex flex-col gap-8" style={{ transform: `scale(${scale})`, width: '794px' }}>
                {pages.map((pageItems, pageIndex) => (
                    <div key={pageIndex} className={`invoice-page shadow-2xl layout-${tempLayout}`}>
                        <InvoicePageContent pageItems={pageItems} pageIndex={pageIndex} totalPages={pages.length} />
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
};
