
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowRight, Activity, FileText, Layout, Grid, AlertTriangle, ChevronLeft, Loader2, Printer, CheckCircle2, Package, Search, QrCode, Download, Info, X, Factory } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { pricingStore } from '../services/pricingStore';
import { WindowPreview } from '../components/WindowPreview';
import { SavedProject, WindowNode } from '../types';
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

  useEffect(() => {
    const all = pricingStore.getProjects();
    setProjects(all.filter(p => p.status === 'Production' || p.status === 'Contract'));
    const savedInv = localStorage.getItem('lumina_inventory_v3');
    if (savedInv) setInventory(JSON.parse(savedInv));
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

  // --- Material Analysis Logic ---
  const analysisReport = useMemo(() => {
      if (!selectedProject || !inventory.length) return null;
      const needed: Record<string, { req: number, stock: number, unit: string, isShort: boolean }> = {};
      
      selectedProject.items.forEach(unit => {
          unit.calculations.details.forEach(d => {
              const current = needed[d.name] || { req: 0, stock: 0, unit: d.unit, isShort: false };
              current.req += (d.quantity * unit.quantity);
              
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
        const imgData = await toJpeg(pages[i] as HTMLElement, { quality: 1, pixelRatio: 3 });
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      pdf.save(`Technical_Blueprints_${selectedProject?.customerName}.pdf`);
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
        const imgData = await toJpeg(pages[i] as HTMLElement, { quality: 1, pixelRatio: 3 });
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      pdf.save(`Glass_Labels_${selectedProject?.customerName}.pdf`);
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-['Vazirmatn']">
      
      {/* HIDDEN EXPORT ENGINES */}
      <div className="fixed top-0 left-[-10000px] pointer-events-none">
          {/* Blueprints Engine */}
          <div ref={pdfRef} style={{ width: '794px' }}>
              {selectedProject?.items.map((item, idx) => (
                  <div key={idx} className="blueprint-page" style={{ width: '794px', height: '1123px', padding: '50px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
                      <div style={{ borderBottom: '3px solid #0f172a', paddingBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                         <h1 style={{ fontSize: '22px', fontWeight: '900' }}>نقشه فنی یونیت شماره {toPersianDigits(idx + 1)}</h1>
                         <div style={{ textAlign: 'left', fontSize: '10px' }}>LUMINA CORE v4.5</div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                          <WindowPreview config={item.config} width="500px" height="500px" scale={0.6} />
                      </div>
                      <div style={{ marginTop: '20px' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '900', marginBottom: '10px' }}>لیست قطعات و ابعاد برش (mm)</h3>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <thead><tr style={{ backgroundColor: '#f1f5f9' }}>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>شرح قطعه</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>طول برش</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>تعداد</th>
                                <th style={{ padding: '8px', border: '1px solid #e2e8f0' }}>زاویه</th>
                              </tr></thead>
                              <tbody>
                                  {item.calculations.details.filter(d => d.name.includes('پروفیل')).map((d, i) => (
                                      <tr key={i}>
                                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{d.name}</td>
                                          <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{toPersianDigits(d.quantity)}</td>
                                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{toPersianDigits(item.quantity * 2)}</td>
                                          <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>۴۵° / ۴۵°</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              ))}
          </div>

          {/* Labels Engine (8 labels per A4) */}
          <div ref={labelsRef} style={{ width: '794px' }}>
              {(() => {
                  const labelPages = [];
                  for (let i = 0; i < allGlassPanes.length; i += 8) labelPages.push(allGlassPanes.slice(i, i + 8));
                  return labelPages.map((page, pIdx) => (
                      <div key={pIdx} className="label-page" style={{ width: '794px', height: '1123px', padding: '20px', backgroundColor: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(4, 1fr)', gap: '15px', direction: 'rtl' }}>
                          {page.map((glass, gIdx) => (
                              <div key={gIdx} style={{ border: '2px dashed #cbd5e1', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '15px', position: 'relative' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b' }}>برچسب شیشه دوجداره</span>
                                      <QrCode size={40} style={{ opacity: 0.2 }} />
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{toPersianDigits(glass.w)} × {toPersianDigits(glass.h)}</div>
                                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', marginTop: '5px' }}>ابعاد نهایی جام شیشه (mm)</div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                                      <span style={{ fontSize: '12px', fontWeight: '900' }}>یونیت شماره: {toPersianDigits(glass.unitId)}</span>
                                      <span style={{ fontSize: '10px', fontWeight: 'bold' }}>LUMINA-GLASS-SYS</span>
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
           <h1 className="text-xl font-black text-slate-900 tracking-tight">کنترل و اسناد تولید</h1>
           <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl animate-pulse"><Activity size={20}/></div>
        </div>
      </div>

      <div className="p-6">
          {/* STEP 1: Project Selection */}
          <div className="mb-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">انتخاب پروژه جهت پردازش</h3>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {projects.length === 0 ? (
                      <div className="w-full py-16 bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                          <Factory size={48} className="mb-4 opacity-20" />
                          <span className="text-xs font-black">پروژه آماده‌ای یافت نشد</span>
                      </div>
                  ) : (
                    projects.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => { setSelectedProjectId(p.id); setActiveTab(null); }}
                            className={`min-w-[240px] p-6 rounded-[2rem] border-2 transition-all text-right ${selectedProjectId === p.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-600 border-slate-100 hover:border-blue-200'}`}
                        >
                            <h4 className="font-black text-sm mb-1">{p.customerName}</h4>
                            <p className="text-[10px] opacity-60 mb-4">{p.address || 'بدون آدرس ثبت شده'}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Ready for Production</span>
                                <span className="text-[9px] font-black">{toPersianDigits(p.items.length)} یونیت</span>
                            </div>
                        </button>
                    ))
                  )}
              </div>
          </div>

          {/* STEP 2: Action Cards (Visible only after selection) */}
          <AnimatePresence>
            {selectedProject && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Technical Blueprints */}
                      <GlassCard onClick={() => setActiveTab('blueprints')} className="flex flex-col items-center justify-center gap-4 py-10 border-indigo-100 bg-indigo-50/5 cursor-pointer active:scale-95 transition-transform">
                          <div className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-200"><Layout size={32}/></div>
                          <div className="text-center">
                            <h3 className="font-black text-slate-900 text-sm">نقشه فنی یونیت‌ها</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Technical Blueprints</p>
                          </div>
                      </GlassCard>

                      {/* Glass Labeling */}
                      <GlassCard onClick={() => setActiveTab('labels')} className="flex flex-col items-center justify-center gap-4 py-10 border-emerald-100 bg-emerald-50/5 cursor-pointer active:scale-95 transition-transform">
                          <div className="p-5 bg-emerald-600 text-white rounded-[2rem] shadow-xl shadow-emerald-200"><Grid size={32}/></div>
                          <div className="text-center">
                            <h3 className="font-black text-slate-900 text-sm">چاپ برچسب شیشه</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Glass Labeling System</p>
                          </div>
                      </GlassCard>

                      {/* Material Analysis */}
                      <GlassCard onClick={() => setActiveTab('analysis')} className="flex flex-col items-center justify-center gap-4 py-10 border-rose-100 bg-rose-50/5 cursor-pointer active:scale-95 transition-transform">
                          <div className="p-5 bg-rose-600 text-white rounded-[2rem] shadow-xl shadow-rose-200"><AlertTriangle size={32}/></div>
                          <div className="text-center">
                            <h3 className="font-black text-slate-900 text-sm">آنالیز مواد مصرفی</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Inventory Analysis</p>
                          </div>
                      </GlassCard>
                  </div>

                  {/* Tab Contents: Blueprints */}
                  {activeTab === 'blueprints' && (
                      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                          <div className="flex justify-between items-center">
                              <h3 className="font-black text-slate-800 text-base">پیش‌نمایش نقشه‌های اجرایی</h3>
                              <PrimaryButton onClick={downloadBlueprints} loading={isGenerating} icon={Download}>دانلود دفترچه فنی (PDF)</PrimaryButton>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedProject.items.map((item, idx) => (
                                  <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                                      <div className="w-32 h-32 flex items-center justify-center"><WindowPreview config={item.config} scale={0.4} /></div>
                                      <div className="text-left">
                                          <span className="text-[10px] font-black text-slate-400 block mb-1">یونیت شماره {toPersianDigits(idx + 1)}</span>
                                          <div className="text-sm font-black text-slate-900" style={{ direction: 'ltr' }}>{toPersianDigits(item.config.width)} × {toPersianDigits(item.config.height)}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Tab Contents: Labels */}
                  {activeTab === 'labels' && (
                      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                           <div className="flex justify-between items-center">
                              <h3 className="font-black text-slate-800 text-base">سیستم لیبل‌زنی هوشمند</h3>
                              <PrimaryButton onClick={downloadLabels} loading={isGenerating} icon={Printer}>چاپ لیبل‌ها (A4 Standard)</PrimaryButton>
                          </div>
                          <div className="p-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
                             <span className="text-xs font-bold text-slate-500">تعداد {toPersianDigits(allGlassPanes.length)} قطعه شیشه برای این پروژه شناسایی شد.</span>
                             <p className="text-[10px] text-slate-400 mt-2">لیبل‌ها به صورت خودکار در صفحات A4 (۸تایی) چیده شده‌اند.</p>
                          </div>
                      </div>
                  )}
              </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* MODAL: Inventory Analysis */}
      <AnimatePresence>
          {activeTab === 'analysis' && analysisReport && (
              <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-white w-full max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-8">
                         <div className="flex items-center gap-3">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><AlertTriangle size={24}/></div>
                            <h2 className="text-xl font-black text-slate-900">آنالیز متریال و موجودی انبار</h2>
                         </div>
                         <button onClick={() => setActiveTab(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={24}/></button>
                      </div>

                      <div className="space-y-3 mb-10">
                          {/* Fix: Explicitly define the type for [name, data] to avoid 'unknown' type errors */}
                          {(Object.entries(analysisReport) as [string, any][]).map(([name, data]) => (
                              <div key={name} className={`flex items-center justify-between p-5 rounded-2xl border ${data.isShort ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                                  <div className="flex items-center gap-4">
                                      {data.isShort ? <AlertTriangle size={18} className="text-rose-500" /> : <CheckCircle2 size={18} className="text-emerald-500" />}
                                      <div>
                                          <h4 className="text-sm font-black text-slate-800">{name}</h4>
                                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">مورد نیاز: {toPersianDigits(Math.ceil(data.req))} {data.unit}</p>
                                      </div>
                                  </div>
                                  <div className="text-left">
                                      <div className={`text-sm font-black ${data.isShort ? 'text-rose-600' : 'text-slate-900'}`}>موجودی: {toPersianDigits(Math.floor(data.stock))}</div>
                                      {data.isShort && <div className="text-[10px] font-black text-rose-400">کمبود: {toPersianDigits(Math.ceil(data.req - data.stock))} {data.unit}</div>}
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                          <Info size={24} className="text-blue-500 mt-1" />
                          <div>
                              <h4 className="font-black text-blue-900 text-sm mb-1">نکته تامین کالا</h4>
                              <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                                  لیست فوق بر اساس خروجی دقیق مهندسی پروژه و آخرین موجودی ثبت شده در انبار لومینا محاسبه شده است. 
                                  در صورت وجود ردیف‌های قرمز، لطفا قبل از شروع برش‌کاری نسبت به تامین کسری‌ها اقدام کنید.
                              </p>
                          </div>
                      </div>
                      
                      <button 
                        onClick={() => navigate('/inventory')}
                        className="w-full mt-8 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-3"
                      >
                         <Package size={20} /> انتقال به مدیریت انبار و خرید
                      </button>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};
