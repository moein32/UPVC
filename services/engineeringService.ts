import { WindowConfig, WindowNode, InvoiceDetail, OpeningDirection, ProfileBrand, GlassType, HardwareItem } from '../types';

export const CONSTANTS = {
  Z: 6,           // Melt allowance in mm
  Ms: 8,          // Mullion overlap in mm
  Sh: 8,          // Sash hem/overlap in mm
  B_sh: 10,       // Glass/Panel clearance in mm
  P_plank: 100,   // Panel plank width in mm
  Te: 30,         // Screen height addition in mm
  Ta: 30,         // Screen width addition in mm
  A_overhang: 8,  // Overhang gap (French window) in mm
  C_connector: 12, // Connector joint profile in mm

  // Default casement widths in mm
  F_std: 45,       // Standard frame depth
  F_renov_lip: 35, // Renovation frame lip dimension
  F_renov_net: 38, // Renovation net depth (73 - 35)
  M_mullion: 42,   // Mullion division thickness
  S_win: 58,       // Window sash profile thickness
  S_door: 83,      // Door sash profile thickness

  // Sliding constants in mm
  F_sliding: 50,
  S_sliding: 56,
  S_sliding_thick: 40,
  S_sliding_lip: 20,
  E_interlock: 3
};

export interface FinishedCut {
  id: string;
  name: string;
  length: number;
  quantity: number;
  type: 'Frame' | 'Sash' | 'Mullion' | 'Bead' | 'Galvanized' | 'Glass' | 'Panel' | 'Screen' | 'Threshold';
  unit: 'm' | 'm2' | 'count';
  angle?: string;
  width?: number; // for Glass/Panel
  height?: number; // for Glass/Panel
}

export const getBoundarySub = (boundary: string): number => {
  switch (boundary) {
    case 'FrameStandard': return CONSTANTS.F_std;
    case 'FrameRenovation': return CONSTANTS.F_renov_net;
    case 'Mullion': return CONSTANTS.M_mullion / 2; // 21
    case 'FrenchMullion': return CONSTANTS.A_overhang / 2; // 4
    case 'Threshold': return 20; // aluminum threshold height
    default: return 0;
  }
};

/**
 * Traverses the WindowNode recursively to compute precise cutting lengths and areas 
 * according to the MasterWin technical specification.
 */
export function calculateDetailedCuts(
  node: WindowNode,
  w: number,
  h: number,
  frameType: 'standard' | 'renovation' | 'threshold' = 'standard',
  selectedProfile?: ProfileBrand
): FinishedCut[] {
  const cuts: FinishedCut[] = [];

  // Determine dynamic frame variables responsive to the selected profile
  const brandName = selectedProfile?.name?.toLowerCase() || '';
  const brandId = selectedProfile?.id?.toLowerCase() || '';
  const isW700 = brandId.includes('w700') || brandName.includes('70') || brandId.includes('exclusive') || brandId.includes('70mm');
  const isW800 = brandId.includes('80mm') || brandName.includes('80');

  const f_std = isW800 ? 55 : (isW700 ? 50 : CONSTANTS.F_std); // default 45
  const f_renov_net = isW800 ? 48 : (isW700 ? 43 : CONSTANTS.F_renov_net); // default 38

  // 1. Calculate Frame cuts (done at root level)
  const isRenov = frameType === 'renovation';
  const frameSubLabel = isRenov ? 'بازسازی' : 'استاندارد';
  const frameLengthAdd = isRenov ? (2 * CONSTANTS.F_renov_lip + CONSTANTS.Z) : CONSTANTS.Z; // +76 or +6
  const frameAngle = '45/45';

  // We push root frame lengths (2 widths, 2 heights unless threshold is used)
  if (frameType === 'threshold') {
    // Top standard frame
    cuts.push({ id: 'frame-top', name: 'پروفیل فریم کتیبه بالا (استاندارد)', length: w + CONSTANTS.Z, quantity: 1, type: 'Frame', unit: 'm', angle: frameAngle });
    // Left & Right standard frames
    cuts.push({ id: 'frame-vertical', name: 'پروفیل فریم درب (ارتفاع استاندارد)', length: h + CONSTANTS.Z, quantity: 2, type: 'Frame', unit: 'm', angle: frameAngle });
    // Bottom aluminum threshold (Alum threshold sits between frame, cut L = W - 2*F + joint_allowance = W - 2*f_std + 10)
    cuts.push({ id: 'threshold-bottom', name: 'آستانه آلومینیومی کف', length: w - f_std * 2 + 10, quantity: 1, type: 'Threshold', unit: 'm', angle: '90/90' });
  } else {
    cuts.push({ id: 'frame-width', name: `پروفیل فریم ${frameSubLabel} (عرض)`, length: w + frameLengthAdd, quantity: 2, type: 'Frame', unit: 'm', angle: frameAngle });
    cuts.push({ id: 'frame-height', name: `پروفیل فریم ${frameSubLabel} (ارتفاع)`, length: h + frameLengthAdd, quantity: 2, type: 'Frame', unit: 'm', angle: frameAngle });
  }

  // Define initial boundary types for recursive solver
  const initialBounds = {
    left: isRenov ? 'FrameRenovation' : 'FrameStandard',
    right: isRenov ? 'FrameRenovation' : 'FrameStandard',
    top: 'FrameStandard',
    bottom: frameType === 'threshold' ? 'Threshold' : (isRenov ? 'FrameRenovation' : 'FrameStandard')
  };

  // Run recursive pane calculation
  solveNode(node, w, h, initialBounds, cuts, selectedProfile);

  return cuts;
}

