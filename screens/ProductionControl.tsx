
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowRight, Activity, Layout, Grid, AlertTriangle, Loader2, Printer, CheckCircle2, Package, QrCode, Download, X, Factory, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { pricingStore } from '../services/pricingStore';
import { WindowCanvas } from '../components/WindowCanvas';
import { SavedProject, WindowNode, AppSettings } from '../types';
import { toPersianDigits, toEnglishDigits } from '../utils/formatting';
import { GlassCard, PrimaryButton } from '../components/UIComponents';
import { BRANDS } from '../constants';
import { calculateDetailedCuts } from '../services/engineeringService';

export const ProductionControl = () => {
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'blueprints' | 'labels' | 'analysis' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingProduction, setIsProcessingProduction] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const loadData = () => {
    const all = pricingStore.getProjects();
    setProjects(all.filter(p => p.status !== 'Draft' || p.items.length > 0));
    
    let savedInv = localStorage.getItem('lumina_inventory_v3');
    if (!savedInv) {
      // Auto-initialize empty/test inventory based on existing brands and items so Production Control always works
      const testInventory: any[] = [];
      const brands = pricingStore.getBrands();
      
      // Profiles
      brands.forEach(b => {
        b.components.forEach(c => {
          testInventory.push({
            id: `prof_${b.id}_${c.id}`,
            name: c.name,
            brandId: b.id,
            currentStock: 0,
            minStock: 10,
            unit: 'شاخه',
            category: 'profiles'
          });
        });
      });

      // Galvanized
      ['galv_125', 'galv_150', 'galv_200'].forEach(id => {
        testInventory.push({ id, name: 'گالوانیزه', currentStock: 0, minStock: 20, unit: 'شاخه', category: 'galvanized' });
      });

      // Glass sheets
      const GLASS_SHEET_SIZES = { long: { width: 3210, height: 2250, label: 'جام بلند' }, short: { width: 2250, height: 1605, label: 'جام کوتاه' } };
      const SINGLE_PANE_GLASS_TYPES = [ { id: 'sp_4_simple', name: 'شیشه ۴ میل ساده' }, { id: 'sp_6_simple', name: 'شیشه ۴ میل ساده' }, { id: 'sp_4_reflex', name: 'شیشه ۴ میل رفلکس' } ];
      SINGLE_PANE_GLASS_TYPES.forEach(g => {
          ['long', 'short'].forEach(type => {
              const sid = `glass_${g.id}_${type}`;
              const size = GLASS_SHEET_SIZES[type as 'long' | 'short'];
              testInventory.push({ id: sid, name: `${g.name} - ${size.label}`, currentStock: 0, minStock: 5, unit: 'جام', category: 'glass', width: size.width, height: size.height, glassTypeId: g.id, sheetType: type as any });
          });
      });

      // Hardware sets
      pricingStore.getHardware().filter(h => h.id !== 'panel_upvc').forEach(h => {
        testInventory.push({ id: `hw_set_${h.id}`, name: h.name, currentStock: 0, minStock: 10, unit: 'ست کامل', category: 'hardware' });
      });

      localStorage.setItem('lumina_inventory_v3', JSON.stringify(testInventory));
      savedInv = JSON.stringify(testInventory);
    }

    setInventory(JSON.parse(savedInv));
    setSettings(pricingStore.getSettings());
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
  [projects, selectedProjectId]);

  const analysisReport = useMemo(() => {
      if (!selectedProject) return null;
      const needed: Record<string, { req: number, stock: number, unit: string, isShort: boolean, invId?: string }> = {};
      selectedProject.items.forEach(unit => {
          if (unit.calculations && unit.calculations.details) {
              unit.calculations.details.forEach(d => {
                  let current = needed[d.name];
                  if (!current) {
                      current = { req: 0, stock: 0, unit: d.unit, isShort: false, invId: undefined };
                      needed[d.name] = current;
                  }
                  current.req += (d.quantity * unit.quantity);
                  const invItem = inventory.find(i => i.name === d.name || i.id.includes(d.name));
                  if (invItem) {
                      current.stock = invItem.currentStock;
                      current.invId = invItem.id;
                  }
                  current.isShort = current.stock < current.req;
              });
          }
      });
      return needed;
  }, [selectedProject, inventory]);

  const handleConfirmProduction = async () => {
    if (!selectedProject || !analysisReport) return;
    if (!window.confirm('آیا از شروع تولید و کسر متریال از انبار اطمینان دارید؟')) return;
    setIsProcessingProduction(true);
    try {
        const updatedInventory = [...inventory];
        (Object.entries(analysisReport) as [string, any][]).forEach(([name, data]) => {
            if (data.invId) {
                const itemIdx = updatedInventory.findIndex(i => i.id === data.invId);
                if (itemIdx >= 0) {
                    updatedInventory[itemIdx].currentStock = Math.max(0, updatedInventory[itemIdx].currentStock - data.req);
                }
            }
        });
        localStorage.setItem('lumina_inventory_v3', JSON.stringify(updatedInventory));
        setInventory(updatedInventory);
        const updatedProject = { ...selectedProject, status: 'Produced' as const };
        pricingStore.saveProject(updatedProject);
        loadData();
        alert('تولید با موفقیت ثبت شد.');
        setActiveTab(null);
    } catch (error) {
        alert('خطا در پردازش.');
    } finally {
        setIsProcessingProduction(false);
    }
  };

  const extractGlassPanes = (node: WindowNode, w: number, h: number, unitId: string): any[] => {
      let panes: any[] = [];
      if (node.type === 'container' && node.children) {
          const totalFlex = node.children.reduce((a, b) => a + (b.flex || 1), 0);
          node.children.forEach((child) => {
              const ratio = (child.flex || 1) / totalFlex;
              const childW = node.dir === 'row' ? w * ratio : w;
              const childH = node.dir === 'col' ? h * ratio : h;
              panes = [...panes, ...extractGlassPanes(child, childW, childH, unitId)];
          });
      } else {
          if (!node.openingType?.includes('Panel')) {
              panes.push({ w: Math.round(w - 80), h: Math.round(h - 80), unitId, name: 'شیشه استاندارد' });
          }
      }
      return panes;
  };

  const allGlassPanes = useMemo(() => {
      if (!selectedProject) return [];
      const panes: any[] = [];
      selectedProject.items.forEach((item, idx) => {
          const unitId = (idx + 1).toString();
          const brand = BRANDS.find(b => b.id === item.config.profileId);
          
          // Calculate precise physical cuts for this unit
          const cuts = calculateDetailedCuts(
              item.config.layout!,
              item.config.width,
              item.config.height,
              item.config.frameType || 'standard',
              brand
          );
          
          let hasCalculatedGlass = false;
          
          cuts.forEach((cut) => {
              if (cut.type === 'Glass' && cut.width && cut.height) {
                  hasCalculatedGlass = true;
                  const totalQty = (cut.quantity || 1) * (item.quantity || 1);
                  let labelName = 'شیشه دوجداره';
                  if (cut.name.includes('بازشو') || cut.name.includes('لنگه') || cut.name.toLowerCase().includes('sash')) {
                      labelName = 'شیشه بازشو';
                  } else if (cut.name.includes('ثابت') || cut.name.includes('کتیبه') || cut.name.toLowerCase().includes('fix')) {
                      labelName = 'شیشه ثابت';
                  } else if (cut.name.includes('کشویی') || cut.name.toLowerCase().includes('sliding')) {
                      labelName = 'شیشه کشویی';
                  }
                  
                  for (let i = 0; i < totalQty; i++) {
                      panes.push({
                          w: Math.round(cut.width),
                          h: Math.round(cut.height),
                          unitId,
                          name: labelName
                      });
                  }
              }
          });
          
          if (!hasCalculatedGlass) {
              const estimated = extractGlassPanes(item.config.layout!, item.config.width, item.config.height, unitId);
              for (let q = 0; q < (item.quantity || 1); q++) {
                  panes.push(...estimated);
              }
          }
      });
      return panes;
  }, [selectedProject]);

  const downloadBlueprints = async () => {
    if (!pdfRef.current) return;
    setIsGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = pdfRef.current.querySelectorAll('.blueprint-page');
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const imgData = await toJpeg(pages[i] as HTMLElement, { quality: 1.0, pixelRatio: 3 });
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      pdf.save(`Technical_Sheet_${selectedProject?.customerName}.pdf`);
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
      pdf.save(`Labels_${selectedProject?.customerName}.pdf`);
    } finally { setIsGenerating(false); }
  };

  const todayStr = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date());

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-['Vazirmatn']">
      
      {/* EXPORT ENGINE (HIDDEN) */}
      <div className="fixed top-0 left-[-10000px] pointer-events-none">
          {/* INDUSTRIAL SWISS STYLE PDF RENDERER - WHITE MAP */}
          <div ref={pdfRef} style={{ width: '794px' }}>
              {(() => {
                  const items = selectedProject?.items || [];
                  const pagesItems = [];
                  for (let i = 0; i < items.length; i += 2) pagesItems.push(items.slice(i, i + 2));
                  
                  return pagesItems.map((page, pIdx) => (
                    <div key={pIdx} className="blueprint-page" style={{ width: '794px', height: '1123px', padding: '40px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', direction: 'rtl', boxSizing: 'border-box' }}>
                        
                        {/* HEADER: STRICT B&W INDUSTRIAL */}
                        <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', borderBottom: '4px solid #000', paddingBottom: '15px', marginBottom: '30px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#000', margin: 0, letterSpacing: '-1px', lineHeight: '1' }}>NEXWIN</h1>
                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#000', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '2px' }}>Production Technical Card</div>
                                
                                <div style={{ marginTop: '16px', display: 'flex', gap: '30px', fontSize: '11px', color: '#000', fontWeight: 'bold' }}>
                                    <div style={{ display: 'flex', gap: '6px' }}><span style={{ fontWeight: '900' }}>مشتری:</span> <span>{selectedProject?.customerName}</span></div>
                                    <div style={{ display: 'flex', gap: '6px' }}><span style={{ fontWeight: '900' }}>شماره سفارش:</span> <span>{toPersianDigits(selectedProject?.id.slice(-6) || '')}</span></div>
                                    <div style={{ display: 'flex', gap: '6px' }}><span style={{ fontWeight: '900' }}>تاریخ:</span> <span>{toPersianDigits(todayStr)}</span></div>
                                </div>
                            </div>
                            <div style={{ border: '3px solid #000', borderRadius: '12px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
                                <QrCode size={64} color="#000" strokeWidth={1.5} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px', flex: 1 }}>
                            {page.map((item, idx) => {
                                const unitNumber = pIdx * 2 + idx + 1;
                                const brandName = BRANDS.find(b => b.id === item.config.profileId)?.name || 'استاندارد';
                                const unitRatio = item.config.width / item.config.height;

                                return (
                                  <div key={idx} style={{ border: '2px solid #000', borderRadius: '16px', padding: '20px', height: '420px', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
                                      {/* Left Column (Data) */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ border: '1px solid #000', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                                          <div style={{ fontSize: '10px', fontWeight: '900', borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '8px' }}>ابعاد نهایی (Overall)</div>
                                          <div style={{ fontSize: '24px', fontWeight: '900', direction: 'ltr', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                              <span style={{fontSize: '16px'}}>↔</span> {toPersianDigits(item.config.width)}
                                          </div>
                                          <div style={{ fontSize: '12px', margin: '4px 0', fontWeight: 'bold' }}>×</div>
                                          <div style={{ fontSize: '24px', fontWeight: '900', direction: 'ltr', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                              <span style={{fontSize: '16px'}}>↕</span> {toPersianDigits(item.config.height)}
                                          </div>
                                        </div>
                                        
                                        <div style={{ flex: 1, border: '1px solid #000', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          <div style={{ fontSize: '10px', fontWeight: '900', borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '2px' }}>مشخصات فنی</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>شماره یونیت:</span><span style={{ fontWeight: '900' }}>{toPersianDigits(unitNumber)}</span></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>تعداد کل:</span><span style={{ fontWeight: '900' }}>{toPersianDigits(item.quantity)} عدد</span></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>سیستم پروفیل:</span><span style={{ fontWeight: '900' }}>{brandName}</span></div>
                                        </div>
                                      </div>

                                      {/* Right Column (Drawing) - WITH SCALING FIX */}
                                      <div style={{
                                          backgroundColor: '#ffffff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          padding: '20px',
                                          position: 'relative',
                                          border: '1px solid #000',
                                          borderRadius: '8px',
                                          overflow: 'hidden'
                                      }}>
                                          <div style={{
                                              position: 'relative',
                                              width: '100%',
                                              height: '100%',
                                              maxWidth: unitRatio > 1 ? '100%' : `${unitRatio * 100}%`,
                                              maxHeight: unitRatio <= 1 ? '100%' : `${(1 / unitRatio) * 100}%`
                                          }}>
                                            <WindowCanvas 
                                                node={item.config.layout!} 
                                                width={item.config.width} 
                                                height={item.config.height} 
                                                selectedId={null} 
                                                onSelect={() => {}} 
                                                onUpdateNode={() => {}} 
                                                isRoot={true}
                                                readOnly={true} 
                                                isThumbnail={true} 
                                                scale={0.45} 
                                                showDimensions={false} 
                                                frameType={item.config.frameType}
                                            />
                                          </div>
                                      </div>
                                    </div>
                                    
                                    <div style={{ marginTop: '15px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #000' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#000', color: '#fff' }}>
                                                    <th style={{ padding: '5px', textAlign: 'right', border: '1px solid #000' }}>قطعات اصلی فریم (Critical Cut Sizes)</th>
                                                    <th style={{ padding: '5px', textAlign: 'center', border: '1px solid #000', width: '100px' }}>طول برش (mm)</th>
                                                    <th style={{ padding: '5px', textAlign: 'center', border: '1px solid #000', width: '80px' }}>تعداد</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '5px 8px', border: '1px solid #000', fontWeight: 'bold', fontFamily: 'Vazirmatn' }}>فریم افقی (Frame Width)</td>
                                                    <td style={{ padding: '5px', textAlign: 'center', border: '1px solid #000', fontWeight: '900', fontFamily: 'monospace', fontSize: '13px' }}>{toPersianDigits(item.config.width)}</td>
                                                    <td style={{ padding: '5px', textAlign: 'center', border: '1px solid #000', fontWeight: '900' }}>{toPersianDigits(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '5px 8px', border: '1px solid #000', fontWeight: 'bold', fontFamily: 'Vazirmatn' }}>فریم عمودی (Frame Height)</td>
                                                    <td style={{ padding: '5px', textAlign: 'center', border: '1px solid #000', fontWeight: '900', fontFamily: 'monospace', fontSize: '13px' }}>{toPersianDigits(item.config.height)}</td>
                                                    <td style={{ padding: '5px', textAlign: 'center', border: '1px solid #000', fontWeight: '900' }}>{toPersianDigits(2)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                  </div>
                                )
                            })}
                        </div>

                        {/* FOOTER: QC SIGNATURES */}
                        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '3px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '9px', color: '#000', fontWeight: '900', marginBottom: '4px' }}>کلیه ابعاد خالص برش (mm) لحاظ شده است.</div>
                                <div style={{ fontSize: '12px', fontWeight: '900', color: '#fff', backgroundColor: '#000', padding: '4px 12px', borderRadius: '8px' }}>
                                    صفحه {toPersianDigits(pIdx + 1)} از {toPersianDigits(pagesItems.length)}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '40px' }}>
                                <div style={{ width: '180px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#000', marginBottom: '30px' }}>امضای سرپرست کارگاه:</div>
                                    <div style={{ borderBottom: '1px dashed #000', width: '100%' }}></div>
                                </div>
                                <div style={{ width: '180px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#000', marginBottom: '30px' }}>تاییدیه کیفیت ابعاد (QC):</div>
                                    <div style={{ borderBottom: '1px dashed #000', width: '100%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                  ));
              })()}
          </div>

          <div ref={labelsRef} style={{ width: '794px' }}>
              {(() => {
                  const labelPages = [];
                  for (let i = 0; i < allGlassPanes.length; i += 8) labelPages.push(allGlassPanes.slice(i, i + 8));
                  return labelPages.map((page, pIdx) => (
                      <div key={pIdx} className="label-page" style={{ width: '794px', height: '1123px', padding: '20px', backgroundColor: '#fff', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(4, 1fr)', gap: '15px', direction: 'rtl' }}>
                          {page.map((glass, gIdx) => (
                              <div key={gIdx} style={{ border: '2.5px solid #000', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '15px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                                      <span style={{ fontSize: '12px', fontWeight: '900', color: '#000' }}>{settings?.invoice.companyName || 'NEXWIN'}</span>
                                      <span style={{ fontSize: '9px', fontWeight: '900', color: '#000' }}>GLASS LABEL v4.9</span>
                                  </div>
                                  <div style={{ textAlign: 'center', padding: '15px 0' }}>
                                      <div style={{ fontSize: '45px', fontWeight: '900', color: '#000' }}>{toPersianDigits(glass.w)} × {toPersianDigits(glass.h)}</div>
                                      <div style={{ fontSize: '11px', fontWeight: '900', color: '#000' }}>ابعاد خالص شیشه (mm)</div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid #000', paddingTop: '10px' }}>
                                      <div style={{ fontSize: '11px', fontWeight: '900', color: '#000' }}>
                                          <div>مشتری: {selectedProject?.customerName}</div>
                                          <div style={{ color: '#000', marginTop: '3px' }}>یونیت: {toPersianDigits(glass.unitId)} | {glass.name}</div>
                                      </div>
                                      <QrCode size={40} color="#000" strokeWidth={1.5} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  ));
              })()}
          </div>
      </div>

      <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-40 border-b border-slate-100">
        <div className="flex items-center justify-between">
           <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-slate-50 rounded-2xl text-slate-700 active:scale-90 transition-transform"><ArrowRight size={20}/></button>
           <div className="text-center">
               <h1 className="text-xl font-black text-slate-900 tracking-tight">کنترل تولید (NexWin)</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Workshop Control Center</p>
           </div>
           <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl animate-pulse"><Activity size={20}/></div>
        </div>
      </div>

      <div className="p-6">
          <div className="mb-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">انتخاب پروژه جهت خروجی فنی</h3>
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
                            <h4 className="font-black text-base mb-1">{p.customerName}</h4>
                            {p.customerPhone && (
                                <p className="text-[10px] font-bold opacity-80 mb-1" dir="ltr" style={{ textAlign: 'right' }}>📞 {toPersianDigits(p.customerPhone)}</p>
                            )}
                            <p className="text-[10px] font-bold opacity-60 mb-4 truncate">{p.address || 'بدون آدرس'}</p>
                            <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${p.status === 'Production' ? 'bg-amber-100 text-amber-600' : p.status === 'Produced' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {p.status === 'Production' ? 'Ready' : p.status === 'Produced' ? 'Done' : 'Draft'}
                                </span>
                                <span className="text-[10px] font-black">{toPersianDigits(p.items.length)} یونیت</span>
                            </div>
                        </button>
                    ))
                  )}
              </div>
          </div>

          <AnimatePresence>
            {selectedProject && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <GlassCard onClick={() => setActiveTab('blueprints')} className="flex flex-col items-center justify-center gap-4 py-12 border-indigo-100 bg-indigo-50/5 cursor-pointer active:scale-95 transition-transform">
                          <div className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-200"><Layout size={32}/></div>
                          <div className="text-center">
                            <h3 className="font-black text-slate-900 text-sm">دفترچه فنی یونیت‌ها</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Technical Blueprints</p>
                          </div>
                      </GlassCard>
                      <GlassCard onClick={() => setActiveTab('labels')} className="flex flex-col items-center justify-center gap-4 py-12 border-emerald-100 bg-emerald-50/5 cursor-pointer active:scale-95 transition-transform">
                          <div className="p-5 bg-emerald-600 text-white rounded-[2rem] shadow-xl shadow-emerald-200"><Grid size={32}/></div>
                          <div className="text-center">
                            <h3 className="font-black text-slate-900 text-sm">چاپ برچسب شیشه</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Glass Labels</p>
                          </div>
                      </GlassCard>
                      <GlassCard onClick={() => setActiveTab('analysis')} className="flex flex-col items-center justify-center gap-4 py-12 border-rose-100 bg-rose-50/5 cursor-pointer active:scale-95 transition-transform">
                          <div className="p-5 bg-rose-600 text-white rounded-[2rem] shadow-xl shadow-rose-200"><ShieldCheck size={32}/></div>
                          <div className="text-center">
                            <h3 className="font-black text-slate-900 text-sm">تایید نهایی و خروج</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Production Completion</p>
                          </div>
                      </GlassCard>
                  </div>

                  {activeTab === 'blueprints' && (
                      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                          <div className="flex justify-between items-center">
                              <h3 className="font-black text-slate-800 text-base">پیش‌نمایش دفترچه فنی (Industrial)</h3>
                              <PrimaryButton onClick={downloadBlueprints} loading={isGenerating} icon={Download}>دریافت فایل PDF</PrimaryButton>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {selectedProject.items.map((item, idx) => (
                                  <div key={idx} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col items-center gap-2">
                                      <div className="w-20 h-20 flex items-center justify-center relative bg-white rounded-xl">
                                        <WindowCanvas 
                                            node={item.config.layout!} 
                                            width={item.config.width} 
                                            height={item.config.height} 
                                            selectedId={null} 
                                            onSelect={() => {}} 
                                            onUpdateNode={() => {}} 
                                            isRoot={true} 
                                            readOnly={true} 
                                            isThumbnail={true} 
                                            scale={0.12} 
                                            showDimensions={false} 
                                            frameType={item.config.frameType}
                                        />
                                      </div>
                                      <span className="text-[9px] font-black text-slate-400">یونیت {toPersianDigits(idx + 1)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {activeTab === 'labels' && (
                      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
                           <div className="flex justify-between items-center">
                              <h3 className="font-black text-slate-800 text-base">سیستم برچسب‌زنی نکس‌وین</h3>
                              <PrimaryButton onClick={downloadLabels} loading={isGenerating} icon={Printer}>چاپ لیبل‌ها</PrimaryButton>
                          </div>
                          <div className="p-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center">
                             <QrCode size={40} className="text-emerald-600 mb-4" />
                             <span className="text-xs font-black text-slate-600">آماده‌سازی {toPersianDigits(allGlassPanes.length)} قطعه شیشه جهت چاپ لیبل</span>
                          </div>
                      </div>
                  )}
              </motion.div>
            )}
          </AnimatePresence>
      </div>

      <AnimatePresence>
          {activeTab === 'analysis' && analysisReport && (
              <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-white w-full max-w-2xl rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                      <div className="flex justify-between items-center mb-8">
                         <div className="flex items-center gap-3">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><ShieldCheck size={24}/></div>
                            <h2 className="text-xl font-black text-slate-900">تایید تولید نهایی</h2>
                         </div>
                         <button onClick={() => setActiveTab(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={24}/></button>
                      </div>

                      <div className="space-y-3 mb-8">
                          {Object.keys(analysisReport || {}).length === 0 ? (
                              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 font-bold text-xs">
                                  ⚠️ هیچ متریال یا یراقی برای محاسبات انبار این پروژه یافت نشد.
                              </div>
                          ) : (
                              (Object.entries(analysisReport) as [string, any][]).map(([name, data]) => (
                                  <div key={name} className={`flex items-center justify-between p-5 rounded-2xl border ${data.isShort ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                                      <div className="flex items-center gap-4">
                                          {data.isShort ? <AlertTriangle size={18} className="text-rose-500" /> : <CheckCircle2 size={18} className="text-emerald-500" />}
                                          <div>
                                              <h4 className="text-sm font-black text-slate-800">{name}</h4>
                                              <p className="text-[10px] text-slate-400 font-black uppercase mt-0.5">مقدار کل: {toPersianDigits(Math.ceil(data.req))} {data.unit}</p>
                                          </div>
                                      </div>
                                      <div className="text-left">
                                          <div className={`text-sm font-black ${data.isShort ? 'text-rose-600' : 'text-slate-900'}`}>انبار: {toPersianDigits(Math.floor(data.stock))}</div>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>

                      <div className="flex gap-4">
                        <button onClick={() => navigate('/inventory')} className="flex-1 bg-slate-100 text-slate-700 py-5 rounded-2xl font-black text-sm active:scale-95 transition-all">بررسی انبار</button>
                        <button 
                            disabled={selectedProject?.status === 'Produced' || isProcessingProduction}
                            onClick={handleConfirmProduction}
                            className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isProcessingProduction ? <Loader2 className="animate-spin" size={20}/> : <Package size={20} />}
                            {selectedProject?.status === 'Produced' ? 'قبلاً تولید شده' : 'تایید و کسر از موجودی'}
                        </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};
