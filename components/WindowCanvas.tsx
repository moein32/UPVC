
import React, { useRef, useState } from 'react';
import { WindowNode, OpeningDirection } from '../types';
import { toPersianDigits } from '../utils/formatting';

// --- DESIGN SYSTEM CONTROL PANEL ---
const DESIGN_SYSTEM = {
    handle: {
        color: '#ffffff', 
        width: 4,         
        height: 26,       
        radius: 4,        
        shadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)', 
        zIndex: 50
    },
    openingLines: {
        color: "#000000",
        strokeWidth: 4.5,
        dashArray: "15,10"
    },
    dimensions: {
        segmentOffset: -38, 
        globalOffset: -62,  
        lineColor: 'bg-slate-400', 
        textColor: 'text-slate-600', 
        badgeBg: 'bg-white/95 backdrop-blur-sm', 
        badgeBorder: 'border-slate-200'
    },
    frame: {
        bg: '#f8fafc',
        gradient: 'linear-gradient(to right bottom, #ffffff, #f1f5f9)',
        borderColor: '#cbd5e1'
    }
};

interface Props {
  node: WindowNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdateNode: (id: string, updates: Partial<WindowNode>) => void;
  width: number;
  height: number;
  depth?: number;
  isRoot?: boolean;
  onDimensionEdit?: (dim: 'w' | 'h', val: number) => void; 
  onChildResize?: (nodeId: string, childIndex: number, newSize: number, totalSize: number) => void;
  readOnly?: boolean;
  isThumbnail?: boolean;
  scale?: number; 
  showDimensions?: boolean;
  frameType?: 'standard' | 'renovation';
}

// --- HELPER COMPONENTS ---

