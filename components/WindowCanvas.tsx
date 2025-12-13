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
}

// Engineering Style Dimension Line (Arrows)
const DimensionLine = ({ length, orientation, label, position }: { length: number, orientation: 'h' | 'v', label: number, position: 'start' | 'end' | 'center' }) => {
    const isH = orientation === 'h';
    return (
        <div className={`absolute flex items-center justify-center pointer-events-none z-40
            ${isH ? 'h-8' : 'w-8'}
            ${isH ? 'flex-row' : 'flex-col'}
        `}
        style={{
            [isH ? 'width' : 'height']: '100%',
            [isH ? (position === 'start' ? 'top' : 'bottom') : (position === 'start' ? 'left' : 'right')]: '-40px',
            [isH ? 'left' : 'top']: 0
        }}
        >
            {/* The Line */}
            <div className={`bg-black ${isH ? 'h-[1px] w-full' : 'w-[1px] h-full'}`}></div>
            
            {/* Start Arrow (Classic filled triangle) */}
            <div className={`absolute bg-black
                ${isH ? 'left-0' : 'top-0'}
            `}
            style={{
                [isH ? 'clipPath' : 'clipPath']: isH ? 'polygon(100% 0, 0 50%, 100% 100%)' : 'polygon(0 100%, 50% 0, 100% 100%)',
                width: isH ? '8px' : '6px',
                height: isH ? '6px' : '8px',
                [isH ? 'marginTop' : 'marginLeft']: isH ? '-2px' : '-2px',
                [isH ? 'marginLeft' : 'marginTop']: '0px'
            }}
            ></div>

            {/* End Arrow */}
            <div className={`absolute bg-black
                ${isH ? 'right-0' : 'bottom-0'}
            `}
            style={{
                [isH ? 'clipPath' : 'clipPath']: isH ? 'polygon(0 0, 100% 50%, 0 100%)' : 'polygon(0 0, 50% 100%, 100% 0)',
                width: isH ? '8px' : '6px',
                height: isH ? '6px' : '8px',
                [isH ? 'marginTop' : 'marginLeft']: isH ? '-2px' : '-2px',
            }}
            ></div>

            {/* Label */}
            <div className={`absolute bg-white px-1 text-[11px] font-bold text-black border border-gray-300 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.1)] z-50
                 ${isH ? '-top-3.5' : '-left-5 -rotate-90 origin-center'}
            `}>
                {toPersianDigits(Math.round(label))}
            </div>
        </div>
    )
}

