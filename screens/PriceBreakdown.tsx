
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, ChevronLeft, MapPin, Phone, DownloadCloud, FileText } from 'lucide-react';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem, AppSettings } from '../types';
import { BRANDS } from '../constants';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';

// حذف پرانتزها برای گزارش رسمی
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

    // تزریق ویوپورت دسکتاپ برای رندر صحیح در موبایل پیش از چاپ
    if (viewport) {
      viewport.setAttribute('content', 'width=1024');
    }

    // تاخیر کوتاه برای اعمال تغییرات لایوت
    setTimeout(() => {
      window.print();
      
      // بازگرداندن ویوپورت به حالت موبایل
      setTimeout(() => {
        if (viewport) {
          viewport.setAttribute('content', originalContent);
        }
      }, 1000);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      
      {/* --- بخش نمایش در موبایل (Screen Summary) --- */}
      <div className="no-print pb-40">
        <header className="bg-white px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-slate-100">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-50 rounded-xl text-slate-700">
            <ChevronLeft size={24} className="rotate-180" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black text-slate-900">خلاصه فاکتور</h1>
            <p className="text-[10px] text-slate-400 font-bold">{projectDetails.customerName}</p>
          </div>
          <button onClick={handlePrint} className="p-2 bg-[#001f3f] text-white rounded-xl shadow-lg active:scale-95 transition-all">
            <Printer size={20} />
          </button>
        </header>

        <div className="p-6 space-y-6">
           {items.map((item, idx) => (
             <div key={item.id} className="bg-white rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/50 border border-white">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="bg-slate-900 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black">
                            {toPersianDigits(idx + 1)}
                        </div>
                        <div className="text-right">
                            <h3 className="font-black text-slate-900 text-lg">
                                {BRANDS.find(b => b.id === item.config.profileId)?.name}
                            </h3>
                            <p className="text-xs text-slate-400 font-bold">{item.config.type}</p>
                        </div>
                    </div>
                    
                    {/* تصویر پنجره با سایز بزرگتر برای نمایش جزئیات */}
                    <div className="bg-slate-50 rounded-3xl p-8 mb-6 border border-slate-100 flex items-center justify-center min-h-[280px]">
                        <WindowPreview config={item.config} width="100%" height="220px" />
                    </div>

                    <div className="flex justify-between items-end bg-slate-50 p-5 rounded-2xl">
                        <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-1">Dimensions / ابعاد</p>
                            <p className="font-black text-slate-700">{toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)} <span className="text-[10px]">mm</span></p>
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-1">Item Total / قیمت واحد</p>
                            <p className="text-2xl font-black text-[#001f3f]">{formatPrice(item.calculations.totalPrice)} <span className="text-xs font-normal">تومان</span></p>
                        </div>
                    </div>
                </div>
             </div>
           ))}
        </div>

        {/* نوار نهایی قیمت به رنگ سرمه‌ای تیره */}
        <div className="fixed bottom-0 left-0 right-0 p-6 z-40">
          <div className="bg-[#001f3f] text-white p-6 rounded-[32px] shadow-2xl flex justify-between items-center ring-4 ring-white/10">
            <div>
              <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Total Amount / مبلغ کل قابل پرداخت</p>
              <h2 className="text-3xl font-black">{formatPrice(finalTotal)} <span className="text-sm font-normal opacity-50">تومان</span></h2>
            </div>
            <button 
                onClick={handlePrint} 
                className="bg-white text-[#001f3f] px-6 py-4 rounded-2xl font-black text-sm flex items-center gap-2 active:scale-95 transition-all shadow-xl"
            >
               <DownloadCloud size={20} /> دریافت PDF
            </button>
          </div>
        </div>
      </div>

      {/* --- بخش مخصوص چاپ (Print Only View) --- */}
      <div className="hidden print:block print-invoice-wrapper bg-white">
        
        {/* هدر رسمی سرمه‌ای */}
        <div className="bg-[#001f3f] text-white p-16 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tight uppercase">{invoiceConfig.companyName}</h1>
            <div className="flex gap-8 text-sm opacity-80 font-bold">
              <span className="flex items-center gap-2"><Phone size={14}/> {toPersianDigits(invoiceConfig.companyPhone)}</span>
              <span className="flex items-center gap-2"><MapPin size={14}/> {invoiceConfig.companyAddress}</span>
            </div>
          </div>
          <div className="text-left">
            <div className="text-5xl font-light opacity-20 mb-2 tracking-tighter">INVOICE</div>
            <div className="text-xl font-black tracking-widest">#{toPersianDigits(projectDetails.id.slice(-6))}</div>
            <div className="text-[10px] font-black opacity-60 uppercase mt-1 tracking-widest">{jalaliDate}</div>
          </div>
        </div>

        <div className="p-16">
          {/* اطلاعات مشتری */}
          <div className="flex justify-between items-start mb-16 pb-10 border-b-2 border-slate-100">
            <div>
              <span className="text-[10px] font-black text-[#001f3f] uppercase tracking-widest block mb-2 opacity-50">Customer / مشتری گرامی</span>
              <h2 className="text-3xl font-black text-slate-800">{projectDetails.customerName}</h2>
              <p className="text-base text-slate-500 font-bold mt-2">{projectDetails.address}</p>
            </div>
            <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">Total Items</span>
                <span className="text-2xl font-black text-slate-800">{toPersianDigits(items.length)}</span>
            </div>
          </div>

          {/* لیست اقلام با جداول BOM تفصیلی */}
          <div className="space-y-16">
            {items.map((item, idx) => (
              <div key={item.id} className="break-inside-avoid border-b border-slate-100 pb-12 last:border-0">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-[#001f3f] text-white rounded-2xl flex items-center justify-center font-black text-xl">
                      {toPersianDigits(idx + 1)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">
                        {BRANDS.find(b => b.id === item.config.profileId)?.name} — {item.config.type}
                      </h3>
                      <p className="text-sm text-slate-400 font-bold">ابعاد تولیدی: {toPersianDigits(item.config.width)} در {toPersianDigits(item.config.height)} میلی‌متر</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Unit Price</p>
                    <div className="font-black text-3xl text-[#001f3f]">
                        {formatPrice(item.calculations.totalPrice)} <span className="text-sm font-bold">تومان</span>
                    </div>
                  </div>
                </div>

                {/* جدول استاندارد BOM بدون پرانتز */}
                <table className="w-full text-[11px] text-slate-700 border-collapse">
                  <thead>
                    <tr className="bg-[#001f3f] text-white print:print-color-adjust-exact">
                      <th className="p-4 w-[6%] text-center font-black border-l border-white/10">ردیف</th>
                      <th className="p-4 w-[46%] text-right font-black border-l border-white/10">شرح دقیق متریال (پروفیل، شیشه، یراق)</th>
                      <th className="p-4 w-[12%] text-center font-black border-l border-white/10">مقدار</th>
                      <th className="p-4 w-[10%] text-center font-black border-l border-white/10">واحد</th>
                      <th className="p-4 w-[13%] text-center font-black border-l border-white/10">فی (تومان)</th>
                      <th className="p-4 w-[13%] text-center font-black">جمع کل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.calculations.details.map((detail, dIdx) => (
                      <tr key={dIdx} className="border-b border-slate-100 even:bg-slate-50/50">
                        <td className="p-3 text-center text-slate-400 font-bold border-l border-slate-50">{toPersianDigits(dIdx + 1)}</td>
                        <td className="p-3 text-right font-black text-slate-800 border-l border-slate-50">{cleanDescription(detail.name)}</td>
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

          {/* فوتر فاکتور با جمع‌بندی نهایی */}
          <div className="mt-16 bg-slate-50 p-12 rounded-[48px] border border-slate-100 flex justify-end">
            <div className="w-[400px] space-y-5">
               <div className="flex justify-between text-sm font-bold text-slate-500 px-4">
                 <span>جمع کل متریال مصرفی</span>
                 <span>{formatPrice(totalMaterial)}</span>
               </div>
               <div className="flex justify-between text-sm font-bold text-slate-500 px-4">
                 <span>هزینه نصب و بالابری ({toPersianDigits(projectDetails.installPercent)}٪)</span>
                 <span>{formatPrice(installCost)}</span>
               </div>
               <div className="h-0.5 bg-slate-200/50 mx-4"></div>
               <div className="bg-[#001f3f] text-white p-10 rounded-[32px] flex justify-between items-center shadow-2xl print:print-color-adjust-exact">
                 <span className="font-black text-xl">مبلغ نهایی فاکتور</span>
                 <div className="text-right">
                    <span className="text-4xl font-black">{formatPrice(finalTotal)}</span>
                    <span className="text-[10px] block font-bold opacity-50 uppercase tracking-widest mt-2">TOMAN / تومان</span>
                 </div>
               </div>
            </div>
          </div>

          {/* توضیحات تکمیلی */}
          <div className="mt-20 pt-10 border-t border-slate-100 text-[10px] text-slate-400 font-bold leading-relaxed max-w-3xl">
             <div className="flex items-center gap-2 mb-2 text-[#001f3f] opacity-50">
                <FileText size={14} />
                <span className="uppercase tracking-widest">Notes & Terms / توضیحات</span>
             </div>
             {invoiceConfig.footerNote}
          </div>
        </div>
      </div>

    </div>
  );
};
