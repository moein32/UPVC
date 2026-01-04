
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowRight, Activity, FileText, Layout, Grid, AlertTriangle, ChevronLeft, Loader2, Printer, CheckCircle2, Package, Search, QrCode, Download, Info, X, Factory, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { pricingStore } from '../services/pricingStore';
import { WindowPreview } from '../components/WindowPreview';
import { SavedProject, WindowNode, AppSettings } from '../types';
import { toPersianDigits, formatPrice } from '../utils/formatting';
import { GlassCard, PrimaryButton } from '../components/UIComponents';

export const ProductionControl = () => {
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'blueprints' | 'labels' | 'analysis' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const all = pricingStore.getProjects();
    setProjects(all.filter(p => p.status === 'Production' || p.status === 'Contract' || p.status === 'Draft'));
    
    const savedInv = localStorage.getItem('lumina_inventory_v3');
    if (savedInv) setInventory(JSON.parse(savedInv));
    
    setSettings(pricingStore.getSettings());
  }, []);

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
  [projects, selectedProjectId]);

  // --- Helpers for Glass Extraction ---
  const extractGlassPanes = (node: WindowNode, w: number, h: number, unitId: string): any[] => {
      let panes: any[] = [];
      if (node.type === 'container' && node.children) {
          const totalFlex = node.children.reduce((a, b) => a + (b.flex || 1), 0);
          node.children.forEach((child, idx) => {
              const ratio = (child.flex || 1) / totalFlex;
              const childW = node.dir === 'row' ? w * ratio : w;
              const childH = node.dir === 'col' ? h * ratio : h;
              panes = [...panes, ...extractGlassPanes(child, childW, childH, unitId)];
          });
      } else {
          if (!node.openingType?.includes('Panel')) {
              panes.push({ w: Math.round(w - 80), h: Math.round(h - 80), unitId });
          }
      }
      return panes;
  };

  const allGlassPanes = useMemo(() => {
      if (!selectedProject) return [];
      return selectedProject.items.flatMap((item, idx) => 
          extractGlassPanes(item.config.layout!, item.config.width, item.config.height, (idx + 1).toString())
      );
  }, [selectedProject]);

  // --- Material Analysis / Stock Deduction Logic ---
  const analysisReport = useMemo(() => {
      if (!selectedProject || !inventory.length) return null;
      const needed: Record<string, { req: number, stock: number, unit: string, isShort: boolean }> = {};
      
      selectedProject.items.forEach(unit => {
          unit.calculations.details.forEach(d => {
              const current = needed[d.name] || { req: 0, stock: 0, unit: d.unit, isShort: false };
              current.req += (d.quantity * unit.quantity);
              
              // Find matching item in inventory by name
              const invItem = inventory.find(i => i.name === d.name);
              current.stock = invItem?.currentStock || 0;
              current.isShort = current.stock < current.req;
              needed[d.name] = current;
          });
      });
      return needed;
  }, [selectedProject, inventory]);

  const downloadBlueprints = async () => {
    if (!pdfRef.current) return;
    setIsGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = pdfRef.current.querySelectorAll('.blueprint-page');
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const imgData = await toJpeg(pages[i] as HTMLElement, { quality: 0.95, pixelRatio: 2.5 });
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      pdf.save(`Technical_Sheets_${selectedProject?.customerName}.pdf`);
    } finally { setIsGenerating(false); }
  };

  const downloadLabels = async () => {
    if (!labelsRef.current) return;
    setIsGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = labelsRef.current.querySelectorAll('.label-page');
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const imgData = await toJpeg(pages[i] as HTMLElement, { quality: 0.95, pixelRatio: 2.5 });
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      pdf.save(`Glass_Labels_${selectedProject?.customerName}.pdf`);
    } finally { setIsGenerating(false); }
  };

  const today = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date());

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-['Vazirmatn']">
      
      {/* HIDDEN EXPORT ENGINES */}
      <div className="fixed top-0 left-[-10000px] pointer-events-none">
          {/* Blueprints Engine (A4 Grid) */}
          <div ref={pdfRef} style={{ width: '794px' }}>
              {(() => {
                  const items = selectedProject?.items || [];
                  const pagesItems = [];
                  for (let i = 0; i < items.length; i += 4) pagesItems.push(items.slice(i, i + 4));
                  
                  return pagesItems.map((page, pIdx) => (
                    <div key={pIdx} className="blueprint-page" style={{ width: '794px', height: '1123px', padding: '40px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
                        <div style={{ borderBottom: '3px solid #0f172a', paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                           <div>
                               <h1 style={{ fontSize: '20px', fontWeight: '900', margin: 0 }}>دفترچه فنی و لیست برش قطعات</h1>
                               <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginTop: '5px' }}>پروژه: {selectedProject?.customerName} | تاریخ: {toPersianDigits(today)}</p>
                           </div>
                           <div style={{ textAlign: 'left', fontSize: '10px', fontWeight: '900' }}>{settings?.invoice.companyName || 'LUMINA UPVC'}</div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '20px', flex: 1 }}>
                            {page.map((item, idx) => (
                                <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '20px', padding: '15px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '5px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '900' }}>یونیت {toPersianDigits(pIdx * 4 + idx + 1)}</span>
                                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#3b82f6' }}>{toPersianDigits(item.quantity)} عدد</span>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <WindowPreview config={item.config} width="160px" height="160px" scale={0.4} />
                                    </div>
                                    <div style={{ marginTop: '10px', fontSize: '8px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead><tr style={{ backgroundColor: '#f8fafc' }}>
                                                <th style={{ padding: '4px', border: '0.5px solid #e2e8f0' }}>قطعه</th>
                                                <th style={{ padding: '4px', border: '0.5px solid #e2e8f0' }}>اندازه (mm)</th>
                                            </tr></thead>
                                            <tbody>
                                                {item.calculations.details.filter(d => d.name.includes('پروفیل')).slice(0, 4).map((d, i) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '4px', border: '0.5px solid #e2e8f0' }}>{d.name}</td>
                                                        <td style={{ padding: '4px', border: '0.5px solid #e2e8f0', fontWeight: 'bold' }}>{toPersianDigits(d.quantity)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#94a3b8' }}>
                            <span>LUMINA CORE V4.5 - سیستم مدیریت هوشمند تولید</span>
                            <span>صفحه {toPersianDigits(pIdx + 1)} از {toPersianDigits(pagesItems.length)}</span>
                        </div>
                    </div>
                  ));
              })()}
          </div>

          {/* Labels Engine (8 labels per A4) */}
          <div ref={labelsRef} style={{ width: '794px' }}>
              {(() => {
                  const labelPages = [];
                  for (let i = 0; i < allGlassPanes.length; i += 8) labelPages.push(allGlassPanes.slice(i, i + 8));
                  return labelPages.map((page, pIdx) => (
                      <div key={pIdx} className="label-page" style={{ width: '794px', height: '1123px', padding: '20px', backgroundColor: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(4, 1fr)', gap: '15px', direction: 'rtl' }}>
                          {page.map((glass, gIdx) => (
                              <div key={gIdx} style={{ border: '2px solid #0f172a', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '10px', position: 'relative' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                          <div style={{ width: '12px', height: '12px', backgroundColor: '#0f172a', borderRadius: '3px' }}></div>
                                          <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{settings?.invoice.companyName || 'LUMINA UPVC'}</span>
                                      </div>
                                      <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b' }}>برچسب شیشه دوجداره</span>
                                  </div>
                                  
                                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                      <div style={{ fontSize: '38px', fontWeight: '900', color: '#0f172a', letterSpacing: '1px' }}>{toPersianDigits(glass.w)} × {toPersianDigits(glass.h)}</div>
                                      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#334155', marginTop: '2px' }}>ابعاد نهایی جام شیشه (mm)</div>
                                  </div>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          <span style={{ fontSize: '10px', fontWeight: '900' }}>مشتری: {selectedProject?.customerName}</span>
                                          <span style={{ fontSize: '10px', fontWeight: '900', color: '#3b82f6' }}>یونیت: {toPersianDigits(glass.unitId)}</span>
                                      </div>
                                      <QrCode size={35} strokeWidth={1.5} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  ));
              })()}
          </div>
      </div>

      {/* UI HEADER */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-40 border-b border-slate-100">
        <div className="flex items-center justify-between">
           <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-slate-50 rounded-2xl text-slate-700 active:scale-90 transition-transform"><ArrowRight size={20}/></button>
           <div className="text-center">
               <h1 className="text-xl font-black text-slate-900 tracking-tight">خط تولید کارگاه</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Production Control Center</p>
           </div>
           <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl animate-pulse"><Activity size={20}/></div>
        </div>
      </div>

      <div className="p-6">
          {/* STEP 1: Project Selection */}
          <div className="mb-10">
              <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">انتخاب پروژه عملیاتی</h3>
                  <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full">{toPersianDigits(projects.length)} پروژه در انتظار</span>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {projects.length === 0 ? (
                      <div className="w-full py-16 bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                          <Factory size={48} className="mb-4 opacity-20" />
                          <span className="text-xs font-black">پروژه‌ای جهت تولید یافت نشد</span>
                      </div>
                  ) : (
                    projects.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => { setSelectedProjectId(p.id); setActiveTab(null); }}
                            className={`min-w-[260px] p-6 rounded-[2.5rem] border-2 transition-all text-right relative overflow-hidden group ${selectedProjectId === p.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-600 border-slate-100 hover:border-blue-200'}`}
                        >
                            <h4 className="font-black text-base mb-1 relative z-10">{p.customerName}</h4>
                            <div className="flex items-center gap-1.5 mb-4 relative z-10 opacity-60">
                                <Building2 size={12} />
                                <p className="text-[10px] font-bold truncate">{p.address || 'بدون آدرس ثبت شده'}</p>
                            </div>
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-lg text-[9px] font-black border border-blue-500/30">
                                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-ping"></div>
                                    Ready to Build
                                </div>
                                <span className="text-[10px] font-black">{toPersianDigits(p.items.length)} یونیت</span>
                            </div>
                            {selectedProjectId === p.id && <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>}
                        </button>
                    ))
                  )}
              </div>
          </div>

          {/* STEP 2: Action Cards */}
          <AnimatePresence>
            {selectedProject && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Technical Blueprints */}
                      <GlassCard onClick={() => setActiveTab('blueprints')} className="flex flex-col items-center justify-center gap-4 py-12 border-indigo-100 bg-indigo-50/5 cursor-pointer active:scale-95 transition-transform">
                          <div className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-200"><Layout size={32}/></div>
                          <div className="text-center">
                            <h3 className="font-black text-slate-900 text-sm">نقشه فنی یونیت‌ها</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Technical Blueprints</p>
                          </div>
                      </GlassCard>

                      {/* Glass Labeling */}
                      <GlassCard onClick={() => setActiveTab('labels')} className="flex flex-col items-center justify-center gap-4 py-12 border-emerald-100 bg-emerald-50/5 cursor-pointer active:scale-95 transition-transform">
                          <div className="p-5 bg-emerald-600 text-white rounded-[2rem] shadow-xl shadow-emerald-200"><Grid size={32}/></div>
                          <div className="text-center">
                            <h3 className="font-black text-slate-900 text-sm">چاپ برچسب شیشه</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Glass Labeling System</p>
                          </div>
                      </GlassCard>

                      {/* Material Analysis / Deduction */}
                      <GlassCard onClick={() => setActiveTab('analysis')} className="flex flex-col items-center justify-center gap-4 py-12 border-rose-100 bg-rose-50/5 cursor-pointer active:scale-95 transition-transform">
                          <div className="p-5 bg-rose-600 text-white rounded-[2rem] shadow-xl shadow-rose-200"><AlertTriangle size={32}/></div>
                          <div className="text-center">
                            <h3 className="font-black text-slate-900 text-sm">تولید پروژه و کسر از انبار</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Production & Stock Analysis</p>
                          </div>
                      </GlassCard>
                  </div>

                  {/* Tab Contents: Blueprints Preview */}
                  {activeTab === 'blueprints' && (
                      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                          <div className="flex justify-between items-center">
                              <h3 className="font-black text-slate-800 text-base">پیش‌نمایش دفترچه اجرایی</h3>
                              <PrimaryButton onClick={downloadBlueprints} loading={isGenerating} icon={Download}>دانلود خروجی استاندارد (PDF)</PrimaryButton>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {selectedProject.items.map((item, idx) => (
                                  <div key={idx} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col items-center gap-3">
                                      <div className="w-24 h-24 flex items-center justify-center"><WindowPreview config={item.config} scale={0.3} /></div>
                                      <div className="text-center">
                                          <span className="text-[9px] font-black text-slate-400 block mb-1">یونیت {toPersianDigits(idx + 1)}</span>
                                          <div className="text-[10px] font-black text-slate-900" style={{ direction: 'ltr' }}>{toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Tab Contents: Labels Information */}
                  {activeTab === 'labels' && (
                      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                           <div className="flex justify-between items-center">
                              <h3 className="font-black text-slate-800 text-base">سیستم لیبل‌زنی شیشه</h3>
                              <PrimaryButton onClick={downloadLabels} loading={isGenerating} icon={Printer}>چاپ لیبل‌ها (8Labels/A4)</PrimaryButton>
                          </div>
                          <div className="p-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center">
                             <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                                <QrCode size={32} />
                             </div>
                             <span className="text-xs font-black text-slate-600">تعداد {toPersianDigits(allGlassPanes.length)} قطعه شیشه برای این پروژه شناسایی شد.</span>
                             <p className="text-[10px] text-slate-400 mt-2 font-bold max-w-sm">لیبل‌ها شامل نام مجموعه شما، ابعاد دقیق، شماره یونیت و بارکد رهگیری هستند.</p>
                          </div>
                      </div>
                  )}
              </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* MODAL: Project Production & Stock Deduction Analysis */}
      <AnimatePresence>
          {activeTab === 'analysis' && analysisReport && (
              <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-white w-full max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-8">
                         <div className="flex items-center gap-3">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><AlertTriangle size={24}/></div>
                            <h2 className="text-xl font-black text-slate-900">تولید پروژه و کسر از انبار</h2>
                         </div>
                         <button onClick={() => setActiveTab(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={24}/></button>
                      </div>

                      <div className="space-y-3 mb-10">
                          {(Object.entries(analysisReport) as [string, any][]).map(([name, data]) => (
                              <div key={name} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${data.isShort ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                                  <div className="flex items-center gap-4">
                                      {data.isShort ? (
                                        <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shadow-sm">
                                            <AlertTriangle size={20} />
                                        </div>
                                      ) : (
                                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                                            <CheckCircle2 size={20} />
                                        </div>
                                      )}
                                      <div>
                                          <h4 className="text-sm font-black text-slate-800">{name}</h4>
                                          <p className="text-[10px] text-slate-400 font-black uppercase mt-0.5">مورد نیاز تولید: {toPersianDigits(Math.ceil(data.req))} {data.unit}</p>
                                      </div>
                                  </div>
                                  <div className="text-left flex flex-col items-end">
                                      <div className={`text-sm font-black ${data.isShort ? 'text-rose-600' : 'text-slate-900'}`}>موجودی انبار: {toPersianDigits(Math.floor(data.stock))}</div>
                                      {data.isShort && <div className="text-[10px] font-black text-rose-400 bg-rose-100 px-2 py-0.5 rounded-lg mt-1">کسری: {toPersianDigits(Math.ceil(data.req - data.stock))}</div>}
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                          <Info size={24} className="text-blue-500 mt-1" />
                          <div>
                              <h4 className="font-black text-blue-900 text-sm mb-1">راهنمای سیستمی انبار</h4>
                              <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                                  در صورت تایید نهایی تولید، مقادیر فوق از موجودی انبار شما کسر خواهد شد. ردیف‌های قرمز نشان‌دهنده کمبود متریال در انبار برای تکمیل این پروژه است.
                              </p>
                          </div>
                      </div>
                      
                      <div className="flex gap-4 mt-8">
                        <button 
                            onClick={() => navigate('/inventory')}
                            className="flex-1 bg-slate-100 text-slate-700 py-5 rounded-2xl font-black text-sm active:scale-95 transition-all"
                        >
                            مدیریت و خرید انبار
                        </button>
                        <button 
                            className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                            disabled={Object.values(analysisReport).some((d: any) => d.isShort)}
                        >
                            <Package size={20} /> تایید تولید و کسر از انبار
                        </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};
