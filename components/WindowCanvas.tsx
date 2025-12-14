import React, { useRef, useState } from 'react';
import { WindowNode, OpeningDirection } from '../types';
import { toPersianDigits } from '../utils/formatting';

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
}

// Engineering Style Dimension Line
const DimensionLine = ({ 
    length, 
    orientation, 
    label, 
    position, 
    offset = 0,
    onClick,
    isSegment = false
}: { 
    length: number, 
    orientation: 'h' | 'v', 
    label: number, 
    position: 'start' | 'end' | 'center', 
    offset?: number,
    onClick?: () => void,
    isSegment?: boolean
}) => {
    const isH = orientation === 'h';
    // Adjusted offsets for tighter, standard technical drawing look
    // Segments are closer to the object (15px), Total is further out (45px)
    // We use positive values assuming alignment to the "inner" edge (end)
    const baseOffset = isSegment ? 10 : 40; 
    const totalOffset = baseOffset + (offset * 25);

    return (
        <div className={`absolute flex items-center justify-center z-40 select-none pointer-events-none
            ${isH ? 'h-8' : 'w-8'}
            ${isH ? 'flex-row' : 'flex-col'}
        `}
        style={{
            [isH ? 'width' : 'height']: '100%',
            // Align to 'bottom' or 'right' to measure from the frame outwards
            [isH ? (position === 'start' ? 'top' : 'bottom') : (position === 'start' ? 'left' : 'right')]: `${totalOffset}px`,
            [isH ? 'left' : 'top']: 0
        }}
        >
            {/* The Main Line */}
            <div className={`bg-slate-800 absolute ${isH ? 'h-[1px] left-0 right-0 top-1/2' : 'w-[1px] top-0 bottom-0 left-1/2'}`}></div>
            
            {/* Start Tick/Arrow */}
            <div className={`absolute bg-slate-800
                ${isH ? 'left-0 h-2 w-[1px] top-1/2 -translate-y-1/2' : 'top-0 w-2 h-[1px] left-1/2 -translate-x-1/2'}
            `}></div>

             {/* End Tick/Arrow */}
             <div className={`absolute bg-slate-800
                ${isH ? 'right-0 h-2 w-[1px] top-1/2 -translate-y-1/2' : 'bottom-0 w-2 h-[1px] left-1/2 -translate-x-1/2'}
            `}></div>

            {/* Label Badge */}
            <div 
                onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
                className={`bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-900 border border-slate-300 rounded shadow-sm hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 cursor-pointer transition-all z-50 pointer-events-auto
                 ${isH ? '-translate-y-[8px]' : '-rotate-90 origin-center translate-x-[-8px]'}
            `}>
                {toPersianDigits(Math.round(label))}
            </div>
        </div>
    )
}

