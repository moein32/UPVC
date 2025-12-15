import React from 'react';
import { WindowConfig } from '../types';
import { WindowCanvas } from './WindowCanvas';

interface Props {
  config: WindowConfig;
  width?: string;
  height?: string;
  className?: string;
}

export const WindowPreview = ({ config, width, height, className = '' }: Props) => {
  const displayWidth = width || '100%';
  const displayHeight = height || '100%';

  // Calculate Aspect Ratio to preserve shape regardless of container
  // We use a safe default if dimensions are 0
  const ratio = (config.width > 0 && config.height > 0) ? (config.width / config.height) : 1;

  return (
    <div 
      className={`relative flex flex-col items-center justify-center ${className}`}
      style={{ 
        width: displayWidth, 
        height: displayHeight,
      }}
    >
        {/* We use a container that fits within the parent but maintains the window's Aspect Ratio */}
        <div 
            className="relative flex items-center justify-center"
            style={{ 
                aspectRatio: `${ratio}`, 
                maxHeight: '100%', 
                maxWidth: '100%',
                height: 'auto',
                width: 'auto',
                minWidth: '60%', // Ensure it doesn't get too small if very tall
                minHeight: '60%' // Ensure it doesn't get too small if very wide
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
                    // Change: Use realistic style (isThumbnail=false) but hide dimensions and scale down borders
                    isThumbnail={false} 
                    showDimensions={false}
                    scale={0.35} // Scale down borders/handles for preview
                />
            )}
        </div>
    </div>
  );
};