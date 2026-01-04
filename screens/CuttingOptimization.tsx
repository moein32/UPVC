
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Scissors, RefreshCw, Download, Settings as SettingsIcon, Package, Loader2, BarChart3, Grid, Printer, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputField, PrimaryButton, GlassCard, SelectField } from '../components/UIComponents';
import { toPersianDigits, toEnglishDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { SavedProject } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { toJpeg } from 'html-to-image';
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
  const printRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    setProjects(pricingStore.getProjects());
  }, []);

  const getFarsiType = (type: ProfileType) => {
    switch(type) {
        case 'Frame': return 'پروفیل فریم (Frame)';
        case 'Sash': return 'پروفیل بازشو (Sash)';
        case 'Mullion': return 'پروفیل مولیون (Mullion)';
        case 'Bead': return 'زهوار (Bead)';
        default: return type;
    }
  };

  const getProfileColors = (type: ProfileType) => {
    switch(type) {
        case 'Frame': return '#0f172a'; // Deep Navy
        case 'Sash': return '#064e3b';  // Forest Green
        case 'Mullion': return '#7f1d1d'; // Dark Red
        case 'Bead': return '#b45309';   // Dark Amber/Brown
        default: return '#334155';
    }
  };

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const extracted: CutItem[] = [];
    project.items.forEach((unit, idx) => {
      const uId = (idx + 1).toString();
      // Frame - Mitered 45/45
      extracted.push({ id: `F-${idx}-W`, length: unit.config.width, quantity: unit.quantity * 2, label: `عرض`, type: 'Frame', angle: '45/45', unitId: uId });
      extracted.push({ id: `F-${idx}-H`, length: unit.config.height, quantity: unit.quantity * 2, label: `ارتفاع`, type: 'Frame', angle: '45/45', unitId: uId });
      
      if (unit.calculations.sashCount > 0) {
          // Sash - Mitered 45/45
          extracted.push({ id: `S-${idx}-W`, length: unit.config.width - 45, quantity: unit.quantity * unit.calculations.sashCount * 2, label: `ع بازشو`, type: 'Sash', angle: '45/45', unitId: uId });
          extracted.push({ id: `S-${idx}-H`, length: unit.config.height - 45, quantity: unit.quantity * unit.calculations.sashCount * 2, label: `ا بازشو`, type: 'Sash', angle: '45/45', unitId: uId });
      }

      if (unit.config.mullions > 0) {
          // Mullion - Straight 90/90
          extracted.push({ id: `M-${idx}`, length: unit.config.height - 70, quantity: unit.quantity * unit.config.mullions, label: `مولیون`, type: 'Mullion', angle: '90/90', unitId: uId });
      }

      // Bead - Mitered 45/45
      extracted.push({ id: `B-${idx}-W`, length: unit.config.width - 90, quantity: unit.quantity * 2, label: `زهوار ع`, type: 'Bead', angle: '45/45', unitId: uId });
      extracted.push({ id: `B-${idx}-H`, length: unit.config.height - 90, quantity: unit.quantity * 2, label: `زهوار ا`, type: 'Bead', angle: '45/45', unitId: uId });
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
          usedLength: piece.length + bladeKerf,
          waste: stockLength - (piece.length + bladeKerf)
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
    if (!printRef.current || isCalculating) return;
    const hasData = (Object.values(groupedBars) as OptimizedBar[][]).some(arr => arr.length > 0);
    if (!hasData) return;

    setIsGeneratingPDF(true);
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const pages = printRef.current.querySelectorAll('.pdf-page-container');
        
        for (let i = 0; i < pages.length; i++) {
            if (i > 0) pdf.addPage();
            const node = pages[i] as HTMLElement;
            const imgData = await toJpeg(node, {
                quality: 1,
                pixelRatio: 4, 
                backgroundColor: '#ffffff'
            });
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
        const project = pricingStore.getProjects().find(p => p.id === selectedProjectId);
        pdf.save(`Workshop_Cutting_Blueprint_${project?.customerName || 'Lumina'}.pdf`);
    } catch (err) {
        console.error('PDF Generation Failed:', err);
    } finally {
        setIsGeneratingPDF(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const BARS_PER_PAGE = 18; 
  const allBarsFlat = (Object.values(groupedBars) as OptimizedBar[][]).flat();
  const paginatedBars: OptimizedBar[][] = [];
  for (let i = 0; i < allBarsFlat.length; i += BARS_PER_PAGE) {
      paginatedBars.push(allBarsFlat.slice(i, i + BARS_PER_PAGE));
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-32 font-['Vazirmatn']">
      
      {/* 1. ENGINEERING BLUEPRINT ENGINE - FIXED RATIO / HIGH CONTRAST COLORS */}
      <div className="fixed top-0 left-[-10000px] pointer-events-none z-[-100]">
        <div ref={printRef} style={{ width: '794px' }}>
            {paginatedBars.map((pageBars, pageIdx) => (
                <div key={pageIdx} className="pdf-page-container" style={{ 
                    width: '794px', height: '1123px', padding: '40px', backgroundColor: '#ffffff', 
                    display: 'flex', flexDirection: 'column', direction: 'rtl', fontFamily: 'Vazirmatn',
                    border: '1px solid #e2e8f0', boxSizing: 'border-box'
                }}>
                    {/* Engineering Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}>نقشه اجرایی برش و بهینه‌سازی (Profile Optimization)</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>پروژه: {selectedProject?.customerName} | کد رهگیری: {toPersianDigits(selectedProject?.id || '')}</div>
                        </div>
                        <div style={{ textAlign: 'left', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>
                            <div style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: '900' }}>LUMINA CORE v4.5</div>
                            <div>تاریخ صدور: {toPersianDigits(new Date().toLocaleDateString('fa-IR'))}</div>
                            <div>صفحه {toPersianDigits(pageIdx + 1)} از {toPersianDigits(paginatedBars.length)}</div>
                        </div>
                    </div>

                    {/* Bars Grid */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pageBars.map((bar, bIdx) => {
                            const color = getProfileColors(bar.type);
                            const SVG_WIDTH = 714; 
                            const scaleX = (val: number) => (val / stockLength) * SVG_WIDTH;

                            return (
                                <div key={bIdx} style={{ marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px', fontWeight: '900' }}>
                                        <div style={{ color: '#334155' }}>
                                            <span style={{ color: color, fontSize: '14px', marginLeft: '6px' }}>●</span>
                                            {getFarsiType(bar.type)} <span style={{color: '#94a3b8', fontSize: '8px', marginRight: '8px'}}>شاخه {toPersianDigits(bar.id)}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '15px', color: '#64748b' }}>
                                            <span>طول کل مصرفی: {toPersianDigits(bar.usedLength)} mm</span>
                                            <span style={{ color: '#ef4444' }}>ضایعات: {toPersianDigits(bar.waste)} mm</span>
                                        </div>
                                    </div>

                                    <svg width={SVG_WIDTH} height="32" viewBox={`0 0 ${SVG_WIDTH} 100`} style={{ display: 'block' }}>
                                        <defs>
                                            <pattern id={`hatch-${pageIdx}-${bIdx}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                                                <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="2" />
                                            </pattern>
                                        </defs>
                                        
                                        {/* Profile Placeholder Background */}
                                        <rect x="0" y="30" width={SVG_WIDTH} height="40" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
                                        
                                        {(() => {
                                            let currentX = 0;
                                            return bar.items.map((piece, pIdx) => {
                                                const x = scaleX(currentX);
                                                const w = scaleX(piece.length);
                                                const isMiter = piece.angle === '45/45';
                                                const offset = isMiter ? 8 : 0; 
                                                currentX += piece.length + bladeKerf;
                                                
                                                const isVeryNarrow = w < 45; 

                                                return (
                                                    <g key={pIdx}>
                                                        <polygon 
                                                            points={isMiter ? `${x},30 ${x+w},30 ${x+w-offset},70 ${x+offset},70` : `${x},30 ${x+w},30 ${x+w},70 ${x},70`}
                                                            fill={color}
                                                            stroke="white"
                                                            strokeWidth="0.5"
                                                        />
                                                        {/* Piece Details - Centered */}
                                                        {isVeryNarrow ? (
                                                            <g transform={`rotate(-90, ${x + w/2}, 50)`}>
                                                                <text x={x + w/2} y="55" fill="white" fontSize="24" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                    {toPersianDigits(piece.length)}
                                                                </text>
                                                            </g>
                                                        ) : (
                                                            <g>
                                                                <text x={x + w/2} y="55" fill="white" fontSize="26" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                    {toPersianDigits(piece.length)}
                                                                </text>
                                                                {/* Label & Unit ID */}
                                                                <text x={x + w/2} y="85" fill={color} fontSize="14" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                    {piece.label} (ی{toPersianDigits(piece.unitId)})
                                                                </text>
                                                                {/* CUTTING ANGLE */}
                                                                <text x={x + w/2} y="22" fill={color} fontSize="12" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                    ∠ {toPersianDigits(piece.angle)}
                                                                </text>
                                                            </g>
                                                        )}
                                                    </g>
                                                )
                                            })
                                        })()}

                                        {/* Waste Area Hatching */}
                                        <rect x={scaleX(bar.usedLength)} y="30" width={scaleX(bar.waste)} height="40" fill="#f1f5f9" />
                                        <rect x={scaleX(bar.usedLength)} y="30" width={scaleX(bar.waste)} height="40" fill={`url(#hatch-${pageIdx}-${bIdx})`} />
                                        
                                        {bar.waste > 150 && (
                                            <text x={scaleX(bar.usedLength + bar.waste/2)} y="55" fill="#94a3b8" fontSize="20" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                {toPersianDigits(bar.waste)}
                                            </text>
                                        )}
                                    </svg>
                                </div>
                            )
                        })}
                    </div>

                    {/* Footer / QC Area */}
                    <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '2px solid #0f172a' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                            <div style={{ border: '1px solid #e2e8f0', height: '70px', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', marginBottom: '25px' }}>کنترل کیفی و ابعاد (QC)</div>
                                <div style={{ fontSize: '8px', color: '#cbd5e1' }}>مهر و امضا</div>
                            </div>
                            <div style={{ border: '1px solid #e2e8f0', height: '70px', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', marginBottom: '25px' }}>مسئول ایستگاه برش</div>
                                <div style={{ fontSize: '8px', color: '#cbd5e1' }}>امضا</div>
                            </div>
                            <div style={{ border: '1px solid #e2e8f0', height: '70px', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', marginBottom: '25px' }}>تایید مهندسی فروش</div>
                                <div style={{ fontSize: '8px', color: '#cbd5e1' }}>مهر و امضا</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' }}>
                            <div>تمامی ابعاد به میلی‌متر و کسر تیغه اره {toPersianDigits(bladeKerf)}mm در محاسبات اعمال شده است.</div>
                            <div style={{ color: '#0f172a' }}>LUMINA PRECISION BLUEPRINT v4.5</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* APP INTERFACE */}
      <div className="bg-slate-900 text-white px-6 pt-12 pb-6 shadow-2xl sticky top-0 z-50 rounded-b-[2.5rem]">
        <div className="flex items-center justify-between mb-6">
           <button onClick={() => navigate('/dashboard')} className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-transform"><ArrowRight size={22}/></button>
           <div className="text-center">
                <h1 className="text-xl font-black tracking-tight">بهینه‌سازی برش پروفیل</h1>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mt-1">Workshop Optimization Engine</p>
           </div>
           <button onClick={downloadCuttingListPDF} className="p-3 bg-blue-600 rounded-2xl shadow-lg active:scale-90 transition-transform">
                {isGeneratingPDF ? <Loader2 size={22} className="animate-spin" /> : <Download size={22}/>}
           </button>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <button onClick={() => setActiveMode('profile')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeMode === 'profile' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>پروفیل‌ها</button>
            <button onClick={() => setActiveMode('glass')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeMode === 'glass' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>شیشه‌ها</button>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <Package size={20} className="text-blue-500" />
                    <h2 className="font-black text-slate-800 text-sm">انتخاب پروژه</h2>
                </div>
                <SelectField 
                    label="پروژه مرجع"
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
                    <h2 className="font-black text-slate-800 text-sm">تنظیمات کارگاه</h2>
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
            محاسبه چیدمان بهینه قطعات
        </PrimaryButton>

        <AnimatePresence>
            {(Object.entries(groupedBars) as [ProfileType, OptimizedBar[]][]).map(([type, bars]) => {
                if (bars.length === 0) return null;
                const color = getProfileColors(type);
                return (
                    <motion.section key={type} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="flex justify-between items-center px-5 py-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <h2 className="text-sm font-black text-slate-800">{getFarsiType(type)}</h2>
                            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full">{toPersianDigits(bars.length)} شاخه</span>
                        </div>

                        {bars.map((bar, barIdx) => (
                            <div key={barIdx} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:border-blue-100">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black" style={{ backgroundColor: color }}>{toPersianDigits(bar.id)}</div>
                                        <div className="text-xs font-black text-slate-800">شاخه شماره {toPersianDigits(bar.id)}</div>
                                    </div>
                                    <div className="text-[10px] font-black text-rose-500">پرت شاخه: {toPersianDigits(bar.waste)}mm</div>
                                </div>

                                <div className="h-10 w-full bg-slate-50 rounded-xl flex overflow-hidden border border-slate-100 relative mb-4">
                                    {bar.items.map((piece, pIdx) => (
                                        <div 
                                            key={pIdx}
                                            className="h-full border-r border-white/10 flex flex-col items-center justify-center relative min-w-[15px]"
                                            style={{ 
                                                width: `${(piece.length / stockLength) * 100}%`,
                                                backgroundColor: color,
                                                clipPath: (piece.type === 'Frame' || piece.type === 'Sash') ? 'polygon(5% 0, 95% 0, 100% 100%, 0% 100%)' : 'none'
                                            }}
                                        >
                                            <span className="text-[9px] font-black text-white">{toPersianDigits(piece.length)}</span>
                                        </div>
                                    ))}
                                    <div className="flex-1 h-full bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-400 italic opacity-40">پرت</div>
                                </div>
                            </div>
                        ))}
                    </motion.section>
                );
            })}
        </AnimatePresence>
      </div>

      <div className="no-print fixed bottom-0 left-0 right-0 z-40 p-6 pointer-events-none">
          <div className="max-w-xl mx-auto pointer-events-auto">
              <button 
                disabled={isGeneratingPDF}
                onClick={downloadCuttingListPDF}
                className="w-full bg-slate-900 text-white h-16 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-70"
              >
                  {isGeneratingPDF ? <Loader2 size={22} className="animate-spin"/> : <FileText size={22} />}
                  دریافت نقشه اجرایی کارگاه (PDF)
              </button>
          </div>
      </div>
    </div>
  );
};
