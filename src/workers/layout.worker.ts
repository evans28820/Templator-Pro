/**
 * Phase 0-6 cascade layout algorithm — Web Worker.
 * Pure math, zero DOM access, zero Pinia access.
 * All spatial values in mm, font sizes in pt.
 *
 * Receives LayoutWorkerInput, returns LayoutWorkerResult.
 */

import type { PanelConfig, PipelinePhase } from '../types';
import {
  estimateTextWidthMm,
  estimateRowHeightMm,
  getBreakpointFont,
  sumRowWidthMm,
  faceDimension,
} from '../utils/mathUtils';

/* ── Worker I/O types ── */

export interface RemarkInput {
  groupName: string;
  text: string;
  priority: 1 | 2 | 3 | 4 | 5;
  enabled: boolean;
}

export interface LayoutWorkerInput {
  panelConfig: PanelConfig;
  boxW: number;
  boxH: number;
  remarks: RemarkInput[];
  pipeline: PipelinePhase[];
}

export interface LayoutWorkerResult {
  success: boolean;
  layout: RemarkLayout[];
  warnings: string[];
  phaseReached: number;
}

export interface RemarkLayout {
  groupName: string;
  font: number;
  x: number;
  y: number;
  row: number;
  enabled: boolean;
  shedded: boolean;
}

/* ── Internal types ── */

interface InternalRemark {
  groupName: string;
  text: string;
  priority: 1 | 2 | 3 | 4 | 5;
  enabled: boolean;
}

interface TryLayoutResult {
  fits: boolean;
  rows: InternalRemark[][];
  totalHeightMm: number;
  maxRowWidthMm: number;
}

/* ── Row balancing ── */

function tryLayout(
  remarks: InternalRemark[],
  safeW: number,
  safeH: number,
  fontSizePt: number,
  gapMm: number,
  maxRows: number,
  rowAssignments?: Record<string, number>,
  rowBreakMode?: 'locked' | 'fluid',
): TryLayoutResult {
  const active = remarks.filter(r => r.enabled);
  if (active.length === 0) {
    return { fits: true, rows: [], totalHeightMm: 0, maxRowWidthMm: 0 };
  }

  let rows: InternalRemark[][];

  if (maxRows === 1) {
    rows = [active];
  } else if (rowBreakMode === 'locked' && rowAssignments) {
    rows = Array.from({ length: maxRows }, () => [] as InternalRemark[]);
    for (const r of active) {
      const rowIdx = Math.min(rowAssignments[r.groupName] ?? 0, maxRows - 1);
      rows[rowIdx].push(r);
    }
    rows = rows.filter(r => r.length > 0);
  } else {
    rows = balanceRows(active, safeW, fontSizePt, gapMm, maxRows);
  }

  const rowHeight = estimateRowHeightMm(fontSizePt);
  let maxRowWidth = 0;

  for (const row of rows) {
    const texts = row.map(r => r.text);
    const totalW = sumRowWidthMm(texts, fontSizePt, gapMm);
    if (totalW > safeW) return { fits: false, rows, totalHeightMm: 0, maxRowWidthMm: totalW };
    if (totalW > maxRowWidth) maxRowWidth = totalW;
  }

  const totalHeight = rows.length * rowHeight;
  return {
    fits: totalHeight <= safeH,
    rows,
    totalHeightMm: totalHeight,
    maxRowWidthMm: maxRowWidth,
  };
}

function balanceRows(
  remarks: InternalRemark[],
  safeW: number,
  fontSizePt: number,
  gapMm: number,
  maxRows: number,
): InternalRemark[][] {
  const rows: InternalRemark[][] = [];
  let current: InternalRemark[] = [];

  for (const r of remarks) {
    const w = estimateTextWidthMm(r.text, fontSizePt);
    const texts = current.map(c => c.text);
    const currentW = sumRowWidthMm(texts, fontSizePt, gapMm);
    const candidateW = currentW + (current.length > 0 ? gapMm : 0) + w;

    if (candidateW <= safeW) {
      current.push(r);
    } else {
      if (current.length > 0) rows.push(current);
      current = [r];
    }
    if (rows.length >= maxRows) break;
  }
  if (current.length > 0 && rows.length < maxRows) rows.push(current);
  return rows;
}

