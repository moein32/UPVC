
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Scissors, Plus, Trash2, Calculator, RefreshCw, Layers, Grid, FileText, Download, Settings as SettingsIcon, Package, Ruler, Maximize, AlertCircle, CheckCircle2, ChevronDown, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputField, PrimaryButton, GlassCard, SelectField } from '../components/UIComponents';
import { toPersianDigits, formatPrice, toEnglishDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { SavedProject, InvoiceItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

type OptMode = 'profile' | 'glass';

interface CutItem {
  id: string;
  length: number;
  width?: number; 
  quantity: number;
  label: string;
  type: 'Frame' | 'Sash' | 'Mullion' | 'Bead';
  angle: '45/45' | '90/90' | '45/90';
  unitId: string;
}

interface OptimizedBar {
  id: number;
  items: CutItem[];
  usedLength: number;
  waste: number;
  isReusable: boolean; // Waste > 500mm
}

interface SheetRect {
  x: number; y: number; w: number; h: number; item?: CutItem;
}

interface OptimizedSheet {
  id: number;
  rects: SheetRect[];
  efficiency: number;
  usedArea: number;
}

export const CuttingOptimization = () => {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<OptMode>('profile');
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Industrial Settings
  const [stockLength, setStockLength] = useState(6000);
  const [bladeKerf, setBladeKerf] = useState(4);
  const [minReusableWaste, setMinReusableWaste] = useState(500);
  const [glassSheetW, setGlassSheetW] = useState(3210);
  const [glassSheetH, setGlassSheetH] = useState(2250);
  const [glassTrim, setGlassTrim] = useState(15);
  const [glassOverlap, setGlassOverlap] = useState(8); // Standard UPVC overlap

  const [profileList, setProfileList] = useState<CutItem[]>([]);
  const [glassList, setGlassList] = useState<CutItem[]>([]);
  const [optimizedBars, setOptimizedBars] = useState<OptimizedBar[]>([]);
  const [optimizedSheets, setOptimizedSheets] = useState<OptimizedSheet[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    setProjects(pricingStore.getProjects());
  }, []);

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    const project = projects.find(p => p.id === id);
    if (!project) return;

    if (activeMode === 'profile') {
      const extracted: CutItem[] = [];
      project.items.forEach((unit, idx) => {
        const uId = toPersianDigits(idx + 1);
        // Standard Profile Extraction logic
        extracted.push({ id: Math.random().toString(), length: unit.config.width, quantity: unit.quantity * 2, label: `W${uId}-H`, type: 'Frame', angle: '45/45', unitId: uId });
        extracted.push({ id: Math.random().toString(), length: unit.config.height, quantity: unit.quantity * 2, label: `W${uId}-V`, type: 'Frame', angle: '45/45', unitId: uId });
        
        if (unit.config.mullions > 0) {
            extracted.push({ id: Math.random().toString(), length: unit.config.height - 80, quantity: unit.quantity * unit.config.mullions, label: `M${uId}`, type: 'Mullion', angle: '90/90', unitId: uId });
        }
      });
      setProfileList(extracted);
    } else {
      const extracted: CutItem[] = [];
      project.items.forEach((unit, idx) => {
          const uId = toPersianDigits(idx + 1);
          // Standard Glass Dimension Logic: Opening + (2 * Overlap)
          extracted.push({
            id: Math.random().toString(),
            width: (unit.config.width / (unit.config.mullions + 1)) - 40 + (2 * glassOverlap),
            length: unit.config.height - 80 + (2 * glassOverlap),
            quantity: unit.quantity * 2,
            label: `G${uId}`,
            type: 'Sash', angle: '90/90', unitId: uId
          });
      });
      setGlassList(extracted);
    }
  };

  // --- Advanced 1D Bin Packing ---
  const optimizeProfiles = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const allPieces: CutItem[] = [];
      profileList.forEach(item => {
        for (let i = 0; i < item.quantity; i++) allPieces.push({ ...item, quantity: 1 });
      });

      allPieces.sort((a, b) => b.length - a.length);

      const bars: OptimizedBar[] = [];
      allPieces.forEach(piece => {
        let placed = false;
        for (const bar of bars) {
          if (bar.usedLength + piece.length + bladeKerf <= stockLength) {
            bar.items.push(piece);
            bar.usedLength += piece.length + bladeKerf;
            bar.waste = stockLength - bar.usedLength;
            bar.isReusable = bar.waste >= minReusableWaste;
            placed = true;
            break;
          }
        }
        if (!placed) {
          bars.push({
            id: bars.length + 1,
            items: [piece],
            usedLength: piece.length,
            waste: stockLength - piece.length,
            isReusable: (stockLength - piece.length) >= minReusableWaste
          });
        }
      });
      setOptimizedBars(bars);
      setIsCalculating(false);
    }, 800);
  };

  // --- Guillotine-Style 2D Packing ---
  const optimizeGlass = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const pieces: CutItem[] = [];
      glassList.forEach(p => {
          for(let i=0; i<p.quantity; i++) pieces.push({...p, quantity: 1});
      });
      
      pieces.sort((a, b) => b.length - a.length);

      const usableW = glassSheetW - (glassTrim * 2);
      const usableH = glassSheetH - (glassTrim * 2);
      const sheets: OptimizedSheet[] = [];
      
      let currentSheetRects: SheetRect[] = [];
      let currentX = 0, currentY = 0, shelfH = 0, currentUsedArea = 0;

      pieces.forEach(p => {
          const w = Math.max(p.width!, p.length);
          const h = Math.min(p.width!, p.length);
          
          if (currentX + w > usableW) {
              currentX = 0;
              currentY += shelfH;
              shelfH = 0;
          }

          if (currentY + h > usableH) {
              sheets.push({ 
                  id: sheets.length + 1, 
                  rects: currentSheetRects, 
                  usedArea: currentUsedArea, 
                  efficiency: (currentUsedArea / (usableW * usableH)) * 100 
              });
              currentSheetRects = [];
              currentX = 0; currentY = 0; shelfH = 0; currentUsedArea = 0;
          }

          currentSheetRects.push({ x: currentX, y: currentY, w, h, item: p });
          currentUsedArea += (w * h);
          currentX += w;
          shelfH = Math.max(shelfH, h);
      });

      if (currentSheetRects.length > 0) {
        sheets.push({ id: sheets.length + 1, rects: currentSheetRects, usedArea: currentUsedArea, efficiency: (currentUsedArea / (usableW * usableH)) * 100 });
      }

      setOptimizedSheets(sheets);
      setIsCalculating(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-40 font-['Vazirmatn']">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .print-container { width: 100% !important; margin: 0 !important; display: block !important; }
          .page-break { page-break-after: always; }
          .bar-view { border: 1px solid #000 !important; margin-bottom: 10px; }
        }
      `}</style>

      {/* Industrial Header */}
      <div className="no-print bg-slate-900 text-white px-6 pt-12 pb-8 shadow-2xl sticky top-0 z-50 rounded-b-[2.5rem]">
        <div className="flex items-center justify-between mb-8">
           <button onClick={() => navigate('/dashboard')} className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-transform"><ArrowRight size={22}/></button>
           <div className="text-center">
                <h1 className="text-xl font-black tracking-tight">موتور بهینه‌سازی لومینا</h1>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">MasterWin Calculation Engine v4.0</p>
           </div>
           <button onClick={() => window.print()} className="p-3 bg-blue-600 rounded-2xl shadow-lg active:scale-90 transition-transform"><Download size={22}/></button>
        </div>

        <div className="flex bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10">
            <button 
                onClick={() => { setActiveMode('profile'); setOptimizedBars([]); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeMode === 'profile' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}
            >
                <Scissors size={18} /> پروفیل (1D)
            </button>
            <button 
                onClick={() => { setActiveMode('glass'); setOptimizedSheets([]); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeMode === 'glass' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}
            >
                <Grid size={18} /> شیشه (2D)
            </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Source & Config */}
        <section className="no-print grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="border-blue-100">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Package size={20}/></div>
                    <h3 className="font-black text-slate-800 text-sm">انتخاب پروژه مرجع</h3>
                </div>
                <SelectField 
                    label="پروژه هدف"
                    value={selectedProjectId}
                    onChange={(e: any) => handleProjectSelect(e.target.value)}
                    options={[
                        { label: 'یک پروژه را انتخاب کنید...', value: '' },
                        ...projects.map(p => ({ label: `${p.customerName} - ${toPersianDigits(p.items.length)} ردیف`, value: p.id }))
                    ]}
                />
            </GlassCard>

            <GlassCard className="border-slate-200">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-xl"><SettingsIcon size={20}/></div>
                    <h3 className="font-black text-slate-800 text-sm">تنظیمات متریال</h3>
                </div>
                {activeMode === 'profile' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="طول شاخه (mm)" type="number" value={stockLength} onChange={(e:any) => setStockLength(Number(toEnglishDigits(e.target.value)))} />
                        <InputField label="تیغه اره (mm)" type="number" value={bladeKerf} onChange={(e:any) => setBladeKerf(Number(toEnglishDigits(e.target.value)))} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="هم‌پوشانی (Overlap)" type="number" value={glassOverlap} onChange={(e:any) => setGlassOverlap(Number(toEnglishDigits(e.target.value)))} />
                        <InputField label="لبه جام (Trim)" type="number" value={glassTrim} onChange={(e:any) => setGlassTrim(Number(toEnglishDigits(e.target.value)))} />
                    </div>
                )}
            </GlassCard>
        </section>

        {/* Action Button */}
        <div className="no-print">
            <PrimaryButton 
                fullWidth 
                loading={isCalculating}
                onClick={activeMode === 'profile' ? optimizeProfiles : optimizeGlass}
                icon={RefreshCw}
                className="h-16 rounded-[1.5rem] shadow-2xl"
            >
                شروع محاسبات هوشمند
            </PrimaryButton>
        </div>

        {/* Results: Profile Visuals */}
        <AnimatePresence mode="wait">
            {activeMode === 'profile' && optimizedBars.length > 0 && (
                <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 print-container">
                    <div className="flex justify-between items-end px-2 no-print">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">نقشه برش شاخه‌ای</h2>
                        <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">تعداد شاخه: {toPersianDigits(optimizedBars.length)} عدد</div>
                    </div>

                    <div className="space-y-4">
                        {optimizedBars.map((bar, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm bar-view overflow-hidden">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">{toPersianDigits(idx + 1)}</div>
                                        <span className="text-[11px] font-black text-slate-700">شاخه ۶ متری استاندارد</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-[10px] font-bold text-slate-400">ضایعات: {toPersianDigits(bar.waste)}mm</div>
                                        {bar.isReusable && <div className="text-[10px] font-black text-blue-600 flex items-center gap-1"><Info size={12}/> قابل استفاده مجدد</div>}
                                    </div>
                                </div>
                                <div className="h-14 w-full bg-slate-100 rounded-2xl flex border border-slate-200/50 relative overflow-hidden">
                                    {bar.items.map((piece, pIdx) => (
                                        <div 
                                            key={pIdx}
                                            className="h-full bg-blue-600 border-r border-white/20 flex flex-col items-center justify-center overflow-hidden relative group"
                                            style={{ width: `${(piece.length / stockLength) * 100}%` }}
                                        >
                                            <span className="text-[8px] text-white font-black">{toPersianDigits(piece.length)}</span>
                                            <span className="text-[6px] text-blue-200 font-bold opacity-0 group-hover:opacity-100 transition-opacity">{piece.label}</span>
                                            {/* Industrial Cut Indicators */}
                                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40"></div>
                                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40"></div>
                                        </div>
                                    ))}
                                    <div className={`flex-1 h-full flex items-center justify-center text-[8px] font-black ${bar.isReusable ? 'bg-blue-50 text-blue-400' : 'bg-rose-50 text-rose-300'}`}>
                                        {bar.isReusable ? 'Offcut' : 'Waste'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>
            )}

            {/* Results: Glass Visuals */}
            {activeMode === 'glass' && optimizedSheets.length > 0 && (
                <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 print-container">
                    {optimizedSheets.map((sheet, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl page-break">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">{toPersianDigits(idx + 1)}</div>
                                    <div>
                                        <h4 className="font-black text-slate-900">نقشه چیدمان جام شیشه</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Guillotine Nesting Plan</p>
                                    </div>
                                </div>
                                <div className="text-left px-5 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 block mb-0.5">راندمان جام</span>
                                    <span className="text-sm font-black text-emerald-600">{toPersianDigits(sheet.efficiency.toFixed(1))}%</span>
                                </div>
                            </div>

                            <div className="relative mx-auto bg-slate-900 rounded-[1.5rem] overflow-hidden shadow-inner border-[10px] border-slate-200" 
                                 style={{ width: '100%', paddingBottom: `${(glassSheetH / glassSheetW) * 100}%` }}>
                                
                                {sheet.rects.map((rect, rIdx) => (
                                    <div 
                                        key={rIdx}
                                        className="absolute bg-emerald-500/20 border border-emerald-500/40 flex flex-col items-center justify-center overflow-hidden hover:bg-emerald-500/30 transition-all"
                                        style={{
                                            left: `${((rect.x + glassTrim) / glassSheetW) * 100}%`,
                                            top: `${((rect.y + glassTrim) / glassSheetH) * 100}%`,
                                            width: `${(rect.w / glassSheetW) * 100}%`,
                                            height: `${(rect.h / glassSheetH) * 100}%`
                                        }}
                                    >
                                        <span className="text-[8px] md:text-[10px] font-black text-emerald-900 leading-none">
                                            {toPersianDigits(Math.round(rect.w))} × {toPersianDigits(Math.round(rect.h))}
                                        </span>
                                        <span className="text-[6px] text-emerald-700/60 mt-1 font-bold">{rect.item?.label}</span>
                                    </div>
                                ))}
                                
                                {/* Trim zone */}
                                <div className="absolute inset-0 border border-dashed border-white/10 pointer-events-none" style={{ margin: `${(glassTrim / glassSheetW) * 100}%` }}></div>
                            </div>

                            <div className="mt-8 grid grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                                <div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">تعداد قطعه</span>
                                    <span className="text-xs font-black text-slate-900">{toPersianDigits(sheet.rects.length)} عدد</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">مساحت مفید</span>
                                    <span className="text-xs font-black text-slate-900">{toPersianDigits((sheet.usedArea / 1000000).toFixed(2))} m²</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">ابعاد جام</span>
                                    <span className="text-xs font-black text-slate-900" style={{ direction: 'ltr' }}>{toPersianDigits(glassSheetW)} * {toPersianDigits(glassSheetH)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.section>
            )}
        </AnimatePresence>
      </div>

      {/* Floating BOM & Export Summary */}
      <div className="no-print fixed bottom-0 left-0 right-0 z-40 p-6 pointer-events-none">
          <div className="max-w-xl mx-auto pointer-events-auto">
              <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between">
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 size={16} className="text-blue-400" />
                          <span className="text-[10px] font-black text-slate-400 uppercase">خلاصه لیست متریال (BOM)</span>
                      </div>
                      <div className="flex gap-6">
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-white">{toPersianDigits(activeMode === 'profile' ? optimizedBars.length : optimizedSheets.length)}</span>
                            <span className="text-[10px] text-slate-500">{activeMode === 'profile' ? 'شاخه' : 'جام'}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-blue-400">
                                {activeMode === 'profile' ? 
                                    toPersianDigits((optimizedBars.reduce((a, b) => a + b.usedLength, 0) / 1000).toFixed(1)) : 
                                    toPersianDigits((optimizedSheets.reduce((a, b) => a + b.usedArea, 0) / 1000000).toFixed(1))}
                            </span>
                            <span className="text-[10px] text-slate-500">{activeMode === 'profile' ? 'متر' : 'm²'}</span>
                        </div>
                      </div>
                  </div>
                  <button 
                    onClick={() => window.print()}
                    className="bg-blue-600 h-14 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
                  >
                      <Download size={20} /> خروجی PDF
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

const TabBtn = ({ id, label, icon: Icon, active, onClick, color }: any) => {
    const isSelected = active === id;
    return (
        <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-5 py-3 rounded-xl whitespace-nowrap text-xs font-black transition-all ${isSelected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-white/10'}`}>
            <Icon size={18} /> {label}
        </button>
    );
};
