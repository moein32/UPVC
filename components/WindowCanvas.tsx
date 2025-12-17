import React, { useRef, useState } from 'react';
import { WindowNode, OpeningDirection } from '../types';
import { toPersianDigits } from '../utils/formatting';

// --- DESIGN SYSTEM CONTROL PANEL ---
const DESIGN_SYSTEM = {
    handle: {
        color: '#ffffff', 
        width: 4,         
        height: 28,       
        radius: 4,        
        shadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)', 
        zIndex: 50
    },
    doorHandle: {
        plateWidth: 4,
        plateHeight: 28,
        leverWidth: 20,  
        leverHeight: 4,  
    },
    openingLines: {
        color: "rgba(0,0,0,0.6)", 
        strokeWidth: 1.5,
        dashArray: "5,5" 
    },
    dimensions: {
        segmentOffset: -35, 
        globalOffset: 35,  
        lineColor: 'bg-slate-700', 
        textColor: 'text-slate-800', 
        badgeBg: 'bg-white/90 backdrop-blur-sm', 
        badgeBorder: 'border-slate-300/50'
    },
    frame: {
        bg: '#f8fafc',
        gradient: 'linear-gradient(to right bottom, #ffffff, #f1f5f9)',
        borderColor: '#e2e8f0'
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

const DimensionLine = ({ 
    length, 
    orientation, 
    label, 
    position, 
    offset = 0,
    depthOffset = 0,
    onClick,
    isSegment = false
}: { 
    length: number, 
    orientation: 'h' | 'v', 
    label: number, 
    position: 'start' | 'end' | 'center', 
    offset?: number,
    depthOffset?: number,
    onClick?: () => void,
    isSegment?: boolean
}) => {
    const isH = orientation === 'h';
    const baseVal = isSegment ? DESIGN_SYSTEM.dimensions.segmentOffset : DESIGN_SYSTEM.dimensions.globalOffset; 
    
    // Add depthOffset to push nested dimensions further in/out to avoid overlap
    // depthOffset comes from the recursion depth
    const totalOffset = baseVal + (offset * 25) + (depthOffset * 20);
    
    const lineColor = isSegment ? DESIGN_SYSTEM.dimensions.lineColor : 'bg-slate-600';
    const textColor = isSegment ? DESIGN_SYSTEM.dimensions.textColor : 'text-slate-700';

    return (
        <div className={`absolute flex items-center justify-center z-[60] select-none pointer-events-none
            ${isH ? 'h-6' : 'w-6'}
            ${isH ? 'flex-row' : 'flex-col'}
        `}
        style={{
            [isH ? 'width' : 'height']: '100%',
            [isH ? (position === 'start' ? 'top' : 'bottom') : (position === 'start' ? 'left' : 'right')]: `${totalOffset}px`,
            [isH ? 'left' : 'top']: 0,
            opacity: 1
        }}
        >
            <div className={`${lineColor} absolute ${isH ? 'h-[1px] left-2 right-2 top-1/2' : 'w-[1px] top-2 bottom-2 left-1/2'}`}></div>
            
            <div className={`absolute ${lineColor} ${isH ? 'left-2 h-2 w-[1px] top-1/2 -translate-y-1/2' : 'top-2 w-2 h-[1px] left-1/2 -translate-x-1/2'}`}></div>
            <div className={`absolute ${lineColor} ${isH ? 'right-2 h-2 w-[1px] top-1/2 -translate-y-1/2' : 'bottom-2 w-2 h-[1px] left-1/2 -translate-x-1/2'}`}></div>
            
            <div 
                onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
                className={`${DESIGN_SYSTEM.dimensions.badgeBg} px-1.5 py-0.5 text-[10px] font-bold ${textColor} border ${DESIGN_SYSTEM.dimensions.badgeBorder} rounded shadow-sm hover:bg-blue-50 cursor-pointer transition-all z-[70] pointer-events-auto
                 ${isH ? '-translate-y-[1px]' : '-rotate-90 origin-center'}
            `}>
                {toPersianDigits(Math.round(label))}
            </div>
        </div>
    )
}

export const WindowCanvas = ({ 
  node, selectedId, onSelect, onUpdateNode, width, height, 
  depth = 0, isRoot = false, onDimensionEdit, onChildResize, 
  readOnly = false, isThumbnail = false, scale = 1, showDimensions = true
}: Props) => {
  const isSelected = !readOnly && selectedId === node.id;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // --- Visual Constants ---
  const frameStyle = {
      backgroundColor: DESIGN_SYSTEM.frame.bg,
      backgroundImage: DESIGN_SYSTEM.frame.gradient, 
      boxShadow: isThumbnail 
        ? 'inset 0 0 2px rgba(0,0,0,0.1)' 
        : 'inset 1px 1px 3px rgba(255,255,255,1), inset -1px -1px 3px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)',
      borderColor: DESIGN_SYSTEM.frame.borderColor, 
  };

  const frameThickness = (isThumbnail ? 3 : 14) * scale;
  const mullionWidth = (isThumbnail ? 3 : 14) * scale; 
  const sashThickness = (isThumbnail ? 3 : 12) * scale;

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
      return (
        <div className={`relative w-full h-full ${showDimensions ? 'p-12' : 'p-0.5'} bg-transparent select-none`}>
            {/* Global Dimensions */}
            {showDimensions && (
                <>
                  <div className="absolute top-0 left-12 right-12 h-12">
                       <DimensionLine length={width} orientation="h" label={width} position="end" onClick={() => onDimensionEdit && onDimensionEdit('w', width)}/>
                  </div>
                  <div className="absolute left-0 top-12 bottom-12 w-12">
                       <DimensionLine length={height} orientation="v" label={height} position="end" onClick={() => onDimensionEdit && onDimensionEdit('h', height)}/>
                  </div>
                </>
            )}
            
            {/* Main Outer Frame */}
            <div className="w-full h-full relative shadow-2xl rounded-sm border border-slate-300"
                 style={frameStyle}
            >
                 <div className="w-full h-full" style={{ padding: frameThickness }}>
                    <div className="w-full h-full relative bg-slate-900/5">
                        {children}
                    </div>
                 </div>
            </div>
        </div>
      );
  }

  // Render Container
  if (node.type === 'container' && node.children) {
    const isSashContainer = node.openingType && node.openingType !== 'Fixed';
    const totalFlex = node.children.reduce((a, b) => a + (b.flex || 1), 0);
    
    // Wrapper for Sash Containers
    const Wrapper = isSashContainer ? 
        ({c}: {c: React.ReactNode}) => (
            <div className="w-full h-full relative rounded-sm border border-slate-300 shadow-md bg-white group" style={frameStyle}>
                 <div className="w-full h-full" style={{ padding: sashThickness }}>
                     {c}
                 </div>
                 {/* Opening Symbol Overlay */}
                 <div className="absolute inset-0 pointer-events-none z-50">
                    {renderOpeningSymbol(node.openingType, node.id, sashThickness, isThumbnail)}
                 </div>
            </div>
        ) : ({c}: {c: React.ReactNode}) => <>{c}</>;

    return (
        <RootWrapper>
            <Wrapper c={
                <div 
                    ref={containerRef}
                    className="flex w-full h-full relative"
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
                                        showDimensions={showDimensions} // FIXED: Propagate true/active state
                                    />
                                    {showDimensions && !isThumbnail && (
                                        <>
                                            {/* Logic: Only show the dimension parallel to the split direction */}
                                            {/* Row Split (Vertical Divider) -> Show Widths */}
                                            {node.dir === 'row' && (
                                                <DimensionLine 
                                                    length={childWidth} 
                                                    orientation="h" 
                                                    label={childWidth} 
                                                    position="end" 
                                                    isSegment={true}
                                                    depthOffset={depth} // Pass depth to avoid overlap in nested same-dir splits
                                                    onClick={() => onChildResize && onChildResize(node.id, index, childWidth, width)}
                                                />
                                            )}

                                            {/* Col Split (Horizontal Divider e.g. Transom/Panel) -> Show Heights */}
                                            {node.dir === 'col' && (
                                                <DimensionLine 
                                                    length={childHeight} 
                                                    orientation="v" 
                                                    label={childHeight} 
                                                    position="end" 
                                                    isSegment={true}
                                                    depthOffset={depth} // Pass depth to avoid overlap in nested same-dir splits
                                                    onClick={() => onChildResize && onChildResize(node.id, index, childHeight, height)}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                                {index < node.children!.length - 1 && (
                                    <div 
                                        className={`relative z-20 border-slate-300
                                            ${node.dir === 'col' ? 'w-full border-t border-b' : 'h-full border-l border-r'}
                                            ${!readOnly ? (node.dir === 'col' ? 'cursor-row-resize' : 'cursor-col-resize') : ''}
                                        `}
                                        style={{ 
                                            [node.dir === 'col' ? 'height' : 'width']: mullionWidth,
                                            ...frameStyle
                                        }}
                                        onMouseDown={(e) => !readOnly && handleResizeStart(e, index)}
                                        onTouchStart={(e) => !readOnly && handleResizeStart(e, index)}
                                    >
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            } />
        </RootWrapper>
    );
  }

  // Render Leaf (Glass/Panel)
  const isOpening = node.openingType && node.openingType !== 'Fixed' && node.openingType !== 'Panel';
  
  return (
    <RootWrapper>
        <div 
          onClick={(e) => { e.stopPropagation(); if (!readOnly) onSelect(node.id); }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            w-full h-full relative group transition-all duration-200 box-border
            ${!readOnly ? 'cursor-pointer' : ''}
            ${isSelected ? 'ring-2 ring-inset ring-blue-500 z-50' : ''}
            ${isDragOver ? 'bg-green-100/50 ring-4 ring-inset ring-green-500/50' : ''}
          `}
        >
            {/* Sash Frame if Opening */}
            <div className={`w-full h-full relative transition-all flex
                ${isOpening ? 'shadow-sm border border-slate-300 rounded-[1px]' : ''}
            `}
            style={isOpening ? { padding: sashThickness, ...frameStyle } : {}}
            >
                {/* Content: Glass or Panel - Overflow Hidden applied ONLY here */}
                <div className={`flex-1 relative overflow-hidden border border-slate-300/50
                    ${node.openingType === 'Panel' 
                        ? 'bg-slate-50' 
                        : 'bg-gradient-to-br from-[#e0f2fe] via-[#bae6fd] to-[#7dd3fc]'
                    }`}
                    style={{
                         boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
                    }}
                >
                    {node.openingType !== 'Panel' && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/10 skew-x-12 opacity-60"></div>
                    )}
                    <div className="absolute inset-0 border-[2px] border-[#1e293b]/20 pointer-events-none"></div>
                    {node.openingType === 'Panel' && (
                        <div className="absolute inset-2 border border-slate-200 rounded opacity-50 bg-white/50 shadow-inner"></div>
                    )}
                </div>

                {/* Opening Symbol Overlay - Rendered as sibling to glass container (still inside sash frame but z-indexed) */}
                <div className="absolute inset-0 pointer-events-none z-20">
                    {renderOpeningSymbol(node.openingType, node.id, sashThickness, isThumbnail)}
                </div>
            </div>

            {isSelected && !isThumbnail && (
                <div className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm z-[60]">
                    انتخاب
                </div>
            )}
        </div>
    </RootWrapper>
  );
};

// --- Flat & Minimal Handle & Symbol Renderer ---
const renderOpeningSymbol = (type: OpeningDirection | undefined, nodeId: string, sashThickness: number, isThumbnail?: boolean) => {
  if (!type || type === 'Fixed' || type === 'Panel') return null;

  // Use variables from DESIGN_SYSTEM
  const { color: strokeColor, strokeWidth, dashArray } = DESIGN_SYSTEM.openingLines;
  const { color: handleColor, shadow, zIndex } = DESIGN_SYSTEM.handle;

  // Handle Dimensions
  const hW = isThumbnail ? DESIGN_SYSTEM.handle.width / 2 : DESIGN_SYSTEM.handle.width;
  const hH = isThumbnail ? DESIGN_SYSTEM.handle.height / 2 : DESIGN_SYSTEM.handle.height;
  const hR = isThumbnail ? DESIGN_SYSTEM.handle.radius / 2 : DESIGN_SYSTEM.handle.radius;

  // Offset Calculation
  // We place it (sashThickness - hW) / 2 from the edge to center it on the profile.
  const offset = (sashThickness - hW) / 2;
  const offsetPx = `${offset}px`;

  // Handle Style Base
  const handleBaseStyle: React.CSSProperties = { 
      position: 'absolute', 
      top: '50%', 
      transform: 'translateY(-50%)', 
      zIndex: zIndex,
      width: `${hW}px`,
      height: `${hH}px`,
      backgroundColor: handleColor,
      borderRadius: `${hR}px`,
      boxShadow: shadow
  };

  // Door Lever Dimensions
  const leverH = isThumbnail ? DESIGN_SYSTEM.doorHandle.leverHeight / 2 : DESIGN_SYSTEM.doorHandle.leverHeight;
  const leverW = isThumbnail ? DESIGN_SYSTEM.doorHandle.leverWidth / 2 : DESIGN_SYSTEM.doorHandle.leverWidth;
  
  const leverBaseStyle: React.CSSProperties = {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: zIndex,
      display: 'flex',
      alignItems: 'center'
  };

  const LeverHandle = ({ flip = false }) => (
      <div style={leverBaseStyle}>
          {/* Base Plate */}
          <div style={{
              width: `${hW}px`,
              height: `${hH}px`,
              backgroundColor: handleColor,
              borderRadius: `${hR}px`,
              boxShadow: shadow
          }}></div>
          {/* Lever */}
          <div style={{
              position: 'absolute',
              [flip ? 'right' : 'left']: `${hW/2 - 2}px`, // Slight overlap
              width: `${leverW}px`,
              height: `${leverH}px`,
              backgroundColor: handleColor,
              borderRadius: `${leverH}px`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}></div>
      </div>
  );

  return (
    <>
        {/* Layer 1: Direction Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {type === 'TurnRight' && <path d="M0,0 L100,50 L0,100" fill="none" stroke={strokeColor} vectorEffect="non-scaling-stroke" strokeWidth={strokeWidth} />}
            {type === 'TurnLeft' && <path d="M100,0 L0,50 L100,100" fill="none" stroke={strokeColor} vectorEffect="non-scaling-stroke" strokeWidth={strokeWidth} />}
            {type === 'TiltTurnRight' && (
                <>
                    <path d="M0,0 L100,50 L0,100" fill="none" stroke={strokeColor} vectorEffect="non-scaling-stroke" strokeWidth={strokeWidth} />
                    <path d="M0,100 L50,0 L100,100" fill="none" stroke={strokeColor} vectorEffect="non-scaling-stroke" strokeWidth={strokeWidth} strokeDasharray={dashArray} />
                </>
            )}
            {type === 'TiltTurnLeft' && (
                <>
                    <path d="M100,0 L0,50 L100,100" fill="none" stroke={strokeColor} vectorEffect="non-scaling-stroke" strokeWidth={strokeWidth} />
                    <path d="M100,100 L50,0 L0,100" fill="none" stroke={strokeColor} vectorEffect="non-scaling-stroke" strokeWidth={strokeWidth} strokeDasharray={dashArray} />
                </>
            )}
             {/* Doors */}
             {type === 'DoorRight' && <path d="M0,0 L100,50 L0,100" fill="none" stroke={strokeColor} vectorEffect="non-scaling-stroke" strokeWidth={strokeWidth} />}
             {type === 'DoorLeft' && <path d="M100,0 L0,50 L100,100" fill="none" stroke={strokeColor} vectorEffect="non-scaling-stroke" strokeWidth={strokeWidth} />}
        </svg>

        {(type === 'SlidingRight' || type === 'SlidingLeft') && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <line x1="10" y1="50" x2="90" y2="50" stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                 {type === 'SlidingRight' && <path d="M85,45 L90,50 L85,55" fill="none" stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                 {type === 'SlidingLeft' && <path d="M15,45 L10,50 L15,55" fill="none" stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
            </svg>
        )}

        {/* Layer 2: Flat Handles positioned on Profile */}
        
        {/* TurnRight: Handle Right */}
        {type === 'TurnRight' && <div style={{...handleBaseStyle, right: offsetPx}}></div>}

        {/* TurnLeft: Handle Left */}
        {type === 'TurnLeft' && <div style={{...handleBaseStyle, left: offsetPx}}></div>}

        {/* TiltTurnRight: Handle Right */}
        {type === 'TiltTurnRight' && <div style={{...handleBaseStyle, right: offsetPx}}></div>}

        {/* TiltTurnLeft: Handle Left */}
        {type === 'TiltTurnLeft' && <div style={{...handleBaseStyle, left: offsetPx}}></div>}

        {/* DoorRight: Handle Right */}
        {type === 'DoorRight' && (
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: offsetPx, zIndex: zIndex }}>
                <LeverHandle flip />
            </div>
        )}

        {/* DoorLeft: Handle Left */}
        {type === 'DoorLeft' && (
            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: offsetPx, zIndex: zIndex }}>
                <LeverHandle />
            </div>
        )}

        {/* Sliding Handles - Flat Rect */}
        {type === 'SlidingRight' && (
             <div style={{...handleBaseStyle, right: '2px', height: `${hH*0.8}px`}}></div>
        )}
        {type === 'SlidingLeft' && (
             <div style={{...handleBaseStyle, left: '2px', height: `${hH*0.8}px`}}></div>
        )}
    </>
  );
};