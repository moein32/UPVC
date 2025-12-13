import React from 'react';
import { WindowConfig, WindowNode, OpeningDirection } from '../types';
import { toPersianDigits } from '../utils/formatting';

interface Props {
  config: WindowConfig;
  width?: string;
  height?: string;
  className?: string;
}

// Helper to draw opening symbols within a specific bounding box (0-100 based coords)
const OpeningSymbol = ({ type, x, y, w, h }: { type: OpeningDirection, x: number, y: number, w: number, h: number }) => {
    const strokeColor = "#1e293b"; // Slate-800
    const strokeWidth = "1.5"; // Thicker for visibility in print

    // Calculate center points for paths
    const cx = x + w / 2;
    const cy = y + h / 2;
    const right = x + w;
    const bottom = y + h;

    switch (type) {
        case 'TurnLeft': // < Shape
            return <path d={`M${right},${y} L${x},${cy} L${right},${bottom}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
        
        case 'TurnRight': // > Shape
            return <path d={`M${x},${y} L${right},${cy} L${x},${bottom}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />;
        
        case 'TiltTurnLeft': // < Shape + Dashed V
            return (
                <g>
                    <path d={`M${right},${y} L${x},${cy} L${right},${bottom}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <path d={`M${x},${bottom} L${cx},${y} L${right},${bottom}`} fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                </g>
            );

        case 'TiltTurnRight': // > Shape + Dashed V
            return (
                <g>
                    <path d={`M${x},${y} L${right},${cy} L${x},${bottom}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <path d={`M${x},${bottom} L${cx},${y} L${right},${bottom}`} fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                </g>
            );

        case 'SlidingLeft':
            return (
                <g transform={`translate(${cx}, ${cy})`}>
                     <text x="0" y="5" textAnchor="middle" fontSize="24" fontWeight="bold" fill={strokeColor}>←</text>
                </g>
            );
        case 'SlidingRight':
            return (
                <g transform={`translate(${cx}, ${cy})`}>
                     <text x="0" y="5" textAnchor="middle" fontSize="24" fontWeight="bold" fill={strokeColor}>→</text>
                </g>
            );
        case 'DoorLeft':
             return (
                 <g>
                    <path d={`M${right},${y} L${x},${cy} L${right},${bottom}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <rect x={right - 10} y={cy - 10} width="4" height="20" fill={strokeColor} />
                 </g>
             );
        case 'DoorRight':
             return (
                <g>
                    <path d={`M${x},${y} L${right},${cy} L${x},${bottom}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <rect x={x + 6} y={cy - 10} width="4" height="20" fill={strokeColor} />
                </g>
             );
        default:
            return null;
    }
};

const renderRecursiveSvg = (node: WindowNode, x: number, y: number, w: number, h: number, keyPrefix: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const strokeColor = "#334155"; // Slate-700 for frames
    const glassColor = "#ecfeff"; // Cyan-50 for glass
    
    if (node.type === 'container' && node.children) {
        // Draw Container Frame (Outer box of this section)
        // Note: We don't fill containers, only leaves fill space.
        
        // Handle Sash Frame for Container (e.g. Double Door inside a sash)
        if (node.openingType && node.openingType !== 'Fixed') {
             // Draw Sash Frame offset
             const sashOffset = 3; // Approx 3% or px depending on scale, let's assume viewbox 0-1000
             elements.push(
                <rect 
                    key={`${keyPrefix}-sash`} 
                    x={x + sashOffset} y={y + sashOffset} width={w - (sashOffset*2)} height={h - (sashOffset*2)} 
                    fill="none" stroke={strokeColor} strokeWidth="2" 
                />
             );
             elements.push(
                 <g key={`${keyPrefix}-symbol`}>
                    <OpeningSymbol type={node.openingType} x={x} y={y} w={w} h={h} />
                 </g>
             );
        }

        const totalFlex = node.children.reduce((acc, child) => acc + (child.flex || 1), 0);
        let currentPos = node.dir === 'row' ? x : y;

        node.children.forEach((child, index) => {
            const flex = child.flex || 1;
            const ratio = flex / totalFlex;
            
            let childX, childY, childW, childH;

            if (node.dir === 'row') {
                childW = w * ratio;
                childH = h;
                childX = currentPos;
                childY = y;
                currentPos += childW;
            } else {
                childW = w;
                childH = h * ratio;
                childX = x;
                childY = currentPos;
                currentPos += childH;
            }

            elements.push(...renderRecursiveSvg(child, childX, childY, childW, childH, `${keyPrefix}-${index}`));

            // Draw Mullion (Divider)
            if (index < node.children!.length - 1) {
                const mullionThickness = 2; 
                if (node.dir === 'row') {
                    // Vertical line
                    elements.push(
                        <rect key={`${keyPrefix}-mullion-${index}`} x={currentPos - (mullionThickness/2)} y={y} width={mullionThickness} height={h} fill={strokeColor} />
                    );
                } else {
                    // Horizontal line
                    elements.push(
                        <rect key={`${keyPrefix}-mullion-${index}`} x={x} y={currentPos - (mullionThickness/2)} width={w} height={mullionThickness} fill={strokeColor} />
                    );
                }
            }
        });

    } else {
        // Leaf Node
        const isPanel = node.openingType === 'Panel';
        
        // 1. Draw Glass/Panel Fill
        elements.push(
            <rect 
                key={`${keyPrefix}-bg`} 
                x={x} y={y} width={w} height={h} 
                fill={isPanel ? "#f1f5f9" : glassColor} 
                stroke="none" 
            />
        );

        // 2. Draw Panel texture (Diagonal lines) if panel
        if (isPanel) {
            elements.push(
                <path 
                    key={`${keyPrefix}-panel-x`}
                    d={`M${x},${y} L${x+w},${y+h} M${x+w},${y} L${x},${y+h}`}
                    stroke="#cbd5e1" strokeWidth="1"
                />
            );
        }

        // 3. Draw Sash Frame (if not fixed/panel)
        if (node.openingType && node.openingType !== 'Fixed' && node.openingType !== 'Panel') {
            const sashInset = 4;
            elements.push(
                <rect 
                    key={`${keyPrefix}-sash-frame`} 
                    x={x + sashInset} y={y + sashInset} width={w - (sashInset*2)} height={h - (sashInset*2)} 
                    fill="none" stroke={strokeColor} strokeWidth="3" 
                />
            );
        }

        // 4. Draw Opening Symbol
        if (node.openingType && node.openingType !== 'Fixed' && node.openingType !== 'Panel') {
            elements.push(
                <g key={`${keyPrefix}-symbol`}>
                    <OpeningSymbol type={node.openingType} x={x} y={y} w={w} h={h} />
                </g>
            );
        }
    }

    return elements;
};

export const WindowPreview = ({ config, width, height, className = '' }: Props) => {
  const displayWidth = width || '100%';
  const displayHeight = height || '100%';

  // SVG Coordinate System (0 to 1000 for easy precision)
  const viewBoxW = 1000;
  const viewBoxH = 1000;

  // Outer Frame Thickness
  const frameThickness = 15;

  return (
    <div 
      className={`relative bg-white overflow-hidden flex flex-col items-center justify-center ${className}`}
      style={{ 
        width: displayWidth, 
        height: displayHeight,
      }}
    >
      {/* Container for Dimensions + Drawing */}
      <div className="relative p-6 w-full h-full flex items-center justify-center">
        
        {/* Top Dimension */}
        <div className="absolute top-1 left-0 w-full text-center text-[10px] font-bold text-slate-600">
             {toPersianDigits(config.width)}
        </div>
        
        {/* Left Dimension */}
        <div className="absolute left-1 top-0 h-full flex items-center justify-center">
             <div className="-rotate-90 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                 {toPersianDigits(config.height)}
             </div>
        </div>

        {/* The Technical Drawing (SVG) */}
        <svg 
            viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} 
            className="w-full h-full border border-slate-200 shadow-sm bg-white" 
            preserveAspectRatio="none" // Stretch to fill container aspect ratio
        >
            {/* Outer Main Frame */}
            <rect x="0" y="0" width={viewBoxW} height={viewBoxH} fill="none" stroke="#1e293b" strokeWidth={frameThickness} />
            
            {/* Inner Content (Recursively Rendered) */}
            <g transform={`translate(${frameThickness/2}, ${frameThickness/2}) scale(${(viewBoxW - frameThickness)/viewBoxW}, ${(viewBoxH - frameThickness)/viewBoxH})`}>
                {config.layout && renderRecursiveSvg(config.layout, 0, 0, viewBoxW, viewBoxH, 'root')}
            </g>
        </svg>

      </div>
    </div>
  );
};