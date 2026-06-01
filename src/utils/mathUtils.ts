/**
 * Pure math helpers — zero DOM access.
 * All spatial values in mm, font sizes in pt.
 */

import type { WidthBreakpoint, Face } from '../types';

/* ── Constants ── */

/** Estimated character width per pt: ASCII */
export const CHAR_WIDTH_ASCII = 0.45;
/** Estimated character width per pt: CJK/wide */
export const CHAR_WIDTH_CJK = 0.70;
/** Line height multiplier */
export const LINE_HEIGHT_FACTOR = 1.50;

/* ── Text width estimation ── */

export function estimateTextWidthMm(text: string, fontSizePt: number): number {
  let width = 0;
  for (const ch of text) {
    width += ch.charCodeAt(0) > 0x2000 ? CHAR_WIDTH_CJK : CHAR_WIDTH_ASCII;
  }
  return width * fontSizePt;
}

export function estimateRowHeightMm(fontSizePt: number): number {
  return fontSizePt * LINE_HEIGHT_FACTOR;
}

/* ── Width breakpoint lookup ── */

export function getBreakpointFont(
  faceDimMm: number,
  breakpoints: WidthBreakpoint[],
): number | null {
  for (const bp of breakpoints) {
    const matches =
      bp.operator === 'less_than'     ? faceDimMm <  bp.thresholdMm :
      bp.operator === 'greater_than'  ? faceDimMm >  bp.thresholdMm :
      bp.operator === 'less_equal'    ? faceDimMm <= bp.thresholdMm :
      /* greater_equal */               faceDimMm >= bp.thresholdMm;
    if (matches) return bp.fontSizePt;
  }
  return null;
}

/* ── Row width sum ── */

export function sumRowWidthMm(
  texts: string[],
  fontSizePt: number,
  gapMm: number,
): number {
  let total = 0;
  for (let i = 0; i < texts.length; i++) {
    total += estimateTextWidthMm(texts[i], fontSizePt);
    if (i < texts.length - 1) total += gapMm;
  }
  return total;
}

/* ── Face dimension selector ── */

export function faceDimension(face: Face, boxW: number, boxH: number): number {
  return (face === 'left' || face === 'right') ? boxH : boxW;
}

export default {};