export const WindowCanvas = ({ node, selectedId, onSelect, onUpdateNode, width, height, depth = 0, isRoot = false }: Props) => {
  const isSelected = selectedId === node.id;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
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
    e.preventDefault();
    if (node.type === 'leaf') {
        setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
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

  const ContainerWrapper = ({ children }: {children: React.ReactNode}) => {
      if (isRoot) {
          const FRAME_THICKNESS = 12;
          return (
              <div className="relative w-full h-full p-12 bg-transparent select-none">
                  {/* Top Dimension */}
                  <div className="absolute top-0 left-12 right-12 h-10">
                       <DimensionLine length={width} orientation="h" label={width} position="start" />
                  </div>
                  {/* Left Dimension */}
                  <div className="absolute left-0 top-12 bottom-12 w-10">
                       <DimensionLine length={height} orientation="v" label={height} position="start" />
                  </div>
                  
                  {/* Frame Visual */}
                  <div className="relative w-full h-full bg-white shadow-xl">
                      {/* Outer Frame Border */}
                      <div className="absolute inset-0 border border-gray-400 bg-gray-50"></div>
                      
                      {/* Inner Area (Window Content) */}
                      <div className="absolute inset-[12px] bg-white border border-gray-400 overflow-hidden">
                          {children}
                      </div>

                      {/* Miter Lines (Corners) */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                          <line x1="0" y1="0" x2="12" y2="12" stroke="#9ca3af" strokeWidth="1" />
                          <line x1="100%" y1="0" x2="calc(100% - 12px)" y2="12" stroke="#9ca3af" strokeWidth="1" />
                          <line x1="0" y1="100%" x2="12" y2="calc(100% - 12px)" stroke="#9ca3af" strokeWidth="1" />
                          <line x1="100%" y1="100%" x2="calc(100% - 12px)" y2="calc(100% - 12px)" stroke="#9ca3af" strokeWidth="1" />
                      </svg>
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
            className="flex w-full h-full relative bg-white border border-gray-400 box-border" 
            style={{ 
              flexDirection: node.dir === 'col' ? 'column' : 'row',
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(node.id);
            }}
          >
            {/* Sash Frame Overlay for Containers */}
            {node.openingType && node.openingType !== 'Fixed' && (
                <div className="absolute inset-0 z-30 pointer-events-none">
                    <div className="absolute inset-0 border-[14px] border-white shadow-[inset_0_0_2px_rgba(0,0,0,0.2)]">
                       <div className="absolute inset-0 border border-gray-300"></div>
                    </div>
                     <div className="absolute inset-0 flex items-center justify-center">
                        {renderOpeningSymbol(node.openingType)}
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
                    width={node.dir === 'row' ? width * ((child.flex || 1) / node.children!.reduce((a,b) => a + (b.flex||1), 0)) : width}
                    height={node.dir === 'col' ? height * ((child.flex || 1) / node.children!.reduce((a,b) => a + (b.flex||1), 0)) : height}
                    depth={depth + 1}
                  />
                </div>
                
                {/* Mullion (Divider) */}
                {index < node.children.length - 1 && (
                  <div 
                    className={`relative z-20 flex items-center justify-center bg-white border-gray-300 transition-colors group/resizer
                      ${node.dir === 'col' ? 'h-3 w-full cursor-row-resize border-y border-y-gray-400' : 'w-3 h-full cursor-col-resize border-x border-x-gray-400'}
                      hover:bg-blue-50 hover:border-blue-400
                    `}
                    onMouseDown={(e) => handleResizeStart(e, index)}
                    onTouchStart={(e) => handleResizeStart(e, index)}
                  >
                     <div className={`bg-gray-400 rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity
                        ${node.dir === 'col' ? 'w-8 h-1' : 'w-1 h-8'}
                     `} />
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
        onSelect(node.id);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        w-full h-full relative cursor-pointer group transition-all duration-200 overflow-hidden border border-gray-400 box-border
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
         // Glass Background - Light Blue Solidish to match reference
         <div className="absolute inset-0 bg-[#e0f7fa]">
            <div className="absolute -inset-full top-0 block h-full w-full -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-40 transform translate-x-full" />
        </div>
      )}

      {/* Sash Frame */}
      {node.openingType !== 'Fixed' && node.openingType !== 'Panel' && (
        <div className="absolute inset-0 border-[14px] border-white shadow-[inset_0_0_2px_rgba(0,0,0,0.2)] pointer-events-none">
           <div className="absolute inset-0 border border-gray-300"></div>
        </div>
      )}

      {/* Opening Indicators */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {renderOpeningSymbol(node.openingType)}
      </div>

      {/* Internal Dimensions Overlay - Simple Text */}
      {width > 80 && height > 60 && (
          <div className="absolute inset-0 pointer-events-none z-10 opacity-100">
             {/* Width */}
             <div className="absolute top-2 left-0 right-0 flex justify-center">
                 <span className="text-[10px] font-medium text-black bg-white/50 px-1 rounded">{toPersianDigits(Math.round(width))}</span>
             </div>
             {/* Height */}
             <div className="absolute left-2 top-0 bottom-0 flex items-center">
                 <span className="text-[10px] font-medium text-black bg-white/50 px-1 rounded -rotate-90">{toPersianDigits(Math.round(height))}</span>
             </div>
          </div>
      )}

      {/* Selection Label */}
      {isSelected && (
        <div className="absolute top-1 right-1 bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded shadow-sm z-20">
          انتخاب
        </div>
      )}
    </div>
    </ContainerWrapper>
  );
};

// Fixed Logic for Opening Indicators
const renderOpeningSymbol = (type?: OpeningDirection) => {
  // Reference uses thin blue lines
  const strokeColor = "stroke-blue-700";
  const strokeWidth = "1.5";
  const dashedStroke = "4 4";
  
  switch (type) {
    case 'TurnLeft': // Point <
       return (
        <div className="relative w-full h-full p-4">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M100,0 L0,50 L100,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
             </svg>
             <ModernHandle position="left" />
        </div>
      );
    case 'TurnRight': // Point >
      return (
        <div className="relative w-full h-full p-4">
             <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0,0 L100,50 L0,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
            </svg>
            <ModernHandle position="right" />
        </div>
      );
    case 'TiltTurnLeft': 
        return (
         <div className="relative w-full h-full p-4">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M100,0 L0,50 L100,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
                <path d="M0,100 L50,0 L100,100" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray={dashedStroke} className={strokeColor} opacity="0.6" vectorEffect="non-scaling-stroke"/>
            </svg>
            <ModernHandle position="left" />
         </div>
       );
    case 'TiltTurnRight': 
       return (
        <div className="relative w-full h-full p-4">
             <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0,0 L100,50 L0,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
                 <path d="M0,100 L50,0 L100,100" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray={dashedStroke} className={strokeColor} opacity="0.6" vectorEffect="non-scaling-stroke"/>
             </svg>
             <ModernHandle position="right" />
        </div>
      );
    case 'SlidingLeft':
        return <div className="w-full h-full flex items-center justify-center text-black text-2xl font-bold">←</div>;
    case 'SlidingRight':
        return <div className="w-full h-full flex items-center justify-center text-black text-2xl font-bold">→</div>;
    case 'DoorLeft':
        return (
             <div className="relative w-full h-full p-4 pb-12">
                 <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                     <path d="M100,0 L0,50 L100,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
                 </svg>
                 <ModernHandle position="left" isDoor />
            </div>
        );
    case 'DoorRight':
        return (
            <div className="relative w-full h-full p-4 pb-12">
                 <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                     <path d="M0,0 L100,50 L0,100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={strokeColor} vectorEffect="non-scaling-stroke"/>
                 </svg>
                 <ModernHandle position="right" isDoor />
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
        <div className={`bg-white rounded-sm border border-gray-400 shadow-sm ${isDoor ? 'w-2 h-10' : 'w-1.5 h-6'}`}></div>
    </div>
);