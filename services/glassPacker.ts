export interface GlassPiece {
  x: number;
  y: number;
  w: number;
  h: number;
  unitId: string;
  label: string;
  isWaste?: boolean;
}

export interface SheetSize {
  id: string;
  width: number;
  height: number;
  label: string;
  isActive: boolean;
}

export interface OptimizedSheet {
  id: number;
  pieces: GlassPiece[];
  wastes: GlassPiece[];
  usedArea: number;
  wastePercent: number;
  sheetWidth: number;
  sheetHeight: number;
  sheetLabel: string;
}

export interface CutItem {
  id: string;
  width: number;
  height: number;
  quantity: number;
  label: string;
  type: 'Glass';
  unitId: string;
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PackResult {
  pieces: GlassPiece[];
  wastes: GlassPiece[];
  usedArea: number;
  sheetWidth: number;
  sheetHeight: number;
  unpackedIndices: number[];
}

/**
 * Packs rectangular glass pieces into a single sheet using the Guillotine algorithm.
 * Guarantees all cuts start from corners/edges, resulting in perfectly aligned, edge-to-edge rectangles.
 */
export const packOneSheet = (
  sheetW: number,
  sheetH: number,
  piecesToPack: { w: number; h: number; unitId: string; label: string }[],
  margin: number,
  kerf: number
): PackResult => {
  const usableW = Math.round(sheetW - (margin * 2));
  const usableH = Math.round(sheetH - (margin * 2));

  const freeRects: FreeRect[] = [{ x: margin, y: margin, w: usableW, h: usableH }];
  const packed: GlassPiece[] = [];
  const unpackedIndices: number[] = [];

  piecesToPack.forEach((p, idx) => {
    let bestRectIdx = -1;
    let rotateItem = false;
    let minAreaFit = Infinity;

    for (let rIdx = 0; rIdx < freeRects.length; rIdx++) {
      const r = freeRects[rIdx];

      // Normal orientation
      if (p.w <= r.w && p.h <= r.h) {
        const areaFit = r.w * r.h - p.w * p.h;
        if (areaFit < minAreaFit) {
          minAreaFit = areaFit;
          bestRectIdx = rIdx;
          rotateItem = false;
        }
      }

      // Rotated orientation
      if (p.h <= r.w && p.w <= r.h) {
        const areaFit = r.w * r.h - p.w * p.h;
        if (areaFit < minAreaFit) {
          minAreaFit = areaFit;
          bestRectIdx = rIdx;
          rotateItem = true;
        }
      }
    }

    if (bestRectIdx !== -1) {
      const r = freeRects[bestRectIdx];
      freeRects.splice(bestRectIdx, 1);

      const pw = rotateItem ? p.h : p.w;
      const ph = rotateItem ? p.w : p.h;

      packed.push({
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(pw),
        h: Math.round(ph),
        unitId: p.unitId,
        label: p.label
      });

      const remW = r.w - pw;
      const remH = r.h - ph;

      // Guillotine slicing and remaining space decomposition
      if (remW > 0 || remH > 0) {
        if (remW > remH) {
          if (remW - kerf > 0) {
            freeRects.push({
              x: r.x + pw + kerf,
              y: r.y,
              w: remW - kerf,
              h: ph
            });
          }
          if (remH - kerf > 0) {
            freeRects.push({
              x: r.x,
              y: r.y + ph + kerf,
              w: r.w,
              h: remH - kerf
            });
          }
        } else {
          if (remH - kerf > 0) {
            freeRects.push({
              x: r.x,
              y: r.y + ph + kerf,
              w: pw,
              h: remH - kerf
            });
          }
          if (remW - kerf > 0) {
            freeRects.push({
              x: r.x + pw + kerf,
              y: r.y,
              w: remW - kerf,
              h: r.h
            });
          }
        }
      }
    } else {
      unpackedIndices.push(idx);
    }
  });

  const wastes: GlassPiece[] = freeRects
    .filter(r => r.w > 10 && r.h > 10)
    .map(r => ({
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.w),
      h: Math.round(r.h),
      unitId: '',
      label: 'ضایعات',
      isWaste: true
    }));

  const usedArea = packed.reduce((sum, p) => sum + (p.w * p.h), 0);

  return {
    pieces: packed,
    wastes,
    usedArea,
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    unpackedIndices
  };
};

/**
 * Optimizes cutting layout by selecting the best sheet size for each step
 * to minimize total waste.
 */
