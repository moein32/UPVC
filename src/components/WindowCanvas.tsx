import React from 'react';
import { WindowNode, OpeningDirection } from '../types';
import { toPersianDigits } from '../utils/formatting';

// CAD Geometric and Styling constants for high-fidelity architectural rendering
const CAD = {
  stroke: {
    outer: 4.0,       // Outer main frame contour
    inner: 2.5,       // Inner frame sash contours
    bead: 1.5,        // Glazing bead contour (زهوار پنجره)
    spacer: 1.2,      // Double glazing thermal spacer bar profile
    miter: 1.5,        // Miter corner joints
    dimension: 1.5,   // Dimension lines
    tick: 2.5,        // Architectural tick marks
    hinge: 1.5,       // Metal hinge contours
    glazeLine: 2.0    // Reflective glass glare lines
  },
  colors: {
    line: '#0f172a',         // Deep slate contour lines
    beadLine: '#475569',     // Glazing bead divisions
    spacerColor: '#64748b',  // Thermal glass spacer alloy color
    activeFrame: '#2563eb',  // Blue highlight for selected parts
    openingLine: '#0ea5e9',  // Cyan opening direction visualization
    miter: '#94a3b8',        // Distinct miter joints
    dim: '#1e293b',          // High-contrast architectural dimension text
    glassBase: '#e0f2fe',    // Translucent light blue sky color
    spacerInner: '#1e293b'   // Sealant line color
  },
  geom: {
    frameT: 62,        // Outer frame thickness
    sashT: 68,         // Active sash (بازشو) thickness
    mullionT: 62,      // Fixed divider mullion thickness (مولیون)
    overlapSliding: 35 // Horizontal overlap for sliding sashes
  },
  font: {
    dimSize: 42
  }
};

interface RenderFrameProps {
  x: number;
  y: number;
  w: number;
  h: number;
  thickness: number;
  isRenovation?: boolean;
  isDoorSash?: boolean;
}