/* ── Alignment position calculator ── */

function computeAlignment(
  rowWidthMm: number,
  safeW: number,
  paddingLeft: number,
  alignment: 'left' | 'center' | 'right',
): number {
  switch (alignment) {
    case 'left':   return paddingLeft;
    case 'center': return paddingLeft + (safeW - rowWidthMm) / 2;
    case 'right':  return paddingLeft + safeW - rowWidthMm;
  }
}

/* ── Build layout from row assignment ── */

function buildLayout(
  rows: InternalRemark[][],
  fontSizePt: number,
  gapMm: number,
  safeW: number,
  panelConfig: PanelConfig,
  allRemarks: RemarkInput[],
  sheddedGroupNames: string[],
): RemarkLayout[] {
  const layout: RemarkLayout[] = [];
  const rowHeight = estimateRowHeightMm(fontSizePt);

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const texts = row.map(r => r.text);
    const totalW = sumRowWidthMm(texts, fontSizePt, gapMm);
    const startX = computeAlignment(totalW, safeW, panelConfig.paddingLeft, panelConfig.alignment);

    let cursorX = startX;
    for (const remark of row) {
      layout.push({
        groupName: remark.groupName,
        font: fontSizePt,
        x: cursorX,
        y: panelConfig.paddingTop + rowIdx * rowHeight,
        row: rowIdx,
        enabled: true,
        shedded: false,
      });
      cursorX += estimateTextWidthMm(remark.text, fontSizePt) + gapMm;
    }
  }

  // Mark shedded remarks
  for (const name of sheddedGroupNames) {
    layout.push({
      groupName: name,
      font: fontSizePt,
      x: 0, y: 0, row: -1,
      enabled: false,
      shedded: true,
    });
  }

  // Mark disabled remarks
  for (const r of allRemarks) {
    if (!r.enabled && !layout.some(l => l.groupName === r.groupName)) {
      layout.push({
        groupName: r.groupName,
        font: fontSizePt,
        x: 0, y: 0, row: -1,
        enabled: false,
        shedded: false,
      });
    }
  }

  return layout;
}

/* ── Main pipeline runner ── */

