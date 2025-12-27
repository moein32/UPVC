
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

  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + item.calculations.unitPrice, 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;
  const todayJalali = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date(projectDetails.date));
  const invoiceConfig = settings?.invoice || { companyName: 'فروشگاه لومینا', companyPhone: '', companyAddress: '', footerNote: '' };

  const ITEMS_PER_PAGE = 3; 
  const pages = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    const pageElements = document.querySelectorAll('.invoice-page-export');
    if (!pageElements.length || !scaledWrapperRef.current) return;
    const originalTransform = scaledWrapperRef.current.style.transform;
    scaledWrapperRef.current.style.transform = 'none';
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      for (let i = 0; i < pageElements.length; i++) {
         if (i > 0) pdf.addPage();
         const canvas = await toJpeg(pageElements[i] as HTMLElement, { quality: 0.95, pixelRatio: 2.5, backgroundColor: '#ffffff' });
         const imgProps = pdf.getImageProperties(canvas);
         const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
         pdf.addImage(canvas, 'JPEG', 0, 0, pdfWidth, imgHeight);
      }
      pdf.save(`Invoice-${projectDetails.customerName}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF Error:', error);
    } finally {
      scaledWrapperRef.current.style.transform = originalTransform;
      setIsGenerating(false);
    }
  };

  const handleSharePDF = async () => {
    setIsGenerating(true);
    const pageElements = document.querySelectorAll('.invoice-page-export');
    if (!pageElements.length || !scaledWrapperRef.current) return;
    const originalTransform = scaledWrapperRef.current.style.transform;
    scaledWrapperRef.current.style.transform = 'none';
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      for (let i = 0; i < pageElements.length; i++) {
         if (i > 0) pdf.addPage();
         const canvas = await toJpeg(pageElements[i] as HTMLElement, { quality: 0.90, pixelRatio: 2, backgroundColor: '#ffffff' });
         const imgProps = pdf.getImageProperties(canvas);
         const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
         pdf.addImage(canvas, 'JPEG', 0, 0, pdfWidth, imgHeight);
      }
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `Invoice.pdf`, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'پیش‌فاکتور', text: `فاکتور ${projectDetails.customerName}` });
      } else {
        pdf.save(`Invoice-${projectDetails.customerName}.pdf`);
      }
    } catch (error: any) {
       console.error('Share Error:', error);
    } finally {
      scaledWrapperRef.current.style.transform = originalTransform;
      setIsGenerating(false);
    }
  };

  const InvoiceHeader = () => (
    <div className="inv-header">
        <div className={`flex ${tempLayout === 'classic' ? 'flex-col items-center gap-4' : 'justify-between items-start'}`}>
            <div className={`${tempLayout === 'classic' ? 'text-center' : 'text-right'}`}>
                <div className="inv-title-box">
                    <h1 className="text-3xl font-black mb-2 tracking-tight text-slate-900">{invoiceConfig.companyName}</h1>
                    {tempLayout === 'modern' && <span className="inv-badge text-[10px] font-bold">پیش‌فاکتور رسمی</span>}
                </div>
                <div className="text-[11px] opacity-80 space-y-1 font-medium mt-3 text-slate-700">
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
            <div className={`flex flex-col ${tempLayout === 'classic' ? 'items-center w-full border-t-2 border-slate-900 pt-4 mt-2' : 'items-end text-left'}`}>
                {tempLayout !== 'modern' && (
                    <div className={`text-[12px] font-black px-4 py-2 mb-3 rounded-lg ${tempLayout === 'technical' ? 'bg-slate-900 text-white' : tempLayout === 'classic' ? 'border border-slate-900' : 'bg-slate-100'}`}>
                        پیش‌فاکتور فروش
                    </div>
                )}
                <div className="text-[10px] font-bold space-y-1.5 opacity-90 text-slate-800">
                    <div className="flex gap-4 justify-between min-w-[140px]">
                        <span>تاریخ صدور:</span>
                        <span className="font-black">{todayJalali}</span>
                    </div>
                    <div className="flex gap-4 justify-between min-w-[140px]">
                        <span>شماره سند:</span>
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
     <div className="inv-footer mt-auto">
        <div className="inv-footer-container relative pt-6 border-t border-slate-200">
            <div className="flex justify-between items-end">
                <div className="max-w-[55%]">
                    <div className="flex items-center gap-2 mb-2 opacity-60">
                            <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">توضیحات و شرایط</span>
                    </div>
                    <p className="text-[9px] leading-loose text-justify opacity-70 font-medium pl-4 text-slate-700">
                        {invoiceConfig.footerNote || 'هزینه حمل و نقل بر عهده خریدار می‌باشد. اعتبار این پیش‌فاکتور ۷۲ ساعت از تاریخ صدور است.'}
                    </p>
                </div>
                <div className="text-left flex flex-col items-end gap-4">
                        <div className="text-[9px] font-bold opacity-80 dir-ltr text-right text-slate-700">
                        {invoiceConfig.companyAddress && <div className="mb-1">{invoiceConfig.companyAddress}</div>}
                        {invoiceConfig.companyPhone && <div className="opacity-70 font-mono tracking-widest">{invoiceConfig.companyPhone}</div>}
                        </div>
                        <div className="bg-slate-900 text-white text-[9px] font-bold px-4 py-1.5 rounded-full flex items-center gap-3 shadow-md">
                            <span className="opacity-70 font-normal">صفحه</span>
                            <span className="font-mono pt-0.5 tracking-wider">{toPersianDigits(pageNum)} / {toPersianDigits(totalPages)}</span>
                        </div>
                </div>
            </div>
        </div>
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
             .invoice-page { margin: 0 !important; width: 210mm !important; min-height: 297mm !important; height: auto !important; box-shadow: none !important; border-radius: 0 !important; }
           }
           .invoice-page { width: 794px !important; min-height: 1123px !important; background-color: #ffffff; color: #0f172a; box-sizing: border-box; position: relative; display: flex; flex-direction: column; margin-bottom: 2rem; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); }
           .invoice-page * { font-family: 'Vazirmatn', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
           .inv-footer { padding: 0 50px 40px 50px; }
           .layout-modern .inv-footer-container { background: #f8fafc; border: none; padding: 24px 30px; border-radius: 16px; margin-top: 20px; }
           .layout-technical .inv-footer-container { border-top: 4px solid #1e293b; padding-top: 20px; }
           .layout-classic .inv-footer-container { border-top: 3px double #1e293b; }
           .layout-standard { --primary: #334155; --primary-light: #f1f5f9; --text-main: #0f172a; --text-muted: #475569; --border: #cbd5e1; --header-bg: #f8fafc; }
           .layout-standard .inv-header { background-color: var(--header-bg); border-bottom: 2px solid var(--primary); padding: 40px; }
           .layout-standard .inv-title-box { border-right: 4px solid var(--primary); padding-right: 15px; }
           .layout-standard .inv-card { background: white; border: 1px solid var(--border); border-radius: 4px; }
           .layout-standard .inv-table th { background-color: var(--primary); color: white; text-transform: uppercase; font-weight: 900; border-bottom: 2px solid var(--primary); text-align: center; }
           .layout-standard .inv-table td { border-bottom: 1px solid var(--border); text-align: center; vertical-align: middle; }
           .layout-standard .inv-total { background-color: var(--header-bg); border-top: 2px solid var(--primary); padding: 30px; margin-top: 20px; }
           .layout-modern { --primary: #1e293b; --primary-light: #f8fafc; --text-main: #1e293b; --text-muted: #64748b; --border: transparent; --header-bg: #ffffff; }
           .layout-modern .inv-header { padding: 40px 40px 10px 40px; }
           .layout-modern .inv-badge { background-color: var(--primary); color: white; padding: 6px 16px; border-radius: 100px; }
           .layout-modern .inv-card { background: #f5f5f5; border-radius: 12px; border: none; }
           .layout-modern .inv-table th { color: var(--text-muted); font-weight: 700; font-size: 10px; padding-bottom: 15px; text-align: center; border-bottom: 1px solid #e2e8f0; }
           .layout-modern .inv-table td { padding-top: 15px; padding-bottom: 15px; vertical-align: middle; text-align: center; }
           .layout-modern .inv-total { background-color: var(--primary); color: white; border-radius: 16px; padding: 40px; margin: 20px 40px; }
           .layout-modern .inv-total * { color: white !important; }
           .layout-technical { --primary: #0f172a; --primary-light: #e2e8f0; --text-main: #0f172a; --text-muted: #475569; --border: #475569; --header-bg: #1e293b; }
           .layout-technical .inv-header { background-color: var(--header-bg); color: white; padding: 40px; border-bottom: 4px solid #475569; }
           .layout-technical .inv-header * { color: white !important; }
           .layout-technical .inv-card { border: 1px solid var(--border); border-radius: 0; background: white; }
           .layout-technical .inv-table th { background-color: #cbd5e1; color: #0f172a; border: 1px solid var(--border); font-weight: 800; text-align: center; }
           .layout-technical .inv-table td { border: 1px solid var(--border); text-align: center; vertical-align: middle; }
           .layout-technical .inv-total { border-top: 4px solid #0f172a; background-color: #f1f5f9; padding: 30px; margin-top: 20px; border-bottom: 10px solid var(--header-bg); }
           .layout-classic { --primary: #171717; --primary-light: #f3f3f3; --text-main: #171717; --text-muted: #262626; --border: #171717; --header-bg: #ffffff; }
           .layout-classic { padding: 40px; border: none; }
           .layout-classic .classic-border-frame { border: 2px solid var(--border); height: 100%; display: flex; flex-direction: column; }
           .layout-classic .inv-header { border-bottom: 2px solid var(--border); padding: 30px; text-align: center; }
           .layout-classic .inv-title-box { border: none; padding: 0; margin-bottom: 10px; }
           .layout-classic .inv-card { border: 1px solid var(--border); border-radius: 0; }
           .layout-classic .inv-table th { border-bottom: 1px solid var(--border); background-color: #f5f5f5; font-weight: bold; text-align: center; }
           .layout-classic .inv-table td { border-bottom: 1px solid var(--border); text-align: center; vertical-align: middle; }
           .layout-classic .inv-total { border-top: 2px solid var(--border); padding: 20px; background-color: #fff; margin-top: 20px; }
           .window-preview-clean svg { filter: none !important; box-shadow: none !important; }
           .window-preview-clean div { box-shadow: none !important; }
           .detail-row { border-bottom: 1px solid rgba(0,0,0,0.05); padding: 6px 0; }
           .detail-row:last-child { border-bottom: none; }
           .detail-header { border-bottom: 2px solid #e2e8f0; margin-bottom: 4px; padding-bottom: 4px; }
           .detail-col-text { font-size: 10px; font-weight: 600; color: #475569; }
         `}
       </style>

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
                <button onClick={handleDownloadPDF} disabled={isGenerating} className="flex items-center gap-2 px-6 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-xs transition-all disabled:opacity-50">
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                    <span>دانلود PDF</span>
                </button>
                <button onClick={handleSharePDF} disabled={isGenerating} className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all disabled:opacity-50"><Share2 size={18} /></button>
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
                    <div key={pageIndex} className={`invoice-page invoice-page-export layout-${tempLayout}`}>
                         <div className={tempLayout === 'classic' ? 'classic-border-frame' : 'h-full flex flex-col'}>
                             <InvoiceHeader />
                             {pageIndex === 0 && (
                                <div className="px-10 py-6">
                                    <div className="inv-card p-5 grid grid-cols-2 gap-8">
                                        <div>
                                            <span className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-1.5 block">مشخصات خریدار</span>
                                            <div className="text-lg font-black text-center" style={{ color: 'var(--text-main)' }}>{projectDetails.customerName}</div>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-1.5 block">محل پروژه</span>
                                            <div className="text-sm font-bold text-center" style={{ color: 'var(--text-muted)' }}>{projectDetails.address || 'ثبت نشده'}</div>
                                        </div>
                                    </div>
                                </div>
                             )}
                             <div className="flex-1 px-10">
                                <table className="inv-table w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-3 w-12 text-center rounded-r-lg">#</th>
                                            <th className="p-3 w-40 text-center">نقشه فنی</th>
                                            <th className="p-3 text-center">شرح اقلام و محاسبات متریال</th>
                                            <th className="p-3 w-32 text-center rounded-l-lg">مبلغ نهایی (تومان)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageItems.map((item, localIndex) => {
                                            const globalIndex = pageIndex * ITEMS_PER_PAGE + localIndex;
                                            const brand = BRANDS.find(b => b.id === item.config.profileId);
                                            return (
                                                <tr key={globalIndex}>
                                                    <td className="p-3 font-bold text-xs opacity-50">{toPersianDigits(globalIndex + 1)}</td>
                                                    <td className="p-3">
                                                        <div className="window-preview-clean relative w-32 h-32 mx-auto bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2">
                                                            <WindowPreview config={item.config} width="100%" height="100%" />
                                                        </div>
                                                        <div className="text-center mt-2 text-[9px] font-black opacity-60 dir-ltr">{toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)} mm</div>
                                                    </td>
                                                    <td className="p-3 align-top">
                                                        <div className="flex items-center justify-center gap-2 mb-3">
                                                            <span className="bg-slate-100 text-slate-900 px-2 py-0.5 rounded text-[10px] font-black border border-slate-200">{brand?.name}</span>
                                                            <span className="text-[10px] font-bold opacity-70">{item.config.type}</span>
                                                        </div>
                                                        
                                                        {/* Material Breakdown Sub-Table */}
                                                        <div className="w-full border rounded-lg overflow-hidden border-slate-100 bg-white">
                                                            <div className="detail-header flex bg-slate-50 text-[8px] font-black text-slate-500 px-2 py-1.5 border-b border-slate-100">
                                                                <div className="w-[35%] text-right">شرح کالا / متریال</div>
                                                                <div className="w-[20%] text-center">مقدار / واحد</div>
                                                                <div className="w-[20%] text-center">قیمت واحد</div>
                                                                <div className="w-[25%] text-left">مبلغ کل</div>
                                                            </div>
                                                            <div className="px-2 pb-1">
                                                                {item.calculations.details?.map((detail, dIdx) => (
                                                                    <div key={dIdx} className="detail-row flex items-center w-full border-b last:border-0 border-slate-50">
                                                                        <div className="w-[35%] font-bold text-[10px] text-right py-1.5 text-slate-900">{detail.name}</div>
                                                                        <div className="w-[20%] text-center detail-col-text">{toPersianDigits(detail.quantity)} {detail.unit}</div>
                                                                        <div className="w-[20%] text-center detail-col-text">{formatPrice(detail.unitPrice)}</div>
                                                                        <div className="w-[25%] text-left font-black text-[10px] text-slate-900">{formatPrice(detail.totalPrice)}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="text-sm font-black" style={{ color: 'var(--text-main)' }}>{formatPrice(item.calculations.totalPrice)}</div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                             </div>
                             {pageIndex === pages.length - 1 && (
                                 <div className="inv-total">
                                    <div className="flex gap-8 items-start">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center px-4 opacity-70 mt-2">
                                                <div className="text-center">
                                                    <span className="text-[9px] font-bold block mb-4">مهر و امضاء فروشنده</span>
                                                    <div className="w-24 h-px bg-current opacity-30 mx-auto"></div>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[9px] font-bold block mb-4">تایید خریدار</span>
                                                    <div className="w-24 h-px bg-current opacity-30 mx-auto"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-64">
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-xs font-bold opacity-70">
                                                    <span>جمع متریال مصرفی:</span>
                                                    <span>{formatPrice(totalMaterialPrice)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-bold opacity-70">
                                                    <span>اجرت نصب ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                                                    <span>{formatPrice(installationCost)}</span>
                                                </div>
                                                <div className="h-px bg-current opacity-20 my-2"></div>
                                                <div className="flex justify-between items-end">
                                                    <span className="text-sm font-black mb-1">مبلغ نهایی کل:</span>
                                                    <div className="text-left">
                                                        <div className="text-2xl font-black tracking-tight leading-none">{formatPrice(finalPrice)}</div>
                                                        <span className="text-[9px] font-bold opacity-50 block mt-1 uppercase">Toman</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                 </div>
                             )}
                             <InvoiceFooter pageNum={pageIndex + 1} totalPages={pages.length} />
                         </div>
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
};
