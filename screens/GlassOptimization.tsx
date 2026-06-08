import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, RefreshCw, Download, Package, FileText, X, Layout, Maximize2, Percent, Check, Trash2, Plus, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InputField, PrimaryButton, GlassCard, SelectField } from '../components/UIComponents';
import { toPersianDigits, toEnglishDigits } from '../utils/formatting';
import { pricingStore } from '../services/pricingStore';
import { SavedProject } from '../types';
import { calculateDetailedCuts } from '../services/engineeringService';
import { motion, AnimatePresence } from 'framer-motion';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { GlassPiece, SheetSize, OptimizedSheet, CutItem, runGlassOptimization } from '../services/glassPacker';

export const GlassOptimization = () => {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Manage Multiple Sheet Sizes (User requested to change size and define multiple simultaneously)
  const [sheetSizes, setSheetSizes] = useState<SheetSize[]>([
    { id: '1', width: 3210, height: 2250, label: 'جام استاندارد بزرگ (A)', isActive: true },
    { id: '2', width: 2400, height: 1800, label: 'جام اقتصادی متوسط (B)', isActive: false },
    { id: '3', width: 2200, height: 1600, label: 'جام کوچک کارگاهی (C)', isActive: false }
  ]);

  const [newWidth, setNewWidth] = useState<number>(2400);
  const [newHeight, setNewHeight] = useState<number>(1800);
  const [newLabel, setNewLabel] = useState<string>('');

  const [glassKerf, setGlassKerf] = useState(0);
  const [glassMargin, setGlassMargin] = useState(0);

  // Data State
  const [glassList, setGlassList] = useState<CutItem[]>([]);
  const [optimizedSheets, setOptimizedSheets] = useState<OptimizedSheet[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Layout Font Controls
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [fontFamily, setFontFamily] = useState<string>('Vazirmatn');

  useEffect(() => {
    setProjects(pricingStore.getProjects());
  }, []);

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const glasses: CutItem[] = [];

    project.items.forEach((unit, idx) => {
      const uId = (idx + 1).toString();
      const unitBrand = pricingStore.getBrands().find(b => b.id === unit.config.profileId);
      const cuts = calculateDetailedCuts(unit.config.layout || {} as any, unit.config.width, unit.config.height, unit.config.frameType, unitBrand);

      cuts.forEach((cut, cIdx) => {
        const itemQuantity = cut.quantity * unit.quantity;

        if (cut.type === 'Glass') {
          glasses.push({
            id: `G-${idx}-${cIdx}`,
            width: Math.round(cut.width || 0),
            height: Math.round(cut.height || 0),
            quantity: itemQuantity,
            label: `${cut.name} (${Math.round(unit.config.width || 0)}x${Math.round(unit.config.height || 0)})`,
            type: 'Glass',
            unitId: uId
          });
        }
      });
    });

    setGlassList(glasses);
    setOptimizedSheets([]); // Clear stale results
  };

  const handleAddSheetSize = () => {
    if (!newWidth || !newHeight) return;
    const labelStr = newLabel.trim() || `جام سفارشی (${newWidth}×${newHeight})`;
    const nSize: SheetSize = {
      id: Date.now().toString(),
      width: Math.round(newWidth),
      height: Math.round(newHeight),
      label: labelStr,
      isActive: true
    };
    setSheetSizes(prev => [...prev, nSize]);
    setNewWidth(2400);
    setNewHeight(1800);
    setNewLabel('');
    setOptimizedSheets([]);
  };

  const handleToggleSheetSize = (id: string) => {
    setSheetSizes(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
      // Fallback: at least one size must remain active
      if (!updated.some(s => s.isActive)) return prev;
      return updated;
    });
    setOptimizedSheets([]);
  };

  const handleDeleteSheetSize = (id: string) => {
    setSheetSizes(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) return prev;
      // Guarantee at least one size is active
      if (!filtered.some(s => s.isActive)) {
        filtered[0].isActive = true;
      }
      return filtered;
    });
    setOptimizedSheets([]);
  };

  const handleCalculate = () => {
    if (!selectedProjectId) return;
    setIsCalculating(true);
    setTimeout(() => {
      const results = runGlassOptimization(glassList, sheetSizes, glassMargin, glassKerf);
      setOptimizedSheets(results);
      setIsCalculating(false);
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
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          canvasWidth: 794,
          canvasHeight: 1123
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
      pdf.save(`NexWin_Glass_Optimization_${selectedProject?.customerName || 'Project'}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Compute exact metrics (weighted by page sheet area)
  const totalSheetsUsed = optimizedSheets.length;
  const totalGlassArea = optimizedSheets.reduce((acc, s) => acc + s.usedArea, 0) / 1000000;
  const totalSheetArea = optimizedSheets.reduce((acc, s) => acc + (s.sheetWidth * s.sheetHeight), 0);
  const avgEfficiency = totalSheetArea > 0
    ? (optimizedSheets.reduce((acc, s) => acc + s.usedArea, 0) / totalSheetArea) * 100
    : 0;

  // Colors & Label formatting helper
  const getPieceColor = (w: number, f: number) => {
    const hash = (Math.round(w) * 31 + Math.round(f)) % 4;
    if (hash === 0) return '#6366f1'; // Royal Indigo
    if (hash === 1) return '#c2410c'; // Saffron Rust
    if (hash === 2) return '#0284c7'; // Sea Sky Blue
    return '#0d9488'; // Forest Teal
  };

  const getSimplifiedLabel = (labelStr: string) => {
    let s = labelStr || '';
    s = s.replace(/شیشه/g, '').trim();
    s = s.replace(/دوجداره/g, '').trim();
    s = s.replace(/تک‌جداره/g, '').trim();
    s = s.replace(/ساده/g, '').trim();
    s = s.replace(/\s+/g, ' ');
    if (s.length > 15) {
      s = s.substring(0, 14) + '...';
    }
    return s || 'جام یونیت';
  };

  // Reusable responsive SVG component to output beautiful, polished blueprints
  const renderInteractiveSvg = (sheet: OptimizedSheet, indexKey: string) => {
    const W = sheet.sheetWidth;
    const H = sheet.sheetHeight;

    // View margins allowing detailed dimension lines outdoors
    const padLeft = 140;
    const padRight = 140;
    const padTop = 100;
    const padBottom = 260; // Larger room at bottom for standard horizontal dimensions

    const viewBoxW = W + padLeft + padRight;
    const viewBoxH = H + padTop + padBottom;

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`-${padLeft} -${padTop} ${viewBoxW} ${viewBoxH}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <pattern id={`stripe-waste-svg-${indexKey}`} patternUnits="userSpaceOnUse" width="30" height="30" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="30" stroke="#fecaca" strokeWidth="6" />
          </pattern>
        </defs>

        {/* 1. Base Sheet Frame */}
        <rect x="0" y="0" width={W} height={H} fill="#f8fafc" stroke="#334155" strokeWidth="8" rx="8" />

        {/* 2. Margin Boundary Lines */}
        {glassMargin > 0 && (
          <rect
            x={glassMargin}
            y={glassMargin}
            width={W - glassMargin * 2}
            height={H - glassMargin * 2}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="3"
            strokeDasharray="16 12"
          />
        )}

        {/* 3. Outer Sheet Width Indicator (Bottom) */}
        <g>
          <line x1="0" y1={H + 80} x2={W} y2={H + 80} stroke="#475569" strokeWidth="5" strokeDasharray="12 10" />
          <line x1="0" y1={H + 50} x2="0" y2={H + 110} stroke="#475569" strokeWidth="6" />
          <line x1={W} y1={H + 50} x2={W} y2={H + 110} stroke="#475569" strokeWidth="6" />
          
          {/* Label Card */}
          <rect x={W / 2 - 280} y={H + 35} width="560" height="90" fill="#0f172a" rx="16" />
          <text
            x={W / 2}
            y={H + 95}
            fill="#ffffff"
            fontSize="75"
            fontWeight="900"
            textAnchor="middle"
            style={{ fontFamily: fontFamily }}
          >
            عرض جام: {toPersianDigits(W)} mm
          </text>
        </g>

        {/* 4. Outer Sheet Height Indicator (Right) */}
        <g>
          <line x1={W + 80} y1="0" x2={W + 80} y2={H} stroke="#475569" strokeWidth="5" strokeDasharray="12 10" />
          <line x1={W + 50} y1="0" x2={W + 110} y2="0" stroke="#475569" strokeWidth="6" />
          <line x1={W + 50} y1={H} x2={W + 110} y2={H} stroke="#475569" strokeWidth="6" />

          {/* Rotated Label Card */}
          <g transform={`rotate(90, ${W + 130}, ${H / 2})`}>
            <rect x={W + 130 - 280} y={H / 2 - 45} width="560" height="90" fill="#0f172a" rx="16" />
            <text
              x={W + 130}
              y={H / 2 + 15}
              fill="#ffffff"
              fontSize="75"
              fontWeight="900"
              textAnchor="middle"
              style={{ fontFamily: fontFamily }}
            >
              طول جام: {toPersianDigits(H)} mm
            </text>
          </g>
        </g>

        {/* 5. Render Wastes (Leftovers) with dotted structures and sizes detailed inside */}
        {sheet.wastes.map((waste, wIdx) => {
          const isTooSmall = waste.w < 200 || waste.h < 120;
          const isMicro = waste.w < 100 || waste.h < 75;

          return (
            <g key={`w-${wIdx}`}>
              <rect x={waste.x} y={waste.y} width={waste.w} height={waste.h} fill="#fef2f2" />
              <rect
                x={waste.x}
                y={waste.y}
                width={waste.w}
                height={waste.h}
                fill={`url(#stripe-waste-svg-${indexKey})`}
                stroke="#fda4af"
                strokeWidth="4"
                strokeDasharray="10 8"
              />

              {!isMicro && (
                isTooSmall ? (
                  <text
                    x={waste.x + waste.w / 2}
                    y={waste.y + waste.h / 2 + 15}
                    fill="#e11d48"
                    fontSize="50"
                    fontWeight="bold"
                    textAnchor="middle"
                    style={{ fontFamily: fontFamily }}
                  >
                    {toPersianDigits(waste.w)}×{toPersianDigits(waste.h)}
                  </text>
                ) : (
                  <g>
                    {/* Waste Width */}
                    <text x={waste.x + waste.w / 2} y={waste.y + 45} fill="#be123c" fontSize="42" fontWeight="bold" textAnchor="middle" style={{ fontFamily: fontFamily }}>
                      {toPersianDigits(waste.w)}
                    </text>
                    {/* Waste Height (Rotated) */}
                    <text
                      x={waste.x + waste.w - 20}
                      y={waste.y + waste.h / 2}
                      transform={`rotate(90, ${waste.x + waste.w - 20}, ${waste.y + waste.h / 2})`}
                      fill="#be123c"
                      fontSize="42"
                      fontWeight="bold"
                      textAnchor="middle"
                      style={{ fontFamily: fontFamily }}
                    >
                      {toPersianDigits(waste.h)}
                    </text>
                    {/* Label */}
                    <text
                      x={waste.x + waste.w / 2}
                      y={waste.y + waste.h / 2 + 15}
                      fill="#be123c"
                      fontSize="55"
                      fontWeight="black"
                      textAnchor="middle"
                      style={{ fontFamily: fontFamily }}
                    >
                      ضایعات
                    </text>
                  </g>
                )
              )}
            </g>
          );
        })}

        {/* 6. Render Placed Glass items corner-to-corner edge-to-edge */}
        {sheet.pieces.map((piece, pIdx) => {
          const blockColor = getPieceColor(piece.w, piece.h);
          const fsWidth = Math.round(52 * fontScale);
          const fsHeight = Math.round(52 * fontScale);
          const fsLabel = Math.round(56 * fontScale);
          const fsUnit = Math.round(42 * fontScale);

          // Defensive edge-offset calculation based on text sizes
          const widthY = piece.y + Math.max(fsWidth + 15, Math.min(piece.h * 0.25, 95));
          const heightX = piece.x + piece.w - Math.max(fsHeight + 15, Math.min(piece.w * 0.25, 95));

          const canShowLabel = piece.h >= 180 && piece.w >= 240;
          const canShowUnit = piece.h >= 280 && piece.w >= 240;

          // Smart text-truncating calculation ensuring Persian descriptions don't exceed container size
          const getSmartTruncatedLabel = (label: string, pieceWidth: number) => {
            const s = getSimplifiedLabel(label);
            const charWidth = fsLabel * 0.55;
            const maxAllowedChars = Math.max(2, Math.floor((pieceWidth - 60) / charWidth));
            if (s.length > maxAllowedChars) {
              return s.substring(0, Math.max(1, maxAllowedChars - 1)) + '..';
            }
            return s;
          };

          const truncatedLabel = getSmartTruncatedLabel(piece.label, piece.w);

          return (
            <g key={`p-${pIdx}`}>
              <rect x={piece.x} y={piece.y} width={piece.w} height={piece.h} fill={blockColor} stroke="#ffffff" strokeWidth="6" rx="4" />
              
              {/* Width dimension */}
              {piece.w >= 100 && piece.h >= 60 && (
                <text
                  x={piece.x + piece.w / 2}
                  y={widthY}
                  fill="#ffffff"
                  fontSize={fsWidth}
                  fontWeight="900"
                  textAnchor="middle"
                  style={{ fontFamily: fontFamily }}
                >
                  {toPersianDigits(piece.w)}
                </text>
              )}

              {/* Height dimension (Rotated with safe horizontal offset) */}
              {piece.h >= 100 && piece.w >= 60 && (
                <text
                  x={heightX}
                  y={piece.y + piece.h / 2}
                  transform={`rotate(90, ${heightX}, ${piece.y + piece.h / 2})`}
                  fill="#ffffff"
                  fontSize={fsHeight}
                  fontWeight="900"
                  textAnchor="middle"
                  style={{ fontFamily: fontFamily }}
                >
                  {toPersianDigits(piece.h)}
                </text>
              )}

              {/* Label text in middle */}
              {canShowLabel && (
                <text
                  x={piece.x + piece.w / 2}
                  y={piece.y + piece.h / 2 + (canShowUnit ? 10 : 25)}
                  fill="#ffffff"
                  fontSize={fsLabel}
                  fontWeight="black"
                  textAnchor="middle"
                  style={{ fontFamily: fontFamily }}
                >
                  {truncatedLabel}
                </text>
              )}

              {/* Unit indicator at bottom */}
              {canShowUnit ? (
                <text
                  x={piece.x + piece.w / 2}
                  y={piece.y + piece.h / 2 + 75}
                  fill="#ffffff"
                  fillOpacity="0.85"
                  fontSize={fsUnit}
                  fontWeight="bold"
                  textAnchor="middle"
                  style={{ fontFamily: fontFamily }}
                >
                  یونیت {toPersianDigits(piece.unitId)}
                </text>
              ) : (
                piece.h >= 140 && piece.w >= 140 && !canShowUnit && (
                  <text
                    x={piece.x + piece.w / 2}
                    y={piece.y + piece.h - 20}
                    fill="#ffffff"
                    fillOpacity="0.8"
                    fontSize={Math.round(28 * fontScale)}
                    fontWeight="bold"
                    textAnchor="middle"
                    style={{ fontFamily: fontFamily }}
                  >
                    یـ {toPersianDigits(piece.unitId)}
                  </text>
                )
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-['Vazirmatn'] text-slate-800">

      {/* GLASS SHEET PRINTABLE PDF ENGINE (HIDDEN BACKSTAGE) */}
      <div className="fixed top-0 left-[-10000px] pointer-events-none z-[-100]">
        <div ref={printRef} style={{ width: '794px' }}>
          {optimizedSheets.map((sheet, sIdx) => (
            <div key={sIdx} className="pdf-page-container" style={{
              width: '794px', height: '1123px', padding: '45px', backgroundColor: '#ffffff',
              display: 'flex', flexDirection: 'column', direction: 'rtl',
              boxSizing: 'border-box', overflow: 'hidden', border: '1px solid #bfdbfe'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3.5px dashed #0ea5e9', paddingBottom: '14px', marginBottom: '20px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ fontSize: '19px', fontWeight: '900', color: '#0369a1', margin: 0, fontFamily: 'Vazirmatn, sans-serif' }}>برنامه اجرایی چیدمان و برش شیشه (NexWin Glass)</h1>
                  <p style={{ fontSize: '11px', color: '#1e293b', fontWeight: 'bold', marginTop: '4px', fontFamily: 'Vazirmatn, sans-serif' }}>کارفرما/شماره نقشه: {selectedProject?.customerName} | برگ جام: {toPersianDigits(sheet.id)}</p>
                </div>
                <div style={{ textAlign: 'left', fontSize: '10px', color: '#475569', fontWeight: '950', fontFamily: 'Vazirmatn, sans-serif' }}>
                  <div>جام انتخابی: {sheet.sheetLabel}</div>
                  <div>ابعاد اسمی: {toPersianDigits(sheet.sheetWidth)} × {toPersianDigits(sheet.sheetHeight)} mm</div>
                  <div>واحد اندازه‌گیری: میلی‌متر (mm)</div>
                </div>
              </div>

              {/* Blueprint drawing */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ position: 'relative', width: '680px', height: '740px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', borderRadius: '12px', padding: '15px' }}>
                  {renderInteractiveSvg(sheet, `pdf-${sIdx}`)}
                </div>
              </div>

              {/* PDF Footer stats */}
              <div style={{ marginTop: '20px', borderTop: '3px solid #0ea5e9', paddingTop: '15px', flexShrink: 0, fontFamily: 'Vazirmatn, sans-serif' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ border: '1.5px solid #0369a1', padding: '8px', textAlign: 'center', borderRadius: '8px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', color: '#0369a1' }}>متراژ مفید شیشه</span>
                    <span style={{ fontSize: '13px', fontWeight: '900' }}>{toPersianDigits((sheet.usedArea / 1000000).toFixed(2))} m²</span>
                  </div>
                  <div style={{ border: '1.5px solid #0369a1', padding: '8px', textAlign: 'center', borderRadius: '8px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', color: '#0369a1' }}>پرت جام (Waste)</span>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#ef4444' }}>{toPersianDigits(sheet.wastePercent)}%</span>
                  </div>
                  <div style={{ border: '1.5px solid #0369a1', padding: '8px', textAlign: 'center', borderRadius: '8px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'block', color: '#0369a1' }}>ابعاد جام مورد استفاده</span>
                    <span style={{ fontSize: '11px', fontWeight: '900' }}>{toPersianDigits(sheet.sheetWidth)}×{toPersianDigits(sheet.sheetHeight)}</span>
                  </div>
                </div>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'center' }}>
                  طرح چیدمان فوق براساس الگوریتم گیوتینی پیشرفته (NexWin Precision Engine) محاسه‌گر بهینه‌ترین حالت می‌باشد.
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-sky-900 to-cyan-950 text-white px-6 pt-12 pb-8 shadow-2xl rounded-b-[2rem]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-3 bg-white/10 hover:bg-white/15 rounded-2xl active:scale-90 transition-transform flex items-center gap-2 border border-white/5"
            title="بازگشت به پیشخوان"
          >
            <Home size={22} className="text-cyan-400" />
            <span className="text-xs font-black hidden sm:inline">پیشخوان اصلی</span>
          </button>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 border border-cyan-500/10">
              <Layout size={11} /> دوجداره و تک‌جداره | Glass Optimizer
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">سیستم بهینه‌سازی و برش جام شیشه</h1>
            <p className="text-[10px] text-slate-300">محاسبه الگوریتم چیدمان گوشه‌چین ۲بعدی با پشتیبانی از تنوع جام‌ها همزمان</p>
          </div>
          <div className="w-10 sm:block hidden"></div>
        </div>
      </div>

      {/* CONTENT SYSTEM */}
      <div className="p-6 space-y-6 max-w-5xl mx-auto -mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* PROJECT TARGET SELECT */}
          <GlassCard className="lg:col-span-2 border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
                <Package size={20} />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm">انتخاب پروژه و بازیابی شیشه‌ها</h2>
                <p className="text-[9px] text-slate-400">قطعات به صورت خودکار از شیشه‌بندی یونیت‌ها بازخوانی میشوند</p>
              </div>
            </div>

            <SelectField
              label="پروژه مرجع"
              value={selectedProjectId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const id = e.target.value;
                setSelectedProjectId(id);
                handleProjectSelect(id);
                setShowSummary(false);
              }}
              options={[
                { label: 'یک پروژه را انتخاب کنید...', value: '' },
                ...projects.map(p => ({ label: `${p.customerName}`, value: p.id }))
              ]}
            />

            {glassList.length > 0 && (
              <div className="mt-4 p-4.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="text-slate-700">تعداد شیشه‌های استخراج شده:</span>
                <span className="px-3.5 py-1.5 bg-cyan-50 border border-cyan-100 text-cyan-800 rounded-lg font-black text-sm">
                  {toPersianDigits(glassList.reduce((acc, g) => acc + g.quantity, 0))} قطعه شیشه
                </span>
              </div>
            )}
          </GlassCard>

          {/* DYNAMIC SHET SIZE CONFIG - USER INPUT TO DEFINE AND SELECT SIMULTANEOUSLY */}
          <GlassCard className="border-slate-200 bg-white/80 backdrop-blur shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Maximize2 size={19} />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-800 text-sm">مدیریت و تنوع جام‌ها</h2>
                <p className="text-[9px] text-slate-400">تعریف و فعال‌سازی هم‌زمان چند جام</p>
              </div>
            </div>

            {/* Quick manual inputs */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <span className="text-[10px] font-black text-slate-500 block">افزودن سریع ابعاد</span>
              <div className="grid grid-cols-2 gap-2">
                <InputField
                  label="عرض جام (mm)"
                  type="number"
                  value={newWidth}
                  onChange={(e) => setNewWidth(Math.max(100, Number(toEnglishDigits(e.target.value))))}
                />
                <InputField
                  label="طول جام (mm)"
                  type="number"
                  value={newHeight}
                  onChange={(e) => setNewHeight(Math.max(100, Number(toEnglishDigits(e.target.value))))}
                />
              </div>
              <InputField
                label="عنوان اختصاصی جام"
                type="text"
                placeholder="مثال: جام متوسط باقیمانده کارگاه"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddSheetSize}
                className="w-full mt-1.5 py-2 px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[10px] font-black transition-colors flex items-center justify-center gap-1 shadow-sm"
              >
                <Plus size={12} /> اضافه کردن به لیست جام‌ها
              </button>
            </div>

            {/* List with toggles */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 block pb-1 border-b border-slate-100">جام‌های در دسترس محاسبات:</span>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {sheetSizes.map((size) => (
                  <div
                    key={size.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      size.isActive
                        ? 'bg-cyan-50/75 border-cyan-200 text-cyan-950 font-extrabold'
                        : 'bg-white border-slate-100 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={size.isActive}
                        onChange={() => handleToggleSheetSize(size.id)}
                        className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs">{size.label}</span>
                        <span className="text-[9px] text-slate-400 font-bold">
                          {toPersianDigits(size.width)} × {toPersianDigits(size.height)} mm
                        </span>
                      </div>
                    </div>
                    {sheetSizes.length > 1 && (
                      <button
                        onClick={() => handleDeleteSheetSize(size.id)}
                        className="p-1 hover:bg-rose-50 text-slate-350 hover:text-rose-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Minor spacing parameters */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <InputField
                label="کف برش الماسه (mm)"
                type="number"
                value={glassKerf}
                onChange={(e) => setGlassKerf(Math.max(0, Number(toEnglishDigits(e.target.value))))}
              />
              <InputField
                label="حاشیه الماسه (mm)"
                type="number"
                value={glassMargin}
                onChange={(e) => setGlassMargin(Math.max(0, Number(toEnglishDigits(e.target.value))))}
              />
            </div>

            {/* Dynamic Font controls and customized options */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <span className="text-[10px] font-black text-slate-500 block">تنظیمات نوشته روی قطعات شیشه</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 block mb-1">اندازه قلم: {toPersianDigits(fontScale.toFixed(1))}x</label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.6"
                    step="0.1"
                    value={fontScale}
                    onChange={(e) => setFontScale(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 block mb-1">انتخاب فونت</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-[9px] font-black p-1 text-slate-700 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Vazirmatn">Vazirmatn</option>
                    <option value="Inter">Inter (مدرن)</option>
                    <option value="Arial">Arial (سیستم)</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Courier New">monospace</option>
                  </select>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* COMPUTE BUTTON */}
        <PrimaryButton
          fullWidth
          loading={isCalculating}
          disabled={!selectedProjectId}
          onClick={handleCalculate}
          icon={RefreshCw}
          className="h-16 rounded-2xl shadow-xl bg-gradient-to-r from-sky-800 to-indigo-950 border border-sky-600 text-xs md:text-sm font-black active:scale-[0.99] transition-transform"
        >
          شروع چیدمان و بهینه‌سازی گیوتینی شیشه
        </PrimaryButton>

        {/* RESULTS SYSTEM */}
        {optimizedSheets.length > 0 && (
          <div className="space-y-8 animate-fadeIn mt-6">

            {/* High level stats panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-sky-950 p-4 rounded-2xl text-white flex flex-col justify-between shadow-md">
                <span className="text-[10px] font-bold text-sky-400 block mb-2 font-black">جام مورد استفاده</span>
                <div className="text-2xl font-black tracking-tight">{toPersianDigits(totalSheetsUsed)} <span className="text-xs text-sky-400 font-normal">عدد جام</span></div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-slate-800 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 block mb-2 font-black">شیشه مفید مصرفی</span>
                <div className="text-2xl font-black tracking-tight">{toPersianDigits(totalGlassArea.toFixed(2))} <span className="text-xs text-slate-400 font-normal">مترمربع</span></div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-slate-700 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 block mb-2 font-black">کل درصد پرت (کل جام‌ها)</span>
                <div className="text-2xl font-black text-rose-600 font-black">{toPersianDigits((100 - avgEfficiency).toFixed(1))}%</div>
              </div>
              <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-100 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-black text-cyan-700 block mb-2 font-black">بازدهی مفید میانگین</span>
                <div className="flex items-center gap-1 justify-between">
                  <span className="text-2.5xl font-black text-cyan-950">{toPersianDigits(avgEfficiency.toFixed(1))}%</span>
                  <Percent size={20} className="text-cyan-600" />
                </div>
              </div>
            </div>

            {/* Visual Glass sheets list */}
            <div className="space-y-8">
              {optimizedSheets.map((sheet, sIdx) => {
                const sheetAreaM2 = (sheet.sheetWidth * sheet.sheetHeight) / 1000000;
                const usedAreaM2 = sheet.usedArea / 1000000;

                return (
                  <div key={sheet.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3.5 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></span>
                        <h3 className="font-extrabold text-slate-900 text-sm">نقشه برش جام شماره {toPersianDigits(sheet.id)}</h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600">
                        <span>نوع جام انتخاب شده: <span className="text-indigo-600 font-black">{sheet.sheetLabel}</span></span>
                        <span>ابعاد: <span className="text-slate-800 font-black">{toPersianDigits(sheet.sheetWidth)}×{toPersianDigits(sheet.sheetHeight)} mm</span></span>
                        <span>راندمان: <span className="text-emerald-600 font-black">{toPersianDigits(100 - sheet.wastePercent)}%</span></span>
                        <span>قطعات: <span className="text-cyan-800 font-black">{toPersianDigits(sheet.pieces.length)} عدد</span></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* SVG Canvas */}
                      <div className="lg:col-span-2 flex items-center justify-center p-3 bg-[#f8fafc] rounded-2xl border border-slate-150">
                        <div className="w-full max-w-xl aspect-[321/225] bg-white border border-slate-200 rounded-xl relative overflow-hidden shadow-inner p-1">
                          {renderInteractiveSvg(sheet, `sheet-${sIdx}`)}
                        </div>
                      </div>

                      {/* Pieces catalog */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col justify-between">
                        <div className="space-y-3">
                          <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">نقشه برشی قطعات</span>
                          <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar pr-1">
                            {sheet.pieces.map((p, pIdx) => (
                              <div key={pIdx} className="p-2.5 bg-white rounded-xl border border-slate-200/60 flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400">قطعه {toPersianDigits(pIdx + 1)} (یونیت {toPersianDigits(p.unitId)})</span>
                                  <span className="text-xs font-black text-slate-800">{toPersianDigits(p.w)} × {toPersianDigits(p.h)} mm</span>
                                </div>
                                <span className="px-2 py-0.5 bg-sky-50 text-sky-700 text-[8px] font-black rounded-lg border border-sky-100">
                                  {getSimplifiedLabel(p.label)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-200 flex flex-col gap-1 text-[10px] font-bold text-slate-500">
                          <span>کل مساحت این جام: {toPersianDigits(sheetAreaM2.toFixed(3))} مترمربع</span>
                          <span>شیشه مفید چیده شده: {toPersianDigits(usedAreaM2.toFixed(3))} مترمربع</span>
                          <span className="text-rose-600 font-extrabold">مساحت کل پرت: {toPersianDigits(sheet.wastePercent)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SUMMARY MODAL */}
      <AnimatePresence>
        {showSummary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <button onClick={() => setShowSummary(false)} className="absolute top-6 left-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shadow-inner">
                  <Layout size={28} />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">گزارش بهینه‌سازی جام شیشه</h2>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">2D Guillotine Matrix Report</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>جام‌های مصرف شده در برنامه:</span>
                    <span className="font-extrabold text-slate-800">{toPersianDigits(totalSheetsUsed)} ورق جام</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>مجموع خالص مساحت مفید:</span>
                    <span className="font-extrabold text-slate-800">{toPersianDigits(totalGlassArea.toFixed(2))} m²</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-600">میزان پرت کل شیت‌ها:</span>
                    <span className="font-extrabold text-rose-600 text-sm">{toPersianDigits((100 - avgEfficiency).toFixed(1))}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-slate-800">بازدهی نهایی چیدمان گیوتینی:</span>
                    <span className="font-black text-emerald-600 text-lg">{toPersianDigits(avgEfficiency.toFixed(1))}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <PrimaryButton
                  fullWidth
                  loading={isGeneratingPDF}
                  onClick={downloadPDF}
                  icon={Download}
                  className="h-14 rounded-xl bg-cyan-600 hover:bg-cyan-700 font-extrabold text-xs"
                >
                  دریافت نقشه برش کارگاهی (PDF)
                </PrimaryButton>

                <button
                  type="button"
                  onClick={() => setShowSummary(false)}
                  className="w-full text-center py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  بستن و مرور نقشه‌ها روی صفحه
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
};
