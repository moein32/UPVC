
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
    <div className="inv-header">
        <div className={`flex ${tempLayout === 'classic' ? 'flex-col items-center gap-4' : 'justify-between items-start'}`}>
            <div className={`${tempLayout === 'classic' ? 'text-center' : 'text-right'}`}>
                <div className="inv-title-box">
                    <h1 className="text-3xl font-black mb-1 tracking-tight text-slate-800">{invoiceConfig.companyName}</h1>
                    {tempLayout === 'modern' && <span className="inv-badge text-[10px] font-bold">پیش‌فاکتور رسمی</span>}
                </div>
                <div className="text-[10px] opacity-80 space-y-0.5 font-medium mt-2 text-slate-700">
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
            <div className={`flex flex-col ${tempLayout === 'classic' ? 'items-center w-full border-t border-slate-700 pt-4 mt-1' : 'items-end text-left'}`}>
                {tempLayout !== 'modern' && (
                    <div className={`text-[11px] font-black px-4 py-1.5 mb-2 rounded-lg ${tempLayout === 'technical' ? 'bg-slate-800 text-white' : tempLayout === 'classic' ? 'border border-slate-800' : 'bg-slate-100'}`}>
                        پیش‌فاکتور فروش
                    </div>
                )}
                <div className="text-[10px] font-bold space-y-1 opacity-90 text-slate-800">
                    <div className="flex gap-4 justify-between min-w-[140px]">
                        <span>تاریخ:</span>
                        <span className="font-black">{todayJalali}</span>
                    </div>
                    <div className="flex gap-4 justify-between min-w-[140px]">
                        <span>شماره:</span>
                        <span className="font-black">{toPersianDigits(projectDetails.id.slice(-6))}</span>
                    </div>
                    <div className="flex gap-4 justify-between min-w-[140px]">
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
        <div className="inv-footer-container relative pt-2 border-t border-slate-200">
            <div className="flex justify-between items-end">
                <div className="max-w-[70%]">
                    <p className="text-[9px] leading-relaxed text-justify opacity-70 font-medium text-slate-700">
                        {invoiceConfig.footerNote || 'اعتبار این پیش‌فاکتور ۷۲ ساعت می‌باشد. نصب در محل پروژه بر عهده تیم متخصص لومینا است.'}
                    </p>
                </div>
                <div className="text-left">
                        <div className="bg-slate-800 text-white text-[8px] font-bold px-3 py-1 rounded-full flex items-center gap-2">
                            <span>صفحه</span>
                            <span>{toPersianDigits(pageNum)} / {toPersianDigits(totalPages)}</span>
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
                <div className="inv-card p-3 grid grid-cols-2 gap-4 border border-slate-100 rounded-2xl bg-slate-50/50 shadow-sm">
                    <div>
                        <span className="text-[8px] font-black opacity-50 uppercase tracking-widest mb-0.5 block">مشخصات خریدار</span>
                        <div className="text-sm font-black text-slate-900">{projectDetails.customerName}</div>
                    </div>
                    <div>
                        <span className="text-[8px] font-black opacity-50 uppercase tracking-widest mb-0.5 block">محل پروژه</span>
                        <div className="text-[10px] font-bold text-slate-600 truncate">{projectDetails.address || 'ثبت نشده'}</div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 px-10 overflow-hidden">
            <table className="inv-table w-full border-collapse">
                <thead>
                    <tr>
                        <th className="p-1.5 w-8 text-center border-b-2 border-slate-300 text-[10px]">#</th>
                        <th className="p-1.5 w-36 text-center border-b-2 border-slate-300 text-[10px]">نقشه فنی</th>
                        <th className="p-1.5 text-center border-b-2 border-slate-300 text-[10px]">شرح اقلام و محاسبات</th>
                        <th className="p-1.5 w-16 text-center border-b-2 border-slate-300 text-[10px]">تعداد</th>
                        <th className="p-1.5 w-32 text-center border-b-2 border-slate-300 text-[10px]">جمع ردیف (تومان)</th>
                    </tr>
                </thead>
                <tbody>
                    {pageItems.map((item: any, localIndex: number) => {
                        const globalIndex = pageIndex * ITEMS_PER_PAGE + localIndex;
                        const brand = BRANDS.find(b => b.id === item.config.profileId);
                        return (
                            <tr key={item.id} className="border-b border-slate-100 last:border-0">
                                <td className="p-1 font-bold text-[10px] opacity-40 text-center align-top pt-4">{toPersianDigits(globalIndex + 1)}</td>
                                <td className="p-1 align-top pt-4">
                                    <div className="relative w-32 h-32 mx-auto bg-white flex items-center justify-center border border-slate-50 rounded-lg overflow-hidden shadow-sm">
                                        <WindowPreview 
                                          config={item.config} 
                                          width="100%" 
                                          height="100%" 
                                          isThumbnail={true} 
                                          scale={0.38} 
                                        />
                                    </div>
                                    <div className="text-center mt-1.5 text-[9px] font-black text-slate-800 bg-slate-50 py-0.5 rounded border border-slate-100">
                                      {toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)} mm
                                    </div>
                                </td>
                                <td className="p-1 align-top pt-2">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded text-[8px] font-black border border-slate-200">{brand?.name}</span>
                                        <span className="text-[8px] font-bold opacity-70">{item.config.type}</span>
                                    </div>
                                    <table className="w-full text-[8px] border border-slate-100 rounded overflow-hidden bg-white">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="p-1 text-right text-slate-500 w-[40%]">شرح کالا</th>
                                                <th className="p-1 text-center text-slate-500 w-[15%]">مقدار</th>
                                                <th className="p-1 text-center text-slate-500 w-[15%]">واحد</th>
                                                <th className="p-1 text-left text-slate-500 w-[30%]">مبلغ واحد</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {item.calculations.details?.slice(0, 5).map((detail: any, dIdx: number) => (
                                                <tr key={dIdx} className="border-b border-slate-50 last:border-0">
                                                    <td className="p-1 font-bold text-slate-900 truncate max-w-[100px]">{detail.name}</td>
                                                    <td className="p-1 text-center text-slate-800 font-black">{toPersianDigits(detail.quantity)}</td>
                                                    <td className="p-1 text-center text-slate-500 text-[7px]">{detail.unit}</td>
                                                    <td className="p-1 text-left font-black text-slate-900">{formatPrice(detail.unitPrice)}</td>
                                                </tr>
                                            ))}
                                            {item.calculations.details?.length > 5 && (
                                                <tr>
                                                    <td colSpan={4} className="p-0.5 text-center text-[7px] text-slate-400 italic">...و سایر اقلام فنی طبق طراحی</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </td>
                                <td className="p-1 text-center align-top pt-10">
                                    <div className="text-base font-black text-slate-900">{toPersianDigits(item.quantity)}</div>
                                </td>
                                <td className="p-1 text-center align-top pt-10">
                                    <div className="text-sm font-black text-slate-900 tracking-tight text-center">{formatPrice(item.calculations.totalPrice * item.quantity)}</div>
                                    <span className="text-[8px] font-black text-slate-400 block text-center mt-1">تومان</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {pageIndex === totalPages - 1 && (
            <div className="inv-total px-10 py-3 shrink-0 border-t border-slate-200 bg-white z-20">
                <div className="flex gap-4 items-center">
                    <div className="flex-1">
                        <div className="flex justify-around items-center opacity-60">
                            <div className="text-center">
                                <span className="text-[8px] font-black block mb-4 uppercase tracking-widest">مهر و امضاء فروشنده</span>
                                <div className="w-20 h-px bg-slate-300 mx-auto"></div>
                            </div>
                            <div className="text-center">
                                <span className="text-[8px] font-black block mb-4 uppercase tracking-widest">تایید نهایی خریدار</span>
                                <div className="w-20 h-px bg-slate-300 mx-auto"></div>
                            </div>
                        </div>
                    </div>
                    <div className="totals-box w-68 p-4 rounded-2xl flex flex-col bg-slate-100 border border-slate-200 shadow-sm">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                <span>مجموع اقلام (تعداد {toPersianDigits(items.reduce((acc, i) => acc + i.quantity, 0))} عدد):</span>
                                <span className="text-slate-900 font-black">{formatPrice(totalMaterialPrice)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold text-slate-500">
                                <span>اجرت نصب ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                                <span className="text-slate-900 font-black">{formatPrice(installationCost)}</span>
                            </div>
                            <div className="h-px bg-slate-300 my-1 opacity-50"></div>
                            <div className="flex justify-between items-end pt-1">
                                <span className="text-xs font-black text-slate-900">جمع کل فاکتور:</span>
                                <div className="text-left">
                                    <div className="text-2xl font-black text-blue-700 leading-none tracking-tight">{formatPrice(finalPrice)}</div>
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
           
           .layout-standard .inv-header { background-color: #f8fafc; border-bottom: 2px solid #334155; padding: 25px 40px; }
           .layout-standard .inv-table th { background-color: #334155; color: white; font-size: 10px; }
           
           .layout-modern .inv-header { padding: 25px 40px 10px 40px; }
           .layout-modern .inv-badge { background-color: #1e293b; color: white; padding: 4px 12px; border-radius: 100px; }
           .layout-modern .inv-total { background-color: #1e293b; color: white !important; border-radius: 20px; margin: 10px 40px; padding: 20px; }
           .layout-modern .inv-total .totals-box { background: rgba(255,255,255,0.05); border: none; }
           .layout-modern .inv-total * { color: white !important; }

           .layout-technical .inv-header { background-color: #0f172a; color: white; padding: 25px 40px; }
           .layout-technical .inv-header * { color: white !important; }

           .layout-classic .classic-border-frame { border: 2px solid #171717; margin: 15px; flex: 1; display: flex; flex-direction: column; height: calc(100% - 30px) !important; }
           .layout-classic .inv-header { border-bottom: 1px solid #171717; padding: 20px; }
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
                     <button key={layout} onClick={() => setTempLayout(layout as InvoiceLayoutType)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tempLayout === layout ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
                        {layout === 'standard' && 'استاندارد'}
                        {layout === 'modern' && 'مدرن'}
                        {layout === 'technical' && 'فنی'}
                        {layout === 'classic' && 'کلاسیک'}
                     </button>
                 ))}
            </div>
            <div className="bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-full p-2 flex items-center gap-2 pointer-events-auto">
                <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"><ArrowRight size={18} /></button>
                <div className="w-px h-6 bg-white/20 mx-1"></div>
                <button onClick={() => generatePDF(false)} disabled={isGenerating} className="flex items-center gap-2 px-6 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-xs transition-all disabled:opacity-50">
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                    <span>دانلود PDF</span>
                </button>
                <button onClick={() => generatePDF(true)} disabled={isGenerating} className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all disabled:opacity-50"><Share2 size={18} /></button>
                <div className="w-px h-6 bg-white/20 mx-1"></div>
                <div className="flex bg-white/10 rounded-full p-1">
                    <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-full"><ZoomOut size={14} /></button>
                    <button onClick={() => setScale(1)} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-full"><Maximize size={14} /></button>
                    <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-full"><ZoomIn size={14} /></button>
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
