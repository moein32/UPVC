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
const PreviewNode = ({ node }: { node: WindowNode }) => {
  if (node.type === 'container' && node.children) {
    return (
      <div className="flex w-full h-full overflow-hidden" style={{ flexDirection: node.dir === 'col' ? 'column' : 'row' }}>
        {node.children.map((child, idx) => (
          <React.Fragment key={child.id}>
             <div className="relative flex-1 min-w-0 min-h-0">
               <PreviewNode node={child} />
             </div>
             {/* Mullion Divider in Preview */}
             {idx < node.children!.length - 1 && (
               <div className={`bg-slate-200 border-slate-300 relative z-10
                  ${node.dir === 'col' ? 'h-1.5 w-full border-y' : 'w-1.5 h-full border-x'}
               `} />
             )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Leaf with Directional Visuals
  return (
    <div className={`w-full h-full relative ${node.openingType === 'Panel' ? 'bg-slate-100' : 'bg-sky-50'}`}>
       {/* Sash Indication */}
       {node.openingType !== 'Fixed' && node.openingType !== 'Panel' && (
         <div className="absolute inset-0 border-[4px] border-white shadow-sm pointer-events-none">
             <div className="absolute inset-0 border border-slate-300/30"></div>
             {/* Door Kickplate Preview */}
             {node.openingType?.includes('Door') && (
                 <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-slate-100 border-t border-slate-200"></div>
             )}
         </div>
       )}
       
       {node.openingType === 'Panel' && (
           <div className="absolute inset-0 flex items-center justify-center opacity-10">
                {/* Minimal vertical lines for panel */}
                <div className="h-full w-px bg-black mx-1"></div>
                <div className="h-full w-px bg-black mx-1"></div>
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
             return <div className="absolute bottom-1 right-1 text-[8px] bg-white/80 px-1 rounded font-bold">L</div>;
        case 'DoorRight':
             return <div className="absolute bottom-1 right-1 text-[8px] bg-white/80 px-1 rounded font-bold">R</div>;
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
      className={`relative bg-white border-2 border-slate-600 shadow-sm overflow-hidden ${className}`}
      style={{ 
        width: displayWidth, 
        height: displayHeight,
        borderRadius: '4px'
      }}
    >
      <div className="absolute inset-0 z-10">
        {config.layout ? (
           <PreviewNode node={config.layout} />
        ) : (
           <div className="w-full h-full flex items-center justify-center text-xs text-slate-300">Empty</div>
        )}
      </div>
    </div>
  );
};