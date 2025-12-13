import React from 'react';
import { WindowConfig, WindowNode, OpeningDirection } from '../types';
import { toPersianDigits } from '../utils/formatting';

interface Props {
  config: WindowConfig;
  width?: string;
  height?: string;
  className?: string;
}

// Recursive Minimal Renderer for Preview
const PreviewNode = ({ node, level = 0 }: { node: WindowNode, level?: number }) => {
  if (node.type === 'container' && node.children) {
    return (
      <div className="flex w-full h-full relative" style={{ flexDirection: node.dir === 'col' ? 'column' : 'row' }}>
         {/* Sash Frame Overlay for Containers */}
         {node.openingType && node.openingType !== 'Fixed' && (
             <div className="absolute inset-0 z-30 pointer-events-none">
                <div className="absolute inset-0 border-[4px] border-white shadow-[inset_0_0_5px_rgba(0,0,0,0.1)]">
                   <div className="absolute inset-0 border border-slate-300/50"></div>
                </div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    {renderPreviewSymbol(node.openingType)}
                 </div>
             </div>
        )}

        {node.children.map((child, idx) => (
          <React.Fragment key={child.id}>
             <div className="relative flex-1 min-w-0 min-h-0">
               <PreviewNode node={child} level={level + 1} />
             </div>
             {/* Mullion Divider in Preview */}
             {idx < node.children!.length - 1 && (
               <div className={`bg-slate-200 border-slate-300 relative z-10
                  ${node.dir === 'col' ? 'h-1 w-full border-y' : 'w-1 h-full border-x'}
               `} />
             )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Leaf with Directional Visuals
  return (
    <div className={`w-full h-full relative`}>
       
       {node.openingType === 'Panel' ? (
        // Panel Preview
        <div className="absolute inset-0 bg-white">
             <div className="absolute inset-0 border-t-[2px] border-l-[2px] border-slate-50 border-b-[2px] border-r-[2px] border-slate-200"></div>
             <div className="absolute inset-1 bg-slate-100 shadow-inner">
                 <div className="w-full h-full opacity-20" 
                      style={{ 
                          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.2) 11px, transparent 12px)' 
                      }}>
                 </div>
             </div>
        </div>
      ) : (
         // Glass Background
         <div className="absolute inset-0 bg-sky-50">
             <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-white opacity-30 transform translate-x-full" />
         </div>
      )}

       {/* Sash Indication */}
       {node.openingType !== 'Fixed' && node.openingType !== 'Panel' && (
         <div className="absolute inset-0 border-[2px] border-white shadow-sm pointer-events-none">
             <div className="absolute inset-0 border border-slate-300/30"></div>
         </div>
       )}

       {/* Directional Lines */}
       <div className="absolute inset-0 opacity-60">
           {renderPreviewSymbol(node.openingType)}
       </div>
    </div>
  );
};

const renderPreviewSymbol = (type?: OpeningDirection) => {
    switch (type) {
        case 'TurnLeft': // Points Left <
            return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full"><path d="M100,0 L0,50 L100,100" fill="none" stroke="black" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
        case 'TurnRight': // Points Right >
            return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full"><path d="M0,0 L100,50 L0,100" fill="none" stroke="black" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
        case 'TiltTurnLeft': // Points Left <
            return (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <path d="M100,0 L0,50 L100,100" fill="none" stroke="black" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <path d="M0,100 L50,0 L100,100" fill="none" stroke="black" strokeWidth="1" strokeDasharray="5,5" vectorEffect="non-scaling-stroke" />
                </svg>
            );
        case 'TiltTurnRight': // Points Right >
            return (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <path d="M0,0 L100,50 L0,100" fill="none" stroke="black" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <path d="M0,100 L50,0 L100,100" fill="none" stroke="black" strokeWidth="1" strokeDasharray="5,5" vectorEffect="non-scaling-stroke" />
                </svg>
            );
        case 'SlidingLeft':
            return <div className="w-full h-full flex items-center justify-center text-slate-500 text-lg">←</div>;
        case 'SlidingRight':
            return <div className="w-full h-full flex items-center justify-center text-slate-500 text-lg">→</div>;
        case 'DoorLeft':
             return <div className="absolute bottom-1 right-1 text-[6px] bg-white/80 px-1 rounded font-bold">L</div>;
        case 'DoorRight':
             return <div className="absolute bottom-1 right-1 text-[6px] bg-white/80 px-1 rounded font-bold">R</div>;
        case 'Fixed':
        case 'Panel':
            return null;
        default:
            return null;
    }
}

export const WindowPreview = ({ config, width, height, className = '' }: Props) => {
  const displayWidth = width || '100%';
  const displayHeight = height || '100%';

  return (
    <div 
      className={`relative bg-white overflow-hidden ${className}`}
      style={{ 
        width: displayWidth, 
        height: displayHeight,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center p-2">
         {/* Simple Outer Dimension Lines */}
         <div className="w-full h-full border-l border-t border-black/20 p-1 relative">
             <div className="absolute -top-3 left-0 w-full text-center text-[8px]">{toPersianDigits(config.width)}</div>
             <div className="absolute -left-3 top-0 h-full flex items-center text-[8px] -rotate-90">{toPersianDigits(config.height)}</div>
             
             {/* Main Window Box */}
             <div className="w-full h-full border-2 border-slate-600">
                {config.layout ? (
                   <PreviewNode node={config.layout} />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-xs text-slate-300">Empty</div>
                )}
             </div>
         </div>
      </div>
    </div>
  );
};