// 1. High-fidelity frame profile drawing with bevels, mitres, bead lines, and realistic textures
const RenderFrame = ({ x, y, w, h, thickness, isRenovation, isDoorSash }: RenderFrameProps) => {
  if (w <= 0 || h <= 0) return null;
  
  const innerX = x + thickness;
  const innerY = y + thickness;
  const innerW = Math.max(0, w - 2 * thickness);
  const innerH = Math.max(0, h - 2 * thickness);
  const beadOffset = Math.round(thickness * 0.25); // Inset for glazing bead profile

  return (
    <g className="render-frame" filter="url(#shadow-frame-3d)">
      {/* Renovation frame extensions (Sill or flange profile for older properties - فریم بازسازی) */}
      {isRenovation && (
        <g opacity="0.95">
          <rect
            x={x - 22}
            y={y - 22}
            width={w + 44}
            height={h + 44}
            fill="url(#renovation-grad)"
            stroke={CAD.colors.line}
            strokeWidth={CAD.stroke.outer}
            rx={2}
          />
          <rect
            x={x - 10}
            y={y - 10}
            width={w + 20}
            height={h + 20}
            fill="none"
            stroke={CAD.colors.beadLine}
            strokeWidth={CAD.stroke.bead}
            opacity="0.5"
          />
        </g>
      )}

      {/* Main Extruded Profile base */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="url(#frame-grad-h)"
        stroke={CAD.colors.line}
        strokeWidth={CAD.stroke.outer}
      />

      {/* Door Leaf bottom kick-plate or extra sash reinforcement (درب بالکنی یا ورودی) */}
      {isDoorSash && (
        <g>
          <rect
            x={innerX - 8}
            y={innerY - 8}
            width={innerW + 16}
            height={innerH + 16}
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.5"
            opacity="0.8"
          />
          {/* Kick plate region at bottom of doors */}
          {innerH > 400 && (
            <rect
              x={innerX}
              y={innerY + innerH - 120}
              width={innerW}
              height={120}
              fill="url(#metal-grad-classic)"
              stroke={CAD.colors.line}
              strokeWidth={CAD.stroke.inner}
              opacity="0.5"
            />
          )}
        </g>
      )}

      {/* 3D Bevel Chamfers - Diagonal miter weld joins (جوش زاویه قاب یوپی‌وی‌سی) */}
      <line x1={x} y1={y} x2={innerX} y2={innerY} stroke={CAD.colors.miter} strokeWidth={CAD.stroke.miter} />
      <line x1={x + w} y1={y} x2={innerX + innerW} y2={innerY} stroke={CAD.colors.miter} strokeWidth={CAD.stroke.miter} />
      <line x1={x} y1={y + h} x2={innerX} y2={innerY + innerH} stroke={CAD.colors.miter} strokeWidth={CAD.stroke.miter} />
      <line x1={x + w} y1={y + h} x2={innerX + innerW} y2={innerY + innerH} stroke={CAD.colors.miter} strokeWidth={CAD.stroke.miter} />
      
      {/* Subtle secondary inner shadow stroke */}
      <rect
        x={innerX - 2}
        y={innerY - 2}
        width={innerW + 4}
        height={innerH + 4}
        fill="none"
        stroke="#0f172a"
        strokeWidth="2"
        opacity="0.85"
      />

      {/* Ultimate absolute glass cutout opening bounding line */}
      <rect
        x={innerX}
        y={innerY}
        width={innerW}
        height={innerH}
        fill="none"
        stroke={CAD.colors.line}
        strokeWidth={CAD.stroke.inner}
      />
    </g>
  );
};

// 2. Extruded Mullion (مولیون ثابت) with high-end miter joins and double stop-miter line indicators
interface RenderMullionProps {
  x: number;
  y: number;
  w: number;
  h: number;
  onClick?: () => void;
  isSelected?: boolean;
  readOnly?: boolean;
}

const RenderMullion = ({ x, y, w, h, onClick, isSelected, readOnly }: RenderMullionProps) => {
  if (w <= 0 || h <= 0) return null;
  const isVertical = w < h;
  const beadOffset = Math.round((isVertical ? w : h) * 0.22);

  const r = 12; // Fillet bend radius to frame
  const strokeColor = isSelected ? CAD.colors.activeFrame : CAD.colors.line;
  const mullionFill = isSelected ? "url(#metal-grad-classic)" : (isVertical ? "url(#frame-grad-v)" : "url(#frame-grad-h)");

  return (
    <g
      onClick={(e) => {
        if (!readOnly && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className="render-mullion"
      filter="url(#shadow-hardware)"
    >
      {/* Main profile fill without standard rect border stroke to allow continuous welded transition */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={mullionFill}
        stroke="none"
      />

      {isVertical ? (
        <>
          {/* Corner wedges filling the flare joints */}
          <path d={`M ${x},${y} L ${x},${y + r} Q ${x},${y} ${x - r},${y} Z`} fill={mullionFill} stroke="none" />
          <path d={`M ${x + w},${y} L ${x + w},${y + r} Q ${x + w},${y} ${x + w + r},${y} Z`} fill={mullionFill} stroke="none" />
          <path d={`M ${x},${y + h} L ${x},${y + h - r} Q ${x},${y + h} ${x - r},${y + h} Z`} fill={mullionFill} stroke="none" />
          <path d={`M ${x + w},${y + h} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w + r},${y + h} Z`} fill={mullionFill} stroke="none" />

          {/* Straight outer boundary lines of the vertical mullion profile */}
          <line x1={x} y1={y + r} x2={x} y2={y + h - r} stroke={strokeColor} strokeWidth={CAD.stroke.inner} />
          <line x1={x + w} y1={y + r} x2={x + w} y2={y + h - r} stroke={strokeColor} strokeWidth={CAD.stroke.inner} />

          {/* Seamless flared fillets bridging vertical mullion with frame contour */}
          <path d={`M ${x - r},${y} Q ${x},${y} ${x},${y + r}`} fill="none" stroke={strokeColor} strokeWidth={CAD.stroke.inner} strokeLinecap="round" />
          <path d={`M ${x + w + r},${y} Q ${x + w},${y} ${x + w},${y + r}`} fill="none" stroke={strokeColor} strokeWidth={CAD.stroke.inner} strokeLinecap="round" />
          <path d={`M ${x - r},${y + h} Q ${x},${y + h} ${x},${y + h - r}`} fill="none" stroke={strokeColor} strokeWidth={CAD.stroke.inner} strokeLinecap="round" />
          <path d={`M ${x + w + r},${y + h} Q ${x + w},${y + h} ${x + w},${y + h - r}`} fill="none" stroke={strokeColor} strokeWidth={CAD.stroke.inner} strokeLinecap="round" />

          {/* Inside structural steel core line */}
          <line x1={x + beadOffset} y1={y} x2={x + beadOffset} y2={y + h} stroke={CAD.colors.beadLine} strokeWidth={CAD.stroke.bead} opacity="0.6" />
          <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={CAD.colors.line} strokeWidth="1" strokeDasharray="6,4" opacity="0.25" />
          <line x1={x + w - beadOffset} y1={y} x2={x + w - beadOffset} y2={y + h} stroke={CAD.colors.beadLine} strokeWidth={CAD.stroke.bead} opacity="0.6" />
        </>
      ) : (
        <>
          {/* Corner wedges filling the flare joints */}
          <path d={`M ${x},${y} L ${x + r},${y} Q ${x},${y} ${x},${y - r} Z`} fill={mullionFill} stroke="none" />
          <path d={`M ${x},${y + h} L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h + r} Z`} fill={mullionFill} stroke="none" />
          <path d={`M ${x + w},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y - r} Z`} fill={mullionFill} stroke="none" />
          <path d={`M ${x + w},${y + h} L ${x + w - r},${y + h} Q ${x + w},${y + h} ${x + w},${y + h + r} Z`} fill={mullionFill} stroke="none" />

          {/* Straight outer boundary lines of the horizontal transom profile */}
          <line x1={x + r} y1={y} x2={x + w - r} y2={y} stroke={strokeColor} strokeWidth={CAD.stroke.inner} />
          <line x1={x + r} y1={y + h} x2={x + w - r} y2={y + h} stroke={strokeColor} strokeWidth={CAD.stroke.inner} />

          {/* Seamless flared fillets bridging horizontal transom with frame or mullion contour */}
          <path d={`M ${x},${y - r} Q ${x},${y} ${x + r},${y}`} fill="none" stroke={strokeColor} strokeWidth={CAD.stroke.inner} strokeLinecap="round" />
          <path d={`M ${x},${y + h + r} Q ${x},${y + h} ${x + r},${y + h}`} fill="none" stroke={strokeColor} strokeWidth={CAD.stroke.inner} strokeLinecap="round" />
          <path d={`M ${x + w},${y - r} Q ${x + w},${y} ${x + w - r},${y}`} fill="none" stroke={strokeColor} strokeWidth={CAD.stroke.inner} strokeLinecap="round" />
          <path d={`M ${x + w},${y + h + r} Q ${x + w},${y + h} ${x + w - r},${y + h}`} fill="none" stroke={strokeColor} strokeWidth={CAD.stroke.inner} strokeLinecap="round" />

          {/* Inside structural indicators */}
          <line x1={x} y1={y + beadOffset} x2={x + w} y2={y + beadOffset} stroke={CAD.colors.beadLine} strokeWidth={CAD.stroke.bead} opacity="0.6" />
          <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={CAD.colors.line} strokeWidth="1" strokeDasharray="6,4" opacity="0.25" />
          <line x1={x} y1={y + h - beadOffset} x2={x + w} y2={y + h - beadOffset} stroke={CAD.colors.beadLine} strokeWidth={CAD.stroke.bead} opacity="0.6" />
        </>
      )}
    </g>
  );
};

// 3. Double Glazing Glass (شیشه دوجداره) with thermal spacer bar spacer alloy and rich sun shine glossy reflections
const RenderGlass = ({ x, y, w, h }: { x: number, y: number, w: number, h: number }) => {
  if (w <= 0 || h <= 0) return null;

  const spacerOffset = 18; // Distance of the double-glazed aluminium spacer from the frame inside
  const glassW = Math.max(0, w);
  const glassH = Math.max(0, h);
  
  return (
    <g className="render-glass" filter="url(#shadow-glass-inset)">
      {/* 1. Translucent baseline glass color */}
      <rect x={x} y={y} width={glassW} height={glassH} fill={CAD.colors.glassBase} />
      {/* 2. Glass glossy gradient shimmer */}
      <rect x={x} y={y} width={glassW} height={glassH} fill="url(#glass-grad)" stroke="none" fillOpacity="0.85" />

      {/* 3. Double Glazing Aluminium Spacer (اسپیسر آلومینیومی شیشه دوجداره) */}
      {glassW > spacerOffset * 2 && glassH > spacerOffset * 2 && (
        <g opacity="0.8">
          {/* Black butyl sealant line */}
          <rect
            x={x + spacerOffset - 2}
            y={y + spacerOffset - 2}
            width={glassW - (spacerOffset - 2) * 2}
            height={glassH - (spacerOffset - 2) * 2}
            fill="none"
            stroke={CAD.colors.spacerInner}
            strokeWidth="2"
            opacity="0.6"
          />
          {/* Main extruded aluminium spacer bar alloy */}
          <rect
            x={x + spacerOffset}
            y={y + spacerOffset}
            width={glassW - spacerOffset * 2}
            height={glassH - spacerOffset * 2}
            fill="none"
            stroke="url(#alloy-grad)"
            strokeWidth={CAD.stroke.spacer}
          />
        </g>
      )}

      {/* 4. Elegant 3D Glass Gleam Reflection Stripes */}
      <path d={`M${x + glassW * 0.15},${y} L${x},${y + glassH * 0.15}`} stroke="#ffffff" strokeWidth="2" strokeOpacity="0.30" />
      <path d={`M${x + glassW * 0.40},${y} L${x},${y + glassH * 0.40}`} stroke="#ffffff" strokeWidth="5.0" strokeOpacity="0.22" />
      <path d={`M${x + glassW * 0.46},${y} L${x},${y + glassH * 0.46}`} stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.15" />
      
      {/* Bottom corner reflection */}
      {glassW > 100 && glassH > 100 && (
        <path d={`M${x + glassW},${y + glassH - glassH * 0.18} L${x + glassW - glassW * 0.18},${y + glassH}`} stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.12" />
      )}
    </g>
  );
};

// 4. Panel (پنل پی‌وی‌سی) rendering with realistic vertical or horizontal grooved details and soft indentation shadow lines
const RenderPanel = ({ x, y, w, h, op }: { x: number, y: number, w: number, h: number, op: string }) => {
  if (w <= 0 || h <= 0) return null;
  const els = [<rect key="bg" x={x} y={y} width={w} height={h} fill="url(#panel-grad)" stroke={CAD.colors.line} strokeWidth="1.5" />];
  const grooveCount = Math.max(3, Math.min(10, Math.floor((grooveCount => op === 'PanelV' ? w / 60 : h / 60)())));

  if (op === 'PanelV') {
    const spacing = w / (grooveCount + 1);
    for (let i = 1; i <= grooveCount; i++) {
      const gx = x + spacing * i;
      els.push(
        <g key={`v-${i}`} opacity="0.8">
          {/* Shadow of groove */}
          <line x1={gx} y1={y} x2={gx} y2={y + h} stroke="#0f172a" strokeWidth={1.5} opacity={0.35} />
          {/* Light highlight of groove */}
          <line x1={gx + 1.5} y1={y} x2={gx + 1.5} y2={y + h} stroke="#ffffff" strokeWidth={1.0} opacity={0.7} />
        </g>
      );
    }
  } else if (op === 'PanelH') {
    const spacing = h / (grooveCount + 1);
    for (let i = 1; i <= grooveCount; i++) {
      const gy = y + spacing * i;
      els.push(
        <g key={`h-${i}`} opacity="0.8">
          {/* Shadow of groove */}
          <line x1={x} y1={gy} x2={x + w} y2={gy} stroke="#0f172a" strokeWidth={1.5} opacity={0.35} />
          {/* Light highlight of groove */}
          <line x1={x} y1={gy + 1.5} x2={x + w} y2={gy + 1.5} stroke="#ffffff" strokeWidth={1.0} opacity={0.7} />
        </g>
      );
    }
  }
  return <g>{els}</g>;
};

// 4.5. High-fidelity separate miter-cut glazing beads (زهوار با برش‌های ۴۵ درجه مجزا)
const RenderBeading = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => {
  if (w <= 0 || h <= 0) return null;
  const bt = 12; // Beading profile thickness
  const dW = Math.max(0, w);
  const dH = Math.max(0, h);
  const actualBt = Math.min(bt, Math.min(dW, dH) / 2);

  // Math miter cuts at 45 degrees
  const topPath = `M ${x},${y} L ${x + dW},${y} L ${x + dW - actualBt},${y + actualBt} L ${x + actualBt},${y + actualBt} Z`;
  const bottomPath = `M ${x},${y + dH} L ${x + dW},${y + dH} L ${x + dW - actualBt},${y + dH - actualBt} L ${x + actualBt},${y + dH - actualBt} Z`;
  const leftPath = `M ${x},${y} L ${x},${y + dH} L ${x + actualBt},${y + dH - actualBt} L ${x + actualBt},${y + actualBt} Z`;
  const rightPath = `M ${x + dW},${y} L ${x + dW},${y + dH} L ${x + dW - actualBt},${y + dH - actualBt} L ${x + dW - actualBt},${y + actualBt} Z`;

  return (
    <g className="glazing-beads" opacity="0.95">
      {/* 4 separate custom shapes with bevel textures on all sides */}
      <path d={topPath} fill="url(#frame-grad-h)" stroke={CAD.colors.beadLine} strokeWidth={CAD.stroke.bead} />
      <path d={bottomPath} fill="url(#frame-grad-h)" stroke={CAD.colors.beadLine} strokeWidth={CAD.stroke.bead} />
      <path d={leftPath} fill="url(#frame-grad-v)" stroke={CAD.colors.beadLine} strokeWidth={CAD.stroke.bead} />
      <path d={rightPath} fill="url(#frame-grad-v)" stroke={CAD.colors.beadLine} strokeWidth={CAD.stroke.bead} />
    </g>
  );
};

// 5. High fidelity accessories including corner hinges (لولاهای فلزی), lock-cylinder handles with base plates
interface TechnicalHardwareProps {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  type: string;
}

const TechnicalHardware = ({ sx, sy, sw, sh, type }: TechnicalHardwareProps) => {
  if (type === 'Fixed' || type.includes('Panel')) return null;
  const isDoor = type.includes('Door');
  const isAwning = type === 'Awning';
  const isHopper = type === 'Hopper';
  const isSliding = type.includes('Sliding');
  const isSideOpen = !isAwning && !isHopper && !isSliding;
  const isHandleRight = isSliding ? type.includes('Right') : type.includes('Left');

  // Handle positioning calculation
  let handleX = isHandleRight ? sx + sw - (isDoor ? 42 : 28) : sx + (isDoor ? 42 : 28);
  let handleY = sy + sh / 2;

  if (isAwning) {
    handleX = sx + sw / 2;
    handleY = sy + sh - 25;
  } else if (isHopper) {
    handleX = sx + sw / 2;
    handleY = sy + 25;
  }

  const flipHandle = isHandleRight && !isAwning && !isHopper;

  return (
    <g className="hardware-layer">
      {/* 1. Interactive Opening Lines Overlay (طرح خط نمایش بازشو استاندارد سازمان مهندسی) */}
      {isSideOpen && (
        <path
          d={isHandleRight
            ? `M ${sx},${sy} L ${handleX},${sy + sh / 2} L ${sx},${sy + sh}`
            : `M ${sx + sw},${sy} L ${handleX},${sy + sh / 2} L ${sx + sw},${sy + sh}`
          }
          fill="none"
          stroke={CAD.colors.openingLine}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      
      {/* Tilt and Turn dotted overhead lines */}
      {type.includes('Tilt') && (
        <path
          d={`M ${sx + 10},${sy + sh - 10} L ${sx + sw / 2},${sy + 10} L ${sx + sw - 10},${sy + sh - 10}`}
          fill="none"
          stroke={CAD.colors.openingLine}
          strokeWidth="2.2"
          strokeDasharray="8,6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Awning window swing diagram link */}
      {isAwning && (
        <path
          d={`M ${sx},${sy} L ${sx + sw / 2},${sy + sh - 12} L ${sx + sw},${sy}`}
          fill="none"
          stroke={CAD.colors.openingLine}
          strokeWidth="2.2"
          strokeDasharray="8,6"
          strokeLinecap="round"
        />
      )}

      {/* Hopper swing diagram link */}
      {isHopper && (
        <path
          d={`M ${sx},${sy + sh} L ${sx + sw / 2},${sy + 12} L ${sx + sw},${sy + sh}`}
          fill="none"
          stroke={CAD.colors.openingLine}
          strokeWidth="2.2"
          strokeDasharray="8,6"
          strokeLinecap="round"
        />
      )}

      {/* Sliding indicators paths */}
      {isSliding && (
        <g opacity="0.95">
          {/* Sliding track guide */}
          <line
            x1={sx + 20}
            y1={sy + sh / 2}
            x2={sx + sw - 20}
            y2={sy + sh / 2}
            stroke={CAD.colors.openingLine}
            strokeWidth="1.2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
          {/* Centered high fidelity action arrow in color */}
          <g stroke={CAD.colors.openingLine} strokeWidth="3.0" strokeLinecap="round" fill="none">
            <line x1={sx + sw / 2 - 35} y1={sy + sh / 2} x2={sx + sw / 2 + 35} y2={sy + sh / 2} />
            {type.includes('Right') ? (
              <path d={`M ${sx + sw / 2 + 18},${sy + sh / 2 - 8} L ${sx + sw / 2 + 35},${sy + sh / 2} L ${sx + sw / 2 + 18},${sy + sh / 2 + 8}`} strokeLinejoin="round" />
            ) : (
              <path d={`M ${sx + sw / 2 - 18},${sy + sh / 2 - 8} L ${sx + sw / 2 - 35},${sy + sh / 2} L ${sx + sw / 2 - 18},${sy + sh / 2 + 8}`} strokeLinejoin="round" />
            )}
          </g>
        </g>
      )}

      {/* 2. Visual Corner Metal Hinges - Drawn on the side opposite to the handle! (لولای مخفی و نمایان پنجره) */}
      {isSideOpen && (
        <g className="hinge-graphics" fill="url(#white-hardware-grad)" stroke="#475569" strokeWidth={CAD.stroke.hinge} filter="url(#shadow-hardware)">
          {(() => {
            const hingeW = isDoor ? 15 : 9;
            const hingeH = isDoor ? 65 : 42;
            const hingeXOffset = isHandleRight ? sx + 3 : sx + sw - hingeW - 3;
            return (
              <>
                {/* Top Hinge */}
                <rect x={hingeXOffset} y={sy + 20} width={hingeW} height={hingeH} rx={1.5} />
                {/* Center Hinge for heavy doors */}
                {isDoor && <rect x={hingeXOffset} y={sy + sh / 2 - hingeH / 2} width={hingeW} height={hingeH} rx={1.5} />}
                {/* Bottom Hinge */}
                <rect x={hingeXOffset} y={sy + sh - 20 - hingeH} width={hingeW} height={hingeH} rx={1.5} />
              </>
            );
          })()}
        </g>
      )}

      {/* 3. High Fidelity 3D Handle rendering (دستگیره لولایی و کشویی آلومینیوم فشرده) */}
      <g
        transform={`translate(${handleX}, ${handleY}) ${isAwning || isHopper ? 'rotate(90)' : ''} scale(${flipHandle ? -1 : 1}, 1)`}
        filter="url(#shadow-hardware)"
      >
        {isDoor ? (
          /* Multi-layer Door Handle with rosette and key cylinders */
          <g transform="scale(2.0)">
            {/* Rosette base plate */}
            <rect x="-6" y="-32" width="12" height="78" rx="3.5" fill="url(#white-hardware-grad)" stroke="#64748b" strokeWidth="0.8" />
            {/* Screws dots */}
            <circle cx="0" cy="-24" r="1.5" fill="#475569" />
            <circle cx="0" cy="38" r="1.5" fill="#475569" />
            {/* Safety Key lock Hole (سوئیچ عبور قفل) */}
            <path d="M-2.5,22 A2.5,2.5 0 0,1 2.5,22 L1.5,30 L-1.5,30 Z" fill="#1e293b" />
            {/* Round handle pivot hub */}
            <circle cx="0" cy="-6" r="5.2" fill="url(#alloy-grad)" stroke="#475569" strokeWidth="0.8" />
            {/* Ergonomic handle arm Lever */}
            <path
              d="M -2,-14 C 10,-16 22,-13 32,-8 C 34,-7 34,-4 28,-5 C 18,-6 8,-6 -2,-8 Z"
              fill="url(#white-hardware-grad)"
              stroke="#64748b"
              strokeWidth="0.8"
            />
          </g>
        ) : isSliding ? (
          /* Sleek inset sliding handle with finger hook and latch indicator */
          <g transform="scale(1.7)">
            {/* Main inset cup lock frame */}
            <rect x="-6" y="-22" width="12" height="44" rx="4" fill="url(#white-hardware-grad)" stroke="#64748b" strokeWidth="1.0" />
            {/* Pocket thumb groove overlay */}
            <rect x="-3" y="-15" width="6" height="30" rx="1.5" fill="#1e293b" opacity="0.9" />
            {/* Center safety lock switch indicator */}
            <rect x="-1" y="-3" width="2" height="6" rx="0.5" fill="#ef4444" />
          </g>
        ) : (
          /* Premium ergonomically curved window handle (دستگیره پنجره یک‌طرفه با روکش استاتیک) */
          <g transform="scale(2.6)">
            {/* Rotative oval base plate */}
            <rect x="-4" y="-14" width="8" height="28" rx="3" fill="url(#white-hardware-grad)" stroke="#475569" strokeWidth="0.8" />
            <circle cx="0" cy="-8" r="1.5" fill="#94a3b8" />
            <circle cx="0" cy="8" r="1.5" fill="#94a3b8" />
            {/* Main grip hub */}
            <circle cx="0" cy="0" r="3.5" fill="url(#alloy-grad)" stroke="#475569" strokeWidth="0.8" />
            {/* Elegant curved grip handle */}
            <path
              d="M -1.2,-4.5 C 7,-5.5 15,-5.5 22,-1.5 C 24,-0.5 24,1.8 19,2.2 C 13,2.5 5,1.8 -1.2,0.8 Z"
              fill="url(#white-hardware-grad)"
              stroke="#64748b"
              strokeWidth="0.8"
            />
          </g>
        )}
      </g>
    </g>
  );
};

// 6. Professional Architectural dimension lines (ابعاداندازی طبق استانداردهای نقشه کشی)
interface ArchDimensionProps {
  start: number;
  end: number;
  orientation: 'h' | 'v';
  linePos: number;
  leaderStart: number;
  onClick?: () => void;
}

const ArchDimension = ({ start, end, orientation, linePos, leaderStart, onClick }: ArchDimensionProps) => {
  const isH = orientation === 'h';
  const mid = start + (end - start) / 2;
  const tick = 8; // Large architectural cross tick radius

  return (
    <g
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onTouchEnd={(e) => {
        if (onClick) {
          e.stopPropagation();
          e.preventDefault(); // Prevents simulated click double-fire behavior
          onClick();
        }
      }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className="architectural-dimension cursor-pointer select-none"
    >
      {/* Invisible touch/click receiver with generous padding (touch target area) */}
      <rect
        x={isH ? mid - 60 : linePos - 45}
        y={isH ? linePos - 45 : mid - 60}
        width={isH ? 120 : 90}
        height={isH ? 90 : 120}
        fill="transparent"
        pointerEvents="all"
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      />

      {isH ? (
        <>
          {/* Horizontal leader extension guidelines */}
          <line x1={start} y1={leaderStart} x2={start} y2={linePos} stroke={CAD.colors.dim} strokeWidth="0.7" opacity="0.35" />
          <line x1={end} y1={leaderStart} x2={end} y2={linePos} stroke={CAD.colors.dim} strokeWidth="0.7" opacity="0.35" />
          {/* Core measurement line */}
          <line x1={start} y1={linePos} x2={end} y2={linePos} stroke={CAD.colors.dim} strokeWidth={CAD.stroke.dimension} />
          {/* Architectural ticks (45 degrees slash ticks - تیک معماری دو خط) */}
          <line x1={start - tick} y1={linePos + tick} x2={start + tick} y2={linePos - tick} stroke={CAD.colors.dim} strokeWidth={CAD.stroke.tick} strokeLinecap="round" />
          <line x1={end - tick} y1={linePos + tick} x2={end + tick} y2={linePos - tick} stroke={CAD.colors.dim} strokeWidth={CAD.stroke.tick} strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Vertical leader extension guidelines */}
          <line x1={leaderStart} y1={start} x2={linePos} y2={start} stroke={CAD.colors.dim} strokeWidth="0.7" opacity="0.35" />
          <line x1={leaderStart} y1={end} x2={linePos} y2={end} stroke={CAD.colors.dim} strokeWidth="0.7" opacity="0.35" />
          {/* Core measurement line */}
          <line x1={linePos} y1={start} x2={linePos} y2={end} stroke={CAD.colors.dim} strokeWidth={CAD.stroke.dimension} />
          {/* Architectural ticks */}
          <line x1={linePos + tick} y1={start + tick} x2={linePos - tick} y2={start - tick} stroke={CAD.colors.dim} strokeWidth={CAD.stroke.tick} strokeLinecap="round" />
          <line x1={linePos + tick} y1={end + tick} x2={linePos - tick} y2={end - tick} stroke={CAD.colors.dim} strokeWidth={CAD.stroke.tick} strokeLinecap="round" />
        </>
      )}

      {/* High readability backdrop protective shield/capsule behind dimension values */}
      <g>
        <rect
          x={isH ? mid - 32 : linePos - 16}
          y={isH ? linePos - 16 : mid - 32}
          width={isH ? 64 : 32}
          height={isH ? 32 : 64}
          fill="#ffffff"
          rx={4}
          stroke="#cbd5e1"
          strokeWidth="0.5"
          filter="url(#shadow-hardware)"
        />
        {/* Dimension numerical value in beautiful Persian Digits (نمایش خوانای ابعاد به فوت یا میلی‌متر فارسی) */}
        <text
          x={isH ? mid : linePos}
          y={isH ? linePos : mid}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={CAD.font.dimSize}
          fontWeight="900"
          fill={CAD.colors.dim}
          transform={isH ? '' : `rotate(-90, ${linePos}, ${mid})`}
          style={{ fontFamily: 'Vazirmatn, sans-serif' }}
        >
          {toPersianDigits(Math.round(end - start))}
        </text>
      </g>
    </g>
  );
};

// 7. Recursive Blueprint Node visual parser - builds windows hierarchically (mullion slices & sashes)
interface RenderBlueprintNodeProps {
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
  frameType?: 'standard' | 'slim' | 'heavy' | 'renovation';
  parentSystemType?: 'Casement' | 'Sliding';
}

const RenderBlueprintNode = ({
  node,
  x,
  y,
  w,
  h,
  isRoot,
  selectedId,
  onSelect,
  readOnly,
  hardwareList,
  frameType,
  parentSystemType
}: RenderBlueprintNodeProps) => {
  let innerX = x, innerY = y, innerW = w, innerH = h;
  const els: React.ReactNode[] = [];

  // Anchor and draw outer principal window frame (فریم بیرونی اصلی قاب)
  if (isRoot) {
    const isRenovation = frameType === 'renovation';
    const currentFrameT = isRenovation ? 104 : CAD.geom.frameT;
    els.push(
      <RenderFrame
        key={`f-${node.id}`}
        x={x}
        y={y}
        w={w}
        h={h}
        thickness={currentFrameT}
        isRenovation={isRenovation}
      />
    );
    innerX += currentFrameT;
    innerY += currentFrameT;
    innerW -= 2 * currentFrameT;
    innerH -= 2 * currentFrameT;
  }

  const op = node.openingType || 'Fixed';
  const currentSystemType = node.systemType || parentSystemType || (op.includes('Sliding') ? 'Sliding' : 'Casement');

  // Check if sashes profiles need rendering inside the nodes
  const isSash = !op.includes('Panel') && (
    node.type === 'leaf'
      ? (op !== 'Fixed')
      : (currentSystemType === 'Casement' && op !== 'Fixed')
  );

  let hwEl: React.ReactNode = null;
  if (isSash) {
    const isDoorSash = op.includes('Door');
    const currentSashT = isDoorSash ? 92 : CAD.geom.sashT;
    const sashOverlap = 18; // Overlaps the frame or mullion
    const sashX = innerX - sashOverlap;
    const sashY = innerY - sashOverlap;
    const sashW = innerW + 2 * sashOverlap;
    const sashH = innerH + 2 * sashOverlap;

    els.push(
      <RenderFrame
        key={`s-${node.id}`}
        x={sashX}
        y={sashY}
        w={sashW}
        h={sashH}
        thickness={currentSashT}
        isDoorSash={isDoorSash}
      />
    );
    
    // Physical hardware handles & swing visual overlay mapping
    const actualHwEl = (
      <TechnicalHardware
        key={`hw-${node.id}`}
        sx={sashX}
        sy={sashY}
        sw={sashW}
        sh={sashH}
        type={op}
      />
    );
    if (hardwareList) {
      hardwareList.push(actualHwEl);
    } else {
      hwEl = actualHwEl;
    }

    innerX = sashX + currentSashT;
    innerY = sashY + currentSashT;
    innerW = sashW - 2 * currentSashT;
    innerH = sashH - 2 * currentSashT;
  }

  const contentEls: React.ReactNode[] = [];

  // Terminal nodes - draw glass panel or structural solid panels
  if (node.type === 'leaf' || !node.children || node.children.length === 0) {
    if (op.includes('Panel')) {
      contentEls.push(
        <RenderPanel
          key={`panel-${node.id}`}
          x={innerX}
          y={innerY}
          w={innerW}
          h={innerH}
          op={op}
        />
      );
    } else {
      contentEls.push(
        <RenderGlass
          key={`glass-${node.id}`}
          x={innerX}
          y={innerY}
          w={innerW}
          h={innerH}
        />
      );
    }
    // Draw separate miter-cut glazing beading around every glass/panel space
    contentEls.push(
      <RenderBeading
        key={`bead-${node.id}`}
        x={innerX}
        y={innerY}
        w={innerW}
        h={innerH}
      />
    );
  } else {
    // Parent containers recursively split divisions
    const children = node.children;
    const dir = node.dir;
    const isSlidingContainer = node.systemType === 'Sliding' || parentSystemType === 'Sliding';
    const totalFlex = children.reduce((sum, c) => sum + (c.flex || 1), 0) || 1;
    
    // Sliding profiles use a horizontal overlap instead of physical mullions (اینترلاک آلومینیوم و نوار مویی کشویی)
    const overlap = CAD.geom.overlapSliding;
    const childrenSpace = isSlidingContainer && dir === 'row' && children.length > 1
      ? innerW + (children.length - 1) * overlap
      : (dir === 'row' ? innerW - (children.length - 1) * CAD.geom.mullionT : innerH - (children.length - 1) * CAD.geom.mullionT);

    let currentPos = 0;
    const fixedEls: React.ReactNode[] = [];
    const sashEls: React.ReactNode[] = [];
    const interlockEls: React.ReactNode[] = [];

    children.forEach((child, idx) => {
      const flexSize = Math.max(0, (childrenSpace * (child.flex || 1)) / totalFlex);
      const cx = dir === 'row' ? innerX + currentPos : innerX;
      const cy = dir === 'col' ? innerY + currentPos : innerY;
      const cw = dir === 'row' ? flexSize : innerW;
      const ch = dir === 'col' ? flexSize : innerH;

      const childEl = (
        <RenderBlueprintNode
          key={child.id}
          node={child}
          x={cx}
          y={cy}
          w={cw}
          h={ch}
          isRoot={false}
          selectedId={selectedId}
          onSelect={onSelect}
          readOnly={readOnly}
          hardwareList={hardwareList}
          frameType={frameType}
          parentSystemType={node.systemType || parentSystemType}
        />
      );

      const cop = child.openingType || 'Fixed';
      const childIsSash = cop !== 'Fixed' && !cop.includes('Panel');

      if (isSlidingContainer) {
        if (childIsSash) sashEls.push(childEl); else fixedEls.push(childEl);
      } else {
        if (childIsSash) {
          sashEls.push(childEl);
        } else {
          fixedEls.push(childEl);
        }
      }

      currentPos += isSlidingContainer && dir === 'row' && children.length > 1
        ? flexSize - overlap
        : flexSize;

      // Draw dividing mullion posts (مولیون‌های ثابت تقسیم‌کننده)
      if (!isSlidingContainer && idx < children.length - 1) {
        const isMullionSelected = !readOnly && selectedId === node.id;
        fixedEls.push(
          <RenderMullion
            key={`m-${child.id}`}
            x={dir === 'row' ? cx + cw : innerX}
            y={dir === 'col' ? cy + ch : innerY}
            w={dir === 'row' ? CAD.geom.mullionT : innerW}
            h={dir === 'row' ? innerH : CAD.geom.mullionT}
            onClick={() => onSelect(node.id)}
            isSelected={isMullionSelected}
            readOnly={readOnly}
          />
        );
        currentPos += CAD.geom.mullionT;
      } else if (isSlidingContainer && dir === 'row' && idx < children.length - 1) {
        // Draw vertical sliding brush interlocks profiles inside sliding mode (پروفیل اینترلاک و آبرفت کشویی دوجداره)
        const interlockX = cx + cw - (overlap / 2);
        interlockEls.push(
          <g key={`int-${child.id}`} filter="url(#shadow-hardware)">
            {/* Rubber and brush seals shadows */}
            <line x1={interlockX} y1={innerY + 2} x2={interlockX} y2={innerY + innerH - 2} stroke="#020617" strokeWidth="3" opacity="0.45" />
            <line x1={interlockX} y1={innerY} x2={interlockX} y2={innerY + innerH} stroke="#ffffff" strokeWidth="1" strokeDasharray="3,3" opacity="0.8" />
            <line x1={interlockX - 4} y1={innerY} x2={interlockX - 4} y2={innerY + innerH} stroke={CAD.colors.line} strokeWidth="1" opacity="0.3" />
            <line x1={interlockX + 4} y1={innerY} x2={interlockX + 4} y2={innerY + innerH} stroke={CAD.colors.line} strokeWidth="1" opacity="0.3" />
          </g>
        );
      }
    });

    contentEls.push(...fixedEls, ...sashEls, ...interlockEls);
  }

  els.push(<g key={`clip-${node.id}`}>{contentEls}</g>);
  if (hwEl) els.push(hwEl);

  // Outline selected components with responsive animated dashed lines
  const isSelected = !readOnly && selectedId === node.id;
  if (isSelected) {
    els.push(
      <rect
        key={`sel-${node.id}`}
        x={isRoot ? x + 4 : x + 2}
        y={isRoot ? y + 4 : y + 2}
        width={isRoot ? Math.max(0, w - 8) : Math.max(0, w - 4)}
        height={isRoot ? Math.max(0, h - 8) : Math.max(0, h - 4)}
        fill="none"
        stroke={CAD.colors.activeFrame}
        strokeWidth="3.5"
        strokeDasharray="8,5"
        pointerEvents="none"
      />
    );
  }

  // Hitbox triggers overlay to select panes
  if (!readOnly && (node.type === 'leaf' || node.children?.length === 0)) {
    els.push(
      <rect
        key={`hit-${node.id}`}
        x={x}
        y={y}
        width={w}
        height={h}
        fill="transparent"
        cursor="pointer"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
      />
    );
  }

  return <g className="blueprint-node-wrapper">{els}</g>;
};

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
  frameType?: 'standard' | 'slim' | 'heavy' | 'renovation';
  onUpdateNode?: (id: string, updates: Partial<WindowNode>) => void;
  isRoot?: boolean;
  isThumbnail?: boolean;
  scale?: number;
}

// 8. Primary Exportable Drawing Canvas component - renders SVG blueprints complete with defs
export const WindowCanvas = ({
  node,
  width,
  height,
  showDimensions = true,
  onSelect,
  selectedId,
  readOnly,
  onChildResize,
  onGlobalResize,
  canvasPadding,
  frameType
}: WindowCanvasProps) => {
  const padding = canvasPadding !== undefined
    ? canvasPadding
    : (showDimensions ? 160 : 10);
  const hardwareList: React.ReactNode[] = [];

  // Traverses nested sub divisions to render secondary dynamic dimensions
  const getNestedSegments = (targetDir: 'row' | 'col') => {
    const segments: { start: number; end: number; parentId: string; index: number; layer: number; crossPos: number }[] = [];
    let layerTop = 1, layerBot = 1, layerLeft = 1, layerRight = 1;

    const traverse = (currentNode: WindowNode, px: number, py: number, pw: number, ph: number) => {
      if (currentNode.type !== 'container' || !currentNode.children || currentNode.children.length === 0) return;
      
      const isMatchingDir = currentNode.dir === targetDir;
      const isRow = currentNode.dir === 'row';
      const cy = py + ph / 2, cx = px + pw / 2;
      let myLayer = 0;

      if (isMatchingDir) {
        if (targetDir === 'row') {
          myLayer = (cy <= height / 2.01) ? layerTop++ : layerBot++;
        } else {
          myLayer = (cx < width / 2) ? layerLeft++ : layerRight++;
        }
      }

      const totalFlex = currentNode.children.reduce((s, c) => s + (c.flex || 1), 0) || 1;
      let currentX = px, currentY = py;

      currentNode.children.forEach((child, idx) => {
        const cw = isRow ? ((child.flex || 1) / totalFlex) * pw : pw;
        const ch = isRow ? ph : ((child.flex || 1) / totalFlex) * ph;
        
        if (isMatchingDir && currentNode.children!.length > 1) {
          segments.push({
            start: isRow ? currentX : currentY,
            end: isRow ? currentX + cw : currentY + ch,
            parentId: currentNode.id,
            index: idx,
            layer: myLayer,
            crossPos: isRow ? cy : cx
          });
        }
        traverse(child, currentX, currentY, cw, ch);
        if (isRow) currentX += cw; else currentY += ch;
      });
    };

    traverse(node, 0, 0, width, height);
    return segments;
  };

  const rowSegments = getNestedSegments('row');
  const colSegments = getNestedSegments('col');
  const maxRowLayerBot = Math.max(0, ...rowSegments.filter(s => s.crossPos > height / 2.01).map(s => s.layer));
  const maxColLayerLeft = Math.max(0, ...colSegments.filter(s => s.crossPos < width / 2).map(s => s.layer));

  return (
    <div className="w-full h-full flex items-center justify-center select-none">
      <svg
        width="100%"
        height="100%"
        viewBox={`-${padding} -${padding} ${width + padding * 2} ${height + padding * 2}`}
        className="overflow-visible"
        style={{ background: '#ffffff', touchAction: 'none' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Vertical and Horizontal extruded structures mock profiles */}
          <linearGradient id="frame-grad-v" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="6%" stopColor="#ffffff" />
            <stop offset="94%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="frame-grad-h" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="6%" stopColor="#ffffff" />
            <stop offset="94%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          {/* Renovation frame flange visual */}
          <linearGradient id="renovation-grad" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b4c6e7" />
          </linearGradient>
          {/* Realistic double pane sky glass gradient */}
          <linearGradient id="glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="1" />
            <stop offset="42%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="1" />
          </linearGradient>
          {/* UPVC panel texture lines */}
          <linearGradient id="panel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          {/* Aluminium Alloy metal finish finish gradient */}
          <linearGradient id="alloy-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="35%" stopColor="#e2e8f0" />
            <stop offset="65%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="metal-grad-classic" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="white-hardware-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* 3D Drop shadows and light diffuse filters for high-fidelity visualization */}
          <filter id="shadow-frame-3d" x="-5%" y="-5%" width="112%" height="112%">
            <feDropShadow dx="2" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.22" />
          </filter>
          <filter id="shadow-hardware" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="1" dy="2.5" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.25" />
          </filter>
          <filter id="shadow-glass-inset" x="-4%" y="-4%" width="108%" height="108%">
            <feOffset dx="1" dy="1" />
            <feGaussianBlur stdDeviation="1.5" result="offset-blur" />
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
            <feFlood floodColor="#020617" floodOpacity="0.18" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>
        </defs>

        <rect x={-padding} y={-padding} width={width + padding * 2} height={height + padding * 2} fill="#ffffff" />
        
        <g className="blueprint-main">
          {/* Main frame tree expansion recursion trigger */}
          <RenderBlueprintNode
            node={node}
            x={0}
            y={0}
            w={width}
            h={height}
            isRoot={true}
            selectedId={selectedId}
            onSelect={onSelect}
            readOnly={readOnly}
            hardwareList={hardwareList}
            frameType={frameType}
          />

          {/* Dimensions visual metrics layout layer */}
          {showDimensions && (
            <g className="dimensions-layer">
              {/* Primary Total Width dimension */}
              <ArchDimension
                start={0}
                end={width}
                orientation="h"
                linePos={height + 75 + maxRowLayerBot * 35}
                leaderStart={height}
                onClick={() => onGlobalResize?.('w')}
              />
              {/* Primary Total Height dimension */}
              <ArchDimension
                start={0}
                end={height}
                orientation="v"
                linePos={-(75 + maxColLayerLeft * 35)}
                leaderStart={0}
                onClick={() => onGlobalResize?.('h')}
              />

              {/* Fractional division Widths dimensions */}
              {rowSegments.map((seg, i) => {
                const isBot = seg.crossPos > height / 2.01;
                return (
                  <ArchDimension
                    key={`h-${i}`}
                    start={seg.start}
                    end={seg.end}
                    orientation="h"
                    linePos={isBot ? height + 55 + (seg.layer - 1) * 35 : -(55 + (seg.layer - 1) * 35)}
                    leaderStart={isBot ? height : 0}
                    onClick={() => onChildResize?.(seg.parentId, seg.index, seg.end - seg.start, width)}
                  />
                );
              })}

              {/* Fractional division Heights dimensions */}
              {colSegments.map((seg, i) => {
                const isRight = seg.crossPos >= width / 2;
                return (
                  <ArchDimension
                    key={`v-${i}`}
                    start={seg.start}
                    end={seg.end}
                    orientation="v"
                    linePos={isRight ? width + 55 + (seg.layer - 1) * 35 : -(55 + (seg.layer - 1) * 35)}
                    leaderStart={isRight ? width : 0}
                    onClick={() => onChildResize?.(seg.parentId, seg.index, seg.end - seg.start, height)}
                  />
                );
              })}
            </g>
          )}
        </g>
        
        {/* Draw overlayer floating accessories for unclipped absolute rendering */}
        <g className="hardware-overlay-layer">{hardwareList}</g>
      </svg>
    </div>
  );
};
