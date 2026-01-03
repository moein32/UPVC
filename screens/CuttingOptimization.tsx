
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Scissors, RefreshCw, FileText, Download, Settings as SettingsIcon, Package, Loader2, Info, BarChart3, Grid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputField, PrimaryButton, GlassCard, SelectField } from '../components/UIComponents';
import { toPersianDigits, toEnglishDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { SavedProject } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type OptMode = 'profile' | 'glass';
type ProfileType = 'Frame' | 'Sash' | 'Mullion' | 'Bead';

interface CutItem {
  id: string;
  length: number;
  quantity: number;
  label: string;
  type: ProfileType;
  angle: string; // "45/45" or "90/90"
  unitId: string;
}

interface OptimizedBar {
  id: number;
  type: ProfileType;
  items: CutItem[];
  usedLength: number;
  waste: number;
}

export const CuttingOptimization = () => {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<OptMode>('profile');
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const [stockLength, setStockLength] = useState(6000);
  const [bladeKerf, setBladeKerf] = useState(4);
  const [profileList, setProfileList] = useState<CutItem[]>([]);
  const [groupedBars, setGroupedBars] = useState<Record<ProfileType, OptimizedBar[]>>({
    Frame: [], Sash: [], Mullion: [], Bead: []
  });
  const [isCalculating, setIsCalculating] = useState(false);

  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProjects(pricingStore.getProjects());
  }, []);

  const getFarsiType = (type: ProfileType) => {
    switch(type) {
        case 'Frame': return 'فریم (Frame)';
        case 'Sash': return 'ساشه (Sash)';
        case 'Mullion': return 'مولیون (Mullion)';
        case 'Bead': return 'زهوار (Bead)';
        default: return type;
    }
  };

  const getProfileColors = (type: ProfileType) => {
    switch(type) {
        case 'Frame': return { bg: '#e0f2fe', border: '#0369a1', text: '#0c4a6e' };
        case 'Sash': return { bg: '#f0fdf4', border: '#15803d', text: '#064e3b' };
        case 'Mullion': return { bg: '#fff7ed', border: '#c2410c', text: '#7c2d12' };
        case 'Bead': return { bg: '#fefce8', border: '#a16207', text: '#713f12' };
    }
  };

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const extracted: CutItem[] = [];
    project.items.forEach((unit, idx) => {
      const uId = toPersianDigits(idx + 1);
      // Frame items (45 degree)
      extracted.push({ id: `F-${idx}-W`, length: unit.config.width, quantity: unit.quantity * 2, label: `W${uId}`, type: 'Frame', angle: '45/45', unitId: uId });
      extracted.push({ id: `F-${idx}-H`, length: unit.config.height, quantity: unit.quantity * 2, label: `H${uId}`, type: 'Frame', angle: '45/45', unitId: uId });
      
      // Sash items (45 degree)
      if (unit.calculations.sashCount > 0) {
          extracted.push({ id: `S-${idx}-W`, length: unit.config.width - 45, quantity: unit.quantity * unit.calculations.sashCount * 2, label: `SW${uId}`, type: 'Sash', angle: '45/45', unitId: uId });
          extracted.push({ id: `S-${idx}-H`, length: unit.config.height - 45, quantity: unit.quantity * unit.calculations.sashCount * 2, label: `SH${uId}`, type: 'Sash', angle: '45/45', unitId: uId });
      }

      // Mullion (90 degree)
      if (unit.config.mullions > 0) {
          extracted.push({ id: `M-${idx}`, length: unit.config.height - 70, quantity: unit.quantity * unit.config.mullions, label: `M${uId}`, type: 'Mullion', angle: '90/90', unitId: uId });
      }

      // Bead (45 degree)
      extracted.push({ id: `B-${idx}-W`, length: unit.config.width - 90, quantity: unit.quantity * 2, label: `BW${uId}`, type: 'Bead', angle: '45/45', unitId: uId });
      extracted.push({ id: `B-${idx}-H`, length: unit.config.height - 90, quantity: unit.quantity * 2, label: `BH${uId}`, type: 'Bead', angle: '45/45', unitId: uId });
    });
    setProfileList(extracted);
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
        const results: Record<ProfileType, OptimizedBar[]> = {
            Frame: run1DOptimization(profileList.filter(i => i.type === 'Frame')),
            Sash: run1DOptimization(profileList.filter(i => i.type === 'Sash')),
            Mullion: run1DOptimization(profileList.filter(i => i.type === 'Mullion')),
            Bead: run1DOptimization(profileList.filter(i => i.type === 'Bead'))
        };
        setGroupedBars(results);
        setIsCalculating(false);
    }, 600);
  };

  const downloadCuttingListPDF = async () => {
    if ((Object.values(groupedBars) as OptimizedBar[][]).every(arr => arr.length === 0)) return;
    
    setIsGeneratingPDF(true);
    const exportRoot = document.getElementById('pdf-export-root');
    if (!exportRoot || !pdfTemplateRef.current) return;

    exportRoot.innerHTML = pdfTemplateRef.current.innerHTML;

    try {
        const canvas = await html2canvas(exportRoot.firstChild as HTMLElement, {
            scale: 2.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
        });

        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        pdf.save(`Cutting_Plan_${selectedProject?.customerName || 'Project'}.pdf`);
    } catch (err) {
        console.error('PDF Error:', err);
    } finally {
        setIsGeneratingPDF(false);
        exportRoot.innerHTML = '';
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const brandName = selectedProject?.defaultProfileId || 'پروفیل استاندارد';

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-['Vazirmatn']">
      
      {/* HIDDEN ENGINEERING TEMPLATE FOR A4 CAPTURE */}
      <div ref={pdfTemplateRef} className="hidden">
        <div className="bg-white p-10 flex flex-col" style={{ width: '794px', minHeight: '1123px', direction: 'rtl' }}>
            {/* COMPACT HEADER */}
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-6">
                <div>
                    <h1 className="text-xl font-black text-slate-900">نقشه تولید و بهینه‌سازی برش</h1>
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">پروژه: {selectedProject?.customerName} | برند: {brandName}</p>
                </div>
                <div className="text-left">
                    <div className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase italic">Lumina Tech v1.2</div>
                    <div className="text-[9px] font-bold text-slate-400 mt-1">{toPersianDigits(new Date().toLocaleDateString('fa-IR'))}</div>
                </div>
            </div>

            {/* BAR RENDERING ENGINE */}
            <div className="space-y-4">
                {(Object.entries(groupedBars) as [ProfileType, OptimizedBar[]][]).map(([type, bars]) => {
                    if (bars.length === 0) return null;
                    const colors = getProfileColors(type);
                    
                    return (
                        <div key={type} className="mb-6">
                            <div className="flex justify-between items-center px-2 mb-2">
                                <h3 className="text-xs font-black" style={{ color: colors.border }}>{getFarsiType(type)}</h3>
                                <span className="text-[8px] font-bold text-slate-400">تعداد کل شاخه: {toPersianDigits(bars.length)} عدد</span>
                            </div>

                            <div className="space-y-3">
                                {bars.map((bar, barIdx) => (
                                    <div key={barIdx} className="relative">
                                        <div className="flex justify-between text-[7px] font-bold text-slate-400 mb-0.5 px-1">
                                            <span>شاخه {toPersianDigits(barIdx + 1)}</span>
                                            <span>ضایعات: {toPersianDigits(bar.waste)}mm</span>
                                        </div>

                                        <div className="h-10 w-full bg-white border border-slate-900 flex overflow-hidden relative">
                                            {bar.items.map((piece, pIdx) => {
                                                const isMiter = piece.angle === '45/45';
                                                const widthPercent = (piece.length / 6000) * 100;
                                                return (
                                                    <div 
                                                        key={pIdx}
                                                        className="h-full border-r border-slate-900 flex items-center justify-center relative"
                                                        style={{ 
                                                            width: `${widthPercent}%`,
                                                            backgroundColor: colors.bg,
                                                            clipPath: isMiter ? 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)' : 'none'
                                                        }}
                                                    >
                                                        {/* MITER LABELS */}
                                                        {isMiter && (
                                                            <>
                                                                <span className="absolute top-0.5 right-1 text-[5px] opacity-40">45°</span>
                                                                <span className="absolute top-0.5 left-1 text-[5px] opacity-40">45°</span>
                                                            </>
                                                        )}
                                                        
                                                        {/* MAIN DIMENSION */}
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] font-black text-slate-900">{toPersianDigits(piece.length)}</span>
                                                            <span className="text-[5px] font-bold opacity-50">{piece.label}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* HATCHED WASTE (PRT) */}
                                            <div className="flex-1 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 1px, transparent 1px, transparent 6px)' }}></div>
                                                <span className="text-[7px] font-black text-slate-400 z-10">پرت ({toPersianDigits(bar.waste)})</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* FINAL FOOTER */}
            <div className="mt-auto pt-4 border-t border-slate-100 text-[7px] text-center font-bold text-slate-400 flex justify-between">
                <span>تمام ابعاد به میلی‌متر است. تیغه اره: {toPersianDigits(bladeKerf)}mm</span>
                <span>تایید فنی: لومینا اینجنیرینگ</span>
            </div>
        </div>
      </div>

      {/* DASHBOARD UI */}
      <div className="bg-slate-900 text-white px-6 pt-12 pb-6 shadow-2xl sticky top-0 z-50 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-6">
           <button onClick={() => navigate('/dashboard')} className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-transform"><ArrowRight size={22}/></button>
           <div className="text-center">
                <h1 className="text-xl font-black tracking-tight">بهینه‌سازی برش پروفیل</h1>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mt-1">Industrial Production Core</p>
           </div>
           <button onClick={downloadCuttingListPDF} className="p-3 bg-blue-600 rounded-2xl shadow-lg active:scale-90 transition-transform relative">
                {isGeneratingPDF ? <Loader2 size={22} className="animate-spin" /> : <Download size={22}/>}
           </button>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <button 
                onClick={() => setActiveMode('profile')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeMode === 'profile' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}
            >
                <Scissors size={18} /> پروفیل‌ها
            </button>
            <button 
                onClick={() => setActiveMode('glass')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeMode === 'glass' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}
            >
                <Grid size={18} /> شیشه‌ها
            </button>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <Package size={20} className="text-blue-500" />
                    <h2 className="font-black text-slate-800 text-sm">پروژه جهت استخراج دیتا</h2>
                </div>
                <SelectField 
                    label="انتخاب پروژه مرجع"
                    value={selectedProjectId}
                    onChange={(e: any) => handleProjectSelect(e.target.value)}
                    options={[
                        { label: 'یک پروژه را انتخاب کنید...', value: '' },
                        ...projects.map(p => ({ label: `${p.customerName}`, value: p.id }))
                    ]}
                />
            </GlassCard>

            <GlassCard className="border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <SettingsIcon size={20} className="text-slate-400" />
                    <h2 className="font-black text-slate-800 text-sm">تنظیمات فنی دستگاه</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="طول شاخه (mm)" type="number" value={stockLength} onChange={(e:any) => setStockLength(Number(toEnglishDigits(e.target.value)))} />
                    <InputField label="تیغه اره (mm)" type="number" value={bladeKerf} onChange={(e:any) => setBladeKerf(Number(toEnglishDigits(e.target.value)))} />
                </div>
            </GlassCard>
        </div>

        <PrimaryButton 
            fullWidth 
            loading={isCalculating}
            onClick={handleOptimize}
            icon={RefreshCw}
            className="h-16 rounded-[2rem] shadow-xl"
        >
            محاسبه چیدمان مهندسی
        </PrimaryButton>

        {/* LIVE PREVIEW UI */}
        <AnimatePresence>
            {(Object.entries(groupedBars) as [ProfileType, OptimizedBar[]][]).map(([type, bars]) => {
                if (bars.length === 0) return null;
                const colors = getProfileColors(type);
                return (
                    <motion.section 
                        key={type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex justify-between items-center px-5 py-4 bg-slate-100 rounded-3xl border border-slate-200">
                            <h2 className="text-sm font-black text-slate-800">{getFarsiType(type)}</h2>
                            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{toPersianDigits(bars.length)} شاخه</span>
                        </div>

                        {bars.map((bar, barIdx) => (
                            <div key={barIdx} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black">{toPersianDigits(bar.id)}</div>
                                        <div className="text-xs font-black text-slate-800">شاخه شماره {toPersianDigits(bar.id)}</div>
                                    </div>
                                    <div className="text-[10px] font-black text-rose-500">پرت: {toPersianDigits(bar.waste)}mm</div>
                                </div>

                                <div className="h-16 w-full bg-slate-50 rounded-2xl flex overflow-hidden border border-slate-100 relative mb-4">
                                    {bar.items.map((piece, pIdx) => (
                                        <div 
                                            key={pIdx}
                                            className="h-full border-r border-slate-900 flex flex-col items-center justify-center relative min-w-[20px]"
                                            style={{ 
                                                width: `${(piece.length / stockLength) * 100}%`,
                                                backgroundColor: colors.bg,
                                                clipPath: piece.angle === '45/45' ? 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' : 'none'
                                            }}
                                        >
                                            <span className="text-[10px] text-slate-900 font-black">{toPersianDigits(piece.length)}</span>
                                            <span className="text-[8px] font-bold opacity-40">{piece.label}</span>
                                        </div>
                                    ))}
                                    <div className="flex-1 h-full bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-400 italic">Waste</div>
                                </div>
                            </div>
                        ))}
                    </motion.section>
                );
            })}
        </AnimatePresence>
      </div>

      {/* FLOAT BUTTON */}
      <div className="no-print fixed bottom-0 left-0 right-0 z-40 p-6 pointer-events-none">
          <div className="max-w-xl mx-auto pointer-events-auto">
              <button 
                disabled={isGeneratingPDF}
                onClick={downloadCuttingListPDF}
                className="w-full bg-slate-900 text-white h-16 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-70"
              >
                  {isGeneratingPDF ? <Loader2 size={22} className="animate-spin"/> : <BarChart3 size={22} />}
                  دریافت نقشه برش فنی (PDF)
              </button>
          </div>
      </div>
    </div>
  );
};
