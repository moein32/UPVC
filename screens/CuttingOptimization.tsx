
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Scissors, Plus, Trash2, Calculator, Save, RefreshCw, Layers, Grid, FileText, Download, ChevronRight, Settings as SettingsIcon, Package, Maximize2, Ruler, Layout, CheckCircle2, AlertCircle, Maximize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputField, PrimaryButton, GlassCard, SelectField } from '../components/UIComponents';
import { toPersianDigits, formatPrice, toEnglishDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { SavedProject } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

type OptMode = 'profile' | 'glass';

interface CutItem {
  id: string;
  length: number;
  width?: number; // Only for 2D glass
  quantity: number;
  label?: string;
  type?: string; 
}

interface BarResult {
  items: CutItem[];
  waste: number;
  usedLength: number;
}

interface SheetResult {
  id: string;
  panes: { x: number, y: number, w: number, h: number, item: CutItem }[];
  usedArea: number;
  totalArea: number;
}

export const CuttingOptimization = () => {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<OptMode>('profile');
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Settings
  const [stockLength, setStockLength] = useState(6000);
  const [bladeWidth, setBladeWidth] = useState(4);
  const [glassSheetW, setGlassSheetW] = useState(3210);
  const [glassSheetH, setGlassSheetH] = useState(2250);
  const [glassTrim, setGlassTrim] = useState(15);
  
  // Data State
  const [profileItems, setProfileItems] = useState<CutItem[]>([]);
  const [glassItems, setGlassItems] = useState<CutItem[]>([]);
  
  // Calculation Results
  const [optimizedBars, setOptimizedBars] = useState<BarResult[]>([]);
  const [optimizedSheets, setOptimizedSheets] = useState<SheetResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    setProjects(pricingStore.getProjects());
  }, []);

  // --- Data Extraction from Projects ---
  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    const project = projects.find(p => p.id === id);
    if (!project) return;

    if (activeMode === 'profile') {
      const extracted: CutItem[] = [];
      project.items.forEach(unit => {
        // Extract lengths from unit config (width & height segments)
        const frameW = unit.config.width;
        const frameH = unit.config.height;
        
        // Mock extraction: typically 2 of each per unit
        extracted.push({ id: Math.random().toString(), length: frameW, quantity: unit.quantity * 2, label: `عرض-${unit.id.slice(-3)}`, type: 'Frame' });
        extracted.push({ id: Math.random().toString(), length: frameH, quantity: unit.quantity * 2, label: `ارتفاع-${unit.id.slice(-3)}`, type: 'Frame' });
        
        // Add mullions if any
        if (unit.config.mullions > 0) {
            extracted.push({ id: Math.random().toString(), length: frameH - 80, quantity: unit.quantity * unit.config.mullions, label: `مولیون-${unit.id.slice(-3)}`, type: 'Mullion' });
        }
      });
      setProfileItems(extracted);
    } else {
      const extracted: CutItem[] = [];
      project.items.forEach(unit => {
          // Glass area roughly 40mm less than unit size for frame profile
          extracted.push({
            id: Math.random().toString(),
            width: unit.config.width - 80,
            length: unit.config.height - 80,
            quantity: unit.quantity * 2, // Double glazed
            label: `شیشه-${unit.id.slice(-3)}`
          });
      });
      setGlassItems(extracted);
    }
  };

  // --- 1D Bin Packing (First Fit Decreasing) ---
  const run1DOptimization = () => {
    setIsCalculating(true);
    setOptimizedBars([]);
    
    setTimeout(() => {
      // Flatten items into single pieces
      const allCuts: CutItem[] = [];
      profileItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) allCuts.push({ ...item, quantity: 1 });
      });

      // Sort descending
      allCuts.sort((a, b) => b.length - a.length);

      const bars: BarResult[] = [];
      allCuts.forEach(cut => {
        if (cut.length > stockLength) return; // Error handling for oversized
        
        let placed = false;
        for (const bar of bars) {
          if (bar.usedLength + cut.length + bladeWidth <= stockLength) {
            bar.items.push(cut);
            bar.usedLength += cut.length + bladeWidth;
            bar.waste = stockLength - bar.usedLength;
            placed = true;
            break;
          }
        }
        
        if (!placed) {
          bars.push({
            items: [cut],
            usedLength: cut.length,
            waste: stockLength - cut.length
          });
        }
      });

      setOptimizedBars(bars);
      setIsCalculating(false);
    }, 600);
  };

  // --- 2D Packing (Shelf-based Next Fit) ---
  const run2DOptimization = () => {
    setIsCalculating(true);
    setOptimizedSheets([]);

    setTimeout(() => {
      const allPanes: CutItem[] = [];
      glassItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          // Normalize: Width is the larger dimension
          const w = Math.max(item.width || 0, item.length);
          const h = Math.min(item.width || 0, item.length);
          allPanes.push({ ...item, width: w, length: h, quantity: 1 });
        }
      });

      allPanes.sort((a, b) => b.length - a.length);

      const usableW = glassSheetW - (glassTrim * 2);
      const usableH = glassSheetH - (glassTrim * 2);

      const sheets: SheetResult[] = [];
      let currentSheet: SheetResult = { id: '1', panes: [], usedArea: 0, totalArea: usableW * usableH };
      let currentX = 0;
      let currentY = 0;
      let shelfH = 0;

      allPanes.forEach(pane => {
        if (pane.width! > usableW || pane.length > usableH) return;

        // Start new shelf?
        if (currentX + pane.width! > usableW) {
          currentX = 0;
          currentY += shelfH;
          shelfH = 0;
        }

        // Start new sheet?
        if (currentY + pane.length > usableH) {
          sheets.push(currentSheet);
          currentSheet = { id: (sheets.length + 1).toString(), panes: [], usedArea: 0, totalArea: usableW * usableH };
          currentX = 0;
          currentY = 0;
          shelfH = 0;
        }

        currentSheet.panes.push({ x: currentX, y: currentY, w: pane.width!, h: pane.length, item: pane });
        currentSheet.usedArea += (pane.width! * pane.length);
        currentX += pane.width!;
        shelfH = Math.max(shelfH, pane.length);
      });

      sheets.push(currentSheet);
      setOptimizedSheets(sheets);
      setIsCalculating(false);
    }, 1000);
  };

  const handleManualAdd = () => {
    const newItem = { id: Math.random().toString(), length: 1000, width: 800, quantity: 1, label: 'سفارشی' };
    if (activeMode === 'profile') setProfileItems([...profileItems, newItem]);
    else setGlassItems([...glassItems, newItem]);
  };

  const removeItem = (id: string) => {
    if (activeMode === 'profile') setProfileItems(profileItems.filter(i => i.id !== id));
    else setGlassItems(glassItems.filter(i => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-['Vazirmatn']">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-section { display: block !important; width: 100% !important; margin: 0 !important; }
          .bar-visual { border: 1px solid #000 !important; }
          .sheet-container { page-break-after: always; padding: 0 !important; margin: 0 !important; }
        }
      `}</style>

      {/* Header & Mode Switcher */}
      <div className="no-print bg-white px-6 pt-12 pb-6 shadow-sm border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center justify-between mb-6">
           <button onClick={() => navigate('/dashboard')} className="p-3 bg-slate-50 rounded-2xl text-slate-700 active:scale-90 transition-transform"><ArrowRight size={20}/></button>
           <h1 className="text-xl font-black text-slate-900 tracking-tight">هاب بهینه‌سازی برش</h1>
           <button onClick={() => window.print()} className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg active:scale-90 transition-transform"><FileText size={20}/></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => setActiveMode('profile')}
                className={`flex flex-col items-center gap-2 py-4 rounded-[2rem] transition-all border-2 ${activeMode === 'profile' ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-white border-slate-100 text-slate-400'}`}
            >
                <Scissors size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">برش پروفیل (1D)</span>
            </button>
            <button 
                onClick={() => setActiveMode('glass')}
                className={`flex flex-col items-center gap-2 py-4 rounded-[2rem] transition-all border-2 ${activeMode === 'glass' ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'bg-white border-slate-100 text-slate-400'}`}
            >
                <Grid size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">برش شیشه (2D)</span>
            </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Source & Config Cards */}
        <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Package size={20} className="text-blue-500" />
                    <h2 className="font-black text-slate-800 text-sm uppercase">استخراج ابعاد از پروژه</h2>
                </div>
                <SelectField 
                    label="پروژه هدف"
                    value={selectedProjectId}
                    onChange={(e: any) => handleProjectSelect(e.target.value)}
                    options={[
                        { label: 'انتخاب پروژه...', value: '' },
                        ...projects.map(p => ({ label: `${p.customerName} (${toPersianDigits(p.items.length)} واحد)`, value: p.id }))
                    ]}
                />
            </GlassCard>

            <GlassCard className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <SettingsIcon size={20} className="text-slate-400" />
                    <h2 className="font-black text-slate-800 text-sm uppercase">پارامترهای فنی {activeMode === 'profile' ? 'پروفیل' : 'شیشه'}</h2>
                </div>
                {activeMode === 'profile' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="طول شاخه (mm)" type="number" value={stockLength} onChange={(e:any) => setStockLength(Number(toEnglishDigits(e.target.value)))} />
                        <InputField label="تیغه اره (mm)" type="number" value={bladeWidth} onChange={(e:any) => setBladeWidth(Number(toEnglishDigits(e.target.value)))} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="عرض جام (mm)" type="number" value={glassSheetW} onChange={(e:any) => setGlassSheetW(Number(toEnglishDigits(e.target.value)))} />
                            <InputField label="ارتفاع جام (mm)" type="number" value={glassSheetH} onChange={(e:any) => setGlassSheetH(Number(toEnglishDigits(e.target.value)))} />
                        </div>
                        <InputField label="حاشیه لبه (Trim)" type="number" value={glassTrim} onChange={(e:any) => setGlassTrim(Number(toEnglishDigits(e.target.value)))} />
                    </div>
                )}
            </GlassCard>
        </div>

        {/* Input List */}
        <section className="no-print space-y-4">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">لیست قطعات جهت بهینه‌سازی</h3>
                <button onClick={handleManualAdd} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 active:scale-95">
                    <Plus size={14} /> افزودن ردیف
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(activeMode === 'profile' ? profileItems : glassItems).map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4 group">
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400">L:</span>
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-50 border-none rounded-lg py-1 px-2 text-[11px] font-black text-slate-900"
                                    value={item.length}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        activeMode === 'profile' ? 
                                            setProfileItems(profileItems.map(i => i.id === item.id ? {...i, length: val} : i)) :
                                            setGlassItems(glassItems.map(i => i.id === item.id ? {...i, length: val} : i))
                                    }}
                                />
                            </div>
                            {activeMode === 'glass' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400">W:</span>
                                    <input 
                                        type="number" 
                                        className="w-full bg-slate-50 border-none rounded-lg py-1 px-2 text-[11px] font-black text-slate-900"
                                        value={item.width}
                                        onChange={(e) => setGlassItems(glassItems.map(i => i.id === item.id ? {...i, width: Number(e.target.value)} : i))}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="w-16">
                            <span className="text-[8px] font-black text-slate-400 block mb-1 text-center">تعداد</span>
                            <input 
                                type="number" 
                                className="w-full bg-blue-50 border-none rounded-lg py-1 px-2 text-[11px] font-black text-center text-blue-600"
                                value={item.quantity}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    activeMode === 'profile' ? 
                                        setProfileItems(profileItems.map(i => i.id === item.id ? {...i, quantity: val} : i)) :
                                        setGlassItems(glassItems.map(i => i.id === item.id ? {...i, quantity: val} : i))
                                }}
                            />
                        </div>
                        <button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                            <Trash2 size={16}/>
                        </button>
                    </div>
                ))}
            </div>

            <PrimaryButton 
                fullWidth 
                loading={isCalculating}
                onClick={activeMode === 'profile' ? run1DOptimization : run2DOptimization}
                icon={RefreshCw}
                className="h-16 rounded-[1.5rem] shadow-2xl"
            >
                محاسبه چیدمان بهینه
            </PrimaryButton>
        </section>

        {/* RESULTS: Profile View */}
        <AnimatePresence mode="wait">
            {activeMode === 'profile' && optimizedBars.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 print-section">
                    <div className="px-2">
                        <h2 className="text-sm font-black text-slate-900 uppercase">نتایج برش شاخه‌ای</h2>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">تعداد شاخه ۶ متری مورد نیاز: {toPersianDigits(optimizedBars.length)} عدد</p>
                    </div>
                    
                    <div className="space-y-4">
                        {optimizedBars.map((bar, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm bar-visual overflow-hidden">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs">{toPersianDigits(idx + 1)}</div>
                                        <span className="text-[11px] font-black text-slate-700 tracking-tight">شاخه استاندارد</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-[10px] font-bold text-emerald-600">مصرف: {toPersianDigits(bar.usedLength)}mm</div>
                                        <div className="text-[10px] font-bold text-rose-500">پرت: {toPersianDigits(bar.waste)}mm</div>
                                    </div>
                                </div>
                                <div className="h-12 w-full bg-slate-100 rounded-2xl flex border border-slate-200/50 relative overflow-hidden">
                                    {bar.items.map((cut, cIdx) => (
                                        <div 
                                            key={cIdx}
                                            className="h-full bg-blue-600 border-r border-white/20 flex flex-col items-center justify-center overflow-hidden"
                                            style={{ width: `${(cut.length / stockLength) * 100}%` }}
                                        >
                                            <span className="text-[8px] text-white font-black">{toPersianDigits(cut.length)}</span>
                                        </div>
                                    ))}
                                    <div className="flex-1 bg-rose-50 h-full flex items-center justify-center text-[8px] text-rose-400 font-black">Waste</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* RESULTS: Glass View */}
            {activeMode === 'glass' && optimizedSheets.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 print-section">
                    <div className="px-2">
                        <h2 className="text-sm font-black text-slate-900 uppercase">نتایج چیدمان جام شیشه</h2>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">تعداد جام مادر مورد نیاز: {toPersianDigits(optimizedSheets.length)} عدد</p>
                    </div>

                    <div className="grid grid-cols-1 gap-12">
                        {optimizedSheets.map((sheet, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl sheet-container">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner">{toPersianDigits(idx + 1)}</div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-base">نقشه برش جام مادر</h4>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">بازدهی جام: {toPersianDigits(((sheet.usedArea / (glassSheetW * glassSheetH)) * 100).toFixed(1))}٪</p>
                                        </div>
                                    </div>
                                    <div className="text-left bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">مساحت مصرفی</span>
                                        <span className="text-sm font-black text-emerald-600">{toPersianDigits((sheet.usedArea / 1000000).toFixed(2))} m²</span>
                                    </div>
                                </div>

                                <div className="relative mx-auto bg-slate-900/5 border-4 border-slate-200 rounded-[2rem] overflow-hidden shadow-inner" 
                                     style={{ 
                                         width: '100%', 
                                         paddingBottom: `${(glassSheetH / glassSheetW) * 100}%`,
                                         maxWidth: '800px'
                                     }}>
                                    {/* Trim/Margin Boundary */}
                                    <div className="absolute inset-0 border border-dashed border-rose-300 opacity-30" style={{ margin: `${(glassTrim / glassSheetW) * 100}%` }}></div>
                                    
                                    {sheet.panes.map((pane, pIdx) => (
                                        <div 
                                            key={pIdx}
                                            className="absolute bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-col items-center justify-center overflow-hidden hover:bg-emerald-500/20 transition-all cursor-pointer"
                                            style={{
                                                left: `${((pane.x + glassTrim) / glassSheetW) * 100}%`,
                                                top: `${((pane.y + glassTrim) / glassSheetH) * 100}%`,
                                                width: `${(pane.w / glassSheetW) * 100}%`,
                                                height: `${(pane.h / glassSheetH) * 100}%`
                                            }}
                                        >
                                            <span className="text-[7px] md:text-[9px] font-black text-emerald-800 leading-none">
                                                {toPersianDigits(pane.w)} × {toPersianDigits(pane.h)}
                                            </span>
                                            <span className="text-[6px] text-emerald-600/50 mt-1 uppercase font-bold tracking-tighter">{pane.item.label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 flex gap-8 items-center pt-6 border-t border-slate-50 opacity-60">
                                    <div className="flex items-center gap-2">
                                        <Ruler size={16} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500">ابعاد جام: {toPersianDigits(glassSheetW)}×{toPersianDigits(glassSheetH)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Maximize size={16} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500">حاشیه برش: {toPersianDigits(glassTrim)}mm</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Floating Action Bar */}
      <div className="no-print fixed bottom-0 left-0 right-0 z-50 p-6 pointer-events-none">
          <div className="max-w-xl mx-auto flex gap-4 pointer-events-auto">
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-16 h-16 bg-white border border-slate-200 text-slate-400 rounded-[1.5rem] flex items-center justify-center shadow-2xl active:scale-95 transition-all"
              >
                  <ArrowRight size={24} />
              </button>
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 text-white h-16 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
              >
                  <Download size={22} />
                  خروجی PDF نقشه برش
              </button>
          </div>
      </div>
    </div>
  );
};

const TabBtn = ({ id, label, icon: Icon, active, onClick }: any) => {
    const isSelected = active === id;
    return (
        <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-5 py-3 rounded-xl whitespace-nowrap text-xs font-black transition-all ${isSelected ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white'}`}>
            <Icon size={18} /> {label}
        </button>
    );
};
