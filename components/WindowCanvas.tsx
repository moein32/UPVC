
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
    doorHandle: {
        plateWidth: 8,
        plateHeight: 36,
        leverWidth: 28,  
        leverHeight: 6,  
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
}

const UnifiedDimensionLine = ({
    segments,
    orientation,
    totalSize,
    onSegmentClick
}: {
    segments: { id: string, size: number, parentId: string, index: number, total: number }[],
    orientation: 'h' | 'v',
    totalSize: number,
    onSegmentClick?: (parentId: string, index: number, size: number, total: number) => void
}) => {
    const isH = orientation === 'h';
    const totalOffset = DESIGN_SYSTEM.dimensions.segmentOffset;

    return (
        <div className={`absolute z-[60] select-none pointer-events-none transition-all
            ${isH ? 'h-6' : 'w-6'}
        `}
        style={{
            [isH ? 'width' : 'height']: '100%',
            [isH ? 'top' : 'left']: `${totalOffset}px`,
            [isH ? 'left' : 'top']: 0,
        }}
        >
            <div className={`${DESIGN_SYSTEM.dimensions.lineColor} absolute ${isH ? 'h-[1px] left-0 right-0 top-1/2' : 'w-[1px] top-0 bottom-0 left-1/2'}`}></div>
            
            <div className={`flex w-full h-full ${isH ? 'flex-row' : 'flex-col'}`}>
                {segments.map((seg, idx) => {
                    const ratio = (seg.size / totalSize) * 100;
                    return (
                        <div 
                            key={`${seg.id}-${idx}`} 
                            className="relative flex items-center justify-center" 
                            style={{ [isH ? 'width' : 'height']: `${ratio}%` }}
                        >
                            <div 
                                onClick={(e) => { e.stopPropagation(); onSegmentClick && onSegmentClick(seg.parentId, seg.index, seg.size, seg.total); }}
                                className={`${DESIGN_SYSTEM.dimensions.badgeBg} px-1.5 py-0.5 text-[8px] font-black ${DESIGN_SYSTEM.dimensions.textColor} border ${DESIGN_SYSTEM.dimensions.badgeBorder} rounded shadow-sm hover:border-blue-400 cursor-pointer transition-all z-[70] pointer-events-auto
                                ${isH ? '' : 'rotate-90 origin-center'}
                            `}>
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

const DimensionLine = ({ 
    length, orientation, label, onClick 
}: { 
    length: number, orientation: 'h' | 'v', label: number, onClick?: () => void 
}) => {
    const isH = orientation === 'h';
    const totalOffset = DESIGN_SYSTEM.dimensions.globalOffset;
    
    return (
        <div className={`absolute flex items-center justify-center z-[60] select-none pointer-events-none transition-all
            ${isH ? 'h-6' : 'w-6'}
            ${isH ? 'flex-row' : 'flex-col'}
        `}
        style={{
            [isH ? 'width' : 'height']: '100%',
            [isH ? 'top' : 'left']: `${totalOffset}px`,
            [isH ? 'left' : 'top']: 0,
        }}
        >
            <div className={`${DESIGN_SYSTEM.dimensions.lineColor} absolute ${isH ? 'h-[1.5px] left-0 right-0 top-1/2' : 'w-[1.5px] top-0 bottom-0 left-1/2'}`}></div>
            <div className={`${DESIGN_SYSTEM.dimensions.lineColor} absolute ${isH ? 'left-0 h-4 w-[1.5px] top-1/2 -translate-y-1/2' : 'top-0 w-4 h-[1.5px] left-1/2 -translate-x-1/2'}`}></div>
            <div className={`${DESIGN_SYSTEM.dimensions.lineColor} absolute ${isH ? 'right-0 h-4 w-[1.5px] top-1/2 -translate-y-1/2' : 'bottom-0 w-4 h-[1.5px] left-1/2 -translate-x-1/2'}`}></div>
            
            <div 
                onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
                className={`${DESIGN_SYSTEM.dimensions.badgeBg} px-2 py-0.5 text-[10px] font-black ${DESIGN_SYSTEM.dimensions.textColor} border ${DESIGN_SYSTEM.dimensions.badgeBorder} rounded-md shadow-sm hover:border-blue-400 cursor-pointer transition-all z-[70] pointer-events-auto
                 ${isH ? '-translate-y-[1px]' : 'rotate-90 origin-center'}
            `}>
                {toPersianDigits(Math.round(label))}
            </div>
        </div>
    )
}

/**
 * Recursive function to flatten all dimensions. 
 * Corrected: Now checks all children and returns the one with the most segments.
 */
const collectFlattenedSegments = (node: WindowNode, totalSize: number, targetDir: 'row' | 'col'): any[] => {
    if (node.type === 'leaf') {
        return [];
    }

    if (node.dir === targetDir) {
        const totalFlex = node.children?.reduce((sum, c) => sum + (c.flex || 1), 0) || 1;
        return node.children?.flatMap((child, idx) => {
            const childSize = (child.flex || 1) / totalFlex * totalSize;
            const subSegments = collectFlattenedSegments(child, childSize, targetDir);
            
            if (subSegments.length === 0) {
                return [{
                    id: child.id,
                    size: childSize,
                    parentId: node.id,
                    index: idx,
                    total: totalSize
                }];
            }
            return subSegments;
        }) || [];
    } else {
        // If split in opposite direction, we check ALL children and take the one with the MOST segments.
        // This ensures if the bottom section has 3 parts and top has 1, we show the 3 parts.
        let bestSegments: any[] = [];
        if (node.children) {
            for (const child of node.children) {
                const childSegments = collectFlattenedSegments(child, totalSize, targetDir);
                if (childSegments.length > bestSegments.length) {
                    bestSegments = childSegments;
                }
            }
        }
        return bestSegments;
    }
};

export const WindowCanvas = ({ 
  node, selectedId, onSelect, onUpdateNode, width, height, 
  depth = 0, isRoot = false, onDimensionEdit, onChildResize, 
  readOnly = false, isThumbnail = false, scale = 1, showDimensions = true
}: Props) => {
  const isSelected = !readOnly && selectedId === node.id;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const frameStyle = {
      backgroundColor: DESIGN_SYSTEM.frame.bg,
      backgroundImage: DESIGN_SYSTEM.frame.gradient, 
      boxShadow: isThumbnail 
        ? 'inset 0 0 2px rgba(0,0,0,0.1)' 
        : 'inset 1px 1px 3px rgba(255,255,255,1), inset -1px -1px 3px rgba(0,0,0,0.1), 0 4px 15px rgba(0,0,0,0.05)',
      borderColor: DESIGN_SYSTEM.frame.borderColor, 
  };

  const frameThickness = (isThumbnail ? 3 : 12) * scale;
  const mullionWidth = (isThumbnail ? 3 : 12) * scale; 
  const sashThickness = (isThumbnail ? 3 : 10) * scale;

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container || !node.children) return;
    const isCol = node.dir === 'col';
    const startSize = isCol ? container.offsetHeight : container.offsetWidth;
    const startPos = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const startPosY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const startCoord = isCol ? startPosY : startPos;
    const child1 = node.children[index];
    const child2 = node.children[index + 1];
    const f1 = child1.flex || 1;
    const f2 = child2.flex || 1;
    const totalFlex = f1 + f2;
    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentPos = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const currentPosY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      const currentCoord = isCol ? currentPosY : currentPos;
      const deltaPixels = currentCoord - startCoord;
      const deltaRatio = deltaPixels / startSize;
      const oldRatio1 = f1 / totalFlex;
      const newRatio1 = Math.max(0.1, Math.min(0.9, oldRatio1 + deltaRatio));
      const newFlex1 = newRatio1 * totalFlex;
      const newFlex2 = totalFlex - newFlex1;
      const newChildren = [...node.children!];
      newChildren[index] = { ...child1, flex: newFlex1 };
      newChildren[index + 1] = { ...child2, flex: newFlex2 };
      onUpdateNode(node.id, { children: newChildren });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    if (node.type === 'leaf') setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setIsDragOver(false);
    e.stopPropagation();
    if (node.type === 'leaf') {
        const actionType = e.dataTransfer.getData('actionType');
        if (actionType === 'opening') {
            const droppedType = e.dataTransfer.getData('value') as OpeningDirection;
            if (droppedType) {
                onUpdateNode(node.id, { openingType: droppedType });
                onSelect(node.id);
            }
        } else if (actionType === 'split') {
            const dir = e.dataTransfer.getData('dir') as 'row' | 'col';
            const count = parseInt(e.dataTransfer.getData('count'));
            const newChildren = Array(count).fill(null).map((_, i) => ({
                id: Date.now() + `_${i}_${Math.random()}`, 
                type: 'leaf', 
                openingType: node.openingType === 'Panel' ? 'Fixed' : node.openingType || 'Fixed', 
                flex: 1 
            })) as WindowNode[];
            onUpdateNode(node.id, { 
                type: 'container', 
                dir: dir, 
                children: newChildren, 
                openingType: (node.openingType && node.openingType !== 'Fixed' && node.openingType !== 'Panel') ? node.openingType : undefined
            });
            onSelect(node.id); 
        }
    }
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
                  
                  {!isThumbnail && hSegments.length > 0 && (
                      <UnifiedDimensionLine 
                        segments={hSegments} 
                        orientation="h" 
                        totalSize={width} 
                        onSegmentClick={onChildResize}
                      />
                  )}
                  {!isThumbnail && vSegments.length > 0 && (
                      <UnifiedDimensionLine 
                        segments={vSegments} 
                        orientation="v" 
                        totalSize={height} 
                        onSegmentClick={onChildResize}
                      />
                  )}
                </>
            )}
            <div className="w-full h-full relative rounded-sm border border-slate-300 transition-all duration-300" style={frameStyle}>
                 <div className="w-full h-full" style={{ padding: frameThickness }}>
                    <div className="w-full h-full relative bg-slate-900/5">
                        {children}
                    </div>
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
            <div className="w-full h-full relative rounded-sm border border-slate-300 shadow-sm bg-white group" style={frameStyle}>
                 <div className="w-full h-full" style={{ padding: sashThickness }}>
                     {c}
                 </div>
                 <div className="absolute inset-0 pointer-events-none z-20">
                    <div className="w-full h-full relative" style={{ padding: sashThickness }}>
                         {renderOpeningLines(node.openingType, width, height)}
                    </div>
                    {renderHandles(node.openingType, sashThickness, isThumbnail)}
                 </div>
            </div>
        ) : ({c}: {c: React.ReactNode}) => <>{c}</>;

    return (
        <RootWrapper>
            <Wrapper c={
                <div 
                    ref={containerRef}
                    className="flex w-full h-full relative overflow-visible"
                    style={{ flexDirection: node.dir === 'col' ? 'column' : 'row' }}
                    onClick={(e) => { e.stopPropagation(); if (!readOnly) onSelect(node.id); }}
                >
                    {node.children.map((child, index) => {
                        const childFlex = child.flex || 1;
                        const ratio = childFlex / totalFlex;
                        const childWidth = node.dir === 'row' ? width * ratio : width;
                        const childHeight = node.dir === 'col' ? height * ratio : height;

                        return (
                            <React.Fragment key={child.id}>
                                <div className="relative min-w-0 min-h-0 flex flex-col" style={{ flex: childFlex }}>
                                    <WindowCanvas 
                                        node={child} 
                                        selectedId={selectedId} 
                                        onSelect={onSelect}
                                        onUpdateNode={onUpdateNode}
                                        onChildResize={onChildResize} 
                                        width={childWidth}
                                        height={childHeight}
                                        depth={depth + 1}
                                        readOnly={readOnly}
                                        isThumbnail={isThumbnail}
                                        scale={scale}
                                        showDimensions={showDimensions}
                                    />
                                </div>
                                {index < node.children!.length - 1 && (
                                    <div 
                                        className={`relative z-20 border-slate-300 ${node.dir === 'col' ? 'w-full border-t border-b' : 'h-full border-l border-r'} ${!readOnly ? (node.dir === 'col' ? 'cursor-row-resize' : 'cursor-col-resize') : ''}`}
                                        style={{ [node.dir === 'col' ? 'height' : 'width']: mullionWidth, ...frameStyle }}
                                        onMouseDown={(e) => !readOnly && handleResizeStart(e, index)}
                                        onTouchStart={(e) => !readOnly && handleResizeStart(e, index)}
                                    ></div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            } />
        </RootWrapper>
    );
  }

  const isOpening = node.openingType && node.openingType !== 'Fixed' && node.openingType !== 'Panel';
  
  return (
    <RootWrapper>
        <div 
          onClick={(e) => { e.stopPropagation(); if (!readOnly) onSelect(node.id); }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full h-full relative group transition-all duration-200 box-border ${!readOnly ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-inset ring-blue-500 z-50 shadow-lg' : ''} ${isDragOver ? 'bg-green-100/50 ring-4 ring-inset ring-green-500/50' : ''}`}
        >
            <div className={`w-full h-full relative transition-all flex ${isOpening ? 'shadow-sm border border-slate-200 rounded-[1px]' : ''}`} style={isOpening ? { padding: sashThickness, ...frameStyle } : {}}>
                <div className={`flex-1 relative overflow-hidden border border-slate-300/50 ${node.openingType === 'Panel' ? 'bg-slate-50' : 'bg-gradient-to-br from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc]'}`} style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)' }}>
                    {node.openingType !== 'Panel' && <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/10 skew-x-12 opacity-60"></div>}
                    <div className="absolute inset-0 border-[2px] border-[#1e293b]/10 pointer-events-none"></div>
                    {node.openingType === 'Panel' && <div className="absolute inset-2 border border-slate-200 rounded opacity-50 bg-white/50 shadow-inner"></div>}
                    <div className="absolute inset-0 pointer-events-none z-10">
                        {renderOpeningLines(node.openingType, width, height)}
                    </div>
                </div>
                <div className="absolute inset-0 pointer-events-none z-20">
                    {renderHandles(node.openingType, sashThickness, isThumbnail)}
                </div>
            </div>
            {isSelected && !isThumbnail && <div className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm z-[60] font-black">انتخاب</div>}
        </div>
    </RootWrapper>
  );
};

const renderOpeningLines = (type: OpeningDirection | undefined, w: number, h: number) => {
    if (!type || type === 'Fixed' || type === 'Panel') return null;
    const { color: strokeColor, strokeWidth, dashArray } = DESIGN_SYSTEM.openingLines;

    const midH = h / 2;
    const midW = w / 2;
    
    const i = strokeWidth; 
    const iw = w - i;
    const ih = h - i;

    return (
        <svg 
            width="100%" 
            height="100%" 
            className="absolute inset-0 block pointer-events-none" 
            viewBox={`0 0 ${w} ${h}`} 
            preserveAspectRatio="none"
            style={{ shapeRendering: 'geometricPrecision', overflow: 'visible' }}
        >
            {type === 'TurnRight' && <path d={`M${i},${i} L${iw},${midH} L${i},${ih}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />}
            {type === 'TurnLeft' && <path d={`M${iw},${i} L${i},${midH} L${iw},${ih}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />}
            {type === 'TiltTurnRight' && (
                <>
                    <path d={`M${i},${i} L${iw},${midH} L${i},${ih}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                    <path d={`M${i},${ih} L${midW},${i} L${iw},${ih}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={dashArray} strokeLinecap="round" strokeLinejoin="round" />
                </>
            )}
            {type === 'TiltTurnLeft' && (
                <>
                    <path d={`M${iw},${i} L${i},${midH} L${iw},${ih}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                    <path d={`M${iw},${ih} L${midW},${i} L${i},${ih}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={dashArray} strokeLinecap="round" strokeLinejoin="round" />
                </>
            )}
            {type === 'DoorRight' && <path d={`M${i},${i} L${iw},${midH} L${i},${ih}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />}
            {type === 'DoorLeft' && <path d={`M${iw},${i} L${i},${midH} L${iw},${ih}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />}
            {(type === 'SlidingRight' || type === 'SlidingLeft') && (
                 <>
                    <line x1={w * 0.1} y1={midH} x2={w * 0.9} y2={midH} stroke={strokeColor} strokeWidth={strokeWidth * 1.5} />
                    {type === 'SlidingRight' && <path d={`M${w * 0.85},${midH - 10} L${w * 0.9},${midH} L${w * 0.85},${midH + 10}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth * 1.5} strokeLinecap="round" strokeLinejoin="round" />}
                    {type === 'SlidingLeft' && <path d={`M${w * 0.15},${midH - 10} L${w * 0.1},${midH} L${w * 0.15},${midH + 10}`} fill="none" stroke={strokeColor} strokeWidth={strokeWidth * 1.5} strokeLinecap="round" strokeLinejoin="round" />}
                 </>
            )}
        </svg>
    );
};

const renderHandles = (type: OpeningDirection | undefined, sashThickness: number, isThumbnail?: boolean) => {
  if (!type || type === 'Fixed' || type === 'Panel') return null;

  const { color: handleColor, shadow, zIndex } = DESIGN_SYSTEM.handle;
  const hW = isThumbnail ? DESIGN_SYSTEM.handle.width / 2 : DESIGN_SYSTEM.handle.width;
  const hH = isThumbnail ? DESIGN_SYSTEM.handle.height / 2 : DESIGN_SYSTEM.handle.height;
  const hR = isThumbnail ? DESIGN_SYSTEM.handle.radius / 2 : DESIGN_SYSTEM.handle.radius;

  const offset = (sashThickness - hW) / 2;
  const offsetPx = `${offset}px`;

  const handleBaseStyle: React.CSSProperties = { 
      position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: zIndex, width: `${hW}px`, height: `${hH}px`, backgroundColor: handleColor, borderRadius: `${hR}px`, boxShadow: shadow
  };

  const leverH = isThumbnail ? DESIGN_SYSTEM.doorHandle.leverHeight / 2 : DESIGN_SYSTEM.doorHandle.leverHeight;
  const leverW = isThumbnail ? DESIGN_SYSTEM.doorHandle.leverWidth / 2 : DESIGN_SYSTEM.doorHandle.leverWidth;
  
  const leverBaseStyle: React.CSSProperties = {
      position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: zIndex, display: 'flex', alignItems: 'center'
  };

  const LeverHandle = ({ flip = false }) => (
      <div style={leverBaseStyle}>
          <div style={{ width: `${hW}px`, height: `${hH}px`, backgroundColor: handleColor, borderRadius: `${hR}px`, boxShadow: shadow }}></div>
          <div style={{ position: 'absolute', [flip ? 'right' : 'left']: `${hW/2 - 2}px`, width: `${leverW}px`, height: `${leverH}px`, backgroundColor: handleColor, borderRadius: `${leverH}px`, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}></div>
      </div>
  );

  return (
    <>
        {type === 'TurnRight' && <div style={{...handleBaseStyle, right: offsetPx}}></div>}
        {type === 'TurnLeft' && <div style={{...handleBaseStyle, left: offsetPx}}></div>}
        {type === 'TiltTurnRight' && <div style={{...handleBaseStyle, right: offsetPx}}></div>}
        {type === 'TiltTurnLeft' && <div style={{...handleBaseStyle, left: offsetPx}}></div>}
        {type === 'DoorRight' && <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: offsetPx, zIndex: zIndex }}><LeverHandle flip /></div>}
        {type === 'DoorLeft' && <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: offsetPx, zIndex: zIndex }}><LeverHandle /></div>}
        {type === 'SlidingRight' && <div style={{...handleBaseStyle, right: '2px', height: `${hH*0.8}px`}}></div>}
        {type === 'SlidingLeft' && <div style={{...handleBaseStyle, left: '2px', height: `${hH*0.8}px`}}></div>}
    </>
  );
};
