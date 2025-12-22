
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, ChevronLeft, MapPin, Phone, ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem, AppSettings } from '../types';
import { BRANDS } from '../constants';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';

const cleanDescription = (text: string) => text.replace(/\s*\(.*?\)\s*/g, '').trim();

export const PriceBreakdown = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { projectDetails: ProjectDetails, items: InvoiceItem[] } | null;
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(state?.projectDetails || null);
  const [items, setItems] = useState<InvoiceItem[]>(state?.items || []);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    setSettings(pricingStore.getSettings());
  }, []);

  if (!projectDetails || items.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center p-6 text-center">
        <p className="text-slate-500 font-bold">پروژه معتبری یافت نشد.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-600 font-bold underline">بازگشت</button>
      </div>
    );
  }

  const totalMaterial = items.reduce((acc, item) => acc + item.calculations.unitPrice, 0);
  const installCost = Math.round(totalMaterial * (projectDetails.installPercent / 100));
  const finalTotal = totalMaterial + installCost;
  const jalaliDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date(projectDetails.date));
  
  const invoiceConfig = settings?.invoice || { 
    companyName: 'گروه لومینا', 
    companyPhone: '', 
    companyAddress: '', 
    footerNote: '' 
  };

  const handlePrint = () => {
    const viewport = document.getElementById('viewport');
    const originalContent = viewport?.getAttribute('content') || '';

    // Step 1: Force Desktop Scale on Mobile
    if (viewport) {
      viewport.setAttribute('content', 'width=1024');
    }

    // Step 2: Trigger Print
    setTimeout(() => {
      window.print();
      
      // Step 3: Restore Viewport
      setTimeout(() => {
        if (viewport) {
          viewport.setAttribute('content', originalContent);
        }
      }, 1000);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      
      {/* --- SCREEN ONLY VIEW: MOBILE SUMMARY --- */}
      <div className="no-print pb-32">
        <header className="bg-white px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 z-10 shadow-sm border-b border-slate-100">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-50 rounded-xl text-slate-700">
            <ChevronLeft size={24} className="rotate-180" />
          </button>
          <h1 className="text-lg font-black text-slate-900">مشاهده فاکتور</h1>
          <button onClick={handlePrint} className="p-2 bg-[#001f3f] text-white rounded-xl shadow-lg active:scale-95 transition-all">
            <Printer size={20} />
          </button>
        </header>

        <div className="p-6 space-y-4">
           {items.map((item, idx) => (
             <div key={item.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                    <WindowPreview config={item.config} width="32px" height="32px" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">
                      {toPersianDigits(idx + 1)}. {BRANDS.find(b => b.id === item.config.profileId)?.name} — {item.config.type}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)} mm</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900">{formatPrice(item.calculations.totalPrice)}</span>
                  <span className="text-[10px] text-slate-400 block font-bold">تومان</span>
                </div>
             </div>
           ))}
        </div>

        {/* Floating Grand Total Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-6 z-20">
          <div className="bg-[#001f3f] text-white p-5 rounded-3xl shadow-2xl flex justify-between items-center print:hidden">
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Total Payable / مجموع نهایی</p>
              <h2 className="text-2xl font-black">{formatPrice(finalTotal)} <span className="text-xs font-normal opacity-50">تومان</span></h2>
            </div>
            <button onClick={handlePrint} className="bg-white text-[#001f3f] p-3 rounded-2xl font-black text-sm flex items-center gap-2 active:scale-95 transition-all">
               <Printer size={18} /> چاپ
            </button>
          </div>
        </div>
      </div>

      {/* --- PRINT ONLY VIEW: DESKTOP A4 INVOICE --- */}
      <div className="hidden print:block print-invoice-wrapper bg-white">
        
        {/* Navy Header */}
        <div className="bg-[#001f3f] text-white p-16 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tight uppercase">{invoiceConfig.companyName}</h1>
            <div className="flex gap-8 text-sm opacity-80 font-bold">
              <span className="flex items-center gap-2"><Phone size={14}/> {toPersianDigits(invoiceConfig.companyPhone)}</span>
              <span className="flex items-center gap-2"><MapPin size={14}/> {invoiceConfig.companyAddress}</span>
            </div>
          </div>
          <div className="text-left">
            <div className="text-5xl font-light opacity-20 mb-2">INVOICE</div>
            <div className="text-xl font-black tracking-widest">#{toPersianDigits(projectDetails.id.slice(-6))}</div>
            <div className="text-[10px] font-black opacity-60 uppercase mt-1">{jalaliDate}</div>
          </div>
        </div>

        <div className="p-16">
          {/* Customer Metadata Block */}
          <div className="flex justify-between items-start mb-16 pb-8 border-b-2 border-slate-100">
            <div>
              <span className="text-[10px] font-black text-[#001f3f] uppercase tracking-widest block mb-2 opacity-50">Client / مشتری</span>
              <h2 className="text-2xl font-black text-slate-800">{projectDetails.customerName}</h2>
              <p className="text-sm text-slate-500 font-bold mt-1">{projectDetails.address}</p>
            </div>
          </div>

          {/* Items detailed breakdown */}
          <div className="space-y-12">
            {items.map((item, idx) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#001f3f] text-white rounded-xl flex items-center justify-center font-black text-lg">
                      {toPersianDigits(idx + 1)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">
                        {BRANDS.find(b => b.id === item.config.profileId)?.name} — {item.config.type}
                      </h3>
                      <p className="text-xs text-slate-400 font-bold">ابعاد یونیت: {toPersianDigits(item.config.width)} در {toPersianDigits(item.config.height)} میلی‌متر</p>
                    </div>
                  </div>
                  <div className="font-black text-2xl text-[#001f3f]">
                    {formatPrice(item.calculations.totalPrice)} <span className="text-xs font-bold">تومان</span>
                  </div>
                </div>

                {/* Professional BOM Table */}
                <table className="w-full text-xs text-slate-700">
                  <thead>
                    <tr className="bg-[#001f3f] text-white">
                      <th className="p-3 w-[8%] text-center font-black border-l border-white/20">#</th>
                      <th className="p-3 w-[45%] text-right font-black border-l border-white/20">شرح متریال و خدمات</th>
                      <th className="p-3 w-[12%] text-center font-black border-l border-white/20">مقدار</th>
                      <th className="p-3 w-[10%] text-center font-black border-l border-white/20">واحد</th>
                      <th className="p-3 w-[12%] text-center font-black border-l border-white/20">فی (ت)</th>
                      <th className="p-3 w-[13%] text-center font-black">جمع (ت)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.calculations.details.map((detail, dIdx) => (
                      <tr key={dIdx} className="border-b border-slate-100">
                        <td className="p-3 text-center text-slate-400 font-bold border-l border-slate-50">{toPersianDigits(dIdx + 1)}</td>
                        <td className="p-3 text-right font-black text-slate-700 border-l border-slate-50">{cleanDescription(detail.name)}</td>
                        <td className="p-3 text-center font-bold border-l border-slate-50">{toPersianDigits(detail.quantity)}</td>
                        <td className="p-3 text-center text-slate-500 border-l border-slate-50">{detail.unit}</td>
                        <td className="p-3 text-center text-slate-500 border-l border-slate-50">{formatPrice(detail.unitPrice)}</td>
                        <td className="p-3 text-center font-black text-[#001f3f]">{formatPrice(detail.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Totals Summary for Print */}
          <div className="mt-16 bg-slate-50 p-12 rounded-[40px] flex justify-end">
            <div className="w-96 space-y-4">
               <div className="flex justify-between text-sm font-bold text-slate-500">
                 <span>جمع کل متریال مصرفی</span>
                 <span>{formatPrice(totalMaterial)}</span>
               </div>
               <div className="flex justify-between text-sm font-bold text-slate-500">
                 <span>هزینه نصب و بالابری ({toPersianDigits(projectDetails.installPercent)}٪)</span>
                 <span>{formatPrice(installCost)}</span>
               </div>
               <div className="h-px bg-slate-200"></div>
               <div className="bg-[#001f3f] text-white p-8 rounded-3xl flex justify-between items-center shadow-xl">
                 <span className="font-black text-xl">مبلغ کل فاکتور</span>
                 <div className="text-right">
                    <span className="text-3xl font-black">{formatPrice(finalTotal)}</span>
                    <span className="text-[10px] block font-bold opacity-50 uppercase tracking-widest mt-1">TOMAN / تومان</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="mt-20 pt-10 border-t border-slate-100 text-[10px] text-slate-400 font-bold leading-relaxed">
             {invoiceConfig.footerNote}
          </div>
        </div>
      </div>

    </div>
  );
};
