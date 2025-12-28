
import React from 'react';
import { WindowConfig } from '../types';
import { WindowCanvas } from './WindowCanvas';

interface Props {
  config: WindowConfig;
  width?: string;
  height?: string;
  className?: string;
  isThumbnail?: boolean;
  scale?: number;
}

export const WindowPreview = ({ config, width, height, className = '', isThumbnail = false, scale = 0.35 }: Props) => {
  const displayWidth = width || '100%';
  const displayHeight = height || '100%';

  // REFERENCE DIMENSION for Proportionality in Invoices
  // We use 2400mm as the standard max height to ensure a door looks like a door 
  // and a smaller window doesn't fill the whole box.
  const REF_DIM = 2400; 

  const wRatio = (config.width / REF_DIM) * 100;
  const hRatio = (config.height / REF_DIM) * 100;
  
  // Real Aspect Ratio for the internal canvas
  const aspectRatio = config.width / config.height;

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ 
        width: displayWidth, 
        height: displayHeight,
      }}
    >
        <div 
            className="relative flex items-center justify-center"
            style={{ 
                width: isThumbnail ? `${wRatio}%` : '100%',
                height: isThumbnail ? `${hRatio}%` : '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                aspectRatio: `${aspectRatio}`,
            }}
        >
            {config.layout && (
                <WindowCanvas 
                    node={config.layout}
                    width={config.width}
                    height={config.height}
                    selectedId={null}
                    onSelect={() => {}}
                    onUpdateNode={() => {}}
                    isRoot={true}
                    readOnly={true}
                    isThumbnail={isThumbnail} 
                    showDimensions={false}
                    scale={scale} 
                    frameType={config.frameType}
                />
            )}
        </div>
    </div>
  );
};
