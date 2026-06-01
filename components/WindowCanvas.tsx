
import React from 'react';
import { WindowNode } from '../types';
import { toPersianDigits } from '../utils/formatting';

// --- INDUSTRIAL CAD STANDARDS ---
const CAD = {
  stroke: {
    outer: 2.0,       
    inner: 1.0,      
    bead: 0.8,       
    miter: 0.5,       
    dimension: 1.0,   
    tick: 2.0,        
  },
  colors: {
    profileFill: '#ffffff', 
    line: '#1e293b',        
    beadLine: '#475569',    
    glass: '#e2f1ff', 
    panel: '#f8fafc',       
    dim: '#0f172a',         
    grid: '#f8fafc',
    activeFrame: '#2563eb',
    openingLine: '#2563eb',
    miter: '#94a3b8'
  },
  geom: {
    frameT: 50,           
    sashT: 55,            
    mullionT: 50,         
  },
  font: {
    dimSize: 52,          
  }
};

const CadGrid = () => (
  <pattern id="industrial-grid" width="20" height="20" patternUnits="userSpaceOnUse">
    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
  </pattern>
);

const RenderFrame = ({ x, y, w, h, thickness }: { x: number, y: number, w: number, h: number, thickness: number }) => {
  const innerX = x + thickness;
  const innerY = y + thickness;
  const MathMax = Math.max;
  const innerW = MathMax(0, w - 2 * thickness);
  const innerH = MathMax(0, h - 2 * thickness);
  
  if (w <= 0 || h <= 0) return null;

  return (
    <g className="render-frame" filter="url(#shadow-soft)">
      {/* Realistic Bevel using trapezoids */}
      <polygon points={`${x},${y} ${x+w},${y} ${innerX+innerW},${innerY} ${innerX},${innerY}`} fill="url(#frame-grad-h)" stroke={CAD.colors.miter} strokeWidth="0.5" />
      <polygon points={`${x+w},${y} ${x+w},${y+h} ${innerX+innerW},${innerY+innerH} ${innerX+innerW},${innerY}`} fill="url(#frame-grad-v)" stroke={CAD.colors.miter} strokeWidth="0.5" />
      <polygon points={`${innerX},${innerY+innerH} ${innerX+innerW},${innerY+innerH} ${x+w},${y+h} ${x},${y+h}`} fill="url(#frame-grad-h)" stroke={CAD.colors.miter} strokeWidth="0.5" />
      <polygon points={`${x},${y} ${innerX},${innerY} ${innerX},${innerY+innerH} ${x},${y+h}`} fill="url(#frame-grad-v)" stroke={CAD.colors.miter} strokeWidth="0.5" />

      {/* Frame Outer and Inner borders */}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={CAD.colors.line} strokeWidth={CAD.stroke.outer} />
      {/* Black Rubber Gasket Seal on the inside! */}
      <rect x={innerX} y={innerY} width={innerW} height={innerH} fill="none" stroke="#1f2937" strokeWidth="4" />
      {/* Sharp inner line */}
      <rect x={innerX} y={innerY} width={innerW} height={innerH} fill="none" stroke={CAD.colors.line} strokeWidth={CAD.stroke.inner} />
    </g>
  );
};

const RenderMullion = ({ x, y, w, h }: { x: number, y: number, w: number, h: number }) => {
  if (w <= 0 || h <= 0) return null;
  const isVertical = w < h;
  const fill = isVertical ? "url(#frame-grad-v)" : "url(#frame-grad-h)";
  
  return (
    <g filter="url(#shadow-soft)">
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={CAD.colors.line} strokeWidth={CAD.stroke.outer} />
      {/* Rubber gasket on both sides of the mullion */}
      {isVertical ? (
        <>
          <line x1={x} y1={y} x2={x} y2={y+h} stroke="#1f2937" strokeWidth="4" />
          <line x1={x+w} y1={y} x2={x+w} y2={y+h} stroke="#1f2937" strokeWidth="4" />
          <line x1={x} y1={y} x2={x} y2={y+h} stroke={CAD.colors.line} strokeWidth="1" />
          <line x1={x+w} y1={y} x2={x+w} y2={y+h} stroke={CAD.colors.line} strokeWidth="1" />
        </>
      ) : (
        <>
          <line x1={x} y1={y} x2={x+w} y2={y} stroke="#1f2937" strokeWidth="4" />
          <line x1={x} y1={y+h} x2={x+w} y2={y+h} stroke="#1f2937" strokeWidth="4" />
          <line x1={x} y1={y} x2={x+w} y2={y} stroke={CAD.colors.line} strokeWidth="1" />
          <line x1={x} y1={y+h} x2={x+w} y2={y+h} stroke={CAD.colors.line} strokeWidth="1" />
        </>
      )}
    </g>
  );
};

