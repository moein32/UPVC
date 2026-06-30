import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, RefreshCw, Download, Settings as SettingsIcon, Package, FileText, X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputField, PrimaryButton, GlassCard, SelectField } from '../components/UIComponents';
import { toPersianDigits, toEnglishDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { SavedProject } from '../types';
import { calculateDetailedCuts } from '../services/engineeringService';
import { motion, AnimatePresence } from 'framer-motion';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

type ProfileType = 'Frame' | 'Sash' | 'Mullion' | 'Bead';

interface CutItem {
  id: string;
  length: number;
  quantity: number;
  label: string;
  type: ProfileType;
  angle?: string;
  unitId: string;
}

interface OptimizedBar {
  id: number;
  type: ProfileType;
  items: CutItem[];
  usedLength: number;
  waste: number;
}

export const ProfileOptimization = () => {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  // Settings
  const [stockLength, setStockLength] = useState(6000);
  const [bladeKerf, setBladeKerf] = useState(4);

  // Data
  const [profileList, setProfileList] = useState<CutItem[]>([]);
  const [groupedBars, setGroupedBars] = useState<Record<ProfileType, OptimizedBar[]>>({
    Frame: [], Sash: [], Mullion: [], Bead: []
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  useEffect(() => {
    setProjects(pricingStore.getProjects());
  }, []);

  const getFarsiType = (type: string) => {
    switch(type) {
        case 'Frame': return 'پروفیل فریم (Frame)';
        case 'Sash': return 'پروفیل بازشو (Sash)';
        case 'Mullion': return 'پروفیل مولیون (Mullion)';
        case 'Bead': return 'زهوار (Bead)';
        default: return type;
    }
  };

  const getProfileColors = (type: string) => {
    switch(type) {
        case 'Frame': return '#0f172a'; 
        case 'Sash': return '#064e3b';  
        case 'Mullion': return '#7f1d1d'; 
        case 'Bead': return '#b45309';   
        default: return '#334155';
    }
  };

  const getSimplifiedLabel = (label: string) => {
    let s = label || '';
    s = s.replace(/پروفیل/g, '').trim();
    s = s.replace(/دوجداره/g, '').trim();
    s = s.replace(/تک‌جداره/g, '').trim();
    s = s.replace(/سه کانال/g, '').trim();
    s = s.replace(/چهار کانال/g, '').trim();
    s = s.replace(/کشویی/g, '').trim();
    s = s.replace(/سش/g, 'بازشو').trim();
    s = s.replace(/\s+/g, ' ');
    if (s.length > 12) {
      s = s.substring(0, 11) + '...';
    }
    return s;
  };

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    setHasCalculated(false);
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const profiles: CutItem[] = [];

    project.items.forEach((unit, idx) => {
      const uId = (idx + 1).toString();
      const unitBrand = pricingStore.getBrands().find(b => b.id === unit.config.profileId);
      const cuts = calculateDetailedCuts(unit.config.layout || {} as any, unit.config.width, unit.config.height, unit.config.frameType, unitBrand);
      
      cuts.forEach((cut, cIdx) => {
        const itemQuantity = cut.quantity * unit.quantity;
        
        if (cut.type !== 'Glass') {
          profiles.push({
            id: `${cut.type.substring(0, 1)}-${idx}-${cIdx}`,
            length: Math.round(cut.length),
            quantity: itemQuantity,
            label: cut.name,
            type: cut.type as ProfileType,
            angle: '45/45',
            unitId: uId
          });
        }
      });
    });

    setProfileList(profiles);
  };

  const run1DOptimization = (items: CutItem[]): OptimizedBar[] => {
    const pieces: CutItem[] = [];
    items.forEach(item => { for (let i = 0; i < item.quantity; i++) pieces.push({ ...item, quantity: 1 }); });
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
          type: piece.type as ProfileType, 
          items: [piece], 
          usedLength: piece.length + bladeKerf, 
          waste: stockLength - (piece.length + bladeKerf) 
        });
      }
    });
    return bars;
  };

  const handleCalculate = () => {
    if (!selectedProjectId) return;
    setIsCalculating(true);
    setTimeout(() => {
        setGroupedBars({
            Frame: run1DOptimization(profileList.filter(i => i.type === 'Frame')),
            Sash: run1DOptimization(profileList.filter(i => i.type === 'Sash')),
            Mullion: run1DOptimization(profileList.filter(i => i.type === 'Mullion')),
            Bead: run1DOptimization(profileList.filter(i => i.type === 'Bead'))
        });
        setIsCalculating(false);
        setHasCalculated(true);
        setShowSummary(true);
    }, 600);
  };

  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    if (!printRef.current) {
        setIsGeneratingPDF(false);
        return;
    }
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
              pixelRatio: 3, 
              backgroundColor: '#ffffff',
              canvasWidth: 794,
              canvasHeight: 1123 
            });
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
        pdf.save(`Profile_Cuts_${selectedProject?.customerName || 'NexWin'}.pdf`);
    } catch (err) { console.error('PDF Error:', err); } finally { setIsGeneratingPDF(false); }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Helper template for profile bars visualization (On-Screen and Print sharing)
  const renderProfileBarSvg = (bar: OptimizedBar, bIdx: number, pageIdx: number) => {
    const color = getProfileColors(bar.type);
    const SVG_WIDTH = 714;
    const scaleX = (val: number) => (val / stockLength) * SVG_WIDTH;

    return (
        <div key={bIdx} className="mb-4 bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm font-sans" dir="rtl">
            <div className="flex justify-between mb-2 text-xs font-black">
                <div className="text-slate-800 flex items-center gap-2">
                    <span style={{ color: color }} className="text-lg">●</span>
                    {getFarsiType(bar.type)} <span className="text-slate-400 font-normal text-[10px]">شاخه {toPersianDigits(bar.id)}</span>
                </div>
                <div className="flex gap-4 text-slate-500">
                    <span>طول مصرفی: {toPersianDigits(Math.round(bar.usedLength))} mm</span>
                    <span className="text-red-700">ضایعات: {toPersianDigits(Math.round(bar.waste))} mm</span>
                </div>
            </div>

            <svg width="100%" height="45" viewBox={`0 0 ${SVG_WIDTH} 100`} className="block overflow-visible">
                <defs>
                    <pattern id={`hatch-${pageIdx}-${bIdx}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="2" />
                    </pattern>
                </defs>
                <rect x="0" y="30" width={SVG_WIDTH} height="40" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
                
                {(() => {
                    let curX = 0;
                    return bar.items.map((piece, pIdx) => {
                        const x = scaleX(curX);
                        const w = scaleX(piece.length);
                        const isMiter = true; // All sections (Frame, Sash, Mullion, Bead) are cut at 45 degrees
                        const offset = 8; 
                        curX += piece.length + bladeKerf;
                        
                        const isVeryNarrow = w < 50; 

                        return (
                            <g key={pIdx}>
                                <polygon 
                                    points={`${x},30 ${x+w},30 ${x+w-offset},70 ${x+offset},70`}
                                    fill={color}
                                    stroke="white"
                                    strokeWidth="0.5"
                                />
                                {isVeryNarrow ? (
                                    <g transform={`rotate(-90, ${x + w/2}, 50)`}>
                                        <text x={x + w/2} y="55" fill="white" fontSize="16" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                            {toPersianDigits(piece.length)}
                                        </text>
                                    </g>
                                ) : w < 100 ? (
                                    <g>
                                        <text x={x + w/2} y="22" fill={color} fontSize="10" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                            ۴۵°
                                        </text>
                                        <text x={x + w/2} y="54" fill="white" fontSize="16" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                            {toPersianDigits(piece.length)}
                                        </text>
                                        <text x={x + w/2} y="85" fill={color} fontSize="11" fontWeight="bold" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                            ی{toPersianDigits(piece.unitId)}
                                        </text>
                                    </g>
                                ) : w < 160 ? (
                                    <g>
                                        <text x={x + w/2} y="22" fill={color} fontSize="11" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                            ∠ ۴۵°
                                        </text>
                                        <text x={x + w/2} y="54" fill="white" fontSize="20" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                            {toPersianDigits(piece.length)}
                                        </text>
                                        <text x={x + w/2} y="85" fill={color} fontSize="11" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                            {getSimplifiedLabel(piece.label)} (ی{toPersianDigits(piece.unitId)})
                                        </text>
                                    </g>
                                ) : (
                                    <g>
                                        <text x={x + w/2} y="22" fill={color} fontSize="12" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                            ∠ ۴۵° / ۴۵°
                                        </text>
                                        <text x={x + w/2} y="55" fill="white" fontSize="24" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                            {toPersianDigits(piece.length)}
                                        </text>
                                        <text x={x + w/2} y="85" fill={color} fontSize="13" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                            {piece.label} (ی{toPersianDigits(piece.unitId)})
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    });
                })()}

                <rect x={scaleX(bar.usedLength)} y="30" width={scaleX(bar.waste)} height="40" fill="#f1f5f9" />
                <rect x={scaleX(bar.usedLength)} y="30" width={scaleX(bar.waste)} height="40" fill={`url(#hatch-${pageIdx}-${bIdx})`} />
                {bar.waste > 150 && (
                    <text x={scaleX(bar.usedLength + bar.waste/2)} y="55" fill="#94a3b8" fontSize="20" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                        {toPersianDigits(Math.round(bar.waste))}
                    </text>
                )}
            </svg>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-['Vazirmatn'] text-right" style={{ direction: 'rtl' }}>
      
      {/* HEADER UI */}
      <div className="bg-slate-900 text-white px-6 pt-12 pb-6 shadow-2xl sticky top-0 z-50 rounded-b-[2.5rem]">
        <div className="flex items-center justify-between mb-2">
           <button onClick={() => navigate('/dashboard')} className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-transform"><ArrowRight size={22}/></button>
           <div className="text-center">
                <h1 className="text-xl font-black tracking-tight">بهینه‌سازی برش پروفیل</h1>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mt-1">Profile Cut Layout Optimizer</p>
           </div>
           <div className="w-10"></div>
        </div>
      </div>

      {/* INPUTS CONFIG */}
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="border-slate-200 bg-white">
                <div className="flex items-center gap-3 mb-4">
                    <Package size={20} className="text-blue-600" />
                    <h2 className="font-black text-slate-800 text-sm">انتخاب پروژه مرجع</h2>
                </div>
                <SelectField 
                    label="پروژه جهت بهینه‌سازی"
                    value={selectedProjectId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleProjectSelect(e.target.value)}
                    options={[
                        { label: 'یک پروژه را انتخاب کنید...', value: '' },
                        ...projects.map(p => ({ label: p.customerName, value: p.id }))
                    ]}
                />
            </GlassCard>

            <GlassCard className="border-slate-200 bg-white">
                <div className="flex items-center gap-3 mb-4">
                    <SettingsIcon size={20} className="text-slate-500" />
                    <h2 className="font-black text-slate-800 text-sm">تنظیمات برش ابعاد کارگاهی</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="طول شاخه استاندارد (mm)" type="number" value={stockLength} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStockLength(Number(toEnglishDigits(e.target.value)))} />
                    <InputField label="ضخامت تیغه اره (mm)" type="number" value={bladeKerf} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBladeKerf(Number(toEnglishDigits(e.target.value)))} />
                </div>
            </GlassCard>
        </div>

        <PrimaryButton 
            fullWidth 
            loading={isCalculating}
            onClick={handleCalculate}
            icon={RefreshCw}
            className="h-16 rounded-[2rem] shadow-xl text-sm"
        >
            محاسبه چیدمان بهینه و الزامات برش
        </PrimaryButton>

        {/* ON-SCREEN LIVE PREVIEW WORKSHOP VIEW */}
        {hasCalculated && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-600" />
                        پیش‌نمایش چیدمان کارگاهی قطعات (پروفیل)
                    </h3>
                    <button 
                        onClick={downloadPDF}
                        className="flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-xl transition-all"
                    >
                        <Download size={16} />
                        خروجی نقشه فنی PDF
                    </button>
                </div>

                <div className="space-y-2">
                    {((Object.values(groupedBars).flat()) as OptimizedBar[]).map((bar, idx) => renderProfileBarSvg(bar, idx, 99))}
                </div>
            </motion.div>
        )}
      </div>

      {/* SUMMARY MODAL */}
      <AnimatePresence>
        {showSummary && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-lg bg-white rounded-[3rem] p-8 shadow-2xl relative" dir="rtl">
                    <button onClick={() => setShowSummary(false)} className="absolute top-6 left-6 p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                    
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-black text-slate-900">گزارش بهینه‌سازی برش پروفیل</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Industrial Layout Summary</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(groupedBars).map(([type, bars]) => (
                                <div key={type} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 block mb-1">{getFarsiType(type)}</span>
                                    <div className="text-lg font-black text-slate-900">{toPersianDigits(bars.length)} <span className="text-[10px] opacity-40">شاخه</span></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <PrimaryButton fullWidth loading={isGeneratingPDF} onClick={downloadPDF} icon={Download} className="h-16 rounded-[2rem] shadow-xl">
                        دریافت نقشه فنی کارگاه (PDF)
                    </PrimaryButton>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* PURE PRINT LAYOUT ENGINE - PROFILES */}
      <div className="fixed top-0 left-[-10000px] pointer-events-none z-[-100]">
        <div ref={printRef} style={{ width: '794px' }}>
            {(() => {
                const flatBars = (Object.values(groupedBars) as OptimizedBar[][]).flat() as OptimizedBar[];
                const pages: OptimizedBar[][] = [];
                for (let i = 0; i < flatBars.length; i += 16) pages.push(flatBars.slice(i, i + 16));
                const totalPagesCount = pages.length;
                return pages.map((pageBars, pageIdx) => (
                    <div key={pageIdx} className="pdf-page-container" style={{ 
                        width: '794px', height: '1123px', padding: '40px', backgroundColor: '#ffffff', 
                        display: 'flex', flexDirection: 'column', direction: 'rtl', border: '1px solid #e2e8f0',
                        boxSizing: 'border-box', overflow: 'hidden'
                    }}>
                        {/* Header Updated to NexWin Precision */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #0f172a', paddingBottom: '12px', marginBottom: '20px', flexShrink: 0 }}>
                            <div style={{ textAlign: 'right' }}>
                                <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0, fontFamily: 'Vazirmatn, sans-serif' }}>نقشه اجرایی برش و بهینه‌سازی (NexWin Precision)</h1>
                                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginTop: '4px', fontFamily: 'Vazirmatn, sans-serif' }}>پروژه: {selectedProject?.customerName} | کد رهگیری: {toPersianDigits(selectedProject?.id || '')}</p>
                            </div>
                            <div style={{ textAlign: 'left', fontSize: '10px', color: '#64748b', fontWeight: 'bold', fontFamily: 'Vazirmatn, sans-serif' }}>
                                <div style={{ fontSize: '12px', color: '#1e3a8a', fontWeight: '900' }}>NEXWIN CORE v4.8</div>
                                <div>تاریخ صدور: {toPersianDigits(new Date().toLocaleDateString('fa-IR'))}</div>
                                <div>صفحه {toPersianDigits(pageIdx + 1)} از {toPersianDigits(totalPagesCount)}</div>
                            </div>
                        </div>

                        {/* Bars Content */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}>
                            {pageBars.map((bar, bIdx) => {
                                const color = getProfileColors(bar.type);
                                const SVG_WIDTH = 714;
                                const scaleX = (val: number) => (val / stockLength) * SVG_WIDTH;

                                return (
                                    <div key={bIdx} style={{ marginBottom: '2px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '10px', fontWeight: '900', fontFamily: 'Vazirmatn, sans-serif' }}>
                                            <div style={{ color: '#334155' }}>
                                                <span style={{ color: color, fontSize: '14px', marginLeft: '6px' }}>●</span>
                                                {getFarsiType(bar.type)} <span style={{color: '#94a3b8', fontSize: '8px', marginRight: '8px'}}>شاخه {toPersianDigits(bar.id)}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '15px', color: '#64748b' }}>
                                                <span>طول کل مصرفی: {toPersianDigits(bar.usedLength)} mm</span>
                                                <span style={{ color: '#ef4444' }}>ضایعات: {toPersianDigits(bar.waste)} mm</span>
                                            </div>
                                        </div>

                                        <svg width={SVG_WIDTH} height="30" viewBox={`0 0 ${SVG_WIDTH} 100`} style={{ display: 'block' }}>
                                            <defs>
                                                <pattern id={`hatch-pdf-${pageIdx}-${bIdx}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                                                    <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="2" />
                                                </pattern>
                                            </defs>
                                            
                                            <rect x="0" y="30" width={SVG_WIDTH} height="40" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
                                            
                                            {(() => {
                                                let curX = 0;
                                                return bar.items.map((piece, pIdx) => {
                                                    const x = scaleX(curX);
                                                    const w = scaleX(piece.length);
                                                    const isMiter = true; // All sections (Frame, Sash, Mullion, Bead) are cut at 45 degrees
                                                    const offset = 8;
                                                    curX += piece.length + bladeKerf;
                                                    
                                                    const isVeryNarrow = w < 50; 

                                                    return (
                                                        <g key={pIdx}>
                                                            <polygon 
                                                                points={`${x},30 ${x+w},30 ${x+w-offset},70 ${x+offset},70`}
                                                                fill={color}
                                                                stroke="white"
                                                                strokeWidth="0.5"
                                                            />
                                                            {isVeryNarrow ? (
                                                                <g transform={`rotate(-90, ${x + w/2}, 50)`}>
                                                                    <text x={x + w/2} y="55" fill="white" fontSize="16" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        {toPersianDigits(piece.length)}
                                                                    </text>
                                                                </g>
                                                            ) : w < 100 ? (
                                                                <g>
                                                                    <text x={x + w/2} y="22" fill={color} fontSize="10" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        ۴۵°
                                                                    </text>
                                                                    <text x={x + w/2} y="54" fill="white" fontSize="16" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        {toPersianDigits(piece.length)}
                                                                    </text>
                                                                    <text x={x + w/2} y="85" fill={color} fontSize="11" fontWeight="bold" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        ی{toPersianDigits(piece.unitId)}
                                                                    </text>
                                                                </g>
                                                            ) : w < 160 ? (
                                                                <g>
                                                                    <text x={x + w/2} y="22" fill={color} fontSize="11" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        ∠ ۴۵°
                                                                    </text>
                                                                    <text x={x + w/2} y="54" fill="white" fontSize="20" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        {toPersianDigits(piece.length)}
                                                                    </text>
                                                                    <text x={x + w/2} y="85" fill={color} fontSize="11" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        {getSimplifiedLabel(piece.label)} (ی{toPersianDigits(piece.unitId)})
                                                                    </text>
                                                                </g>
                                                            ) : (
                                                                <g>
                                                                    <text x={x + w/2} y="22" fill={color} fontSize="12" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        ∠ ۴۵° / ۴۵°
                                                                    </text>
                                                                    <text x={x + w/2} y="55" fill="white" fontSize="24" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        {toPersianDigits(piece.length)}
                                                                    </text>
                                                                    <text x={x + w/2} y="85" fill={color} fontSize="13" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        {piece.label} (ی{toPersianDigits(piece.unitId)})
                                                                    </text>
                                                                </g>
                                                            )}
                                                        </g>
                                                    )
                                                })
                                            })()}

                                            <rect x={scaleX(bar.usedLength)} y="30" width={scaleX(bar.waste)} height="40" fill="#f1f5f9" />
                                            <rect x={scaleX(bar.usedLength)} y="30" width={scaleX(bar.waste)} height="40" fill={`url(#hatch-pdf-${pageIdx}-${bIdx})`} />
                                            
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

                        {/* Standard Engineering Footer Updated to NexWin */}
                        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2.5px solid #0f172a', flexShrink: 0 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '15px', fontFamily: 'Vazirmatn, sans-serif' }}>
                                <div style={{ border: '1px solid #e2e8f0', height: '70px', borderRadius: '12px', padding: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', marginBottom: '25px' }}>کنترل کیفی و ابعاد (QC)</div>
                                    <div style={{ fontSize: '8px', color: '#cbd5e1' }}>مهر و امضا</div>
                                </div>
                                <div style={{ border: '1px solid #e2e8f0', height: '70px', borderRadius: '12px', padding: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', marginBottom: '25px' }}>مسئول ایستگاه برش</div>
                                    <div style={{ fontSize: '8px', color: '#cbd5e1' }}>امضا</div>
                                </div>
                                <div style={{ border: '1px solid #e2e8f0', height: '70px', borderRadius: '12px', padding: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', marginBottom: '25px' }}>تایید مهندسی فروش</div>
                                    <div style={{ fontSize: '8px', color: '#cbd5e1' }}>مهر و امضا</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', fontWeight: 'bold', fontFamily: 'Vazirmatn, sans-serif' }}>
                                <div>ابعاد بر اساس کسر تیغه اره {toPersianDigits(bladeKerf)}mm می‌باشد. کلیه واحدها به میلی‌متر (mm) است.</div>
                                <div style={{ color: '#0f172a' }}>NEXWIN INDUSTRIAL ENGINE v4.8</div>
                            </div>
                        </div>
                    </div>
                ));
            })()}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-6 pointer-events-none no-print">
          <div className="max-w-xl mx-auto pointer-events-auto">
              <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-900 text-white h-16 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all">
                  <FileText size={22} />
                  بازگشت به پیش‌خوان سیستم
              </button>
          </div>
      </div>

    </div>
  );
};