export const runGlassOptimization = (
  items: CutItem[],
  sheetSizes: SheetSize[],
  glassMargin: number,
  glassKerf: number
): OptimizedSheet[] => {
  const activeSizes = sheetSizes.filter(s => s.isActive);
  const candidatesSizes = activeSizes.length > 0 ? activeSizes : [sheetSizes[0]];

  const runWithSortedPieces = (
    sortedPieces: { w: number; h: number; unitId: string; label: string }[]
  ): OptimizedSheet[] => {
    let remainingPieces = [...sortedPieces];
    const sheets: OptimizedSheet[] = [];
    let sheetId = 1;

    while (remainingPieces.length > 0) {
      const largestItem = remainingPieces[0];

      const fittingSizes = candidatesSizes.filter(s => {
        const uw = s.width - (glassMargin * 2);
        const uh = s.height - (glassMargin * 2);
        return (largestItem.w <= uw && largestItem.h <= uh) || (largestItem.h <= uw && largestItem.w <= uh);
      });

      const candidates = fittingSizes.length > 0 ? fittingSizes : candidatesSizes;

      let bestResult: PackResult | null = null;
      let bestSizeSelected: SheetSize | null = null;
      let highestEfficiency = -1;

      for (const size of candidates) {
        const result = packOneSheet(size.width, size.height, remainingPieces, glassMargin, glassKerf);
        const efficiency = result.usedArea / (size.width * size.height);

        if (efficiency > highestEfficiency && result.pieces.length > 0) {
          highestEfficiency = efficiency;
          bestResult = result;
          bestSizeSelected = size;
        }
      }

      if (!bestResult || !bestSizeSelected || bestResult.pieces.length === 0) {
        const largestSize = candidates.reduce((max, s) => (s.width * s.height > max.width * max.height ? s : max), candidates[0]);
        bestResult = packOneSheet(largestSize.width, largestSize.height, [largestItem], glassMargin, glassKerf);
        bestSizeSelected = largestSize;

        if (!bestResult || bestResult.pieces.length === 0) {
          break; // Guard against unplaceable item to avoid infinite loop
        }
      }

      const finalResult = bestResult as PackResult;
      const finalSize = bestSizeSelected as SheetSize;

      sheets.push({
        id: sheetId++,
        pieces: finalResult.pieces,
        wastes: finalResult.wastes,
        usedArea: finalResult.usedArea,
        wastePercent: Math.round((1 - (finalResult.usedArea / (finalSize.width * finalSize.height))) * 100),
        sheetWidth: finalSize.width,
        sheetHeight: finalSize.height,
        sheetLabel: finalSize.label
      });

      const remainingIndices = finalResult.unpackedIndices;
      remainingPieces = remainingIndices.map(idx => remainingPieces[idx]);
    }

    // Filter empty sheets
    return sheets.filter(s => s.pieces.length > 0);
  };

  // Build the baseline list of pieces
  const basePieces: { w: number; h: number; unitId: string; label: string }[] = [];
  items.forEach(item => {
    // Each glass item is double-glazed (دوجداره), requiring 2 identical physical panes
    const doubleGlazedQuantity = item.quantity * 2;
    for (let i = 0; i < doubleGlazedQuantity; i++) {
      basePieces.push({
        w: Math.round(item.width),
        h: Math.round(item.height),
        unitId: item.unitId,
        label: item.label
      });
    }
  });

  if (basePieces.length === 0) return [];

  // Generate four sorting variants to find the absolute mathematically superior solution
  const sortingHeuristics = [
    // 1. Area Descending
    [...basePieces].sort((a, b) => (b.w * b.h) - (a.w * a.h)),
    // 2. Max Side length Descending
    [...basePieces].sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h)),
    // 3. Width Descending
    [...basePieces].sort((a, b) => b.w - a.w),
    // 4. Height Descending
    [...basePieces].sort((a, b) => b.h - a.h)
  ];

  let bestRunnerSheets: OptimizedSheet[] = [];
  let minSheetsCount = Infinity;
  let minTotalWastePercent = Infinity;

  for (const sortedList of sortingHeuristics) {
    const resultSheets = runWithSortedPieces(sortedList);
    if (resultSheets.length === 0) continue;

    const totalSheetArea = resultSheets.reduce((sum, s) => sum + (s.sheetWidth * s.sheetHeight), 0);
    const totalUsedArea = resultSheets.reduce((sum, s) => sum + s.usedArea, 0);
    const overallWaste = totalSheetArea > 0 ? (1 - (totalUsedArea / totalSheetArea)) * 100 : 100;

    // Better if fewer sheets, or same sheets and lower waste percent
    if (
      resultSheets.length < minSheetsCount ||
      (resultSheets.length === minSheetsCount && overallWaste < minTotalWastePercent)
    ) {
      minSheetsCount = resultSheets.length;
      minTotalWastePercent = overallWaste;
      bestRunnerSheets = resultSheets;
    }
  }

  // Re-id sheets sequentially
  return bestRunnerSheets.map((s, idx) => ({
    ...s,
    id: idx + 1
  }));
};