const UnifiedDimensionLine = ({
    segments, orientation, totalSize, onSegmentClick
}: {
    segments: { id: string, size: number, parentId: string, index: number, total: number }[],
    orientation: 'h' | 'v',
    totalSize: number,
    onSegmentClick?: (parentId: string, index: number, size: number, total: number) => void
}) => {
    const isH = orientation === 'h';
    const totalOffset = DESIGN_SYSTEM.dimensions.segmentOffset;

    return (
        <div className={`absolute z-[60] select-none pointer-events-none transition-all ${isH ? 'h-6' : 'w-6'}`}
        style={{
            [isH ? 'width' : 'height']: '100%',
            [isH ? 'top' : 'left']: `${totalOffset}px`,
            [isH ? 'left' : 'top']: 0,
        }}>
            <div className={`${DESIGN_SYSTEM.dimensions.lineColor} absolute ${isH ? 'h-[1px] left-0 right-0 top-1/2' : 'w-[1px] top-0 bottom-0 left-1/2'}`}></div>
            <div className={`flex w-full h-full ${isH ? 'flex-row' : 'flex-col'}`}>
                {segments.map((seg, idx) => {
                    const ratio = (seg.size / totalSize) * 100;
                    return (
                        <div key={`${seg.id}-${idx}`} className="relative flex items-center justify-center" style={{ [isH ? 'width' : 'height']: `${ratio}%` }}>
                            <div 
                                onClick={(e) => { e.stopPropagation(); onSegmentClick && onSegmentClick(seg.parentId, seg.index, seg.size, seg.total); }}
                                className={`${DESIGN_SYSTEM.dimensions.badgeBg} px-1.5 py-0.5 text-[8px] font-black ${DESIGN_SYSTEM.dimensions.textColor} border ${DESIGN_SYSTEM.dimensions.badgeBorder} rounded shadow-sm hover:border-blue-400 cursor-pointer transition-all z-[70] pointer-events-auto ${isH ? '' : 'rotate-90 origin-center'}`}>
                                {toPersianDigits(Math.round(seg.size))}
                            </div>
                            <div className={`${DESIGN_SYSTEM.dimensions.lineColor} absolute ${isH ? 'left-0 h-3 w-[1.5px] top-1/2 -translate-y-1/2' : 'top-0 w-3 h-[1.5px] left-1/2 -translate-x-1/2'}`}></div>
                            {idx === segments.length - 1 && (
                                <div className={`${DESIGN_SYSTEM.dimensions.lineColor} absolute ${isH ? 'right-0 h-3 w-[1.5px] top-1/2 -translate-y-1/2' : 'bottom-0 w-3 h-[1.5px] left-1/2 -translate-x-1/2'}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DimensionLine = ({ length, orientation, label, onClick }: { length: number, orientation: 'h' | 'v', label: number, onClick?: () => void }) => {
    const isH = orientation === 'h';
    const totalOffset = DESIGN_SYSTEM.dimensions.globalOffset;
    return (
        <div className={`absolute flex items-center justify-center z-[60] select-none pointer-events-none transition-all ${isH ? 'h-6' : 'w-6'} ${isH ? 'flex-row' : 'flex-col'}`}
        style={{
            [isH ? 'width' : 'height']: '100%',
            [isH ? 'top' : 'left']: `${totalOffset}px`,
            [isH ? 'left' : 'top']: 0,
        }}>
            <div className={`${DESIGN_SYSTEM.dimensions.lineColor} absolute ${isH ? 'h-[1.5px] left-0 right-0 top-1/2' : 'w-[1.5px] top-0 bottom-0 left-1/2'}`}></div>
            <div className={`${DESIGN_SYSTEM.dimensions.lineColor} absolute ${isH ? 'left-0 h-4 w-[1.5px] top-1/2 -translate-y-1/2' : 'top-0 w-4 h-[1.5px] left-1/2 -translate-x-1/2'}`}></div>
            <div className={`${DESIGN_SYSTEM.dimensions.lineColor} absolute ${isH ? 'right-0 h-4 w-[1.5px] top-1/2 -translate-y-1/2' : 'bottom-0 w-4 h-[1.5px] left-1/2 -translate-x-1/2'}`}></div>
            <div onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
                className={`${DESIGN_SYSTEM.dimensions.badgeBg} px-2 py-0.5 text-[10px] font-black ${DESIGN_SYSTEM.dimensions.textColor} border ${DESIGN_SYSTEM.dimensions.badgeBorder} rounded-md shadow-sm hover:border-blue-400 cursor-pointer transition-all z-[70] pointer-events-auto ${isH ? '-translate-y-[1px]' : 'rotate-90 origin-center'}`}>
                {toPersianDigits(Math.round(label))}
            </div>
        </div>
    )
}

const collectFlattenedSegments = (node: WindowNode, totalSize: number, targetDir: 'row' | 'col'): any[] => {
    if (node.type === 'leaf') return [];
    if (node.dir === targetDir) {
        const totalFlex = node.children?.reduce((sum, c) => sum + (c.flex || 1), 0) || 1;
        return node.children?.flatMap((child, idx) => {
            const childSize = (child.flex || 1) / totalFlex * totalSize;
            const subSegments = collectFlattenedSegments(child, childSize, targetDir);
            if (subSegments.length === 0) {
                return [{ id: child.id, size: childSize, parentId: node.id, index: idx, total: totalSize }];
            }
            return subSegments;
        }) || [];
    } else {
        let bestSegments: any[] = [];
        if (node.children) {
            for (const child of node.children) {
                const childSegments = collectFlattenedSegments(child, totalSize, targetDir);
                if (childSegments.length > bestSegments.length) bestSegments = childSegments;
            }
        }
        return bestSegments;
    }
};

// --- CORE HANDLES LOGIC (Ultra-Small for Invoices) ---

const renderHandles = (type: OpeningDirection | undefined, sashThickness: number, isThumbnail: boolean = false, scale: number = 1) => {
    if (!type || type === 'Fixed' || type === 'Panel') return null;
  
    const { color: handleColor, shadow, zIndex } = DESIGN_SYSTEM.handle;
    const isDoor = type.includes('Door');
    
    // REDUCED BASE SIZES FOR THUMBNAILS (Premium Look)
    const baseW = DESIGN_SYSTEM.handle.width;
    const baseH = DESIGN_SYSTEM.handle.height;
    
    // Very small handles to avoid cluttering the visual preview
    const hW = isThumbnail 
        ? (isDoor ? baseW * 0.8 : baseW * 0.5) 
        : baseW;
        
    const hH = isThumbnail 
        ? (isDoor ? baseH * 0.5 : baseH * 0.3) 
        : (isDoor ? baseH * 1.3 : baseH);
        
    const hR = isThumbnail ? 0.2 : DESIGN_SYSTEM.handle.radius;
  
    const offset = (sashThickness - hW) / 2;
    const offsetPx = `${offset}px`;
  
    const handleBaseStyle: React.Properties = { 
        position: 'absolute', 
        top: '50%', 
        transform: 'translateY(-50%)', 
        zIndex: zIndex, 
        width: `${hW}px`, 
        height: `${hH}px`, 
        backgroundColor: handleColor, 
        borderRadius: `${hR}px`, 
        boxShadow: isThumbnail ? 'none' : shadow,
        border: isThumbnail ? '0.2px solid #0f172a' : 'none' 
    };
  
    const Lever = ({ direction }: { direction: 'toLeft' | 'toRight' }) => (
        <div style={{
            position: 'absolute',
            top: '50%',
            [direction === 'toLeft' ? 'right' : 'left']: '50%',
            transform: 'translateY(-50%)',
            width: isThumbnail ? (isDoor ? '8px' : '4.5px') : '18px',
            height: isThumbnail ? (isDoor ? '2.5px' : '1.5px') : '6px',
            backgroundColor: handleColor,
            borderRadius: isThumbnail ? '0.2px' : '2px',
            boxShadow: isThumbnail ? 'none' : shadow,
            border: isThumbnail ? '0.2px solid #0f172a' : 'none',
            zIndex: zIndex + 1
        }} />
    );
  
    const Keyhole = () => (
        <div style={{
            position: 'absolute', 
            bottom: isThumbnail ? '1.5px' : '5px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: isThumbnail ? '0.8px' : '1.5px', 
            height: isThumbnail ? '1.8px' : '3px', 
            backgroundColor: '#0f172a', 
            borderRadius: '0.2px'
        }} />
    );
  
    return (
      <>
          {(type === 'TurnRight' || type === 'TiltTurnRight') && (
              <div style={{...handleBaseStyle, right: offsetPx}}><Lever direction="toLeft" /></div>
          )}
          {(type === 'TurnLeft' || type === 'TiltTurnLeft') && (
              <div style={{...handleBaseStyle, left: offsetPx}}><Lever direction="toRight" /></div>
          )}
          {type === 'DoorRight' && (
              <div style={{...handleBaseStyle, right: offsetPx}}><Lever direction="toLeft" /><Keyhole /></div>
          )}
          {type === 'DoorLeft' && (
              <div style={{...handleBaseStyle, left: offsetPx}}><Lever direction="toRight" /><Keyhole /></div>
          )}
          {(type === 'SlidingRight' || type === 'SlidingLeft') && (
               <div style={{...handleBaseStyle, [type === 'SlidingRight' ? 'right' : 'left']: '2px', height: `${hH*0.8}px`}}></div>
          )}
      </>
    );
};

// --- MAIN CANVAS COMPONENT ---

export const WindowCanvas = ({ 
  node, selectedId, onSelect, onUpdateNode, width, height, 
  depth = 0, isRoot = false, onDimensionEdit, onChildResize, 
  readOnly = false, isThumbnail = false, scale = 1, showDimensions = true,
  frameType = 'standard'
}: Props) => {
  const isSelected = !readOnly && selectedId === node.id;
  const containerRef = useRef<HTMLDivElement>(null);

  const frameStyle = {
      backgroundColor: DESIGN_SYSTEM.frame.bg,
      backgroundImage: isThumbnail ? 'none' : DESIGN_SYSTEM.frame.gradient, 
      boxShadow: isThumbnail ? 'inset 0 0 0 1px #94a3b8' : 'inset 1px 1px 3px rgba(255,255,255,1), inset -1px -1px 3px rgba(0,0,0,0.1), 0 4px 15px rgba(0,0,0,0.05)',
      border: isThumbnail ? '1px solid #94a3b8' : `1px solid ${DESIGN_SYSTEM.frame.borderColor}`, 
  };

  const isRenovation = frameType === 'renovation';
  
  const frameThickness = (isThumbnail ? 16 : (isRenovation ? 20 : 12)) * scale;
  const mullionWidth = (isThumbnail ? 14 : 12) * scale; 
  const isDoor = node.openingType?.includes('Door');
  const sashThickness = (isThumbnail ? (isDoor ? 22 : 14) : (isDoor ? 25 : 12)) * scale;

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (readOnly) return;
    e.preventDefault(); e.stopPropagation();
    const container = containerRef.current;
    if (!container || !node.children) return;
    const isCol = node.dir === 'col';
    const startSize = isCol ? container.offsetHeight : container.offsetWidth;
    const startCoord = 'touches' in e ? (isCol ? e.touches[0].clientY : e.touches[0].clientX) : (isCol ? (e as React.MouseEvent).clientY : (e as React.MouseEvent).clientX);
    const child1 = node.children[index];
    const child2 = node.children[index + 1];
    const totalFlex = (child1.flex || 1) + (child2.flex || 1);

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentCoord = 'touches' in moveEvent ? (isCol ? moveEvent.touches[0].clientY : moveEvent.touches[0].clientX) : (isCol ? (moveEvent as MouseEvent).clientY : (moveEvent as MouseEvent).clientX);
      const deltaRatio = (currentCoord - startCoord) / startSize;
      const newFlex1 = Math.max(0.1, Math.min(0.9, (child1.flex || 1)/totalFlex + deltaRatio)) * totalFlex;
      const newChildren = [...node.children!];
      newChildren[index] = { ...child1, flex: newFlex1 };
      newChildren[index + 1] = { ...child2, flex: totalFlex - newFlex1 };
      onUpdateNode(node.id, { children: newChildren });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  const RootWrapper = ({ children }: {children?: React.ReactNode}) => {
      if (!isRoot) return <>{children}</>;
      const hSegments = collectFlattenedSegments(node, width, 'row');
      const vSegments = collectFlattenedSegments(node, height, 'col');
      return (
        <div className="relative w-full h-full bg-transparent select-none overflow-visible">
            {showDimensions && (
                <>
                  <DimensionLine length={width} orientation="h" label={width} onClick={() => onDimensionEdit && onDimensionEdit('w', width)}/>
                  <DimensionLine length={height} orientation="v" label={height} onClick={() => onDimensionEdit && onDimensionEdit('h', height)}/>
                  {!isThumbnail && hSegments.length > 0 && <UnifiedDimensionLine segments={hSegments} orientation="h" totalSize={width} onSegmentClick={onChildResize} />}
                  {!isThumbnail && vSegments.length > 0 && <UnifiedDimensionLine segments={vSegments} orientation="v" totalSize={height} onSegmentClick={onChildResize} />}
                </>
            )}
            <div className="w-full h-full relative rounded-sm" style={frameStyle}>
                 {/* DOUBLE FRAME LINE LOGIC for Thumbnail Mode */}
                 {isThumbnail && (
                    <div className="absolute inset-[2.5px] border border-slate-300 pointer-events-none z-10" />
                 )}
                 <div className="w-full h-full" style={{ padding: frameThickness }}>
                    <div className="w-full h-full relative bg-slate-900/5">{children}</div>
                 </div>
            </div>
        </div>
      );
  }

  if (node.type === 'container' && node.children) {
    const isSashContainer = node.openingType && node.openingType !== 'Fixed';
    const totalFlex = node.children.reduce((a, b) => a + (b.flex || 1), 0);
    const Wrapper = isSashContainer ? 
        ({c}: {c: React.ReactNode}) => (
            <div className="w-full h-full relative rounded-sm shadow-sm bg-white" style={frameStyle}>
                 {isThumbnail && <div className="absolute inset-[2.5px] border border-slate-300 pointer-events-none z-10" />}
                 <div className="w-full h-full" style={{ padding: sashThickness }}>{c}</div>
                 <div className="absolute inset-0 pointer-events-none z-20">
                    <div className="w-full h-full relative" style={{ padding: sashThickness }}>{renderOpeningLines(node.openingType, width, height, isThumbnail)}</div>
                    {renderHandles(node.openingType, sashThickness, isThumbnail, scale)}
                 </div>
            </div>
        ) : ({c}: {c: React.ReactNode}) => <>{c}</>;

    return (
        <RootWrapper>
            <Wrapper c={
                <div ref={containerRef} className="flex w-full h-full relative" style={{ flexDirection: node.dir === 'col' ? 'column' : 'row' }} onClick={(e) => { e.stopPropagation(); if (!readOnly) onSelect(node.id); }}>
                    {node.children.map((child, index) => (
                        <React.Fragment key={child.id}>
                            <div className="relative min-w-0 min-h-0 flex flex-col" style={{ flex: child.flex || 1 }}>
                                <WindowCanvas {...{node: child, selectedId, onSelect, onUpdateNode, onChildResize, width: node.dir === 'row' ? width * ((child.flex || 1)/totalFlex) : width, height: node.dir === 'col' ? height * ((child.flex || 1)/totalFlex) : height, depth: depth + 1, readOnly, isThumbnail, scale, showDimensions, frameType}} />
                            </div>
                            {index < node.children!.length - 1 && (
                                <div className={`relative z-20 border-slate-300 ${node.dir === 'col' ? 'w-full border-t border-b' : 'h-full border-l border-r'} ${!readOnly ? (node.dir === 'col' ? 'cursor-row-resize' : 'cursor-col-resize') : ''}`}
                                    style={{ [node.dir === 'col' ? 'height' : 'width']: mullionWidth, ...frameStyle }}
                                    onMouseDown={(e) => !readOnly && handleResizeStart(e, index)}>
                                    {isThumbnail && (
                                        <div className={`absolute border-slate-300 pointer-events-none ${node.dir === 'col' ? 'inset-x-0 top-[2.5px] h-[1px]' : 'inset-y-0 left-[2.5px] w-[1px]'}`} />
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            } />
        </RootWrapper>
    );
  }

  const isOpening = node.openingType && node.openingType !== 'Fixed' && node.openingType !== 'Panel';
  return (
    <RootWrapper>
        <div onClick={(e) => { e.stopPropagation(); if (!readOnly) onSelect(node.id); }}
          className={`w-full h-full relative transition-all ${isSelected ? 'ring-2 ring-blue-500 z-50' : ''}`}>
            <div className={`w-full h-full relative flex ${isOpening ? 'shadow-sm border border-slate-200' : ''}`} style={isOpening ? { padding: sashThickness, ...frameStyle } : {}}>
                {isOpening && isThumbnail && <div className="absolute inset-[2.5px] border border-slate-300 pointer-events-none z-10" />}
                <div className={`flex-1 relative overflow-hidden ${node.openingType === 'Panel' ? 'bg-slate-50' : 'bg-gradient-to-br from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc]'}`}>
                    <div className="absolute inset-0 pointer-events-none z-10">{renderOpeningLines(node.openingType, width, height, isThumbnail)}</div>
                </div>
                <div className="absolute inset-0 pointer-events-none z-20">{renderHandles(node.openingType, sashThickness, isThumbnail, scale)}</div>
            </div>
        </div>
    </RootWrapper>
  );
};

const renderOpeningLines = (type: OpeningDirection | undefined, w: number, h: number, isThumbnail: boolean = false) => {
    if (!type || type === 'Fixed' || type === 'Panel') return null;
    const { color: strokeColor, strokeWidth, dashArray } = DESIGN_SYSTEM.openingLines;
    
    const finalStrokeWidth = isThumbnail ? strokeWidth * 1.5 : strokeWidth;
    const midH = h / 2; const midW = w / 2; const i = finalStrokeWidth / 2; const iw = w - i; const ih = h - i;

    return (
        <svg width="100%" height="100%" className="absolute inset-0 block pointer-events-none" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            {type === 'TurnRight' && <path d={`M${i},${i} L${iw},${midH} L${i},${ih}`} fill="none" stroke={strokeColor} strokeWidth={finalStrokeWidth} strokeLinecap="round" strokeLinejoin="round" />}
            {type === 'TurnLeft' && <path d={`M${iw},${i} L${i},${midH} L${iw},${ih}`} fill="none" stroke={strokeColor} strokeWidth={finalStrokeWidth} strokeLinecap="round" strokeLinejoin="round" />}
            {type === 'TiltTurnRight' && <><path d={`M${i},${i} L${iw},${midH} L${i},${ih}`} fill="none" stroke={strokeColor} strokeWidth={finalStrokeWidth} /><path d={`M${i},${ih} L${midW},${i} L${iw},${ih}`} fill="none" stroke={strokeColor} strokeWidth={finalStrokeWidth} strokeDasharray={dashArray} /></>}
            {type === 'TiltTurnLeft' && <><path d={`M${iw},${i} L${i},${midH} L${iw},${ih}`} fill="none" stroke={strokeColor} strokeWidth={finalStrokeWidth} /><path d={`M${iw},${ih} L${midW},${i} L${i},${ih}`} fill="none" stroke={strokeColor} strokeWidth={finalStrokeWidth} strokeDasharray={dashArray} /></>}
            {type === 'DoorRight' && <path d={`M${i},${i} L${iw},${midH} L${i},${ih}`} fill="none" stroke={strokeColor} strokeWidth={finalStrokeWidth} />}
            {type === 'DoorLeft' && <path d={`M${iw},${i} L${i},${midH} L${iw},${ih}`} fill="none" stroke={strokeColor} strokeWidth={finalStrokeWidth} />}
        </svg>
    );
};
