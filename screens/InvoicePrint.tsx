
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Download, Settings2, Loader2, Building, Printer, ZoomIn, ZoomOut, Maximize, X, Share2 } from 'lucide-react';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem, AppSettings, InvoiceLayoutType } from '../types';
import { BRANDS } from '../constants';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';

declare var html2pdf: any;

export const InvoicePrint = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const state = location.state as { projectDetails: ProjectDetails, items: InvoiceItem[] } | null;
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(state?.projectDetails || null);
  const [items, setItems] = useState<InvoiceItem[]>(state?.items || []);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tempLayout, setTempLayout] = useState<InvoiceLayoutType>('technical');
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
        const targetW = 810; 
        const newScale = Math.min((screenW - 24) / targetW, 1);
        setScale(newScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!projectDetails || items.length === 0) {
      return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      );
  }

  const totalMaterialPrice = items.reduce<number>((acc, item) => acc + item.calculations.unitPrice, 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const finalPrice = totalMaterialPrice + installationCost;
  const todayJalali = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date(projectDetails.date));
  const invoiceConfig = settings?.invoice || { companyName: 'فروشگاه لومینا', companyPhone: '', companyAddress: '', footerNote: '' };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    
    const element = invoiceRef.current;
    
    const opt = {
      margin: 0,
      filename: `Invoice-${projectDetails.customerName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 }, 
      html2canvas: { 
        scale: 2.5, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        letterRendering: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 794,
        x: 0,
        y: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Generation Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSharePDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    
    const element = invoiceRef.current;
    const opt = {
      margin: 0,
      filename: `Invoice-${projectDetails.customerName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 }, 
      html2canvas: { 
        scale: 2.5, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        windowWidth: 794,
        x: 0,
        y: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
    };

    try {
      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      const file = new File([pdfBlob], `Invoice-${projectDetails.customerName}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'پیش‌فاکتور لومینا',
          text: `پیش‌فاکتور پروژه ${projectDetails.customerName}`,
        });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice-${projectDetails.customerName}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Sharing Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-300 flex flex-col items-center overflow-x-hidden relative font-['Vazirmatn']">
       <style>
         {`
           @media print {
             @page { size: A4; margin: 0; }
             .no-print { display: none !important; }
             .invoice-page { margin: 0 !important; width: 794px !important; box-shadow: none !important; height: auto !important; }
           }

           .invoice-page { 
             width: 794px !important; 
             min-height: 1123px !important; /* Minimum A4 height */
             height: auto !important; /* Allow growth to prevent footer clipping */
             background-color: #ffffff !important; 
             box-sizing: border-box;
             position: relative;
             overflow: visible; /* Changed from hidden to show all content */
             display: flex;
             flex-direction: column;
             margin: 0; 
             color: #1e293b !important;
             padding-bottom: 40px;
           }

           .invoice-page * {
             font-family: 'Vazirmatn', sans-serif !important;
             letter-spacing: 0 !important;
           }

           /* --- LAYOUT: TECHNICAL (NAVY) --- */
           .layout-technical .invoice-header { background: #0f172a !important; border-bottom: 8px solid #2563eb; padding: 40px; }
           .layout-technical .invoice-header h1 { color: #ffffff !important; }
           .layout-technical .invoice-header p, .layout-technical .invoice-header span { color: #cbd5e1 !important; }
           .layout-technical .invoice-table th { background: #1e293b !important; color: #ffffff !important; border: 1px solid #334155; }
           .layout-technical .total-box { background: #0f172a !important; padding: 40px; margin-top: auto; }
           .layout-technical .total-box * { color: #ffffff !important; }

           /* --- LAYOUT: MODERN --- */
           .layout-modern .invoice-header { padding: 50px; border-top: 15px solid #2563eb; background: #ffffff !important; }
           .layout-modern .invoice-header * { color: #1e293b !important; }
           .layout-modern .invoice-table th { border-bottom: 3px solid #2563eb; color: #0f172a !important; font-weight: 900; background: transparent !important; }
           .layout-modern .total-box { background: #f8fafc !important; border-radius: 40px; padding: 30px; margin: 20px 40px; border: 1px solid #e2e8f0; }
           .layout-modern .total-box * { color: #1e293b !important; }

           /* --- LAYOUT: STANDARD --- */
           .layout-standard .invoice-header { background: #f8fafc !important; border-bottom: 2px solid #e2e8f0; padding: 40px; }
           .layout-standard .invoice-header * { color: #1e293b !important; }
           .layout-standard .invoice-table th { background: #f1f5f9 !important; color: #334155 !important; border: 1px solid #e2e8f0; }
           .layout-standard .total-box { background: #f8fafc !important; padding: 30px; border-top: 2px solid #e2e8f0; }
           .layout-standard .total-box * { color: #1e293b !important; }

           /* --- LAYOUT: CLASSIC --- */
           .layout-classic { padding: 40px; }
           .layout-classic .invoice-page-inner { border: 1.5pt solid #000000; height: 100%; display: flex; flex-direction: column; background: #ffffff !important; }
           .layout-classic .invoice-header { text-align: center; border-bottom: 1.5pt solid #000000; padding: 20px; color: #000000 !important; }
           .layout-classic .invoice-header h1 { color: #000000 !important; }
           .layout-classic .invoice-table th, .layout-classic .invoice-table td { border: 0.8pt solid #000000 !important; color: #000000 !important; }
           .layout-classic .invoice-table th { background: #f2f2f2 !important; font-weight: 900; }
           .layout-classic .total-box { border-top: 1.5pt solid #000000; padding: 25px; background: #ffffff !important; color: #000000 !important; }
           .layout-classic .total-box * { color: #000000 !important; }

           .fee-column { color: #000000 !important; font-weight: 700 !important; opacity: 1 !important; }
         `}
       </style>

       {/* Control Bar - Mobile Optimized */}
       <div className="no-print fixed bottom-6 left-4 right-4 z-50 flex justify-center">
            <div className="bg-white/95 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-200 rounded-[2rem] p-2 w-full max-w-xl flex items-center gap-2">
                <button 
                  onClick={() => navigate(-1)} 
                  className="w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all shrink-0"
                >
                  <ArrowRight size={20} />
                </button>
                
                <button 
                    onClick={handleDownloadPDF}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white h-12 rounded-full font-black text-[11px] sm:text-xs shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all px-2"
                >
                    {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                    <span className="whitespace-nowrap">{isGenerating ? 'صبر کنید...' : 'چاپ فاکتور'}</span>
                </button>

                <div className="flex items-center gap-1.5 bg-slate-50 rounded-full px-2 h-12 border border-slate-100 min-w-[90px] sm:min-w-[130px] shrink-0">
                    <Settings2 size={16} className="text-blue-600 hidden sm:block" />
                    <select 
                        value={tempLayout} 
                        onChange={(e) => setTempLayout(e.target.value as any)}
                        className="bg-transparent border-none p-0 text-[10px] font-black text-slate-800 focus:ring-0 cursor-pointer outline-none w-full text-center"
                    >
                        <option value="technical">قالب فنی</option>
                        <option value="modern">قالب مدرن</option>
                        <option value="standard">قالب رسمی</option>
                        <option value="classic">قالب سنتی</option>
                    </select>
                </div>
            </div>
       </div>

       {/* Zoom & Share Controls */}
       <div className="no-print fixed top-6 right-6 z-50 flex flex-col gap-2">
            <button 
              onClick={handleSharePDF} 
              disabled={isGenerating}
              className="p-3.5 bg-emerald-600 shadow-xl rounded-2xl text-white hover:bg-emerald-700 active:scale-90 transition-all border border-emerald-500 disabled:opacity-50"
              title="اشتراک‌گذاری"
            >
              {isGenerating ? <Loader2 size={22} className="animate-spin" /> : <Share2 size={22}/>}
            </button>
            <div className="w-full h-px bg-slate-400 opacity-20 my-1"></div>
            <button onClick={() => setScale(s => Math.min(s + 0.1, 2.5))} className="p-3.5 bg-white shadow-xl rounded-2xl text-slate-700 hover:bg-slate-50 transition-all border border-slate-100 active:scale-90"><ZoomIn size={22}/></button>
            <button onClick={() => setScale(s => Math.max(s - 0.1, 0.2))} className="p-3.5 bg-white shadow-xl rounded-2xl text-slate-700 hover:bg-slate-50 transition-all border border-slate-100 active:scale-90"><ZoomOut size={22}/></button>
            <button onClick={() => setScale(1)} className="p-3.5 bg-blue-600 shadow-xl rounded-2xl text-white hover:bg-blue-700 active:scale-90 transition-all"><Maximize size={22}/></button>
       </div>

       {/* Invoice Preview Area */}
       <div ref={containerRef} className="w-full flex justify-center py-12 pb-44 overflow-x-auto scrollbar-hide">
            <div 
                className="relative shadow-[0_30px_100px_rgba(0,0,0,0.15)] origin-top transition-all duration-300"
                style={{ transform: `scale(${scale})`, width: '794px' }}
            >
                <div ref={invoiceRef} className={`invoice-page layout-${tempLayout}`}>
                    <div className="invoice-page-inner flex-1 flex flex-col">
                        
                        {/* HEADER */}
                        <div className="invoice-header px-10 pt-10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-3xl font-black mb-1 tracking-tighter">
                                        {invoiceConfig.companyName}
                                    </h1>
                                    <div className="text-[11px] font-bold opacity-90 mt-2 space-y-0.5">
                                        <p>{invoiceConfig.companyAddress}</p>
                                        <p>تماس: {toPersianDigits(invoiceConfig.companyPhone)}</p>
                                    </div>
                                </div>
                                <div className="text-left w-48">
                                    <div className={`text-center py-2 px-3 rounded-lg mb-4 font-black text-xs ${tempLayout === 'classic' ? 'border-2 border-black text-black' : 'bg-blue-600 text-white shadow-sm'}`}>
                                        پیش‌فاکتور فروش
                                    </div>
                                    <div className={`space-y-1 text-[10px] font-black ${tempLayout === 'technical' ? 'text-white' : 'text-slate-700'}`}>
                                        <div className="flex justify-between border-b border-current/10 pb-0.5">
                                            <span>تاریخ صدور:</span>
                                            <span>{todayJalali}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>شماره فاکتور:</span>
                                            <span>{toPersianDigits(projectDetails.id.slice(-6))}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CUSTOMER INFO */}
                        <div className="px-10 py-5">
                            <div className={`grid grid-cols-2 gap-8 p-6 ${tempLayout === 'modern' ? 'bg-slate-50 border border-slate-200 rounded-3xl' : tempLayout === 'classic' ? 'border-2 border-black' : 'border border-slate-200 rounded-xl'}`}>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-widest">خریدار محترم:</span>
                                    <div className="text-xl font-black text-slate-900">{projectDetails.customerName}</div>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-widest">محل اجرای پروژه:</span>
                                    <div className="text-[11px] font-bold leading-relaxed text-slate-700">{projectDetails.address || 'ثبت نشده است'}</div>
                                </div>
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="flex-1 px-10">
                            <table className="invoice-table w-full border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black">
                                        <th className="p-3 w-10 text-center">ردیف</th>
                                        <th className="p-3 w-40 text-center">نقشه فنی</th>
                                        <th className="p-3">ریز محاسبات و اقلام مصرفی</th>
                                        <th className="p-3 w-36 text-left">مجموع واحد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => {
                                        const brand = BRANDS.find(b => b.id === item.config.profileId);
                                        return (
                                            <tr key={index} className="break-inside-avoid">
                                                <td className="p-3 text-center font-black text-[10px] text-slate-500">
                                                    {toPersianDigits(index + 1)}
                                                </td>
                                                <td className="p-3 align-top">
                                                    <div className={`unit-card aspect-square bg-white flex items-center justify-center p-2 border ${tempLayout === 'modern' ? 'rounded-xl border-slate-100' : tempLayout === 'classic' ? 'border-black' : 'border-slate-200'}`}>
                                                        <WindowPreview config={item.config} width="100%" height="100%" />
                                                    </div>
                                                    <div className="text-center mt-2 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                        {toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)} mm
                                                    </div>
                                                </td>
                                                <td className="p-3 align-top">
                                                    <div className="mb-2 flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${tempLayout === 'technical' ? 'bg-blue-600 text-white border-none' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                                            {brand?.name}
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-800">{item.config.type}</span>
                                                    </div>
                                                    <div className="w-full">
                                                        <div className="flex justify-between text-[8px] font-black text-slate-400 border-b pb-1 mb-1">
                                                            <span className="flex-1 uppercase tracking-tighter">شرح کالا / متریال مصرفی</span>
                                                            <div className="flex gap-4 w-[240px] justify-end">
                                                                <span className="w-20 text-center">مقدار</span>
                                                                <span className="w-20 text-center">فی</span>
                                                                <span className="w-20 text-left">جمع</span>
                                                            </div>
                                                        </div>
                                                        {item.calculations.details?.map((detail, dIdx) => (
                                                            <div key={dIdx} className="flex justify-between text-[10px] py-0.5 border-b border-slate-50 last:border-0">
                                                                <span className="flex-1 font-bold text-slate-700">{detail.name}</span>
                                                                <div className="flex gap-4 w-[240px] justify-end">
                                                                    <span className="w-20 text-center font-black text-slate-900">{toPersianDigits(detail.quantity)} {detail.unit}</span>
                                                                    <span className="w-20 text-center fee-column tracking-tighter">{formatPrice(detail.unitPrice)}</span>
                                                                    <span className="w-20 text-left font-black text-slate-900 tracking-tighter">{formatPrice(detail.totalPrice)}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className={`p-3 align-top text-left font-black text-base text-slate-900 ${tempLayout === 'technical' ? 'bg-slate-50/50' : ''}`}>
                                                    {formatPrice(item.calculations.totalPrice)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* FOOTER */}
                        <div className="total-box mt-10">
                            <div className="flex justify-between items-start gap-10">
                                <div className="flex-1">
                                    <h4 className="text-[9px] font-black uppercase tracking-[2px] mb-2 opacity-60">توضیحات فاکتور:</h4>
                                    <p className="text-[10px] leading-relaxed text-justify font-medium">
                                        {invoiceConfig.footerNote || 'اعتبار این پیش‌فاکتور ۷۲ ساعت می‌باشد.'}
                                    </p>
                                    <div className="mt-12 flex justify-between items-center px-4">
                                        <div className="text-center">
                                            <div className="w-32 h-px bg-current opacity-20 mb-2"></div>
                                            <span className="text-[8px] font-black opacity-60 uppercase tracking-widest">مهر و امضا</span>
                                        </div>
                                        {tempLayout === 'classic' && <div className="text-black font-black text-sm border-2 border-black p-2 rounded-full opacity-20 rotate-12">STAMP</div>}
                                        <div className="text-center">
                                            <div className="w-32 h-px bg-current opacity-20 mb-2"></div>
                                            <span className="text-[8px] font-black opacity-60 uppercase tracking-widest">تایید خریدار</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-72 space-y-3">
                                    <div className="flex justify-between text-xs font-bold opacity-70">
                                        <span>جمع کل متریال:</span>
                                        <span className="font-black">{formatPrice(totalMaterialPrice)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold opacity-70">
                                        <span>هزینه نصب ({toPersianDigits(projectDetails.installPercent)}٪):</span>
                                        <span className="font-black">{formatPrice(installationCost)}</span>
                                    </div>
                                    <div className="h-px bg-current opacity-10 my-1"></div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-black mb-1 opacity-80">مبلغ نهایی فاکتور:</span>
                                        <div className="text-left">
                                            <div className="text-4xl font-black tracking-tighter leading-none">{formatPrice(finalPrice)}</div>
                                            <span className="text-[9px] font-black opacity-40 mt-1 block uppercase">Toman / تومان</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};