const RenderGlass = ({ x, y, w, h }: { x: number, y: number, w: number, h: number }) => {
  if (w <= 0 || h <= 0) return null;
  return (
    <g className="render-glass">
      {/* Solid sky-blue base layer to completely block grid pattern behind */}
      <rect x={x} y={y} width={w} height={h} fill="#e0f2fe" fillOpacity="1" />
      {/* Overlay gradient for spectacular high-end glass look */}
      <rect x={x} y={y} width={w} height={h} fill="url(#glass-grad)" stroke="none" fillOpacity="1" />
      {/* Glazing spacer profile simulation */}
      <rect x={x+6} y={y+6} width={Math.max(0, w-12)} height={Math.max(0, h-12)} fill="none" stroke="#025a90" strokeWidth="1" strokeOpacity="0.25" />
      {/* Realistic lighting/reflection bevels */}
      <path d={`M${x},${y+h} L${x},${y} L${x+w},${y}`} fill="none" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.65" />
      <path d={`M${x},${y+h} L${x+w},${y+h} L${x+w},${y}`} fill="none" stroke="#000000" strokeWidth="2" strokeOpacity="0.15" />
      {/* Double glass glossy diagonal light reflection strokes */}
      <path d={`M${x + w*0.15},${y} L${x},${y + h*0.15}`} stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.35" />
      <path d={`M${x + w*0.18},${y} L${x},${y + h*0.18}`} stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />
      <path d={`M${x + w*0.4},${y} L${x},${y + h*0.4}`} stroke="#ffffff" strokeWidth="5.5" strokeOpacity="0.25" />
      <path d={`M${x + w*0.44},${y} L${x},${y + h*0.44}`} stroke="#ffffff" strokeWidth="2" strokeOpacity="0.2" />
    </g>
  );
};

const RenderPanel = ({ x, y, w, h, op }: { x: number, y: number, w: number, h: number, op: string }) => {
  if (w <= 0 || h <= 0) return null;
  const els = [
    <rect key="panel-bg" x={x} y={y} width={w} height={h} fill="url(#panel-grad)" stroke="none" />
  ];
  
  if (op === 'PanelV') {
    const lineCount = 3;
    const spacing = w / (lineCount + 1);
    for (let i = 1; i <= lineCount; i++) {
        els.push(
          <g key={`pv-${i}`}>
            <line x1={x + spacing * i} y1={y} x2={x + spacing * i} y2={y + h} stroke="#ffffff" strokeWidth={3} opacity={0.7} />
            <line x1={x + spacing * i + 1} y1={y} x2={x + spacing * i + 1} y2={y + h} stroke={CAD.colors.beadLine} strokeWidth={1} opacity={0.6} />
          </g>
        );
    }
  } else if (op === 'PanelH') {
    const lineCount = 3;
    const spacing = h / (lineCount + 1);
    for (let i = 1; i <= lineCount; i++) {
        els.push(
          <g key={`ph-${i}`}>
            <line x1={x} y1={y + spacing * i} x2={x + w} y2={y + spacing * i} stroke="#ffffff" strokeWidth={3} opacity={0.7} />
            <line x1={x} y1={y + spacing * i + 1} x2={x + w} y2={y + spacing * i + 1} stroke={CAD.colors.beadLine} strokeWidth={1} opacity={0.6} />
          </g>
        );
    }
  }
  
  // Inner shadow for bevel effect on the panel edges
  els.push(
    <rect key="inner-shadow-path" x={x} y={y} width={w} height={h} fill="none" stroke="#cbd5e1" strokeWidth="4" opacity="0.6" />
  );

  return <g>{els}</g>;
};