function solveNode(
  node: WindowNode,
  w: number,
  h: number,
  bounds: { left: string, right: string, top: string, bottom: string },
  cuts: FinishedCut[],
  brand?: ProfileBrand
) {
  // Determine dynamic frame, sash, and mullion dimensions responsive to the selected profile
  const brandName = brand?.name?.toLowerCase() || '';
  const brandId = brand?.id?.toLowerCase() || '';
  const isW700 = brandId.includes('w700') || brandName.includes('70') || brandId.includes('exclusive') || brandId.includes('70mm');
  const isW800 = brandId.includes('80mm') || brandName.includes('80');

  const f_std = isW800 ? 55 : (isW700 ? 50 : CONSTANTS.F_std); // fallback to 45
  const f_renov_net = isW800 ? 48 : (isW700 ? 43 : CONSTANTS.F_renov_net); // fallback to 38
  const m_mullion = isW800 ? 52 : (isW700 ? 48 : CONSTANTS.M_mullion); // fallback to 42

  const frameFix = brand?.glassDeductions?.frameFix ?? 10;
  const sashWindow = brand?.glassDeductions?.sashWindow ?? 110;
  const sashDoor = brand?.glassDeductions?.sashDoor ?? 160;
  const slidingSash = brand?.glassDeductions?.slidingSash ?? 122;

  const getBoundarySubDynamic = (boundary: string): number => {
    switch (boundary) {
      case 'FrameStandard': return f_std;
      case 'FrameRenovation': return f_renov_net;
      case 'Mullion': return m_mullion / 2;
      case 'FrenchMullion': return CONSTANTS.A_overhang / 2; // 4
      case 'Threshold': return 20;
      default: return 0;
    }
  };

  // If sliding container
  if (node.systemType === 'Sliding' && node.children) {
    const numSashes = node.children.length;
    const overlapsCount = numSashes === 4 ? 2 : (numSashes === 2 ? 1 : 2);
    
    // Total opening boundaries using custom profile configurations
    const openingW = w - getBoundarySubDynamic(bounds.left) - getBoundarySubDynamic(bounds.right);
    const openingH = h - getBoundarySubDynamic(bounds.top) - getBoundarySubDynamic(bounds.bottom);

    // Calculate dimensions of each sliding sash according to pg 69 of handbook
    // W_sash = (W_opening + overlapping_term) / numSashes
    const overlappingTerm = ((CONSTANTS.S_sliding_thick + CONSTANTS.S_sliding_lip * 2) / 2) - CONSTANTS.E_interlock; // 40 - 3 = 37mm
    const leafW = (openingW + (overlapsCount * overlappingTerm)) / numSashes;
    const leafH = openingH; // height of sash is equal to opening height

    // Sliding sash cutting lengths (including weld)
    const sashCutW = leafW + overlappingTerm + CONSTANTS.Z; // page 69 width: (nominal) + 40 - 3 + 6 = nominal + 43
    const sashCutH = leafH + (2 * CONSTANTS.Sh) + CONSTANTS.Z;  // page 69 height: height_opening + 16 + 6 = opening + 22

    // Slide Rails frame is monorail or double
    const isMonorail = node.slidingRailType === 'Monorail';

    node.children.forEach((child, sIdx) => {
      const op = child.openingType || 'Fixed';
      const paneId = `pane-sliding-${node.id}-${sIdx}`;
      const isSash = op.includes('Sliding');

      if (isSash) {
        // Push sash cuts (2 widths, 2 heights)
        cuts.push({ id: `${paneId}-sash-w`, name: 'سش کشویی تک‌ریل (عرض)', length: sashCutW, quantity: 2, type: 'Sash', unit: 'm', angle: '45/45' });
        cuts.push({ id: `${paneId}-sash-h`, name: 'سش کشویی تک‌ریل (ارتفاع)', length: sashCutH, quantity: 2, type: 'Sash', unit: 'm', angle: '45/45' });

        // Glass inside sliding sash using dynamic deductions
        const glassW = leafW + overlappingTerm - slidingSash;
        const glassH = leafH - (slidingSash - 16);
        cuts.push({ id: `${paneId}-glass`, name: 'شیشه دوجداره (لنگه کشویی)', length: 0, width: glassW, height: glassH, quantity: 1, type: 'Glass', unit: 'm2' });

        // Beading for sliding sash matching exact glass cuts clearance (10mm)
        cuts.push({ id: `${paneId}-bead-w`, name: 'زهوار لنگه کشویی (عرض)', length: leafW + overlappingTerm - (slidingSash - 10), quantity: 2, type: 'Bead', unit: 'm', angle: '45/45' });
        cuts.push({ id: `${paneId}-bead-h`, name: 'زهوار لنگه کشویی (ارتفاع)', length: leafH + (2 * CONSTANTS.Sh) - (slidingSash - 10), quantity: 2, type: 'Bead', unit: 'm', angle: '45/45' });

        // Add sliding interlock brush length (Page 71: height opening - 2*50 + 2*8 - 2*2)
        cuts.push({ id: `${paneId}-interlock`, name: 'پروفیل اینترلاک کشویی', length: leafH + (2 * CONSTANTS.Sh) - 4, quantity: 1, type: 'Mullion', unit: 'm', angle: '90/90' });
      } else {
        // Simple fixed sliding pane using dynamic frame deductions
        let glassW = leafW - frameFix;
        let glassH = leafH - frameFix;

        if (isMonorail) {
          // Monorail fixed glass is larger (sits in the outer channel)
          glassW = leafW - 40;
          glassH = leafH - 40;
        }

        cuts.push({ id: `${paneId}-glass-fixed`, name: 'شیشه دوجداره (ثابت کشویی)', length: 0, width: glassW, height: glassH, quantity: 1, type: 'Glass', unit: 'm2' });
        cuts.push({ id: `${paneId}-bead-fixed-w`, name: 'زهوار کادر ثابت کشویی (عرض)', length: leafW, quantity: 2, type: 'Bead', unit: 'm', angle: '45/45' });
        cuts.push({ id: `${paneId}-bead-fixed-h`, name: 'زهوار کادر ثابت کشویی (ارتفاع)', length: leafH, quantity: 2, type: 'Bead', unit: 'm', angle: '45/45' });
      }

      if (op.includes('Panel')) {
        let pW = leafW - frameFix;
        let pH = leafH - frameFix;
        cuts.push({ id: `${paneId}-panel`, name: 'پنل UPVC متحرک کشویی', length: 0, width: pW, height: pH, quantity: 1, type: 'Panel', unit: 'm2' });
        const plankCnt = Math.ceil(pW / CONSTANTS.P_plank);
        cuts.push({ id: `${paneId}-panel-planks`, name: 'تیغه پنل UPVC کشویی', length: pH, quantity: plankCnt, type: 'Panel', unit: 'count' });
      }
    });
    return;
  }

  // Solve layout container (Casement splits)
  if (node.type === 'container' && node.children) {
    const totalFlex = node.children.reduce((sum, c) => sum + (c.flex || 1), 0) || 1;
    const isFrench = node.isFrenchWindow || false;

    // Add internal division mullions
    const frameLeftSub = getBoundarySubDynamic(bounds.left);
    const frameRightSub = getBoundarySubDynamic(bounds.right);
    const frameTopSub = getBoundarySubDynamic(bounds.top);
    const frameBottomSub = getBoundarySubDynamic(bounds.bottom);

    const containerW = w - frameLeftSub - frameRightSub;
    const containerH = h - frameTopSub - frameBottomSub;

    if (node.dir === 'row') {
      // Divided by vertical mullions
      if (isFrench) {
        // Floating mullion (مولیون متحرک) between left and right active casement sashes
        const MullionLen = containerH + CONSTANTS.Ms; // Spans total height of division
        cuts.push({ id: `floating-mullion-${node.id}`, name: 'پروفیل مولیون متحرک فرانسوی (Floating)', length: MullionLen, quantity: 1, type: 'Mullion', unit: 'm', angle: '90/90' });
      } else {
        const count = node.children.length - 1;
        const MullionLen = containerH + CONSTANTS.Ms; // vertical mullion length
        cuts.push({ id: `vertical-mullion-${node.id}`, name: 'پروفیل مولیون عمودی (وادار)', length: MullionLen, quantity: count, type: 'Mullion', unit: 'm', angle: '90/90' });
      }

      // Solve each slice
      let cumulativeX = 0;
      node.children.forEach((child, idx) => {
        const ratio = (child.flex || 1) / totalFlex;
        const widthSlice = containerW * ratio;

        // Boundaries of child slice
        const childBounds = {
          left: idx === 0 ? bounds.left : 'Mullion',
          right: idx === node.children!.length - 1 ? bounds.right : 'Mullion',
          top: bounds.top,
          bottom: bounds.bottom
        };

        if (isFrench) {
          if (idx === 0) childBounds.right = 'FrenchMullion';
          if (idx === 1) childBounds.left = 'FrenchMullion';
        }

        solveNode(child, widthSlice, containerH, childBounds, cuts, brand);
        cumulativeX += widthSlice;
      });

    } else {
      // Divided by horizontal transoms (dir === 'col')
      const count = node.children.length - 1;
      const TransomLen = containerW + CONSTANTS.Ms; // horizontal transom length
      cuts.push({ id: `horizontal-mullion-${node.id}`, name: 'پروفیل مولیون افقی (ترنسم)', length: TransomLen, quantity: count, type: 'Mullion', unit: 'm', angle: '90/90' });

      // Solve each slice
      let cumulativeY = 0;
      node.children.forEach((child, idx) => {
        const ratio = (child.flex || 1) / totalFlex;
        const heightSlice = containerH * ratio;

        // Boundaries of child slice
        const childBounds = {
          left: bounds.left,
          right: bounds.right,
          top: idx === 0 ? bounds.top : 'Mullion',
          bottom: idx === node.children!.length - 1 ? bounds.bottom : 'Mullion'
        };

        solveNode(child, containerW, heightSlice, childBounds, cuts, brand);
        cumulativeY += heightSlice;
      });
    }

  } else {
    // PANE LEAF - SOLVE FOR SINGLE PANE
    const paneId = `pane-${node.id}`;
    const op = node.openingType || 'Fixed';

    // Dimensions of this raw pane compartment inside boundaries using dynamic values
    const paneW = w - getBoundarySubDynamic(bounds.left) - getBoundarySubDynamic(bounds.right);
    const paneH = h - getBoundarySubDynamic(bounds.top) - getBoundarySubDynamic(bounds.bottom);

    const isSash = op !== 'Fixed' && !op.includes('Panel');
    const isDoorSash = op.includes('Door');

    let glassW = paneW;
    let glassH = paneH;

    if (isSash) {
      // Glass inside sash frame
      const ded = isDoorSash ? sashDoor : sashWindow;
      glassW = paneW - ded;
      glassH = paneH - ded;

      // 1. Calculate active welded Sash length (Page 33: Nominal opening + 2*Sh + melt)
      const sashCutW = paneW + (2 * CONSTANTS.Sh) + CONSTANTS.Z; 
      const sashCutH = paneH + (2 * CONSTANTS.Sh) + CONSTANTS.Z; 
      
      const sashLabel = isDoorSash ? 'سش درب سنگین' : 'سش پنجره بازشو';
      cuts.push({ id: `${paneId}-sash-w`, name: `پروفیل ${sashLabel} (عرض)`, length: sashCutW, quantity: 2, type: 'Sash', unit: 'm', angle: '45/45' });
      cuts.push({ id: `${paneId}-sash-h`, name: `پروفیل ${sashLabel} (ارتفاع)`, length: sashCutH, quantity: 2, type: 'Sash', unit: 'm', angle: '45/45' });
    } else {
      // Glass directly inside fixed frame
      glassW = paneW - frameFix;
      glassH = paneH - frameFix;
    }

    // Beading physical sizes are exactly glass sizes plus the glass clearance (CONSTANTS.B_sh = 10)
    const beadW = glassW + CONSTANTS.B_sh;
    const beadH = glassH + CONSTANTS.B_sh;

    // Push beading
    cuts.push({ id: `${paneId}-bead-w`, name: `زهوار شیشه (عرض)`, length: beadW, quantity: 2, type: 'Bead', unit: 'm', angle: '45/45' });
    cuts.push({ id: `${paneId}-bead-h`, name: `زهوار شیشه (ارتفاع)`, length: beadH, quantity: 2, type: 'Bead', unit: 'm', angle: '45/45' });

    // Glass piece
    if (!op.includes('Panel')) {
      cuts.push({ id: `${paneId}-glass`, name: 'شیشه دوجداره استاندارد', length: 0, width: glassW, height: glassH, quantity: 1, type: 'Glass', unit: 'm2' });
    }

    // Panel plank cuts if opening includes Panel (Page 54: calculated using plank divisions)
    if (op.includes('Panel')) {
      const panelW = glassW;
      const panelH = glassH;
      cuts.push({ id: `${paneId}-panel-block`, name: 'صفحه پنل UPVC فشرده', length: 0, width: panelW, height: panelH, quantity: 1, type: 'Panel', unit: 'm2' });

      const isHorizontalPlanks = op === 'PanelH' || op === 'Panel';
      if (isHorizontalPlanks) {
        const count = Math.ceil(panelH / CONSTANTS.P_plank);
        cuts.push({ id: `${paneId}-panel-planks`, name: 'تیغه روکوب پنل UPVC (افقی)', length: panelW, quantity: count, type: 'Panel', unit: 'count' });
      } else {
        const count = Math.ceil(panelW / CONSTANTS.P_plank);
        cuts.push({ id: `${paneId}-panel-planks`, name: 'تیغه روکوب پنل UPVC (عمودی)', length: panelH, quantity: count, type: 'Panel', unit: 'count' });
      }
    }

    // Screens (توری لولایی یا پلیسه روی بازشو - Page 61/62)
    if (isSash) {
      const screenW = (paneW + 2 * CONSTANTS.Sh) + CONSTANTS.Ta; // welded width + 30
      const screenH = (paneH + 2 * CONSTANTS.Sh) + CONSTANTS.Te; // welded height + 30
      cuts.push({ id: `${paneId}-screen`, name: 'توری پلیسه‌/لولایی لنگه بازشو', length: 0, width: screenW, height: screenH, quantity: 1, type: 'Screen', unit: 'm2' });
    }
  }
}

/**
 * Calculates correct galvanized steel reinforcement length:
 * Standard steel runs inside profiles minus 20mm on each welded side (to prevent melting contact)
 */
export function getGalvanizedCuts(cuts: FinishedCut[]): FinishedCut[] {
  const galvCuts: FinishedCut[] = [];
  cuts.forEach(cut => {
    if (cut.type === 'Frame' || cut.type === 'Sash' || cut.type === 'Mullion') {
      // For welded elements (Frame, Sash), galvanized is 40mm shorter (20mm both ends)
      const isWelded = cut.type === 'Frame' || cut.type === 'Sash';
      const steelLen = cut.length - (isWelded ? 40 : 10);
      if (steelLen > 0) {
        galvCuts.push({
          id: `G-${cut.id}`,
          name: `گالوانیزه اونیورسال تقویتی (برای ${cut.name})`,
          length: steelLen,
          quantity: cut.quantity,
          type: 'Galvanized',
          unit: 'm'
        });
      }
    }
  });
  return galvCuts;
}
