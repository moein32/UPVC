import { useMemo } from 'react';
import { WindowNode, ProfileBrand, GlassDeductions } from '../types';

export interface GlassSizeResult {
  glassId: string;
  width: number;
  height: number;
  count: number;
  type: 'Fixed' | 'Sash' | 'Sliding';
  label: string;
}

// Helper to determine boundary deductions dynamically based on selected profile ID or names
export function getBoundarySubDynamic(boundary: string, profile: ProfileBrand | undefined): number {
  const brandName = profile?.name?.toLowerCase() || '';
  const brandId = profile?.id?.toLowerCase() || '';
  
  // Checking if the profile is 70mm, 80mm or standard 60mm series
  const isW700 = brandId.includes('w700') || brandName.includes('70') || brandId.includes('exclusive') || brandId.includes('70mm');
  const isW800 = brandId.includes('80mm') || brandName.includes('80');
  
  const f_std = isW800 ? 55 : (isW700 ? 50 : 45);
  const f_renov_net = isW800 ? 48 : (isW700 ? 43 : 38);
  const m_mullion = isW800 ? 52 : (isW700 ? 48 : 42);
  
  switch (boundary) {
    case 'FrameStandard': return f_std;
    case 'FrameRenovation': return f_renov_net;
    case 'Mullion': return m_mullion / 2;
    case 'FrenchMullion': return 4; // Overhang gap / 2 (standard 8mm / 2 = 4mm)
    case 'Threshold': return 20;   // Aluminum door threshold height in mm
    default: return 0;
  }
}

// Pure search helper to fetch mullion thickness based on selected profile
export function getMullionThicknessDynamic(profile: ProfileBrand | undefined): number {
  if (!profile) return 42; // Fallback to current constant
  const brandName = profile.name.toLowerCase();
  const brandId = profile.id.toLowerCase();
  
  if (brandId.includes('w700') || brandName.includes('70') || brandId.includes('exclusive') || brandId.includes('70mm')) {
    return 48; // 70mm series standard mullion visible face
  }
  if (brandId.includes('80mm') || brandName.includes('80')) {
    return 52; // 80mm series standard mullion visible face
  }
  return 42; // Standard 60mm series mullion visible face (M_mullion = 42)
}

/**
 * Dynamic Glass Size Calculation Engine
 * Recursively traverses the layout tree and returns accurate glass sizing list 
 * taking intermediate mullion widths and brand-specific sash deductions into consideration.
 */