const TechnicalHardware = ({ sx: sxInput, sy: syInput, sw: swInput, sh: shInput, type }: { sx: number, sy: number, sw: number, sh: number, type: string }) => {
  const sx = Number(sxInput);
  const sy = Number(syInput);
  const sw = Number(swInput);
  const sh = Number(shInput);
  const isHandleRight = !type.includes('Right'); // Reversed logic per request
  const isDoor = type.includes('Door');
  const isAwning = type === 'Awning';
  const isHopper = type === 'Hopper';
  const isSliding = type.includes('Sliding');
  const isTiltTurn = type.includes('TiltTurn');
  
  const handlePadding = 30; 
  let handleX = 0;
  let handleY = 0;

  if (isAwning) {
      handleX = sx + sw / 2;
      handleY = sy + sh - handlePadding - 5;
  } else if (isHopper) {
      handleX = sx + sw / 2;
      handleY = sy + handlePadding + 5;
  } else {
      handleX = isHandleRight ? sx + sw - handlePadding - 5 : sx + handlePadding + 5;
      handleY = isDoor && sh > 1200 ? sy + sh - 1050 : sy + sh / 2;
  }
  
  const flipHandle = isHandleRight && !isAwning && !isHopper;

  // Center glass-morphic motion badges calculation
  const cx = sx + sw / 2;
  const cy = sy + sh / 2;

  return (
    <g className="hardware-layer">
      {/* Traditional/Standard Turn Swing Opening line with Chevron arrowheads */}
      {!isAwning && !isHopper && !isSliding && (
        <>
          <path 
            d={isHandleRight 
              ? `M ${sx},${sy} L ${sx+sw},${sy+sh/2} L ${sx},${sy+sh}`
              : `M ${sx+sw},${sy} L ${sx},${sy+sh/2} L ${sx+sw},${sy+sh}`} 
            fill="none" 
            stroke={CAD.colors.openingLine} 
            strokeWidth="2.5" 
            strokeDasharray="10,6" 
            opacity="1" 
          />
          {/* Beautiful converging feedback polygon arrow at focal handle tip */}
          <polygon
            points={isHandleRight 
              ? `${sx+sw},${sy+sh/2} ${sx+sw-16},${sy+sh/2-10} ${sx+sw-16},${sy+sh/2+10}` 
              : `${sx},${sy+sh/2} ${sx+16},${sy+sh/2-10} ${sx+16},${sy+sh/2+10}`}
            fill={CAD.colors.openingLine}
            opacity="1"
          />
        </>
      )}

      {/* ADDITIONAL TILT indicators for Tilt & Turn: Converges to top center */}
      {isTiltTurn && (
        <>
          <path 
            d={`M ${sx},${sy+sh} L ${sx+sw/2},${sy} L ${sx+sw},${sy+sh}`} 
            fill="none" 
            stroke={CAD.colors.openingLine} 
            strokeWidth="2.2" 
            strokeDasharray="7,5" 
            opacity="1" 
          />
          {/* Upper converging polygon arrow for secure Tilt action */}
          <polygon
            points={`${sx+sw/2},${sy} ${sx+sw/2-14},${sy+18} ${sx+sw/2+14},${sy+18}`}
            fill={CAD.colors.openingLine}
            opacity="1"
          />
        </>
      )}

      {isAwning && (
         <path 
           d={`M ${sx},${sy} L ${sx+sw/2},${sy+sh} L ${sx+sw},${sy}`}
           fill="none" 
           stroke={CAD.colors.openingLine} 
           strokeWidth="2.5" 
           strokeDasharray="10,6" 
           opacity="1" 
         />
      )}

      {isHopper && (
         <path 
           d={`M ${sx},${sy+sh} L ${sx+sw/2},${sy} L ${sx+sw},${sy+sh}`}
           fill="none" 
           stroke={CAD.colors.openingLine} 
           strokeWidth="2.5" 
           strokeDasharray="10,6" 
           opacity="1" 
         />
      )}

      {/* Advanced Sliding track line & indicator arrows */}
      {isSliding && (
         <g opacity="0.95">
             {/* Slider track linear accent line on glass */}
             <line x1={sx + 15} y1={sy + sh/2} x2={sx + sw - 15} y2={sy + sh/2} stroke={CAD.colors.openingLine} strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
             {/* Big premium slide guide graphic */}
             <g stroke={CAD.colors.openingLine} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
                 <line x1={sx + sw/2 - 35} y1={sy + sh/2} x2={sx + sw/2 + 35} y2={sy + sh/2} />
                 {isHandleRight ? (
                     <path d={`M ${sx + sw/2 + 20},${sy + sh/2 - 10} L ${sx + sw/2 + 35},${sy + sh/2} L ${sx + sw/2 + 20},${sy + sh/2 + 10}`} />
                 ) : (
                     <path d={`M ${sx + sw/2 - 20},${sy + sh/2 - 10} L ${sx + sw/2 - 35},${sy + sh/2} L ${sx + sw/2 - 20},${sy + sh/2 + 10}`} />
                 )}
             </g>
         </g>
      )}

{/* Handle Base with realistic styling */}
      <g transform={`translate(${handleX}, ${handleY}) ${isAwning || isHopper ? 'rotate(90)' : ''} scale(${flipHandle ? -1 : 1}, 1)`}>
        {isDoor ? (
           <g>
             {/* Door handle base: larger, rectangular with keyhole */}
             <rect x="-12" y="-55" width="24" height="150" rx="4" fill="#000000" opacity="0.2" />
             <rect x="-12" y="-57" width="22" height="148" rx="3" fill="url(#metal-grad)" stroke="#334155" strokeWidth="1.5" />
             <rect x="-10" y="-55" width="18" height="144" rx="2" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
             
             {/* Keyhole */}
             <circle cx="-1" cy="45" r="4" fill="#1e293b" />
             <path d="M -4 45 L -5 57 L 3 57 L 2 45 Z" fill="#1e293b" />
             
             {/* Door Handle Lever */}
             <path d="M -6 4 L 55 4 C 65 4, 65 14, 55 14 L -6 14 Z" fill="#000000" opacity="0.2" />
             <path d="M -6 -1 L 52 -1 C 60 -1, 60 9, 52 9 L -6 9 Z" fill="url(#metal-grad)" stroke="#334155" strokeWidth="1.5" />
             <path d="M -3 1 L 44 1 C 49 1, 49 3, 44 3 L -3 3 Z" fill="#ffffff" opacity="0.6" />
           </g>
        ) : isSliding ? (
           <g>
             {/* Beautiful recessed slide vertical handle (specifically designed for sliding sashes!) */}
             <rect x="-10" y="-45" width="20" height="90" rx="8" fill="#000000" opacity="0.3" />
             <rect x="-10" y="-47" width="18" height="88" rx="7" fill="url(#metal-grad)" stroke="#1e293b" strokeWidth="1.5" />
             <rect x="-8" y="-45" width="14" height="84" rx="5" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
             {/* Deep grip slot */}
             <rect x="-5" y="-35" width="10" height="70" rx="4" fill="#090d16" stroke="#475569" strokeWidth="1" />
             {/* Sliding center lock slider */}
             <rect x="-3" y="-10" width="6" height="20" rx="1.5" fill="url(#metal-grad)" stroke="#334155" strokeWidth="0.8" />
             {/* Elegant status lock pins */}
             <circle cx="0" cy="-22" r="2.5" fill="#ef4444" />
             <circle cx="0" cy="22" r="2.5" fill="#22c55e" />
           </g>
        ) : (
           <g>
             {/* Window handle base: oval, slightly larger */}
             <rect x="-9" y="-35" width="18" height="74" rx="9" fill="#000000" opacity="0.2" />
             <rect x="-9" y="-37" width="16" height="72" rx="8" fill="url(#metal-grad)" stroke="#334155" strokeWidth="1.5" />
             <rect x="-6" y="-34" width="10" height="66" rx="5" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
             
             {/* Window Handle Lever */}
             <path d="M -4 2 L 45 2 C 52 2, 52 12, 45 12 L -4 12 Z" fill="#000000" opacity="0.2" />
             <path d="M -4 -2 L 42 -2 C 48 -2, 48 8, 42 8 L -4 8 Z" fill="url(#metal-grad)" stroke="#334155" strokeWidth="1.5" />
             <path d="M -2 0 L 36 0 C 40 0, 40 2, 36 2 L -2 2 Z" fill="#ffffff" opacity="0.6" />
           </g>
        )}
      </g>

      {/* Hinges */}
      {!isAwning && !isHopper && !isSliding && (
        <g fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" filter="url(#shadow-soft)">
           {(() => {
               const hW = 12;
               const hH = 64;
               const hX = isHandleRight ? sx + 3 : sx + sw - hW - 3; 
               return (
                   <>
                      <rect x={hX} y={sy + 40} width={hW} height={hH} rx={4} />
                      <line x1={hX} y1={sy + 40 + hH/2} x2={hX + hW} y2={sy + 40 + hH/2} stroke="#94a3b8" strokeWidth="1.5" />
                      
                      {isDoor && (
                        <>
                          <rect x={hX} y={sy + sh/2 - hH/2} width={hW} height={hH} rx={4} />
                          <line x1={hX} y1={sy + sh/2} x2={hX + hW} y2={sy + sh/2} stroke="#94a3b8" strokeWidth="1.5" />
                        </>
                      )}
                      
                      <rect x={hX} y={sy + sh - 40 - hH} width={hW} height={hH} rx={4} />
                      <line x1={hX} y1={sy + sh - 40 - hH/2} x2={hX + hW} y2={sy + sh - 40 - hH/2} stroke="#94a3b8" strokeWidth="1.5" />
                   </>
               )
           })()}
        </g>
      )}
      {isAwning && (
          <g fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" filter="url(#shadow-soft)">
              <rect x={sx + sw * 0.2} y={sy + 2} width={64} height={12} rx={4} />
              <line x1={sx + sw * 0.2 + 32} y1={sy + 2} x2={sx + sw * 0.2 + 32} y2={sy + 14} stroke="#94a3b8" strokeWidth="1.5" />
              
              <rect x={sx + sw * 0.8 - 64} y={sy + 2} width={64} height={12} rx={4} />
              <line x1={sx + sw * 0.8 - 32} y1={sy + 2} x2={sx + sw * 0.8 - 32} y2={sy + 14} stroke="#94a3b8" strokeWidth="1.5" />
          </g>
      )}
      {isHopper && (
          <g fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" filter="url(#shadow-soft)">
              <rect x={sx + sw * 0.2} y={sy + sh - 14} width={64} height={12} rx={4} />
              <line x1={sx + sw * 0.2 + 32} y1={sy + sh - 14} x2={sx + sw * 0.2 + 32} y2={sy + sh - 2} stroke="#94a3b8" strokeWidth="1.5" />
              
              <rect x={sx + sw * 0.8 - 64} y={sy + sh - 14} width={64} height={12} rx={4} />
              <line x1={sx + sw * 0.8 - 32} y1={sy + sh - 14} x2={sx + sw * 0.8 - 32} y2={sy + sh - 2} stroke="#94a3b8" strokeWidth="1.5" />
          </g>
      )}
    </g>
  );
};

interface ArchDimensionProps {
  start: number; end: number; orientation: 'h' | 'v'; linePos: number; leaderStart: number; onClick?: () => void;
}

const ArchDimension = ({ start, end, orientation, linePos, leaderStart, onClick }: ArchDimensionProps) => {
  const isH = orientation === 'h';
  const mid = start + (end - start) / 2;
  const color = CAD.colors.dim;
  const tickSize = 8; 
  const isNegative = linePos < leaderStart;
  const leaderEnd = isNegative ? linePos + 3 : linePos - 3;
  const leaderBase = isNegative ? leaderStart - 5 : leaderStart + 5;

  return (
    <g 
      className="arch-dim" 
      onClick={(e) => { 
        if (onClick) {
          e.stopPropagation(); 
          onClick(); 
        }
      }} 
      style={{ cursor: onClick ? 'pointer' : 'default', pointerEvents: 'all' }}
    >
      {isH ? (
         <rect x={start} y={linePos - 20} width={end - start} height={40} fill="transparent" />
      ) : (
         <rect x={linePos - 20} y={start} width={40} height={end - start} fill="transparent" />
      )}

      {isH ? (
        <>
          <line x1={start} y1={leaderBase} x2={start} y2={leaderEnd} stroke={color} strokeWidth="0.8" opacity="0.4"/>
          <line x1={end} y1={leaderBase} x2={end} y2={leaderEnd} stroke={color} strokeWidth="0.8" opacity="0.4"/>
          <line x1={start} y1={linePos} x2={end} y2={linePos} stroke={color} strokeWidth={CAD.stroke.dimension} />
          <line x1={start - tickSize} y1={linePos + tickSize} x2={start + tickSize} y2={linePos - tickSize} stroke={color} strokeWidth={CAD.stroke.tick} />
          <line x1={end - tickSize} y1={linePos + tickSize} x2={end + tickSize} y2={linePos - tickSize} stroke={color} strokeWidth={CAD.stroke.tick} />
        </>
      ) : (
        <>
          <line x1={leaderBase} y1={start} x2={leaderEnd} y2={start} stroke={color} strokeWidth="0.8" opacity="0.4"/>
          <line x1={leaderBase} y1={end} x2={leaderEnd} y2={end} stroke={color} strokeWidth="0.8" opacity="0.4"/>
          <line x1={linePos} y1={start} x2={linePos} y2={end} stroke={color} strokeWidth={CAD.stroke.dimension} />
          <line x1={linePos + tickSize} y1={start + tickSize} x2={linePos - tickSize} y2={start - tickSize} stroke={color} strokeWidth={CAD.stroke.tick} />
          <line x1={linePos + tickSize} y1={end + tickSize} x2={linePos - tickSize} y2={end - tickSize} stroke={color} strokeWidth={CAD.stroke.tick} />
        </>
      )}
      <rect x={isH ? mid - 30 : linePos - 15} y={isH ? linePos - 15 : mid - 30} width={isH ? 60 : 30} height={isH ? 30 : 60} fill="white" />
      <text 
        x={isH ? mid : linePos} y={isH ? linePos : mid} 
        textAnchor="middle" dominantBaseline="middle" fontSize={CAD.font.dimSize} fontWeight="bold" 
        transform={isH ? '' : `rotate(-90, ${linePos}, ${mid})`}
        fill={color}
        style={{ fontFamily: 'Vazirmatn, sans-serif' }}
      >
        {toPersianDigits(Math.round(end - start))}
      </text>
    </g>
  );
};

// --- CORE RENDER ENGINE ---

interface RenderNodeProps {
  node: WindowNode;
  x: number;
  y: number;
  w: number;
  h: number;
  isRoot?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  readOnly: boolean;
  hardwareList?: React.ReactNode[];
}

const RenderBlueprintNode = ({ node, x, y, w, h, isRoot, selectedId, onSelect, readOnly, hardwareList }: RenderNodeProps) => {
  let innerX = x;
  let innerY = y;
  let innerW = w;
  let innerH = h;
  const els: React.ReactNode[] = [];
  
  // 1. Draw Outer Frame if Root
  if (isRoot) {
    els.push(<RenderFrame key={`root-frame-${node.id}`} x={x} y={y} w={w} h={h} thickness={CAD.geom.frameT} />);
    innerX += CAD.geom.frameT;
    innerY += CAD.geom.frameT;
    innerW -= 2 * CAD.geom.frameT;
    innerH -= 2 * CAD.geom.frameT;
  }
  
  // 2. Check for Sash/Opening
  const op = node.openingType || 'Fixed';
  const isSash = op !== 'Fixed' && !op.includes('Panel');
  
  let hwEl: React.ReactNode = null;
  if (isSash) {
    els.push(<RenderFrame key={`sash-${node.id}`} x={innerX} y={innerY} w={innerW} h={innerH} thickness={CAD.geom.sashT} />);
    const actualHwEl = <TechnicalHardware key={`hw-${node.id}`} sx={innerX} sy={innerY} sw={innerW} sh={innerH} type={op} />;
    if (hardwareList) {
      hardwareList.push(actualHwEl);
    } else {
      hwEl = actualHwEl;
    }
    innerX += CAD.geom.sashT;
    innerY += CAD.geom.sashT;
    innerW -= 2 * CAD.geom.sashT;
    innerH -= 2 * CAD.geom.sashT;
  }
  
  // 3. Clip Path for internals ensures no overflow
  const MathMax = Math.max;
  const clipId = `clip-${node.id}`;
  els.push(
    <clipPath key={`clip-def-${node.id}`} id={clipId}>
      <rect x={innerX} y={innerY} width={MathMax(0, innerW)} height={MathMax(0, innerH)} />
    </clipPath>
  );
  
  const contentEls: React.ReactNode[] = [];

  if (node.type === 'leaf' || !node.children || node.children.length === 0) {
    // Fill specific properties
    if (op.includes('Panel')) {
      contentEls.push(<RenderPanel key={`panel-${node.id}`} x={innerX} y={innerY} w={innerW} h={innerH} op={op} />);
    } else {
      contentEls.push(<RenderGlass key={`glass-${node.id}`} x={innerX} y={innerY} w={innerW} h={innerH} />);
    }
  } else {
    // Container mullion distribution
    const children = node.children;
    const dir = node.dir;
    const totalFlex = children.reduce((sum, c) => sum + (c.flex || 1), 0) || 1;
    
    const childrenSpace = dir === 'row' 
      ? innerW - (children.length - 1) * CAD.geom.mullionT
      : innerH - (children.length - 1) * CAD.geom.mullionT;

    let currentPos = 0;

    children.forEach((child, idx) => {
      const flexSize = MathMax(0, (childrenSpace * (child.flex || 1)) / totalFlex);
      
      const cx = dir === 'row' ? innerX + currentPos : innerX;
      const cy = dir === 'col' ? innerY + currentPos : innerY;
      const cw = dir === 'row' ? flexSize : innerW;
      const ch = dir === 'col' ? flexSize : innerH;
      
      contentEls.push(
        <RenderBlueprintNode 
          key={child.id} 
          node={child} 
          x={cx} y={cy} w={cw} h={ch} 
          isRoot={false} 
          selectedId={selectedId}
          onSelect={onSelect}
          readOnly={readOnly}
          hardwareList={hardwareList}
        />
      );
      
      currentPos += flexSize;
      
      if (idx < children.length - 1) {
        if (dir === 'row') {
          contentEls.push(<RenderMullion key={`mullion-${child.id}`} x={cx + cw} y={innerY} w={CAD.geom.mullionT} h={innerH} />);
          currentPos += CAD.geom.mullionT;
        } else {
          contentEls.push(<RenderMullion key={`mullion-${child.id}`} x={innerX} y={cy + ch} w={innerW} h={CAD.geom.mullionT} />);
          currentPos += CAD.geom.mullionT;
        }
      }
    });
  }
  
  // Wrap internals with clipping to prevent overflow artifacts
  els.push(
    <g key={`content-${node.id}`} clipPath={`url(#${clipId})`}>
      {contentEls}
    </g>
  );

  // Layer the opening line indicator arrows on top of the glass
  if (hwEl) {
    els.push(hwEl);
  }
  
  // 4. Hit Area & Focus State
  const isSelected = !readOnly && selectedId === node.id;
  if (isSelected) {
    els.push(
      <rect 
        key={`sel-${node.id}`} 
        x={isRoot ? x + 4 : x + 2} 
        y={isRoot ? y + 4 : y + 2} 
        width={isRoot ? MathMax(0, w - 8) : MathMax(0, w - 4)} 
        height={isRoot ? MathMax(0, h - 8) : MathMax(0, h - 4)} 
        fill="none" 
        stroke={CAD.colors.activeFrame} 
        strokeWidth="4" 
        strokeDasharray="8 6" 
        pointerEvents="none" 
      />
    );
  }
  
  if (!readOnly && (node.type === 'leaf' || node.children?.length === 0)) {
    els.push(
      <rect 
        key={`hit-${node.id}`} 
        x={x} y={y} width={w} height={h} 
        fill="transparent" 
        cursor="pointer"
        className="profile-hit-area"
        onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      />
    );
  }

  return <g key={`group-${node.id}`}>{els}</g>;
}

export interface WindowCanvasProps {
  node: WindowNode;
  width: number;
  height: number;
  showDimensions?: boolean;
  onSelect: (id: string) => void;
  selectedId: string | null;
  readOnly: boolean;
  onChildResize?: (parentId: string, index: number, newSize: number, totalSize: number) => void;
  onGlobalResize?: (axis: 'w' | 'h') => void;
  canvasPadding?: number;
  onUpdateNode?: (nodeId: string, updates: Partial<WindowNode>) => void;
  isRoot?: boolean;
  isThumbnail?: boolean;
  frameType?: 'standard' | 'slim' | 'heavy' | 'renovation';
  scale?: number;
}

export const WindowCanvas = (props: WindowCanvasProps) => {
  const { node, width, height, showDimensions = true, onSelect, selectedId, readOnly, onChildResize, onGlobalResize, canvasPadding } = props;
  
  const padding = canvasPadding !== undefined ? canvasPadding : (showDimensions ? 160 : 10);

  const hardwareList: React.ReactNode[] = [];

  const getNestedSegments = (targetDir: 'row' | 'col') => {
    let segments: { start: number; end: number; parentId: string; index: number; layer: number; crossPos: number }[] = [];
    let currentLayerTop = 1;
    let currentLayerBot = 1;
    let currentLayerLeft = 1;
    let currentLayerRight = 1;

    const traverse = (currentNode: WindowNode, x: number, y: number, w: number, h: number) => {
      if (currentNode.type !== 'container' || !currentNode.children || currentNode.children.length === 0) return;

      const isMatchingDir = currentNode.dir === targetDir;
      const isRow = currentNode.dir === 'row';
      const cy = y + h / 2;
      const cx = x + w / 2;

      let myLayer = 0;
      if (isMatchingDir) {
        if (targetDir === 'row') {
          myLayer = (cy <= height / 2.01) ? currentLayerTop++ : currentLayerBot++;
        } else {
          myLayer = (cx < width / 2) ? currentLayerLeft++ : currentLayerRight++;
        }
      }

      const totalFlex = currentNode.children.reduce((s, c) => s + (c.flex || 1), 0) || 1;
      let currentX = x;
      let currentY = y;

      currentNode.children.forEach((child, idx) => {
        if (isRow) {
          const cw = ((child.flex || 1) / totalFlex) * w;
          const ch = h;
          if (isMatchingDir) {
            if (currentNode.children!.length > 1) {
              segments.push({ start: currentX, end: currentX + cw, parentId: currentNode.id, index: idx, layer: myLayer, crossPos: cy });
            }
          }
          traverse(child, currentX, currentY, cw, ch);
          currentX += cw;
        } else {
          const cw = w;
          const ch = ((child.flex || 1) / totalFlex) * h;
          if (isMatchingDir) {
            if (currentNode.children!.length > 1) {
              segments.push({ start: currentY, end: currentY + ch, parentId: currentNode.id, index: idx, layer: myLayer, crossPos: cx });
            }
          }
          traverse(child, currentX, currentY, cw, ch);
          currentY += ch;
        }
      });
    };

    traverse(node, 0, 0, width, height);
    return segments;
  };

  const rowSegments = getNestedSegments('row');
  const colSegments = getNestedSegments('col');

  const maxRowLayerBot = Math.max(0, ...rowSegments.filter(s => s.crossPos > height / 2.01).map(s => s.layer));
  const maxColLayerLeft = Math.max(0, ...colSegments.filter(s => s.crossPos < width / 2).map(s => s.layer));

  const rowGlobalOffsetBase = 75;
  const colGlobalOffsetBase = 75;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg 
        width="100%" height="100%" 
        viewBox={`-${padding} -${padding} ${width + padding*2} ${height + padding*2}`}
        className="overflow-visible"
        style={{ background: '#ffffff', touchAction: 'none' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <CadGrid />
          <linearGradient id="frame-grad-v" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="25%" stopColor="#ffffff" />
            <stop offset="85%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
          <linearGradient id="frame-grad-h" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="25%" stopColor="#ffffff" />
            <stop offset="85%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
          <linearGradient id="glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="1" />
            <stop offset="30%" stopColor="#e0f2fe" stopOpacity="1" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="60%" stopColor="#bae6fd" stopOpacity="1" />
            <stop offset="85%" stopColor="#a5f3fc" stopOpacity="1" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="panel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="metal-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <filter id="shadow-soft" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>
        <rect x={-padding} y={-padding} width={width + padding*2} height={height + padding*2} fill="url(#industrial-grid)" pointerEvents="none" />
        
        {/* Solid white substrate layer to completely block the grid pattern behind the main profile, sashes, and glass */}
        <rect x={0} y={0} width={width} height={height} fill="#ffffff" stroke="none" />
        
        <g className="blueprint-main">
          <RenderBlueprintNode 
            node={node} 
            x={0} y={0} w={width} h={height} 
            isRoot={true} 
            selectedId={selectedId} 
            onSelect={onSelect} 
            readOnly={readOnly} 
            hardwareList={hardwareList}
          />
          
          {showDimensions && (
            <g className="dimensions-layer">
              <ArchDimension 
                start={0} end={width} orientation="h" 
                linePos={height + rowGlobalOffsetBase + maxRowLayerBot * 35} 
                leaderStart={height} 
                onClick={() => onGlobalResize && onGlobalResize('w')} 
              />
              <ArchDimension 
                start={0} end={height} orientation="v" 
                linePos={-(colGlobalOffsetBase + maxColLayerLeft * 35)} 
                leaderStart={0} 
                onClick={() => onGlobalResize && onGlobalResize('h')} 
              />
              
              {rowSegments.map((seg, i) => {
                const isBot = seg.crossPos > height / 2.01;
                const linePos = isBot ? height + 55 + (seg.layer - 1) * 35 : -(55 + (seg.layer - 1) * 35);
                const leaderStart = isBot ? height : 0;
                return (
                  <ArchDimension key={`h-${i}`} start={seg.start} end={seg.end} orientation="h" linePos={linePos} leaderStart={leaderStart} onClick={() => onChildResize?.(seg.parentId, seg.index, seg.end - seg.start, width)} />
                );
              })}
              
              {colSegments.map((seg, i) => {
                const isRight = seg.crossPos >= width / 2;
                const linePos = isRight ? width + 55 + (seg.layer - 1) * 35 : -(55 + (seg.layer - 1) * 35);
                const leaderStart = isRight ? width : 0;
                return (
                  <ArchDimension key={`v-${i}`} start={seg.start} end={seg.end} orientation="v" linePos={linePos} leaderStart={leaderStart} onClick={() => onChildResize?.(seg.parentId, seg.index, seg.end - seg.start, height)} />
                );
              })}
            </g>
          )}
        </g>
        
        {/* Absolute top-most layer for sash hardware, handles, hinges, and opening indication lines to guarantee they sit above the glass and sashes */}
        <g className="hardware-overlay-layer">
          {hardwareList}
        </g>
      </svg>
    </div>
  );
};

