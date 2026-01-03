
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Scissors, Plus, Trash2, Calculator, RefreshCw, Layers, Grid, FileText, Download, Settings as SettingsIcon, Package, Ruler, Maximize, AlertCircle, CheckCircle2, ChevronDown, Info, Square, Hash, AlignRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputField, PrimaryButton, GlassCard, SelectField } from '../components/UIComponents';
import { toPersianDigits, formatPrice, toEnglishDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { SavedProject, InvoiceItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

type OptMode = 'profile' | 'glass';
type ProfileType = 'Frame' | 'Sash' | 'Mullion' | 'Bead';

interface CutItem {
  id: string;
  length: number;
  width?: number; 
  quantity: number;
  label: string;
  type: ProfileType;
  angle: string;
  unitId: string;
}

interface OptimizedBar {
  id: number;
  type: ProfileType;
  items: CutItem[];
  usedLength: number;
  waste: number;
}

interface OptimizedSheet {
  id: number;
  rects: { x: number; y: number; w: number; h: number; item?: CutItem }[];
  efficiency: number;
  usedArea: number;
}

export const CuttingOptimization = () => {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<OptMode>('profile');
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Settings
  const [stockLength, setStockLength] = useState(6000);
  const [bladeKerf, setBladeKerf] = useState(4);
  const [glassSheetW, setGlassSheetW] = useState(3210);
  const [glassSheetH, setGlassSheetH] = useState(2250);
  const [glassTrim, setGlassTrim] = useState(15);
  
  // Lists
  const [profileList, setProfileList] = useState<CutItem[]>([]);
  const [glassList, setGlassList] = useState<CutItem[]>([]);
  
  // Optimization Results
  const [groupedBars, setGroupedBars] = useState<Record<ProfileType, OptimizedBar[]>>({
    Frame: [], Sash: [], Mullion: [], Bead: []
  });
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
        
        // 1. Frame pieces
        extracted.push({ id: Math.random().toString(), length: unit.config.width, quantity: unit.quantity * 2, label: `W${uId}`, type: 'Frame', angle: '45/45', unitId: uId });
        extracted.push({ id: Math.random().toString(), length: unit.config.height, quantity: unit.quantity * 2, label: `H${uId}`, type: 'Frame', angle: '45/45', unitId: uId });
        
        // 2. Sash pieces (if applicable)
        const sashCount = unit.calculations.sashCount;
        if (sashCount > 0) {
            extracted.push({ id: Math.random().toString(), length: unit.config.width - 45, quantity: unit.quantity * sashCount * 2, label: `SW${uId}`, type: 'Sash', angle: '45/45', unitId: uId });
            extracted.push({ id: Math.random().toString(), length: unit.config.height - 45, quantity: unit.quantity * sashCount * 2, label: `SH${uId}`, type: 'Sash', angle: '45/45', unitId: uId });
        }

        // 3. Mullions
        if (unit.config.mullions > 0) {
            extracted.push({ id: Math.random().toString(), length: unit.config.height - 70, quantity: unit.quantity * unit.config.mullions, label: `M${uId}`, type: 'Mullion', angle: '90/90', unitId: uId });
        }

        // 4. Beads
        extracted.push({ id: Math.random().toString(), length: unit.config.width - 90, quantity: unit.quantity * 2, label: `BW${uId}`, type: 'Bead', angle: '45/45', unitId: uId });
        extracted.push({ id: Math.random().toString(), length: unit.config.height - 90, quantity: unit.quantity * 2, label: `BH${uId}`, type: 'Bead', angle: '45/45', unitId: uId });
      });
      setProfileList(extracted);
    } else {
      const extracted: CutItem[] = [];
      project.items.forEach((unit, idx) => {
          extracted.push({
            id: Math.random().toString(),
            width: unit.config.width - 40,
            length: unit.config.height - 40,
            quantity: unit.quantity * 2,
            label: `G${toPersianDigits(idx + 1)}`,
            type: 'Sash', angle: '90/90', unitId: toPersianDigits(idx + 1)
          });
      });
      setGlassList(extracted);
    }
  };

  const run1DOptimization = (items: CutItem[]): OptimizedBar[] => {
    const pieces: CutItem[] = [];
    items.forEach(item => {
        for (let i = 0; i < item.quantity; i++) pieces.push({ ...item, quantity: 1 });
    });

    pieces.sort((a, b) => b.length - a.length);

    const bars: OptimizedBar[] = [];
    pieces.forEach(piece => {
      let placed = false;
      for (const bar of bars) {
        if (bar.usedLength + piece.length + bladeKerf <= stockLength) {
          bar.items.push(piece);
          bar.usedLength += piece.length + bladeKerf;
          bar.waste = stockLength - bar.usedLength;
          placed = true;
          break;
        }
      }
      if (!placed) {
        bars.push({
          id: bars.length + 1,
          type: piece.type,
          items: [piece],
          usedLength: piece.length,
          waste: stockLength - piece.length
        });
      }
    });
    return bars;
  };

  const handleOptimize = () => {
    setIsCalculating(true);
    setTimeout(() => {
        if (activeMode === 'profile') {
            const results: Record<ProfileType, OptimizedBar[]> = {
                Frame: run1DOptimization(profileList.filter(i => i.type === 'Frame')),
                Sash: run1DOptimization(profileList.filter(i => i.type === 'Sash')),
                Mullion: run1DOptimization(profileList.filter(i => i.type === 'Mullion')),
                Bead: run1DOptimization(profileList.filter(i => i.type === 'Bead'))
            };
            setGroupedBars(results);
        } else {
            // Placeholder for Glass 2D logic
            setOptimizedSheets([]); 
        }
        setIsCalculating(false);
    }, 1000);
  };

  const getProfileColor = (type: ProfileType) => {
    switch(type) {
        case 'Frame': return 'bg-blue-600';
        case 'Sash': return 'bg-emerald-600';
        case 'Mullion': return 'bg-orange-600';
        case 'Bead': return 'bg-indigo-600';
        default: return 'bg-slate-600';
    }
  };

  const getProfileLabel = (type: ProfileType) => {
    switch(type) {
        case 'Frame': return 'پروفیل فریم (Frame)';
        case 'Sash': return 'پروفیل لنگه (Sash)';
        case 'Mullion': return 'پروفیل مولیون (Mullion)';
        case 'Bead': return 'زهوار شیشه (Bead)';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-['Vazirmatn']">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-section { display: block !important; width: 100% !important; margin: 0 !important; }
          .category-page { page-break-after: always; padding: 40px; }
          .bar-row { page-break-inside: avoid; border: 1px solid #334155 !important; }
        }
        .bar-gradient { background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%); }
      `}</style>

      {/* Industrial Header */}
      <div className="no-print bg-slate-900 text-white px-6 pt-12 pb-6 shadow-2xl sticky top-0 z-50 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-6">
           <button onClick={() => navigate('/dashboard')} className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-transform"><ArrowRight size={22}/></button>
           <div className="text-center">
                <h1 className="text-xl font-black tracking-tight">هاب بهینه‌سازی لومینا</h1>
                <div className="flex items-center justify-center gap-2 mt-1 opacity-60">
                    <span className="text-[9px] font-bold uppercase tracking-widest">Industrial Cutting Engine</span>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
           </div>
           <button onClick={() => window.print()} className="p-3 bg-blue-600 rounded-2xl shadow-lg active:scale-90 transition-transform"><Download size={22}/></button>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <button 
                onClick={() => setActiveMode('profile')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeMode === 'profile' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
            >
                <Scissors size={18} /> بهینه برش پروفیل (1D)
            </button>
            <button 
                onClick={() => setActiveMode('glass')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeMode === 'glass' ? 'bg-white text-slate-900' : 'text-slate-400'}`}
            >
                <Grid size={18} /> بهینه برش شیشه (2D)
            </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Project Selector & Config */}
        <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <Package size={20} className="text-blue-500" />
                    <h2 className="font-black text-slate-800 text-sm">انتخاب پروژه مرجع</h2>
                </div>
                <SelectField 
                    label="پروژه هدف"
                    value={selectedProjectId}
                    onChange={(e: any) => handleProjectSelect(e.target.value)}
                    options={[
                        { label: 'یک پروژه را انتخاب کنید...', value: '' },
                        ...projects.map(p => ({ label: `${p.customerName} (${toPersianDigits(p.items.length)} واحد)`, value: p.id }))
                    ]}
                />
            </GlassCard>

            <GlassCard className="border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <SettingsIcon size={20} className="text-slate-400" />
                    <h2 className="font-black text-slate-800 text-sm">تنظیمات فنی</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="طول شاخه (mm)" type="number" value={stockLength} onChange={(e:any) => setStockLength(Number(toEnglishDigits(e.target.value)))} />
                    <InputField label="ضخامت تیغه (mm)" type="number" value={bladeKerf} onChange={(e:any) => setBladeKerf(Number(toEnglishDigits(e.target.value)))} />
                </div>
            </GlassCard>
        </div>

        <div className="no-print">
            <PrimaryButton 
                fullWidth 
                loading={isCalculating}
                onClick={handleOptimize}
                icon={RefreshCw}
                className="h-16 rounded-3xl"
            >
                محاسبه چیدمان صنعتی
            </PrimaryButton>
        </div>

        {/* RESULTS: Grouped Bars */}
        <AnimatePresence>
            {(Object.entries(groupedBars) as [ProfileType, OptimizedBar[]][]).map(([type, bars]) => {
                if (bars.length === 0) return null;
                return (
                    <motion.section 
                        key={type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 category-page"
                    >
                        <div className="flex justify-between items-end px-2 border-b-2 border-slate-200 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900">{getProfileLabel(type)}</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Industrial Cutting Report / Section: {type}</p>
                            </div>
                            <div className="text-left">
                                <span className="text-[10px] font-black text-slate-400 block mb-1">تعداد کل شاخه</span>
                                <div className="text-xl font-black text-slate-900">{toPersianDigits(bars.length)} <span className="text-[10px] font-bold">عدد</span></div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {bars.map((bar, barIdx) => (
                                <div key={barIdx} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm bar-row">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black">
                                                {toPersianDigits(bar.id)}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800">شاخه شماره {toPersianDigits(bar.id)}</h4>
                                                <div className="flex gap-4 mt-1">
                                                    <span className="text-[10px] font-bold text-slate-400">طول مصرفی: {toPersianDigits(bar.usedLength)}mm</span>
                                                    <span className="text-[10px] font-bold text-rose-500">ضایعات: {toPersianDigits(bar.waste)}mm</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual Bar Representation */}
                                    <div className="h-14 w-full bg-slate-100 rounded-2xl flex overflow-hidden border border-slate-200 relative mb-6 bar-gradient shadow-inner">
                                        {bar.items.map((piece, pIdx) => (
                                            <div 
                                                key={pIdx}
                                                className={`h-full ${getProfileColor(type)} border-r border-white/20 flex flex-col items-center justify-center relative group min-w-[20px] transition-all hover:brightness-110`}
                                                style={{ width: `${(piece.length / stockLength) * 100}%` }}
                                            >
                                                <span className="text-[8px] text-white font-black leading-none">{toPersianDigits(piece.length)}</span>
                                                <span className="text-[6px] text-white/60 font-black mt-0.5 uppercase tracking-tighter">{piece.label}</span>
                                                <span className="absolute bottom-1 right-1 text-[5px] text-white/40 font-bold">{piece.angle}</span>
                                            </div>
                                        ))}
                                        <div className="flex-1 h-full bg-slate-300/30 flex items-center justify-center text-[9px] font-black text-slate-400">Waste</div>
                                    </div>

                                    {/* Technical List below the bar */}
                                    <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                                        <table className="w-full text-[10px] border-collapse">
                                            <thead className="bg-slate-100 border-b border-slate-200">
                                                <tr>
                                                    <th className="p-2 text-right font-black w-10">ردیف</th>
                                                    <th className="p-2 text-right font-black">شناسه قطعه</th>
                                                    <th className="p-2 text-center font-black">طول برش (mm)</th>
                                                    <th className="p-2 text-left font-black">زاویه برش</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bar.items.map((piece, pIdx) => (
                                                    <tr key={pIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-100/50 transition-colors">
                                                        <td className="p-2 text-right font-bold text-slate-400">{toPersianDigits(pIdx + 1)}</td>
                                                        <td className="p-2 text-right font-black text-slate-800">{piece.label}</td>
                                                        <td className="p-2 text-center font-black text-blue-600">{toPersianDigits(piece.length)}</td>
                                                        <td className="p-2 text-left font-bold text-slate-500" style={{ direction: 'ltr' }}>{piece.angle}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.section>
                );
            })}
        </AnimatePresence>
      </div>

      <div className="no-print fixed bottom-0 left-0 right-0 z-40 p-6 pointer-events-none">
          <div className="max-w-xl mx-auto pointer-events-auto">
              <button 
                onClick={() => window.print()}
                className="w-full bg-slate-900 text-white h-16 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
              >
                  <Download size={22} />
                  خروجی PDF نقشه برش و برچسب‌ها
              </button>
          </div>
      </div>
    </div>
  );
};