export function calculateGlassList(
  rootNode: WindowNode | undefined,
  selectedProfile: ProfileBrand | undefined,
  totalWidth: number,
  totalHeight: number,
  frameType: 'standard' | 'renovation' | 'threshold' = 'standard'
): GlassSizeResult[] {
  if (!rootNode) return [];

  const results: GlassSizeResult[] = [];
  const isRenov = frameType === 'renovation';

  // Extract parameterized deductions or bind core defaults
  const frameFix = selectedProfile?.glassDeductions?.frameFix ?? 10;
  const sashWindow = selectedProfile?.glassDeductions?.sashWindow ?? 110;
  const sashDoor = selectedProfile?.glassDeductions?.sashDoor ?? 160;
  const slidingSash = selectedProfile?.glassDeductions?.slidingSash ?? 122;

  // Track initial borders representing standard frame edges at root
  const initialBounds = {
    left: isRenov ? 'FrameRenovation' : 'FrameStandard',
    right: isRenov ? 'FrameRenovation' : 'FrameStandard',
    top: 'FrameStandard',
    bottom: frameType === 'threshold' ? 'Threshold' : (isRenov ? 'FrameRenovation' : 'FrameStandard')
  };

  const m_mullion = getMullionThicknessDynamic(selectedProfile);

  function solveNode(
    node: WindowNode,
    w: number,
    h: number,
    bounds: { left: string; right: string; top: string; bottom: string }
  ) {
    const isSlidingContainer = node.systemType === 'Sliding' && node.children;

    if (isSlidingContainer) {
      const numSashes = node.children!.length;
      const overlapsCount = numSashes === 4 ? 2 : (numSashes === 2 ? 1 : 2);
      
      const openingW = w - getBoundarySubDynamic(bounds.left, selectedProfile) - getBoundarySubDynamic(bounds.right, selectedProfile);
      const openingH = h - getBoundarySubDynamic(bounds.top, selectedProfile) - getBoundarySubDynamic(bounds.bottom, selectedProfile);

      const overlappingTerm = 37; // Standard interlock overlap depth
      const leafW = (openingW + (overlapsCount * overlappingTerm)) / numSashes;
      const leafH = openingH;

      node.children!.forEach((child, sIdx) => {
        const op = child.openingType || 'Fixed';
        const paneId = `glass-slide-${node.id}-${sIdx}`;
        const isSash = op.includes('Sliding');

        if (!op.includes('Panel')) {
          if (isSash) {
            // Sliding sash glass dimensions dynamically deducted
            const glassW = leafW + overlappingTerm - slidingSash;
            const glassH = leafH - (slidingSash - 16); // 16mm represents difference between 122 and 106 standard ratios
            results.push({
              glassId: paneId,
              width: Math.max(0, Math.round(glassW * 10) / 10),
              height: Math.max(0, Math.round(glassH * 10) / 10),
              count: 1,
              type: 'Sliding',
              label: `شیشه لنگه کشویی (${child.openingType?.includes('Left') ? 'چپ‌بازشو' : 'راست‌بازشو'})`
            });
          } else {
            // Fixed passive pane in sliding system
            const isMonorail = node.slidingRailType === 'Monorail';
            let glassW = leafW - frameFix;
            let glassH = leafH - frameFix;
            if (isMonorail) {
              glassW = leafW - 40; // Monorail outer channel depth sit
              glassH = leafH - 40;
            }
            results.push({
              glassId: paneId,
              width: Math.max(0, Math.round(glassW * 10) / 10),
              height: Math.max(0, Math.round(glassH * 10) / 10),
              count: 1,
              type: 'Fixed',
              label: 'شیشه ثابت کشویی (کتیبه کشویی)'
            });
          }
        }
      });
      return;
    }

    // Standard Grid Split Container
    if (node.type === 'container' && node.children) {
      const totalFlex = node.children.reduce((sum, c) => sum + (c.flex || 1), 0) || 1;
      const isFrench = node.isFrenchWindow || false;

      const leftSub = getBoundarySubDynamic(bounds.left, selectedProfile);
      const rightSub = getBoundarySubDynamic(bounds.right, selectedProfile);
      const topSub = getBoundarySubDynamic(bounds.top, selectedProfile);
      const bottomSub = getBoundarySubDynamic(bounds.bottom, selectedProfile);

      const containerW = w - leftSub - rightSub;
      const containerH = h - topSub - bottomSub;

      if (node.dir === 'row') {
        const numChildren = node.children.length;
        // Correction for Intermediate mullion profile widths: subtract their cumulative width
        const totalMullionW = (numChildren - 1) * m_mullion;
        const netContainerW = Math.max(0, containerW - totalMullionW);

        node.children.forEach((child, idx) => {
          const ratio = (child.flex || 1) / totalFlex;
          
          const childLeftBound = idx === 0 ? bounds.left : 'Mullion';
          const childRightBound = idx === numChildren - 1 ? bounds.right : 'Mullion';
          
          const isL = isFrench && idx === 0;
          const isR = isFrench && idx === 1;

          const activeLeftBound = isL ? bounds.left : childLeftBound;
          const activeRightBound = isR ? bounds.right : childRightBound;

          const sliceLeftSub = getBoundarySubDynamic(activeLeftBound, selectedProfile);
          const sliceRightSub = getBoundarySubDynamic(activeRightBound, selectedProfile);

          // Physical slice width including boundary margins
          const widthSlice = (netContainerW * ratio) + sliceLeftSub + sliceRightSub;

          const childBounds = {
            left: activeLeftBound,
            right: activeRightBound,
            top: 'Zero',
            bottom: 'Zero'
          };

          if (isFrench) {
            if (idx === 0) childBounds.right = 'FrenchMullion';
            if (idx === 1) childBounds.left = 'FrenchMullion';
          }

          solveNode(child, widthSlice, containerH, childBounds);
        });
      } else {
        // Divided by horizontal transoms
        const numChildren = node.children.length;
        const totalTransomH = (numChildren - 1) * m_mullion;
        const netContainerH = Math.max(0, containerH - totalTransomH);

        node.children.forEach((child, idx) => {
          const ratio = (child.flex || 1) / totalFlex;

          const childTopBound = idx === 0 ? bounds.top : 'Mullion';
          const childBottomBound = idx === numChildren - 1 ? bounds.bottom : 'Mullion';

          const sliceTopSub = getBoundarySubDynamic(childTopBound, selectedProfile);
          const sliceBottomSub = getBoundarySubDynamic(childBottomBound, selectedProfile);

          const heightSlice = (netContainerH * ratio) + sliceTopSub + sliceBottomSub;

          const childBounds = {
            left: 'Zero',
            right: 'Zero',
            top: childTopBound,
            bottom: childBottomBound
          };

          solveNode(child, containerW, heightSlice, childBounds);
        });
      }
    } else {
      // Leaf Node Glass pane
      const paneId = `glass-leaf-${node.id}`;
      const op = node.openingType || 'Fixed';

      // Dimensions of structural pane compartment
      const paneW = w - getBoundarySubDynamic(bounds.left, selectedProfile) - getBoundarySubDynamic(bounds.right, selectedProfile);
      const paneH = h - getBoundarySubDynamic(bounds.top, selectedProfile) - getBoundarySubDynamic(bounds.bottom, selectedProfile);

      const isSash = op !== 'Fixed' && !op.includes('Panel');
      const isDoorSash = op.includes('Door');

      if (!op.includes('Panel')) {
        let glassW = paneW;
        let glassH = paneH;

        if (isSash) {
          // Glass inside sash frame
          const ded = isDoorSash ? sashDoor : sashWindow;
          glassW = paneW - ded;
          glassH = paneH - ded;
        } else {
          // Glass directly inside fixed frame
          glassW = paneW - frameFix;
          glassH = paneH - frameFix;
        }

        results.push({
          glassId: `${paneId}-glass`,
          width: Math.max(0, Math.round(glassW * 10) / 10),
          height: Math.max(0, Math.round(glassH * 10) / 10),
          count: 1,
          type: isSash ? 'Sash' : 'Fixed',
          label: isSash 
            ? `شیشه لنگه بازشو (${isDoorSash ? 'درب سنگین' : 'پنجره بازشو'})` 
            : `شیشه کادر ثابت (فیکس کتیبه)`
        });
      }
    }
  }

  // Execute recursive traverse starting at the root node
  solveNode(rootNode, totalWidth, totalHeight, initialBounds);

  // Group similar glass cuts together for optimization / count sums
  const consolidatedList: GlassSizeResult[] = [];
  results.forEach(item => {
    const match = consolidatedList.find(
      c => c.width === item.width && c.height === item.height && c.type === item.type && c.label === item.label
    );
    if (match) {
      match.count += item.count;
    } else {
      consolidatedList.push({ ...item });
    }
  });

  return consolidatedList;
}

/**
 * React Hook for executing high-precision glass calculation
 */
export function useGlassCalculator(
  rootNode: WindowNode | undefined,
  selectedProfile: ProfileBrand | undefined,
  totalWidth: number,
  totalHeight: number,
  frameType: 'standard' | 'renovation' | 'threshold' = 'standard'
): GlassSizeResult[] {
  return useMemo(() => {
    return calculateGlassList(rootNode, selectedProfile, totalWidth, totalHeight, frameType);
  }, [rootNode, selectedProfile, totalWidth, totalHeight, frameType]);
}