export function runLayoutPipeline(input: LayoutWorkerInput): LayoutWorkerResult {
  const { panelConfig, boxW, boxH, remarks, pipeline } = input;

  if (!panelConfig.enabled) {
    return {
      success: false,
      layout: [],
      warnings: ['Panel is disabled'],
      phaseReached: -1,
    };
  }

  const panelW = panelConfig.face === 'left' || panelConfig.face === 'right' ? boxH : boxW;
  const panelH = panelConfig.face === 'left' || panelConfig.face === 'right' ? boxW : boxH;
  const faceDim = faceDimension(panelConfig.face, boxW, boxH);
  const safeW = panelW - panelConfig.paddingLeft - panelConfig.paddingRight;
  const safeH = panelH - panelConfig.paddingTop - panelConfig.paddingBottom;

  let currentFont = getBreakpointFont(faceDim, panelConfig.widthBreakpoints) ?? panelConfig.maxFontSizePt;
  let currentGap = panelConfig.maxGapMm;
  let currentRows = 1;
  let activeRemarks = remarks.filter(r => r.enabled);
  const sheddedNames: string[] = [];

  for (let pi = 0; pi < pipeline.length; pi++) {
    const phase = pipeline[pi];
    if (!phase.enabled) continue;

    switch (phase.type) {
      case 'max_font_max_gap': {
        currentFont = getBreakpointFont(faceDim, panelConfig.widthBreakpoints) ?? panelConfig.maxFontSizePt;
        currentGap = panelConfig.maxGapMm;
        currentRows = 1;
        const r = tryLayout(activeRemarks, safeW, safeH, currentFont, currentGap, 1);
        if (r.fits) return {
          success: true,
          layout: buildLayout(r.rows, currentFont, currentGap, safeW, panelConfig, remarks, sheddedNames),
          warnings: [],
          phaseReached: pi,
        };
        break;
      }

      case 'shrink_gaps': {
        currentGap = panelConfig.minGapMm;
        const r = tryLayout(activeRemarks, safeW, safeH, currentFont, currentGap, currentRows);
        if (r.fits) return {
          success: true,
          layout: buildLayout(r.rows, currentFont, currentGap, safeW, panelConfig, remarks, sheddedNames),
          warnings: [],
          phaseReached: pi,
        };
        break;
      }

      case 'shrink_font': {
        const pct = (phase.params.shrinkPercent ?? 90) / 100;
        for (let f = currentFont * pct; f >= panelConfig.minFontSizePt; f -= 0.5) {
          const r = tryLayout(activeRemarks, safeW, safeH, f, currentGap, currentRows);
          if (r.fits) {
            currentFont = f;
            return {
              success: true,
              layout: buildLayout(r.rows, currentFont, currentGap, safeW, panelConfig, remarks, sheddedNames),
              warnings: [],
              phaseReached: pi,
            };
          }
        }
        currentFont = panelConfig.minFontSizePt;
        break;
      }

      case 'row_break': {
        currentRows = panelConfig.maxRows;
        currentFont = getBreakpointFont(faceDim, panelConfig.widthBreakpoints) ?? panelConfig.maxFontSizePt;
        currentGap = panelConfig.maxGapMm;
        const r = tryLayout(
          activeRemarks, safeW, safeH, currentFont, currentGap,
          currentRows, panelConfig.rowAssignments, panelConfig.rowBreakMode,
        );
        if (r.fits) return {
          success: true,
          layout: buildLayout(r.rows, currentFont, currentGap, safeW, panelConfig, remarks, sheddedNames),
          warnings: [],
          phaseReached: pi,
        };
        break;
      }

      case 'hard_scale': {
        const pct = (phase.params.targetFontPct ?? 100) / 100;
        const startF = currentFont * pct;
        for (let f = startF; f >= panelConfig.minFontSizePt; f -= 0.5) {
          const r = tryLayout(
            activeRemarks, safeW, safeH, f, currentGap,
            currentRows, panelConfig.rowAssignments, panelConfig.rowBreakMode,
          );
          if (r.fits) {
            currentFont = f;
            return {
              success: true,
              layout: buildLayout(r.rows, currentFont, currentGap, safeW, panelConfig, remarks, sheddedNames),
              warnings: [],
              phaseReached: pi,
            };
          }
        }
        currentFont = panelConfig.minFontSizePt;
        break;
      }

      case 'content_shedding': {
        const sorted = [...activeRemarks].sort((a, b) => b.priority - a.priority);
        for (let i = 0; i < sorted.length; i++) {
          if (sorted[i].priority === 1) break;
          const remaining = activeRemarks.filter(r => r.groupName !== sorted[i].groupName);
          const r = tryLayout(
            remaining, safeW, safeH, currentFont, currentGap,
            currentRows, panelConfig.rowAssignments, panelConfig.rowBreakMode,
          );
          if (r.fits) {
            sheddedNames.push(sorted[i].groupName);
            return {
              success: true,
              layout: buildLayout(r.rows, currentFont, currentGap, safeW, panelConfig, remarks, sheddedNames),
              warnings: [`Shedded: ${sorted[i].groupName} (priority ${sorted[i].priority})`],
              phaseReached: pi,
            };
          }
          activeRemarks = remaining;
          sheddedNames.push(sorted[i].groupName);
        }
        break;
      }

      case 'error_alert': {
        return {
          success: false,
          layout: buildLayout([activeRemarks], currentFont, currentGap, safeW, panelConfig, remarks, sheddedNames),
          warnings: ['Content overflow — cannot fit even at minimum font and after shedding'],
          phaseReached: pi,
        };
      }
    }
  }

  return {
    success: false,
    layout: buildLayout([activeRemarks], currentFont, currentGap, safeW, panelConfig, remarks, sheddedNames),
    warnings: ['Fallback: no phase succeeded'],
    phaseReached: pipeline.length,
  };
}
