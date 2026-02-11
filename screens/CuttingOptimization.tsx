
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, RefreshCw, Download, Settings as SettingsIcon, Package, Loader2, FileText, X, Layout, PieChart, Layers, CheckCircle2, Printer } from 'lucide-react';
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
  width?: number; 
  height?: number; 
  quantity: number;
  label: string;
  type: ProfileType | 'Glass';
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

interface GlassPiece {
  x: number;
  y: number;
  w: number;
  h: number;
  unitId: string;
  label: string;
}

interface OptimizedSheet {
  id: number;
  pieces: GlassPiece[];
  usedArea: number;
  wastePercent: number;
}

export const CuttingOptimization = () => {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const glassPrintRef = useRef<HTMLDivElement>(null);
  
  const [activeMode, setActiveMode] = useState<OptMode>('profile');
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  // Settings
  const [stockLength, setStockLength] = useState(6000);
  const [bladeKerf, setBladeKerf] = useState(4);
  const [glassSheetWidth] = useState(3210);
  const [glassSheetHeight] = useState(2250);
  const [glassKerf] = useState(3);
  const [glassMargin] = useState(10);

  // Data
  const [profileList, setProfileList] = useState<CutItem[]>([]);
  const [glassList, setGlassList] = useState<CutItem[]>([]);
  const [groupedBars, setGroupedBars] = useState<Record<ProfileType, OptimizedBar[]>>({
    Frame: [], Sash: [], Mullion: [], Bead: []
  });
  const [optimizedSheets, setOptimizedSheets] = useState<OptimizedSheet[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

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
        case 'Frame': return '#0f172a'; // Deep Navy
        case 'Sash': return '#064e3b';  // Forest Green
        case 'Mullion': return '#7f1d1d'; // Dark Red
        case 'Bead': return '#b45309';   // Dark Amber
        default: return '#334155';
    }
  };

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const profiles: CutItem[] = [];
    const glasses: CutItem[] = [];

    project.items.forEach((unit, idx) => {
      const uId = (idx + 1).toString();
      profiles.push({ id: `F-${idx}-W`, length: unit.config.width, quantity: unit.quantity * 2, label: `عرض`, type: 'Frame', angle: '45/45', unitId: uId });
      profiles.push({ id: `F-${idx}-H`, length: unit.config.height, quantity: unit.quantity * 2, label: `ارتفاع`, type: 'Frame', angle: '45/45', unitId: uId });
      if (unit.calculations.sashCount > 0) {
          profiles.push({ id: `S-${idx}-W`, length: unit.config.width - 45, quantity: unit.quantity * unit.calculations.sashCount * 2, label: `ع بازشو`, type: 'Sash', angle: '45/45', unitId: uId });
          profiles.push({ id: `S-${idx}-H`, length: unit.config.height - 45, quantity: unit.quantity * unit.calculations.sashCount * 2, label: `ا بازشو`, type: 'Sash', angle: '45/45', unitId: uId });
      }
      if (unit.config.mullions > 0) {
          profiles.push({ id: `M-${idx}`, length: unit.config.height - 70, quantity: unit.quantity * unit.config.mullions, label: `مولیون`, type: 'Mullion', angle: '90/90', unitId: uId });
      }
      profiles.push({ id: `B-${idx}-W`, length: unit.config.width - 90, quantity: unit.quantity * 2, label: `زهوار ع`, type: 'Bead', angle: '45/45', unitId: uId });
      profiles.push({ id: `B-${idx}-H`, length: unit.config.height - 90, quantity: unit.quantity * 2, label: `زهوار ا`, type: 'Bead', angle: '45/45', unitId: uId });

      glasses.push({ id: `G-${idx}`, length: 0, width: unit.config.width - 80, height: unit.config.height - 80, quantity: unit.quantity, label: `شیشه`, type: 'Glass', unitId: uId });
    });
    setProfileList(profiles);
    setGlassList(glasses);
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
        bars.push({ id: bars.length + 1, type: piece.type as ProfileType, items: [piece], usedLength: piece.length + bladeKerf, waste: stockLength - (piece.length + bladeKerf) });
      }
    });
    return bars;
  };

  const runGlassOptimization = (items: CutItem[]): OptimizedSheet[] => {
    const pieces: {w: number, h: number, unitId: string, label: string}[] = [];
    items.forEach(item => {
        for (let i = 0; i < item.quantity; i++) pieces.push({ w: item.width || 0, h: item.height || 0, unitId: item.unitId, label: item.label });
    });
    pieces.sort((a, b) => b.h - a.h);
    const sheets: OptimizedSheet[] = [];
    const usableW = glassSheetWidth - (glassMargin * 2);
    const usableH = glassSheetHeight - (glassMargin * 2);
    let currentSheet: OptimizedSheet = { id: 1, pieces: [], usedArea: 0, wastePercent: 100 };
    let currentX = 0, currentY = 0, levelH = 0;

    pieces.forEach(p => {
        if (currentX + p.w + glassKerf > usableW) { currentX = 0; currentY += levelH + glassKerf; levelH = 0; }
        if (currentY + p.h + glassKerf > usableH) {
            sheets.push({ ...currentSheet, wastePercent: 100 - (currentSheet.usedArea / (glassSheetWidth * glassSheetHeight) * 100) });
            currentSheet = { id: sheets.length + 1, pieces: [], usedArea: 0, wastePercent: 100 };
            currentX = 0; currentY = 0; levelH = 0;
        }
        currentSheet.pieces.push({ x: currentX + glassMargin, y: currentY + glassMargin, w: p.w, h: p.h, unitId: p.unitId, label: p.label });
        currentSheet.usedArea += p.w * p.h;
        currentX += p.w + glassKerf;
        levelH = Math.max(levelH, p.h);
    });
    if (currentSheet.pieces.length > 0) sheets.push({ ...currentSheet, wastePercent: 100 - (currentSheet.usedArea / (glassSheetWidth * glassSheetHeight) * 100) });
    return sheets;
  };

  const handleCalculate = () => {
    if (!selectedProjectId) return;
    setIsCalculating(true);
    setTimeout(() => {
        if (activeMode === 'profile') {
            setGroupedBars({
                Frame: run1DOptimization(profileList.filter(i => i.type === 'Frame')),
                Sash: run1DOptimization(profileList.filter(i => i.type === 'Sash')),
                Mullion: run1DOptimization(profileList.filter(i => i.type === 'Mullion')),
                Bead: run1DOptimization(profileList.filter(i => i.type === 'Bead'))
            });
        } else {
            setOptimizedSheets(runGlassOptimization(glassList));
        }
        setIsCalculating(false);
        setShowSummary(true);
    }, 800);
  };

  const downloadPDF = async (type: 'profile' | 'glass') => {
    setIsGeneratingPDF(true);
    const targetRef = type === 'profile' ? printRef : glassPrintRef;
    if (!targetRef.current) {
        setIsGeneratingPDF(false);
        return;
    }
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const pages = targetRef.current.querySelectorAll('.pdf-page-container');
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
        pdf.save(`${type === 'profile' ? 'Profile_Cutting' : 'Glass_Cutting'}_${selectedProject?.customerName || 'NexWin'}.pdf`);
    } catch (err) { console.error('PDF Error:', err); } finally { setIsGeneratingPDF(false); }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const totalGlassArea = optimizedSheets.reduce((acc, s) => acc + s.usedArea, 0) / 1000000;
  const avgGlassWaste = optimizedSheets.reduce((acc, s) => acc + s.wastePercent, 0) / (optimizedSheets.length || 1);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-['Vazirmatn']">
      
      {/* 1. ENGINEERING BLUEPRINT ENGINE - PROFILE */}
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
                                <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>نقشه اجرایی برش و بهینه‌سازی (NexWin Precision)</h1>
                                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginTop: '4px' }}>پروژه: {selectedProject?.customerName} | کد رهگیری: {toPersianDigits(selectedProject?.id || '')}</p>
                            </div>
                            <div style={{ textAlign: 'left', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '10px', fontWeight: '900' }}>
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
                                                    const isMiter = piece.type === 'Frame' || piece.type === 'Sash';
                                                    const offset = isMiter ? 8 : 0; 
                                                    curX += piece.length + bladeKerf;
                                                    
                                                    const isVeryNarrow = w < 45; 

                                                    return (
                                                        <g key={pIdx}>
                                                            <polygon 
                                                                points={isMiter ? `${x},30 ${x+w},30 ${x+w-offset},70 ${x+offset},70` : `${x},30 ${x+w},30 ${x+w},70 ${x},70`}
                                                                fill={color}
                                                                stroke="white"
                                                                strokeWidth="0.5"
                                                            />
                                                            {isVeryNarrow ? (
                                                                <g transform={`rotate(-90, ${x + w/2}, 50)`}>
                                                                    <text x={x + w/2} y="55" fill="white" fontSize="24" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        {toPersianDigits(piece.length)}
                                                                    </text>
                                                                </g>
                                                            ) : (
                                                                <g>
                                                                    <text x={x + w/2} y="22" fill={color} fontSize="12" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
                                                                        ∠ {toPersianDigits(piece.angle || '90/90')}
                                                                    </text>
                                                                    <text x={x + w/2} y="55" fill="white" fontSize="26" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn' }}>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '15px' }}>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' }}>
                                <div>ابعاد بر اساس کسر تیغه اره {toPersianDigits(bladeKerf)}mm می‌باشد. کلیه واحدها به میلی‌متر (mm) است.</div>
                                <div style={{ color: '#0f172a' }}>NEXWIN INDUSTRIAL ENGINE v4.8</div>
                            </div>
                        </div>
                    </div>
                ));
            })()}
        </div>
      </div>

      {/* 2. INDUSTRIAL GLASS PDF ENGINE ( بازطراحی صنعتی ) */}
      <div className="fixed top-0 left-[-10000px] pointer-events-none z-[-100]">
        <div ref={glassPrintRef} style={{ width: '794px' }}>
            {optimizedSheets.map((sheet, sIdx) => (
                <div key={sIdx} className="pdf-page-container" style={{ 
                    width: '794px', height: '1123px', padding: '50px', backgroundColor: '#ffffff', 
                    display: 'flex', flexDirection: 'column', direction: 'rtl',
                    boxSizing: 'border-box', overflow: 'hidden'
                }}>
                    {/* INDUSTRIAL HEADER */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #000000', paddingBottom: '15px', marginBottom: '30px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                            <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#000000', margin: 0 }}>نقشه برش جام شیشه (NexWin Glass)</h1>
                            <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                                <p style={{ fontSize: '12px', color: '#000', fontWeight: '900' }}>پروژه: {selectedProject?.customerName}</p>
                                <p style={{ fontSize: '12px', color: '#000', fontWeight: '900' }}>جام شماره: {toPersianDigits(sheet.id)}</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'left', fontSize: '11px', color: '#000', fontWeight: '900' }}>
                            <div style={{ fontSize: '14px', color: '#000', fontWeight: '900', marginBottom: '4px' }}>واحد اندازه‌گیری: میلی‌متر (mm)</div>
                            <div>ابعاد جام: {toPersianDigits(glassSheetWidth)} × {toPersianDigits(glassSheetHeight)}</div>
                        </div>
                    </div>

                    {/* MAIN BLUEPRINT AREA */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <div style={{ position: 'relative', width: '694px', height: '650px', border: '3px solid #000' }}>
                            {/* Point Zero Marker (Origin) */}
                            <div style={{ position: 'absolute', top: '-25px', right: '-25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: '900', marginBottom: '2px' }}>مبدأ برش (0,0)</div>
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                                    <path d="M12 2L12 22M12 2L5 9M12 2L19 9" />
                                </svg>
                            </div>

                            <svg width="100%" height="100%" viewBox={`0 0 ${glassSheetWidth} ${glassSheetHeight}`} style={{ display: 'block' }}>
                                <defs>
                                    <pattern id="industrial-glass-waste" patternUnits="userSpaceOnUse" width="80" height="80" patternTransform="rotate(45)">
                                        <line x1="0" y1="0" x2="0" y2="80" stroke="#eeeeee" strokeWidth="20" />
                                    </pattern>
                                </defs>
                                
                                {/* Background as Waste */}
                                <rect x="0" y="0" width={glassSheetWidth} height={glassSheetHeight} fill="url(#industrial-glass-waste)" />
                                <text x={glassSheetWidth/2} y={glassSheetHeight/2} fill="#cccccc" fontSize="300" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'Vazirmatn', opacity: 0.5 }}>ضـایـعـات</text>

                                {/* Pieces */}
                                {sheet.pieces.map((p, pIdx) => {
                                    const isVertical = p.w < p.h * 0.6;
                                    return (
                                        <g key={pIdx}>
                                            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="#ffffff" stroke="#000000" strokeWidth="6" />
                                            
                                            {/* Large Centered Dimensions */}
                                            <text 
                                                x={p.x + p.w/2} y={p.y + p.h/2 - 20} 
                                                fill="#000000" fontSize={p.w < 500 ? "130" : "180"} fontWeight="900" textAnchor="middle" 
                                                transform={isVertical ? `rotate(-90, ${p.x + p.w/2}, ${p.y + p.h/2 - 20})` : ""}
                                                style={{ fontFamily: 'Vazirmatn' }}
                                            >
                                                {toPersianDigits(p.w)} × {toPersianDigits(p.h)}
                                            </text>

                                            {/* Identifier */}
                                            <text 
                                                x={p.x + p.w/2} y={p.y + p.h/2 + 130} 
                                                fill="#000000" fontSize="90" fontWeight="900" textAnchor="middle" 
                                                transform={isVertical ? `rotate(-90, ${p.x + p.w/2}, ${p.y + p.h/2 + 130})` : ""}
                                                style={{ fontFamily: 'Vazirmatn' }}
                                            >
                                                واحد {toPersianDigits(p.unitId)} - {p.label}
                                            </text>

                                            {/* Piece Sequence Number */}
                                            <circle cx={p.x + 60} cy={p.y + 60} r="45" fill="#000" />
                                            <text x={p.x + 60} y={p.y + 75} fill="#fff" fontSize="50" fontWeight="900" textAnchor="middle">{toPersianDigits(pIdx + 1)}</text>
                                        </g>
                                    )
                                })}
                            </svg>
                        </div>
                    </div>

                    {/* INDUSTRIAL FOOTER */}
                    <div style={{ marginTop: '40px', borderTop: '4px solid #000', paddingTop: '20px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 180px)', gap: '15px' }}>
                                <div style={{ border: '2px solid #000', padding: '10px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '900', display: 'block', marginBottom: '2px' }}>متراژ مفید (Area)</span>
                                    <span style={{ fontSize: '16px', fontWeight: '900' }}>{toPersianDigits((sheet.usedArea/1000000).toFixed(2))} m²</span>
                                </div>
                                <div style={{ border: '2px solid #000', padding: '10px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '900', display: 'block', marginBottom: '2px' }}>راندمان (Yield)</span>
                                    <span style={{ fontSize: '16px', fontWeight: '900' }}>{toPersianDigits((100 - sheet.wastePercent).toFixed(1))}%</span>
                                </div>
                                <div style={{ border: '2px solid #000', padding: '10px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '900', display: 'block', marginBottom: '2px' }}>تعداد قطعه</span>
                                    <span style={{ fontSize: '16px', fontWeight: '900' }}>{toPersianDigits(sheet.pieces.length)} عدد</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'left', fontSize: '10px', fontWeight: '900' }}>
                                <div style={{ fontSize: '14px', marginBottom: '4px' }}>NEXWIN GLASS v4.9</div>
                                <div style={{ color: '#666' }}>Optimized Industrial Output</div>
                            </div>
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '900', textAlign: 'center', borderTop: '1px dashed #000', paddingTop: '10px' }}>
                            تاییدیه نهایی کارگاه: .................................................... | امضای مسئول برش: ....................................................
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* HEADER UI Updated to NexWin Designer */}
      <div className="bg-slate-900 text-white px-6 pt-12 pb-6 shadow-2xl sticky top-0 z-50 rounded-b-[2.5rem]">
        <div className="flex items-center justify-between mb-6">
           <button onClick={() => navigate('/dashboard')} className="p-3 bg-white/10 rounded-2xl active:scale-90 transition-transform"><ArrowRight size={22}/></button>
           <div className="text-center">
                <h1 className="text-xl font-black tracking-tight">طراح نکس‌وین (NexWin Designer)</h1>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mt-1">Workshop Layout Engine</p>
           </div>
           <div className="w-10"></div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <button onClick={() => { setActiveMode('profile'); setShowSummary(false); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeMode === 'profile' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>پروفیل‌ها</button>
            <button onClick={() => { setActiveMode('glass'); setShowSummary(false); }} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeMode === 'glass' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>شیشه‌ها</button>
        </div>
      </div>

      {/* INPUTS */}
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
                    onChange={(e: any) => { setSelectedProjectId(e.target.value); handleProjectSelect(e.target.value); setShowSummary(false); }}
                    options={[
                        { label: 'یک پروژه را انتخاب کنید...', value: '' },
                        ...projects.map(p => ({ label: `${p.customerName}`, value: p.id }))
                    ]}
                />
            </GlassCard>

            <GlassCard className="border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <SettingsIcon size={20} className="text-slate-400" />
                    <h2 className="font-black text-slate-800 text-sm">تنظیمات مهندسی</h2>
                </div>
                {activeMode === 'profile' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="طول شاخه (mm)" type="number" value={stockLength} onChange={(e:any) => setStockLength(Number(toEnglishDigits(e.target.value)))} />
                        <InputField label="تیغه اره (mm)" type="number" value={bladeKerf} onChange={(e:any) => setBladeKerf(Number(toEnglishDigits(e.target.value)))} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ابعاد جام استاندارد</span>
                            <span className="text-xs font-black text-slate-700">{toPersianDigits(3210)} × {toPersianDigits(2250)} mm</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">الماسه و حاشیه</span>
                            <span className="text-xs font-black text-slate-700">{toPersianDigits(3)}mm + {toPersianDigits(10)}mm</span>
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>

        <PrimaryButton 
            fullWidth 
            loading={isCalculating}
            onClick={handleCalculate}
            icon={RefreshCw}
            className="h-16 rounded-[2rem] shadow-xl"
        >
            محاسبه چیدمان بهینه قطعات
        </PrimaryButton>
      </div>

      {/* SUMMARY MODAL Updated to NexWin */}
      <AnimatePresence>
        {showSummary && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full max-w-lg bg-white rounded-[3rem] p-8 shadow-2xl relative overflow-hidden"
                >
                    <button onClick={() => setShowSummary(false)} className="absolute top-6 left-6 p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                    
                    <div className="text-center mb-8">
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-3xl flex items-center justify-center ${activeMode === 'profile' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {activeMode === 'profile' ? <Layers size={32}/> : <Layout size={32}/>}
                        </div>
                        <h2 className="text-xl font-black text-slate-900">خلاصه گزارش نکس‌وین (NexWin)</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Industrial Layout Summary</p>
                    </div>

                    <div className="space-y-4 mb-8">
                        {activeMode === 'profile' ? (
                            <div className="grid grid-cols-2 gap-3">
                                {(Object.entries(groupedBars) as [string, OptimizedBar[]][]).map(([type, bars]) => (
                                    <div key={type} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-tight">{getFarsiType(type)}</span>
                                        <div className="text-lg font-black text-slate-900">{toPersianDigits(bars.length)} <span className="text-[10px] opacity-40">شاخه</span></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-tight">تعداد کل جام</span>
                                    <div className="text-lg font-black text-slate-900">{toPersianDigits(optimizedSheets.length)} <span className="text-[10px] opacity-40">جام</span></div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-tight">مساحت کل</span>
                                    <div className="text-lg font-black text-slate-900">{toPersianDigits(totalGlassArea.toFixed(2))} <span className="text-[10px] opacity-40">m²</span></div>
                                </div>
                                <div className="col-span-2 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">راندمان چیدمان مهندسی</span>
                                    <div className="text-xl font-black text-emerald-700">{toPersianDigits((100 - avgGlassWaste).toFixed(1))}%</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <PrimaryButton 
                        fullWidth 
                        loading={isGeneratingPDF}
                        onClick={() => downloadPDF(activeMode)}
                        icon={Download}
                        className="h-16 rounded-[2rem] shadow-xl"
                    >
                        دریافت نقشه فنی کارگاه (PDF)
                    </PrimaryButton>
                    
                    <button onClick={() => setShowSummary(false)} className="w-full mt-4 py-3 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors">بازگشت به تنظیمات</button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* DASHBOARD NAV */}
      <div className="no-print fixed bottom-0 left-0 right-0 z-40 p-6 pointer-events-none">
          <div className="max-w-xl mx-auto pointer-events-auto">
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full bg-slate-900 text-white h-16 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
              >
                  <FileText size={22} />
                  بازگشت به پیش‌خوان
              </button>
          </div>
      </div>
    </div>
  );
};