export const WindowCanvas = ({ 
  node, selectedId, onSelect, onUpdateNode, width, height, 
  depth = 0, isRoot = false, onDimensionEdit, onChildResize, 
  readOnly = false, isThumbnail = false 
}: Props) => {
  const isSelected = !readOnly && selectedId === node.id;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Determine styles based on mode (Editor vs Thumbnail)
  const frameBorderWidth = isThumbnail ? '3px' : '12px';
  const sashBorderWidth = isThumbnail ? '4px' : '14px';
  const frameBorderColor = isThumbnail ? 'border-slate-700' : 'border-slate-100'; // Darker for print visibility
  const frameOutline = isThumbnail ? '' : 'outline outline-1 outline-slate-400';
  const innerBorder = isThumbnail ? 'border-slate-400' : 'border-slate-400';
  const mullionColor = isThumbnail ? 'bg-slate-700' : 'bg-slate-100';
  const sashColor = isThumbnail ? 'border-slate-600' : 'border-white';
  const sashInnerBorder = isThumbnail ? 'border-slate-400' : 'border-gray-300';

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
    if (node.type === 'leaf') {
        setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

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

  const ContainerWrapper = ({ children }: {children?: React.ReactNode}) => {
      if (isRoot) {
          if (isThumbnail) {
               // Minimal Wrapper for Invoice/Thumbnail
               return (
                  <div className="relative w-full h-full">
                       <div className={`absolute inset-0 bg-white border-[${frameBorderWidth}] ${frameBorderColor}`}></div>
                       <div className={`absolute inset-[${frameBorderWidth}] bg-white border ${innerBorder} overflow-hidden`}>
                          {children}
                       </div>
                  </div>
               )
          }

          // Full Editor Wrapper with Dimensions
          // Reduced padding to 14 (56px) for tighter fit
          return (
              <div className="relative w-full h-full p-14 bg-transparent select-none">
                  {/* Global Dimensions */}
                  <div className="absolute top-0 left-14 right-14 h-14">
                       <DimensionLine 
                            length={width} 
                            orientation="h" 
                            label={width} 
                            position="end" // Align to bottom (near frame)
                            onClick={() => onDimensionEdit && onDimensionEdit('w', width)}
                       />
                  </div>
                  <div className="absolute left-0 top-14 bottom-14 w-14">
                       <DimensionLine 
                            length={height} 
                            orientation="v" 
                            label={height} 
                            position="end" // Align to right (near frame)
                            onClick={() => onDimensionEdit && onDimensionEdit('h', height)}
                       />
                  </div>

                  {/* Child Segment Dimensions */}
                  {node.type === 'container' && node.children && (
                      <>
                        {node.dir === 'row' ? (
                            <div className="absolute top-0 left-14 right-14 h-14 flex">
                                {node.children.map((child, idx) => {
                                    const totalFlex = node.children!.reduce((sum, c) => sum + (c.flex || 1), 0);
                                    const childW = width * ((child.flex || 1) / totalFlex);
                                    return (
                                        <div key={child.id} style={{ flex: child.flex || 1 }} className="relative h-full">
                                            <DimensionLine 
                                                length={childW} 
                                                orientation="h" 
                                                label={childW} 
                                                position="end" // Align to bottom (near frame)
                                                isSegment
                                                onClick={() => onChildResize && onChildResize(node.id, idx, childW, width)}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                             <div className="absolute left-0 top-14 bottom-14 w-14 flex flex-col">
                                {node.children.map((child, idx) => {
                                    const totalFlex = node.children!.reduce((sum, c) => sum + (c.flex || 1), 0);
                                    const childH = height * ((child.flex || 1) / totalFlex);
                                    return (
                                        <div key={child.id} style={{ flex: child.flex || 1 }} className="relative w-full">
                                            <DimensionLine 
                                                length={childH} 
                                                orientation="v" 
                                                label={childH} 
                                                position="end" // Align to right (near frame)
                                                isSegment
                                                onClick={() => onChildResize && onChildResize(node.id, idx, childH, height)}
                                            />
                                        </div>
                                    )
                                })}
                             </div>
                        )}
                      </>
                  )}
                  
                  {/* Frame Visual */}
                  <div className="relative w-full h-full shadow-xl">
                      <div className={`absolute inset-0 bg-white border-[${frameBorderWidth}] ${frameBorderColor} ${frameOutline}`}></div>
                      <div className={`absolute inset-[${frameBorderWidth}] bg-white border ${innerBorder} overflow-hidden`}>
                          {children}
                      </div>
                  </div>
              </div>
          )
      }
      return <>{children}</>;
  }

  // Render Container (Split)
  if (node.type === 'container' && node.children) {
    return (
      <ContainerWrapper>
          <div 
            ref={containerRef}
            className={`flex w-full h-full relative bg-white border ${innerBorder} box-border`}
            style={{ 
              flexDirection: node.dir === 'col' ? 'column' : 'row',
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (!readOnly) onSelect(node.id);
            }}
          >
            {/* Sash Frame Overlay for Containers */}
            {node.openingType && node.openingType !== 'Fixed' && (
                <div className="absolute inset-0 z-30 pointer-events-none">
                    <div className={`absolute inset-0 border-[${sashBorderWidth}] ${sashColor} shadow-[inset_0_0_2px_rgba(0,0,0,0.2)]`}>
                       <div className={`absolute inset-0 border ${sashInnerBorder}`}></div>
                    </div>
                     <div className="absolute inset-0 flex items-center justify-center">
                        {renderOpeningSymbol(node.openingType, isThumbnail)}
                     </div>
                 </div>
            )}

            {node.children.map((child, index) => (
              <React.Fragment key={child.id}>
                <div 
                    className="relative min-w-0 min-h-0 flex flex-col"
                    style={{ flex: child.flex || 1 }}
                >
                  <WindowCanvas 
                    node={child} 
                    selectedId={selectedId} 
                    onSelect={onSelect}
                    onUpdateNode={onUpdateNode}
                    onChildResize={onChildResize} 
                    width={node.dir === 'row' ? width * ((child.flex || 1) / node.children!.reduce((a,b) => a + (b.flex||1), 0)) : width}
                    height={node.dir === 'col' ? height * ((child.flex || 1) / node.children!.reduce((a,b) => a + (b.flex||1), 0)) : height}
                    depth={depth + 1}
                    readOnly={readOnly}
                    isThumbnail={isThumbnail}
                  />
                </div>
                
                {/* Mullion */}
                {index < node.children.length - 1 && (
                  <div 
                    className={`relative z-20 flex items-center justify-center ${mullionColor} border-gray-400 transition-colors group/resizer
                      ${node.dir === 'col' ? 'h-3 w-full border-y' : 'w-3 h-full border-x'}
                      ${!readOnly ? (node.dir === 'col' ? 'cursor-row-resize' : 'cursor-col-resize') : ''}
                      ${!readOnly && !isThumbnail ? 'hover:bg-blue-100 hover:border-blue-400' : ''}
                      ${isThumbnail && node.dir === 'col' ? '!h-[2px] !border-none' : ''}
                      ${isThumbnail && node.dir === 'row' ? '!w-[2px] !border-none' : ''}
                    `}
                    onMouseDown={(e) => !readOnly && handleResizeStart(e, index)}
                    onTouchStart={(e) => !readOnly && handleResizeStart(e, index)}
                  >
                     {/* Grip handle - Hide in thumbnail */}
                     {!isThumbnail && (
                        <div className={`bg-gray-300 rounded-full
                            ${node.dir === 'col' ? 'w-4 h-1' : 'w-1 h-4'}
                        `} />
                     )}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
      </ContainerWrapper>
    );
  }

  // Render Leaf
  return (
    <ContainerWrapper>
    <div 
      onClick={(e) => {
        e.stopPropagation();
        if (!readOnly) onSelect(node.id);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        w-full h-full relative group transition-all duration-200 overflow-hidden border ${innerBorder} box-border
        ${!readOnly ? 'cursor-pointer' : ''}
        ${isSelected ? 'ring-2 ring-inset ring-orange-500 z-10' : ''}
        ${isDragOver ? 'bg-green-100/50 ring-2 ring-inset ring-green-500' : ''}
      `}
    >
      
      {node.openingType === 'Panel' ? (
        // Panel Visual
        <div className="absolute inset-0 bg-white">
             <div className="absolute inset-0 border-t-[8px] border-l-[8px] border-gray-50 border-b-[8px] border-r-[8px] border-gray-200"></div>
             <div className="absolute inset-2 bg-gray-100 shadow-inner">
                 <div className="w-full h-full opacity-10" 
                      style={{ 
                          backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.5) 50%)',
                          backgroundSize: '20px 100%'
                      }}>
                 </div>
             </div>
        </div>
      ) : (
         // Glass Background
         <div className={`absolute inset-0 ${isThumbnail ? 'bg-white' : 'bg-[#e0f7fa]/50'}`}>
             {!isThumbnail && (
                 <div className="absolute -inset-full top-0 block h-full w-full -skew-x-12 bg-gradient-to-r from-transparent to-white/40 opacity-40 transform translate-x-full" />
             )}
        </div>
      )}

      {/* Sash Frame */}
      {node.openingType !== 'Fixed' && node.openingType !== 'Panel' && (
        <div className="absolute inset-0 pointer-events-none">
            <div className={`absolute inset-0 border-[${sashBorderWidth}] ${sashColor} shadow-[inset_0_0_2px_rgba(0,0,0,0.2)]`}>
               <div className={`absolute inset-0 border ${sashInnerBorder}`}></div>
            </div>
        </div>
      )}

      {/* Opening Indicators */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {renderOpeningSymbol(node.openingType, isThumbnail)}
      </div>

      {/* Selection Label */}
      {isSelected && !isThumbnail && (
        <div className="absolute top-1 right-1 bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded shadow-sm z-20">
          انتخاب
        </div>
      )}
    </div>
    </ContainerWrapper>
  );
};

// Clean technical opening symbols
const renderOpeningSymbol = (type?: OpeningDirection, isThumbnail?: boolean) => {
  const strokeColor = isThumbnail ? "stroke-slate-900" : "stroke-blue-600";
  const strokeWidth = isThumbnail ? "1.5" : "1";
  const dashedStroke = "4 4";
  
  switch (type) {
    case 'TurnLeft': 
       return (
        <div className="relative w-full h-full p-6">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M100,0 L0,50 L100,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
             </svg>
             {!isThumbnail && <ModernHandle position="left" />}
        </div>
      );
    case 'TurnRight':
      return (
        <div className="relative w-full h-full p-6">
             <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0,0 L100,50 L0,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
            </svg>
            {!isThumbnail && <ModernHandle position="right" />}
        </div>
      );
    case 'TiltTurnLeft': 
        return (
         <div className="relative w-full h-full p-6">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M100,0 L0,50 L100,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
                <path d="M0,100 L50,0 L100,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={dashedStroke} className={strokeColor} opacity="0.5" vectorEffect="non-scaling-stroke"/>
            </svg>
            {!isThumbnail && <ModernHandle position="left" />}
         </div>
       );
    case 'TiltTurnRight': 
       return (
        <div className="relative w-full h-full p-6">
             <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0,0 L100,50 L0,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
                 <path d="M0,100 L50,0 L100,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={dashedStroke} className={strokeColor} opacity="0.5" vectorEffect="non-scaling-stroke"/>
             </svg>
             {!isThumbnail && <ModernHandle position="right" />}
        </div>
      );
    case 'SlidingLeft':
        return <div className={`w-full h-full flex items-center justify-center ${isThumbnail ? 'text-slate-900' : 'text-slate-800'} text-2xl font-bold`}>←</div>;
    case 'SlidingRight':
        return <div className={`w-full h-full flex items-center justify-center ${isThumbnail ? 'text-slate-900' : 'text-slate-800'} text-2xl font-bold`}>→</div>;
    case 'DoorLeft':
        return (
             <div className="relative w-full h-full p-6 pb-12">
                 <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                     <path d="M100,0 L0,50 L100,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
                 </svg>
                 {!isThumbnail && <ModernHandle position="left" isDoor />}
            </div>
        );
    case 'DoorRight':
        return (
            <div className="relative w-full h-full p-6 pb-12">
                 <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                     <path d="M0,0 L100,50 L0,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
                 </svg>
                 {!isThumbnail && <ModernHandle position="right" isDoor />}
            </div>
        );
    default: return null;
  }
};

const ModernHandle = ({ position, isDoor }: { position: 'left' | 'right', isDoor?: boolean }) => (
    <div className={`absolute top-1/2 z-20 drop-shadow-sm
        ${position === 'left' ? 'left-2' : 'right-2'}
        ${isDoor ? '-translate-y-4' : '-translate-y-1/2'}
    `}>
        <div className={`bg-white rounded-sm border border-gray-400 shadow-sm ${isDoor ? 'w-2 h-10' : 'w-1 h-6'}`}></div>
    </div>
);