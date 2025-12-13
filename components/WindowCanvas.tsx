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
}

export const WindowCanvas = ({ node, selectedId, onSelect, onUpdateNode, width, height, depth = 0 }: Props) => {
  const isSelected = selectedId === node.id;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // --- Resize Handler ---
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

  // --- Drop Handlers ---
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
            
            // Create new children based on split count
            const newChildren = Array(count).fill(null).map((_, i) => ({
                id: Date.now() + `_${i}_${Math.random()}`, 
                type: 'leaf', 
                openingType: node.openingType === 'Panel' ? 'Fixed' : node.openingType || 'Fixed', // Reset Panel, otherwise inherit
                flex: 1 
            })) as WindowNode[];

            onUpdateNode(node.id, { 
                type: 'container', 
                dir: dir, 
                children: newChildren, 
                // If it was a door, keep it on the container
                openingType: (node.openingType && node.openingType !== 'Fixed' && node.openingType !== 'Panel') ? node.openingType : undefined
            });
            onSelect(node.id); 
        }
    }
  };

  // Render Container (Split)
  if (node.type === 'container' && node.children) {
    return (
      <div 
        ref={containerRef}
        className="flex w-full h-full relative bg-white" 
        style={{ 
          flexDirection: node.dir === 'col' ? 'column' : 'row',
        }}
        onClick={(e) => {
             e.stopPropagation();
             onSelect(node.id);
        }}
      >
        {/* Render Sash Frame Overlay for Containers (e.g., Door with Panel inside) */}
        {node.openingType && node.openingType !== 'Fixed' && (
             <div className="absolute inset-0 z-30 pointer-events-none">
                <div className="absolute inset-0 border-[12px] border-white shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]">
                   <div className="absolute inset-0 border border-slate-300/50"></div>
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
                className={`relative z-20 flex items-center justify-center bg-slate-100 border border-slate-300 shadow-sm transition-colors group/resizer
                  ${node.dir === 'col' ? 'h-3 w-full cursor-row-resize border-y' : 'w-3 h-full cursor-col-resize border-x'}
                  hover:bg-blue-50 hover:border-blue-300
                `}
                onMouseDown={(e) => handleResizeStart(e, index)}
                onTouchStart={(e) => handleResizeStart(e, index)}
              >
                 <div className={`bg-slate-400/50 rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity
                    ${node.dir === 'col' ? 'w-8 h-1' : 'w-1 h-8'}
                 `} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Render Leaf (Actual Window Section)
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        w-full h-full relative cursor-pointer group transition-all duration-200 overflow-hidden
        ${isSelected ? 'ring-4 ring-inset ring-orange-400 z-10' : ''}
        ${isDragOver ? 'bg-green-100/50 ring-4 ring-inset ring-green-500' : ''}
      `}
    >
      
      {node.openingType === 'Panel' ? (
        // New Distinct Panel Visual
        <div className="absolute inset-0 bg-slate-200 border-[8px] border-slate-300 shadow-inner">
             {/* 3D Molded Look */}
             <div className="absolute inset-0 border-t-4 border-l-4 border-white/40 border-b-4 border-r-4 border-slate-400/20"></div>
             
             {/* Texture */}
            <div className="w-full h-full flex justify-around opacity-20">
                <div className="w-px h-full bg-slate-400"></div>
                <div className="w-px h-full bg-slate-400"></div>
            </div>
        </div>
      ) : (
         // Glass Background
         <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-sky-100/80">
            {/* Reflection */}
            <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 transform translate-x-full" />
        </div>
      )}

      {/* Sash Frame (If not fixed, not panel, and not container) */}
      {/* Note: If node is a leaf, it only has openingType if it wasn't split. */}
      {node.openingType !== 'Fixed' && node.openingType !== 'Panel' && (
        <div className="absolute inset-0 border-[12px] border-white shadow-[inset_0_0_10px_rgba(0,0,0,0.1)] pointer-events-none">
           <div className="absolute inset-0 border border-slate-300/50"></div>
           {/* No automatic kickplate here anymore, user adds panel manually */}
        </div>
      )}

      {/* Opening Indicators */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {renderOpeningSymbol(node.openingType)}
      </div>

      {/* Dimensions Overlay - Always Visible for both Glass and Panel */}
      {width > 60 && height > 40 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-[2px] px-2 py-1 rounded-md border border-slate-300/50 pointer-events-none z-10 whitespace-nowrap flex flex-col items-center justify-center shadow-sm">
             <span className="text-[11px] font-extrabold text-slate-900 leading-none">{toPersianDigits(Math.round(width))}</span>
             <div className="w-full h-px bg-slate-400/50 my-0.5"></div>
             <span className="text-[11px] font-extrabold text-slate-900 leading-none">{toPersianDigits(Math.round(height))}</span>
          </div>
      )}

      {/* Selection Label */}
      {isSelected && (
        <div className="absolute top-1 right-1 bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded shadow-sm z-20">
          انتخاب
        </div>
      )}
    </div>
  );
};

// Fixed Logic for Opening Indicators - Swapped back to Left (<) for TurnLeft
const renderOpeningSymbol = (type?: OpeningDirection) => {
  const strokeColor = "stroke-slate-800";
  const strokeWidth = "1.5";
  const dashedStroke = "3 3";
  
  switch (type) {
    case 'TurnLeft': // Turn Left -> Points Left (<). Handle Left.
       return (
        <div className="relative w-full h-full p-4">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M100,0 L0,50 L100,100" fill="none" stroke="black" strokeWidth={strokeWidth} className={strokeColor} />
             </svg>
             <ModernHandle position="left" />
        </div>
      );
    case 'TurnRight': // Turn Right -> Points Right (>). Handle Right.
      return (
        <div className="relative w-full h-full p-4">
             <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0,0 L100,50 L0,100" fill="none" stroke="black" strokeWidth={strokeWidth} className={strokeColor} />
            </svg>
            <ModernHandle position="right" />
        </div>
      );
    case 'TiltTurnLeft': // Points Left (<)
        return (
         <div className="relative w-full h-full p-4">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M100,0 L0,50 L100,100" fill="none" stroke="black" strokeWidth={strokeWidth} className={strokeColor} />
                <path d="M0,100 L50,0 L100,100" fill="none" stroke="black" strokeWidth="1" strokeDasharray={dashedStroke} className="opacity-60" />
            </svg>
            <ModernHandle position="left" />
         </div>
       );
    case 'TiltTurnRight': // Points Right (>)
       return (
        <div className="relative w-full h-full p-4">
             <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <path d="M0,0 L100,50 L0,100" fill="none" stroke="black" strokeWidth={strokeWidth} className={strokeColor} />
                 <path d="M0,100 L50,0 L100,100" fill="none" stroke="black" strokeWidth="1" strokeDasharray={dashedStroke} className="opacity-60" />
             </svg>
             <ModernHandle position="right" />
        </div>
      );
    case 'SlidingLeft':
        return (
            <div className="flex items-center gap-2 text-slate-700 font-bold opacity-70">
                <ArrowIcon dir="left" />
            </div>
        );
    case 'SlidingRight':
        return (
            <div className="flex items-center gap-2 text-slate-700 font-bold opacity-70">
                <ArrowIcon dir="right" />
            </div>
        );
    case 'DoorLeft': // Points Left (<)
        return (
             <div className="relative w-full h-full p-4 pb-12">
                 <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                     <path d="M100,0 L0,50 L100,100" fill="none" stroke="black" strokeWidth={strokeWidth} className={strokeColor} />
                 </svg>
                 <ModernHandle position="left" isDoor />
            </div>
        );
    case 'DoorRight': // Points Right (>)
        return (
            <div className="relative w-full h-full p-4 pb-12">
                 <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                     <path d="M0,0 L100,50 L0,100" fill="none" stroke="black" strokeWidth={strokeWidth} className={strokeColor} />
                 </svg>
                 <ModernHandle position="right" isDoor />
            </div>
        );
    case 'Panel':
      return null;
    default: 
      return null;
  }
};

const ModernHandle = ({ position, isDoor }: { position: 'left' | 'right', isDoor?: boolean }) => (
    <div className={`absolute top-1/2 z-20 drop-shadow-md
        ${position === 'left' ? 'left-2' : 'right-2'}
        ${isDoor ? '-translate-y-4' : '-translate-y-1/2'}
    `}>
        <div className={`bg-slate-200 rounded-sm border border-slate-300 ${isDoor ? 'w-2 h-10' : 'w-1.5 h-6'}`}></div>
        <div className={`absolute top-2 bg-slate-100 border border-slate-300 rounded-sm
             ${position === 'left' ? 'left-1' : 'right-1 origin-right'}
             ${isDoor ? 'w-12 h-3' : 'w-8 h-2'}
        `}></div>
    </div>
);

const ArrowIcon = ({ dir }: { dir: 'left' | 'right' }) => (
    <div className={`p-2 bg-white/50 rounded-full border border-slate-400 ${dir === 'left' ? '' : 'rotate-180'}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
    </div>
);
