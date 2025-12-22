
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Share2, Printer, Home, Edit2, Trash2, ChevronLeft, Download, Loader2, Plus, FileText, Check, Phone, MapPin, Building2 } from 'lucide-react';
import { PrimaryButton, InputField } from '../components/UIComponents';
import { WindowPreview } from '../components/WindowPreview';
import { ProjectDetails, InvoiceItem, AppSettings, InvoiceLayoutType } from '../types';
import { BRANDS } from '../constants';
import { toPersianDigits, formatPrice, toEnglishDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface MiscItem {
    id: string;
    name: string;
    price: number;
}

export const PriceBreakdown = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { projectDetails: ProjectDetails, items: InvoiceItem[] } | null;
  
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(locationState?.projectDetails || null);
  const [items, setItems] = useState<InvoiceItem[]>(locationState?.items || []);
  const [miscItems, setMiscItems] = useState<MiscItem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  
  const [showAddMisc, setShowAddMisc] = useState(false);
  const [newMiscName, setNewMiscName] = useState('');
  const [newMiscPrice, setNewMiscPrice] = useState('');

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     setSettings(pricingStore.getSettings());
  }, []);

  if (!projectDetails || items.length === 0) {
      return (
          <div className="h-screen flex items-center justify-center flex-col gap-4 bg-slate-50 text-slate-700">
              <p>هیچ آیتمی یافت نشد.</p>
              <button onClick={() => navigate('/dashboard')} className="text-blue-500 flex items-center gap-2">
                 <Home size={18} /> بازگشت به خانه
              </button>
          </div>
      )
  }

  const handleEditProject = () => {
    navigate('/project-setup', { state: { projectDetails, isEdit: true } });
  };

  const handleEditItem = (index: number) => {
    navigate('/designer', { state: { projectDetails, items, editIndex: index } });
  };

  const handleDeleteItem = (index: number) => {
    if (window.confirm('آیا از حذف این آیتم از فاکتور مطمئن هستید؟')) {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
      const projectToSave = {
        ...projectDetails,
        items: updatedItems,
        totalPrice: updatedItems.reduce((acc, item) => acc + item.calculations.totalPrice, 0),
      };
      pricingStore.saveProject(projectToSave);
      if (updatedItems.length === 0) navigate('/projects');
    }
  };

  const handleAddMiscItem = () => {
      if(!newMiscName || !newMiscPrice) return;
      const newItem = {
          id: Date.now().toString(),
          name: newMiscName,
          price: Number(toEnglishDigits(newMiscPrice))
      };
      setMiscItems([...miscItems, newItem]);
      setNewMiscName('');
      setNewMiscPrice('');
      setShowAddMisc(false);
  };

  const handleDeleteMisc = (id: string) => {
      setMiscItems(miscItems.filter(m => m.id !== id));
  };

  const totalMaterialPrice = items.reduce((acc, item) => acc + item.calculations.unitPrice, 0);
  const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
  const miscTotal = miscItems.reduce((acc, m) => acc + m.price, 0);
  const finalPrice = totalMaterialPrice + installationCost + miscTotal;
  const todayJalali = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date(projectDetails.date));
  const invoiceConfig = settings?.invoice || { companyName: 'فروشگاه لومینا', companyPhone: '', companyAddress: '', footerNote: '', layoutType: 'standard' as InvoiceLayoutType };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingPdf(true);
    
    try {
        await document.fonts.ready;
        await new Promise(resolve => setTimeout(resolve, 800)); // Increased wait for images

        const canvas = await toPng(invoiceRef.current, {
            cacheBust: true,
            pixelRatio: 2.5, // Better quality
            backgroundColor: invoiceConfig.layoutType === 'classic' ? '#fffdf5' : '#ffffff',
            filter: (node) => !node.classList?.contains('no-print')
        });

        const img = new Image();
        img.src = canvas;
        await new Promise((resolve) => { img.onload = resolve; });

        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (img.height * imgWidth) / img.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`Factor-${projectDetails.customerName}.pdf`);

    } catch (err) {
        console.error("PDF Failed:", err);
        alert("خطا در تولید PDF.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => window.print();
  
  const handleShare = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: `فاکتور ${projectDetails.customerName}`,
                text: `مبلغ: ${formatPrice(finalPrice)} تومان`,
                url: window.location.href
            });
        } catch (e) {}
    }
  };

  // --- RENDERERS FOR DIFFERENT LAYOUTS ---

  const renderStandardLayout = () => (
    <div className="bg-white min-h-[1100px] relative font-sans text-slate-800">
        {/* Header Curve */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-b-[50px] overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>
        
        <div className="relative p-10 pt-12 z-10">
            {/* Header Content */}
            <div className="flex justify-between items-start text-white mb-12">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black tracking-tight">{invoiceConfig.companyName}</h1>
                    <div className="flex items-center gap-2 text-blue-100 text-sm">
                        <MapPin size={14} /> {invoiceConfig.companyAddress}
                    </div>
                    <div className="flex items-center gap-2 text-blue-100 text-sm">
                        <Phone size={14} /> {toPersianDigits(invoiceConfig.companyPhone)}
                    </div>
                </div>
                <div className="text-left bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                    <div className="text-xs text-blue-200 uppercase tracking-widest mb-1">پیش فاکتور</div>
                    <div className="text-2xl font-bold mb-1">{toPersianDigits(projectDetails.id.slice(-6))}#</div>
                    <div className="text-sm font-medium opacity-90">{todayJalali}</div>
                </div>
            </div>

            {/* Customer Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-slate-100 p-6 mb-10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold mb-1">مشخصات خریدار</div>
                        <div className="text-lg font-bold text-slate-800">{projectDetails.customerName}</div>
                    </div>
                </div>
                <div className="text-left">
                     <div className="text-xs text-slate-400 font-bold mb-1">محل پروژه</div>
                     <div className="text-sm font-medium text-slate-600 max-w-xs">{projectDetails.address || '---'}</div>
                </div>
            </div>

            {/* Table */}
            <div className="mb-8">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 rounded-xl text-slate-500 text-xs font-bold uppercase mb-4">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-5 text-right pr-4">شرح کالا / خدمات</div>
                    <div className="col-span-3 text-center">نمای فنی</div>
                    <div className="col-span-3 text-center">قیمت کل</div>
                </div>

                <div className="space-y-4">
                    {items.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-12 gap-4 items-center p-4 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors bg-white shadow-sm">
                            <div className="col-span-1 text-center font-bold text-slate-300">{toPersianDigits(idx + 1)}</div>
                            <div className="col-span-5">
                                <h3 className="font-bold text-slate-800 text-lg mb-1">{BRANDS.find(b => b.id === item.config.profileId)?.name} - {item.config.type}</h3>
                                <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 mb-3">
                                    <span className="bg-slate-100 px-2 py-1 rounded-md">عرض: {toPersianDigits(item.config.width)}</span>
                                    <span className="bg-slate-100 px-2 py-1 rounded-md">ارتفاع: {toPersianDigits(item.config.height)}</span>
                                </div>
                                <div className="space-y-1 pl-4 border-r-2 border-slate-100 pr-2">
                                     {item.calculations.details.map((d, i) => (
                                         <div key={i} className="flex justify-between text-[11px] text-slate-500">
                                             <span>{d.name} ({toPersianDigits(d.quantity)})</span>
                                             <span className="font-medium text-slate-700">{formatPrice(d.totalPrice)}</span>
                                         </div>
                                     ))}
                                </div>
                                <div className="flex gap-2 mt-2 no-print">
                                    <button onClick={() => handleEditItem(idx)} className="text-blue-500 text-xs">ویرایش</button>
                                    <button onClick={() => handleDeleteItem(idx)} className="text-red-500 text-xs">حذف</button>
                                </div>
                            </div>
                            <div className="col-span-3 flex justify-center p-2 bg-slate-50 rounded-xl">
                                <WindowPreview config={item.config} width="100%" height="120px" />
                            </div>
                            <div className="col-span-3 text-center font-black text-xl text-slate-800">
                                {formatPrice(item.calculations.totalPrice)}
                            </div>
                        </div>
                    ))}
                    {miscItems.map((m, i) => (
                        <div key={m.id} className="grid grid-cols-12 gap-4 items-center p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                             <div className="col-span-1 text-center font-bold text-slate-300">*</div>
                             <div className="col-span-8 font-bold text-slate-700 pr-4 flex items-center gap-2">
                                {m.name}
                                <button onClick={() => handleDeleteMisc(m.id)} className="text-red-400 no-print"><Trash2 size={12}/></button>
                             </div>
                             <div className="col-span-3 text-center font-bold text-slate-800">{formatPrice(m.price)}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-900 text-white rounded-3xl p-8 flex flex-col md:flex-row justify-between items-start gap-8 shadow-2xl shadow-slate-900/20">
                <div className="flex-1">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-3">توضیحات فاکتور</div>
                    <p className="text-sm text-slate-300 leading-relaxed text-justify">{invoiceConfig.footerNote}</p>
                </div>
                <div className="w-full md:w-72 space-y-4">
                    <div className="flex justify-between text-sm text-slate-400">
                        <span>جمع متریال</span>
                        <span>{formatPrice(totalMaterialPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-400">
                        <span>نصب و اجرا</span>
                        <span>{formatPrice(installationCost)}</span>
                    </div>
                    {miscItems.length > 0 && (
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>سایر موارد</span>
                            <span>{formatPrice(miscTotal)}</span>
                        </div>
                    )}
                    <div className="h-px bg-slate-700 my-2"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">مبلغ نهایی</span>
                        <div className="text-right">
                             <div className="text-2xl font-black text-blue-400">{formatPrice(finalPrice)}</div>
                             <div className="text-[10px] text-slate-500">تومان</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="text-center mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
                Designed by Lumina
            </div>
        </div>
    </div>
  );

  const renderModernLayout = () => (
    <div className="bg-white min-h-[1100px] text-black font-sans selection:bg-black selection:text-white">
        <div className="p-12">
            {/* Header */}
            <div className="flex justify-between items-end mb-16 border-b-[3px] border-black pb-8">
                <div>
                    <h1 className="text-6xl font-black uppercase tracking-tighter leading-none mb-4">{invoiceConfig.companyName}</h1>
                    <div className="flex gap-6 text-sm font-bold uppercase tracking-widest">
                        <span>{toPersianDigits(invoiceConfig.companyPhone)}</span>
                        <span>//</span>
                        <span>{todayJalali}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-light mb-1">INVOICE</div>
                    <div className="text-xl font-bold">#{toPersianDigits(projectDetails.id.slice(-6))}</div>
                </div>
            </div>

            {/* Info Block */}
            <div className="grid grid-cols-2 gap-12 mb-16">
                 <div>
                     <div className="text-xs font-black uppercase tracking-widest mb-4 border-b border-black pb-2 w-20">به سفارش</div>
                     <div className="text-2xl font-bold mb-2">{projectDetails.customerName}</div>
                     <div className="text-sm text-gray-500 font-medium">{projectDetails.address}</div>
                 </div>
                 <div className="text-left">
                     <div className="text-xs font-black uppercase tracking-widest mb-4 border-b border-black pb-2 ml-auto w-20">توضیحات</div>
                     <div className="text-sm text-gray-500 font-medium leading-relaxed dir-rtl text-right">{invoiceConfig.footerNote}</div>
                 </div>
            </div>

            {/* Table */}
            <div className="mb-16">
                 {items.map((item, idx) => (
                     <div key={item.id} className="group border-b border-gray-100 py-8 hover:bg-gray-50 transition-colors px-4 -mx-4">
                         <div className="flex justify-between items-start mb-6">
                             <div className="flex gap-6 items-baseline">
                                 <span className="text-xs font-black text-gray-300 w-6">{(idx+1).toString().padStart(2, '0')}</span>
                                 <div>
                                     <h3 className="text-2xl font-bold mb-1">{BRANDS.find(b => b.id === item.config.profileId)?.name}</h3>
                                     <div className="text-sm font-medium text-gray-400">{item.config.type} — {toPersianDigits(item.config.width)}×{toPersianDigits(item.config.height)}</div>
                                 </div>
                             </div>
                             <div className="text-xl font-black">{formatPrice(item.calculations.totalPrice)}</div>
                         </div>
                         
                         <div className="grid grid-cols-12 gap-8">
                             <div className="col-span-8 grid grid-cols-2 gap-x-8 gap-y-2">
                                 {item.calculations.details.map((d, i) => (
                                     <div key={i} className="flex justify-between text-xs border-b border-gray-100 pb-1">
                                         <span className="font-bold text-gray-600">{d.name} <span className="text-gray-400 font-normal">({toPersianDigits(d.quantity)})</span></span>
                                         <span className="font-mono text-gray-400">{formatPrice(d.totalPrice)}</span>
                                     </div>
                                 ))}
                                 <div className="col-span-2 flex gap-2 mt-4 no-print">
                                    <button onClick={() => handleEditItem(idx)} className="text-xs font-bold underline">EDIT</button>
                                    <button onClick={() => handleDeleteItem(idx)} className="text-xs font-bold text-red-500 underline">REMOVE</button>
                                </div>
                             </div>
                             <div className="col-span-4 flex justify-center items-center bg-gray-50 rounded-lg p-4 grayscale group-hover:grayscale-0 transition-all">
                                 <WindowPreview config={item.config} width="100%" height="100px" />
                             </div>
                         </div>
                     </div>
                 ))}
                 {miscItems.map((m, i) => (
                     <div key={m.id} className="flex justify-between items-center py-6 border-b border-black">
                         <div className="flex gap-6 items-center">
                             <span className="text-xs font-black text-gray-300 w-6">+</span>
                             <span className="text-lg font-bold">{m.name}</span>
                             <button onClick={() => handleDeleteMisc(m.id)} className="text-red-400 no-print"><Trash2 size={12}/></button>
                         </div>
                         <div className="text-lg font-bold">{formatPrice(m.price)}</div>
                     </div>
                 ))}
            </div>

            {/* Total */}
            <div className="flex justify-end">
                <div className="w-1/2">
                    <div className="flex justify-between text-sm font-medium mb-2">
                        <span>SUBTOTAL</span>
                        <span>{formatPrice(totalMaterialPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium mb-6">
                        <span>INSTALLATION</span>
                        <span>{formatPrice(installationCost)}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-t-[3px] border-black pt-4">
                        <span className="text-xl font-black tracking-widest">TOTAL</span>
                        <span className="text-4xl font-black">{formatPrice(finalPrice)}</span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Modern Footer Strip */}
        <div className="bg-black text-white p-4 text-center text-xs font-mono uppercase tracking-widest mt-12">
            Authorized by {invoiceConfig.companyName} — {new Date().getFullYear()}
        </div>
    </div>
  );

  const renderTechnicalLayout = () => (
    <div className="bg-white min-h-[1100px] text-slate-800 font-mono relative">
        {/* Grid Background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        <div className="p-8 border-[5px] border-slate-800 h-full relative z-10">
            {/* Blueprint Header */}
            <div className="grid grid-cols-12 border-b-2 border-slate-800 mb-8">
                <div className="col-span-8 p-6 border-l-2 border-slate-800">
                    <h1 className="text-2xl font-bold uppercase mb-2 text-slate-900">{invoiceConfig.companyName}</h1>
                    <div className="text-xs space-y-1 text-slate-600">
                        <p>ADD: {invoiceConfig.companyAddress}</p>
                        <p>TEL: {toPersianDigits(invoiceConfig.companyPhone)}</p>
                    </div>
                </div>
                <div className="col-span-4 p-6 bg-slate-100 flex flex-col justify-center items-center text-center">
                    <div className="text-xs font-bold mb-1 border-b border-slate-400 pb-1 w-full">PROJECT ID</div>
                    <div className="text-xl font-black">{toPersianDigits(projectDetails.id.slice(-6))}</div>
                    <div className="text-[10px] mt-1">{todayJalali}</div>
                </div>
            </div>

            {/* Client Spec Box */}
            <div className="border border-slate-800 mb-8 bg-white p-4 flex justify-between items-start">
                 <div>
                     <span className="bg-slate-800 text-white text-[10px] px-1 py-0.5 font-bold mb-2 inline-block">CLIENT SPEC</span>
                     <div className="font-bold text-lg">{projectDetails.customerName}</div>
                     <div className="text-xs mt-1">{projectDetails.address}</div>
                 </div>
                 <div className="text-right">
                     <span className="bg-slate-200 text-slate-800 text-[10px] px-1 py-0.5 font-bold mb-2 inline-block">STATUS</span>
                     <div className="text-xs font-bold uppercase">{projectDetails.status}</div>
                 </div>
            </div>

            {/* Technical Table */}
            <div className="mb-8">
                <div className="flex border-t-2 border-b-2 border-slate-800 bg-slate-100 text-[10px] font-bold">
                    <div className="w-12 p-2 border-l border-slate-400 text-center">NO.</div>
                    <div className="w-32 p-2 border-l border-slate-400 text-center">SCHEMATIC</div>
                    <div className="flex-1 p-2 border-l border-slate-400 text-right pr-4">SPECIFICATIONS & BOQ</div>
                    <div className="w-32 p-2 text-center">PRICE</div>
                </div>

                {items.map((item, idx) => (
                    <div key={item.id} className="flex border-b border-slate-300">
                        <div className="w-12 p-4 border-l border-slate-300 flex items-center justify-center font-bold bg-slate-50">
                            {toPersianDigits(idx + 1)}
                        </div>
                        <div className="w-32 p-2 border-l border-slate-300 flex items-center justify-center bg-white">
                            <WindowPreview config={item.config} width="100%" height="80px" className="scale-90"/>
                        </div>
                        <div className="flex-1 p-4 border-l border-slate-300">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-sm bg-slate-800 text-white px-2 py-0.5">{BRANDS.find(b => b.id === item.config.profileId)?.name}</span>
                                <span className="text-xs font-bold border border-slate-800 px-2 py-0.5">{item.config.type}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-600 font-mono">
                                {item.calculations.details.map((d, i) => (
                                    <div key={i} className="flex justify-between border-b border-dashed border-slate-200">
                                        <span>{d.name}</span>
                                        <span>{toPersianDigits(d.quantity)} {d.unit}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-2 no-print opacity-50 hover:opacity-100">
                                <button onClick={() => handleEditItem(idx)} className="text-[10px] underline">EDIT</button>
                                <button onClick={() => handleDeleteItem(idx)} className="text-[10px] underline text-red-600">DEL</button>
                            </div>
                        </div>
                        <div className="w-32 p-4 flex items-center justify-center font-bold bg-slate-50">
                            {formatPrice(item.calculations.totalPrice)}
                        </div>
                    </div>
                ))}
                
                {miscItems.map((m, i) => (
                    <div key={m.id} className="flex border-b border-slate-300 bg-slate-100/50">
                         <div className="w-12 p-2 border-l border-slate-300 text-center text-[10px]">MISC</div>
                         <div className="w-32 border-l border-slate-300"></div>
                         <div className="flex-1 p-2 border-l border-slate-300 flex justify-between items-center pr-4 font-bold text-xs">
                             <span>{m.name}</span>
                             <button onClick={() => handleDeleteMisc(m.id)} className="text-red-500 no-print"><Trash2 size={10}/></button>
                         </div>
                         <div className="w-32 p-2 text-center font-bold text-xs flex items-center justify-center">{formatPrice(m.price)}</div>
                    </div>
                ))}
            </div>

            {/* Footer Summary */}
            <div className="flex justify-end gap-8 mt-4">
                 <div className="flex-1 text-[10px] text-justify text-slate-500 border border-slate-200 p-2">
                     <strong>NOTES:</strong> {invoiceConfig.footerNote}
                 </div>
                 <div className="w-64 border-2 border-slate-800 p-4 bg-slate-50">
                     <div className="flex justify-between text-xs mb-1">
                         <span>MAT. TOTAL:</span>
                         <span>{formatPrice(totalMaterialPrice)}</span>
                     </div>
                     <div className="flex justify-between text-xs mb-1">
                         <span>INSTALL:</span>
                         <span>{formatPrice(installationCost)}</span>
                     </div>
                     <div className="h-px bg-slate-800 my-2"></div>
                     <div className="flex justify-between font-bold text-lg">
                         <span>GRAND TOTAL:</span>
                         <span>{formatPrice(finalPrice)}</span>
                     </div>
                 </div>
            </div>
            
            <div className="absolute bottom-2 left-0 w-full text-center text-[8px] text-slate-400">
                GENERATED BY LUMINA ENGINEERING SYSTEM
            </div>
        </div>
    </div>
  );

  const renderClassicLayout = () => (
    <div className="bg-[#fffdf5] min-h-[1100px] text-slate-900 font-serif p-8 border-[12px] border-double border-[#855e42]">
        <div className="border border-[#855e42] h-full p-6 relative">
            {/* Corner Decorations */}
            <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-[#855e42]"></div>
            <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-[#855e42]"></div>
            <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-[#855e42]"></div>
            <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-[#855e42]"></div>

            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-block border-b-2 border-[#855e42] pb-2 mb-2">
                    <h1 className="text-3xl font-bold text-[#5c3d2e]">{invoiceConfig.companyName}</h1>
                </div>
                <div className="text-sm text-[#855e42] font-medium">{invoiceConfig.companyAddress}</div>
                <div className="text-sm text-[#855e42] mt-1">{toPersianDigits(invoiceConfig.companyPhone)}</div>
            </div>

            <div className="flex justify-between items-end border-b border-[#d4c5b5] pb-4 mb-8">
                <div>
                    <div className="text-xs text-[#855e42] mb-1">نام خریدار محترم:</div>
                    <div className="text-xl font-bold">{projectDetails.customerName}</div>
                </div>
                <div className="text-left">
                    <div className="text-2xl font-bold text-[#855e42] mb-1">صورتحساب فروش</div>
                    <div className="text-sm">تاریخ: {todayJalali}</div>
                    <div className="text-sm">شماره: {toPersianDigits(projectDetails.id.slice(-6))}</div>
                </div>
            </div>

            {/* Items */}
            <table className="w-full mb-8">
                <thead className="border-b-2 border-[#855e42] text-[#5c3d2e]">
                    <tr>
                        <th className="py-2 text-center w-12">ردیف</th>
                        <th className="py-2 text-right pr-4">شرح کالا</th>
                        <th className="py-2 text-center">تصویر</th>
                        <th className="py-2 text-left pl-4">مبلغ (تومان)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#d4c5b5]">
                    {items.map((item, idx) => (
                        <tr key={item.id} className="group">
                            <td className="py-4 text-center font-bold text-[#855e42]">{toPersianDigits(idx + 1)}</td>
                            <td className="py-4 pr-4">
                                <div className="font-bold text-lg mb-1">{BRANDS.find(b => b.id === item.config.profileId)?.name}</div>
                                <div className="text-sm text-[#855e42] mb-2">{item.config.type}</div>
                                <div className="text-xs text-slate-600 leading-relaxed pl-8">
                                    {item.calculations.details.map((d, i) => (
                                        <span key={i} className="ml-3 inline-block">• {d.name}: {toPersianDigits(d.quantity)}</span>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-2 no-print opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEditItem(idx)} className="text-xs text-blue-600">ویرایش</button>
                                    <button onClick={() => handleDeleteItem(idx)} className="text-xs text-red-600">حذف</button>
                                </div>
                            </td>
                            <td className="py-4 px-2">
                                <div className="w-32 mx-auto border border-[#d4c5b5] bg-white p-2">
                                     <WindowPreview config={item.config} width="100%" height="80px" />
                                </div>
                            </td>
                            <td className="py-4 pl-4 text-left font-bold text-lg">{formatPrice(item.calculations.totalPrice)}</td>
                        </tr>
                    ))}
                    {miscItems.map((m, i) => (
                        <tr key={m.id} className="bg-[#fcf8f0]">
                            <td className="py-3 text-center text-[#855e42]">*</td>
                            <td className="py-3 pr-4 font-bold flex items-center gap-2">
                                {m.name}
                                <button onClick={() => handleDeleteMisc(m.id)} className="text-red-400 no-print"><Trash2 size={12}/></button>
                            </td>
                            <td></td>
                            <td className="py-3 pl-4 text-left font-bold">{formatPrice(m.price)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer */}
            <div className="border-t-2 border-[#855e42] pt-6 mt-auto">
                <div className="flex justify-end mb-6">
                    <div className="w-80 bg-[#f7f1e3] p-6 border border-[#d4c5b5]">
                         <div className="flex justify-between mb-2 text-sm text-[#5c3d2e]">
                             <span>جمع اقلام:</span>
                             <span>{formatPrice(totalMaterialPrice)}</span>
                         </div>
                         <div className="flex justify-between mb-4 text-sm text-[#5c3d2e]">
                             <span>هزینه خدمات:</span>
                             <span>{formatPrice(installationCost)}</span>
                         </div>
                         <div className="border-t border-[#855e42] pt-2 flex justify-between font-bold text-xl text-[#855e42]">
                             <span>مبلغ نهایی:</span>
                             <span>{formatPrice(finalPrice)}</span>
                         </div>
                    </div>
                </div>
                
                <div className="text-xs text-[#855e42] text-center italic">
                    {invoiceConfig.footerNote}
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-24 print:bg-white print:p-0">
      {/* Top Actions Bar (Hidden in Print/PDF) */}
      <div className="flex items-center justify-between mb-6 pt-4 px-2 no-print">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-white rounded-xl shadow-sm text-slate-700">
          <ChevronLeft size={20} className="rotate-180" />
        </button>
        <div className="flex gap-2">
            <button onClick={() => setShowAddMisc(true)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm flex items-center gap-2 text-xs font-bold">
                <Plus size={16} /> <span className="hidden sm:inline">هزینه جانبی</span>
            </button>
            <button onClick={handleEditProject} className="p-2 bg-blue-50 text-blue-600 rounded-xl shadow-sm">
                <Edit2 size={20} />
            </button>
            <button onClick={handlePrint} className="p-2 bg-white text-slate-700 rounded-xl shadow-sm">
                <Printer size={20} />
            </button>
            <button onClick={handleShare} className="p-2 bg-white text-slate-700 rounded-xl shadow-sm">
                <Share2 size={20} />
            </button>
            <button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPdf}
                className="p-2 bg-slate-900 text-white rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center" 
            >
                {isGeneratingPdf ? <Loader2 size={20} className="animate-spin"/> : <><Download size={20} /><span className="text-xs font-bold">دانلود PDF</span></>}
            </button>
        </div>
      </div>

      {/* Add Misc Item Modal */}
      {showAddMisc && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
                  <h3 className="font-bold text-lg mb-4 text-slate-800">افزودن هزینه جانبی</h3>
                  <div className="space-y-4 mb-6">
                      <InputField label="شرح هزینه (مثلا: کرایه حمل)" value={newMiscName} onChange={(e:any) => setNewMiscName(e.target.value)} />
                      <InputField label="مبلغ (تومان)" type="number" value={newMiscPrice} onChange={(e:any) => setNewMiscPrice(e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                      <PrimaryButton onClick={handleAddMiscItem} fullWidth>افزودن</PrimaryButton>
                      <button onClick={() => setShowAddMisc(false)} className="flex-1 bg-slate-100 rounded-xl font-bold text-slate-600">انصراف</button>
                  </div>
              </div>
          </div>
      )}

      {/* INVOICE PREVIEW AREA - DYNAMIC RENDER */}
      <div className="max-w-[210mm] mx-auto overflow-hidden shadow-2xl print:shadow-none print:w-full">
          <div ref={invoiceRef}>
             {invoiceConfig.layoutType === 'modern' && renderModernLayout()}
             {invoiceConfig.layoutType === 'technical' && renderTechnicalLayout()}
             {invoiceConfig.layoutType === 'classic' && renderClassicLayout()}
             {(invoiceConfig.layoutType === 'standard' || !invoiceConfig.layoutType) && renderStandardLayout()}
          </div>
      </div>
      
      <div className="h-20"></div>
    </div>
  );
};
