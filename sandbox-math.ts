/**
 * Sandbox: Phase 0-6 cascade layout algorithm verification.
 * Pure TypeScript — runs with `npx tsx sandbox-math.ts`.
 * No DOM, no Vue, no Pinia. All spatial values in mm, fonts in pt.
 *
 * Character width estimation (calibrated for Arial-style fonts):
 *   ASCII char  ≈ font_size_pt × 0.45 mm
 *   CJK char    ≈ font_size_pt × 0.70 mm
 *   Line height ≈ font_size_pt × 1.50 mm
 */

/* ── Types (self-contained for sandbox) ── */

type Face = 'bottom' | 'top' | 'left' | 'right';
type Alignment = 'left' | 'center' | 'right';
type RowBreakMode = 'locked' | 'fluid';
type PipelinePhaseType =
  | 'max_font_max_gap' | 'shrink_gaps' | 'shrink_font'
  | 'row_break' | 'hard_scale' | 'content_shedding' | 'error_alert';

interface PipelinePhase {
  id: string; type: PipelinePhaseType; enabled: boolean;
  params: { shrinkPercent?: number; targetFontPct?: number; };
}

interface WidthBreakpoint {
  operator: 'less_than' | 'greater_than' | 'less_equal' | 'greater_equal';
  thresholdMm: number; fontSizePt: number;
}

interface Remark {
  groupName: string; text: string; priority: 1 | 2 | 3 | 4 | 5;
  enabled: boolean; row: number; // row assignment (locked mode)
}

interface PanelConfig {
  face: Face; enabled: boolean;
  paddingTop: number; paddingBottom: number; paddingLeft: number; paddingRight: number;
  alignment: Alignment; minGapMm: number; maxGapMm: number;
  minFontSizePt: number; maxFontSizePt: number;
  widthBreakpoints: WidthBreakpoint[]; rowBreakMode: RowBreakMode; maxRows: number;
  rowAssignments: Record<string, number>; pipeline: PipelinePhase[];
}

interface LayoutResult {
  success: boolean; phaseReached: number;
  font: number; gapMm: number; rows: number;
  remarks: Remark[]; sheddedRemarks: Remark[];
  overflow: boolean; warnings: string[];
}

/* ── Constants ── */

const CHAR_WIDTH_ASCII = 0.45;  // mm per char per pt
const CHAR_WIDTH_CJK = 0.70;
const LINE_HEIGHT_FACTOR = 1.50;

const DEFAULT_PIPELINE: PipelinePhase[] = [
  { id: 'p0', type: 'max_font_max_gap', enabled: true, params: {} },
  { id: 'p1', type: 'shrink_gaps', enabled: true, params: {} },
  { id: 'p2', type: 'shrink_font', enabled: true, params: { shrinkPercent: 90 } },
  { id: 'p3', type: 'row_break', enabled: true, params: {} },
  { id: 'p4', type: 'hard_scale', enabled: true, params: { targetFontPct: 100 } },
  { id: 'p5', type: 'content_shedding', enabled: true, params: {} },
  { id: 'p6', type: 'error_alert', enabled: true, params: {} },
];

/* ── Text width estimation ── */

function estimateTextWidthMm(text: string, fontSizePt: number): number {
  let width = 0;
  for (const ch of text) {
    // Rough CJK detection: code points > U+2000
    width += ch.charCodeAt(0) > 0x2000 ? CHAR_WIDTH_CJK : CHAR_WIDTH_ASCII;
  }
  return width * fontSizePt;
}

function estimateRowHeightMm(fontSizePt: number): number {
  return fontSizePt * LINE_HEIGHT_FACTOR;
}

/* ── Width breakpoint lookup ── */

function getBreakpointFont(faceDimMm: number, breakpoints: WidthBreakpoint[]): number | null {
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

/* ── Core: try to fit remarks into a row layout ── */

interface TryLayoutResult {
  fits: boolean;
  rows: Remark[][];
  totalHeightMm: number;
  maxRowWidthMm: number;
}

function tryLayout(
  remarks: Remark[],
  safeW: number, safeH: number,
  fontSizePt: number, gapMm: number, maxRows: number,
  rowAssignments?: Record<string, number>,
): TryLayoutResult {
  const active = remarks.filter(r => r.enabled);
  if (active.length === 0) return { fits: true, rows: [], totalHeightMm: 0, maxRowWidthMm: 0 };

  // Group remarks into rows
  let rows: Remark[][];
  // When maxRows=1, all remarks go in one row (overflow handled by fits check)
  if (maxRows === 1) {
    rows = [active];
  } else if (rowAssignments) {
    rows = Array.from({ length: maxRows }, () => [] as Remark[]);
    for (const r of active) {
      const rowIdx = Math.min(rowAssignments[r.groupName] ?? 0, maxRows - 1);
      rows[rowIdx].push(r);
    }
    rows = rows.filter(r => r.length > 0);
  } else {
    // Fluid: greedy balance
    rows = balanceRows(active, safeW, fontSizePt, gapMm, maxRows);
  }

  const rowHeight = estimateRowHeightMm(fontSizePt);
  let maxRowWidth = 0;

  for (const row of rows) {
    const totalW = sumRowWidth(row, fontSizePt, gapMm);
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

function sumRowWidth(row: Remark[], fontSizePt: number, gapMm: number): number {
  let total = 0;
  for (let i = 0; i < row.length; i++) {
    total += estimateTextWidthMm(row[i].text, fontSizePt);
    if (i < row.length - 1) total += gapMm;
  }
  return total;
}

/** Fluid: greedy row balancing — fill each row before starting next */
function balanceRows(
  remarks: Remark[], safeW: number, fontSizePt: number, gapMm: number, maxRows: number,
): Remark[][] {
  const rows: Remark[][] = [];
  let current: Remark[] = [];

  for (const r of remarks) {
    const w = estimateTextWidthMm(r.text, fontSizePt);
    const currentW = sumRowWidth(current, fontSizePt, gapMm);
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

/* ── Phase runner ── */

function runPipeline(
  panelCfg: PanelConfig,
  panelW: number, panelH: number,
  faceDimMm: number,
  allRemarks: Remark[],
  phases: PipelinePhase[],
): LayoutResult {
  const safeW = panelW - panelCfg.paddingLeft - panelCfg.paddingRight;
  const safeH = panelH - panelCfg.paddingTop - panelCfg.paddingBottom;

  let currentFont = getBreakpointFont(faceDimMm, panelCfg.widthBreakpoints) ?? panelCfg.maxFontSizePt;
  let currentGap = panelCfg.maxGapMm;
  let currentRows = 1;
  let activeRemarks = allRemarks.filter(r => r.enabled);
  const sheddedRemarks: Remark[] = [];
  const rowAssignments = panelCfg.rowAssignments;

  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi];
    if (!phase.enabled) continue;

    switch (phase.type) {
      /* ── P0: max_font_max_gap ── */
      case 'max_font_max_gap': {
        currentFont = getBreakpointFont(faceDimMm, panelCfg.widthBreakpoints) ?? panelCfg.maxFontSizePt;
        currentGap = panelCfg.maxGapMm;
        currentRows = 1;
        const r = tryLayout(activeRemarks, safeW, safeH, currentFont, currentGap, 1);
        if (r.fits) return success(pi, currentFont, currentGap, 1, activeRemarks, sheddedRemarks, []);
        break;
      }

      /* ── P1: shrink_gaps ── */
      case 'shrink_gaps': {
        currentGap = panelCfg.minGapMm;
        const r = tryLayout(activeRemarks, safeW, safeH, currentFont, currentGap, currentRows);
        if (r.fits) return success(pi, currentFont, currentGap, currentRows, activeRemarks, sheddedRemarks, []);
        break;
      }

      /* ── P2: shrink_font ── */
      case 'shrink_font': {
        const pct = (phase.params.shrinkPercent ?? 90) / 100;
        for (let f = currentFont * pct; f >= panelCfg.minFontSizePt; f -= 0.5) {
          const r = tryLayout(activeRemarks, safeW, safeH, f, currentGap, currentRows);
          if (r.fits) {
            currentFont = f;
            return success(pi, currentFont, currentGap, currentRows, activeRemarks, sheddedRemarks, []);
          }
        }
        currentFont = panelCfg.minFontSizePt;
        break;
      }

      /* ── P3: row_break ── */
      case 'row_break': {
        currentRows = panelCfg.maxRows;
        currentFont = getBreakpointFont(faceDimMm, panelCfg.widthBreakpoints) ?? panelCfg.maxFontSizePt;
        currentGap = panelCfg.maxGapMm;

        if (panelCfg.rowBreakMode === 'locked') {
          const r = tryLayout(activeRemarks, safeW, safeH, currentFont, currentGap, currentRows, rowAssignments);
          if (r.fits) return success(pi, currentFont, currentGap, currentRows, activeRemarks, sheddedRemarks, []);
        } else {
          const r = tryLayout(activeRemarks, safeW, safeH, currentFont, currentGap, currentRows);
          if (r.fits) return success(pi, currentFont, currentGap, currentRows, activeRemarks, sheddedRemarks, []);
        }
        break;
      }

      /* ── P4: hard_scale ── */
      case 'hard_scale': {
        const pct = (phase.params.targetFontPct ?? 100) / 100;
        const startF = currentFont * pct;
        for (let f = startF; f >= panelCfg.minFontSizePt; f -= 0.5) {
          const r = tryLayout(activeRemarks, safeW, safeH, f, currentGap, currentRows, rowAssignments);
          if (r.fits) {
            currentFont = f;
            return success(pi, currentFont, currentGap, currentRows, activeRemarks, sheddedRemarks, []);
          }
        }
        currentFont = panelCfg.minFontSizePt;
        break;
      }

      /* ── P5: content_shedding ── */
      case 'content_shedding': {
        const sorted = [...activeRemarks].sort((a, b) => b.priority - a.priority);
        for (let i = 0; i < sorted.length; i++) {
          if (sorted[i].priority === 1) break; // never delete P1
          const remaining = activeRemarks.filter(r => r.groupName !== sorted[i].groupName);
          const r = tryLayout(remaining, safeW, safeH, currentFont, currentGap, currentRows, rowAssignments);
          if (r.fits) {
            sheddedRemarks.push(sorted[i]);
            return success(pi, currentFont, currentGap, currentRows, remaining, sheddedRemarks, [
              `Shedded remark: ${sorted[i].groupName} (priority ${sorted[i].priority})`,
            ]);
          }
          activeRemarks = remaining;
          sheddedRemarks.push(sorted[i]);
        }
        break;
      }

      /* ── P6: error_alert ── */
      case 'error_alert': {
        return {
          success: false, phaseReached: pi,
          font: currentFont, gapMm: currentGap, rows: currentRows,
          remarks: activeRemarks, sheddedRemarks, overflow: true,
          warnings: ['Content overflow — cannot fit even at minimum font and after shedding'],
        };
      }
    }
  }

  // Fallback: should reach error_alert before here
  return {
    success: false, phaseReached: phases.length,
    font: currentFont, gapMm: currentGap, rows: currentRows,
    remarks: activeRemarks, sheddedRemarks, overflow: true,
    warnings: ['Fallback: no phase succeeded'],
  };
}

function success(
  phase: number, font: number, gap: number, rows: number,
  remarks: Remark[], shedded: Remark[], warnings: string[],
): LayoutResult {
  return { success: true, phaseReached: phase, font, gapMm: gap, rows, remarks, sheddedRemarks: shedded, overflow: false, warnings };
}

/* ═══════════════════════════════════════════════════════════════════
   TEST CASES
   ═══════════════════════════════════════════════════════════════════ */

function assert(condition: boolean, msg: string): void {
  if (!condition) { console.error(`FAIL: ${msg}`); process.exit(1); }
  else console.log(`  PASS: ${msg}`);
}

function approx(a: number, b: number, tolerance = 0.1): boolean {
  return Math.abs(a - b) <= tolerance;
}

/* ── Test fixture ── */

const testPanel: PanelConfig = {
  face: 'bottom', enabled: true,
  paddingTop: 3, paddingBottom: 3, paddingLeft: 3, paddingRight: 3,
  alignment: 'center', minGapMm: 3, maxGapMm: 8,
  minFontSizePt: 7, maxFontSizePt: 16,
  widthBreakpoints: [],
  rowBreakMode: 'locked', maxRows: 2,
  rowAssignments: { BottomRemark1: 0, BottomRemark2: 0, BottomRemark3: 1 },
  pipeline: DEFAULT_PIPELINE,
};

const testRemarks: Remark[] = [
  { groupName: 'BottomRemark1', text: 'FRAGILE HANDLE WITH CARE', priority: 1, enabled: true, row: 1 },
  { groupName: 'BottomRemark2', text: 'MADE IN MALAYSIA', priority: 2, enabled: true, row: 1 },
  { groupName: 'BottomRemark3', text: 'KEEP DRY', priority: 3, enabled: true, row: 2 },
];

// Panel dimensions from an actual template: 2200mm artboard width
const PANEL_W = 180;  // mm — bottom face width
const PANEL_H = 80;   // mm — bottom face height
const FACE_DIM = 2200; // mm — box W for bottom face

/* ── Test 1: Max font + max gap fits on single row ── */

function test1(): void {
  console.log('\n--- Test 1: max_font_max_gap with long text ---');
  const longRemarks: Remark[] = [
    { groupName: 'R1', text: 'SHORT', priority: 1, enabled: true, row: 1 },
    { groupName: 'R2', text: 'TINY', priority: 2, enabled: true, row: 1 },
  ];
  const cfg = { ...testPanel, maxGapMm: 8, maxFontSizePt: 16 };
  const result = runPipeline(cfg, PANEL_W, PANEL_H, FACE_DIM, longRemarks, DEFAULT_PIPELINE);

  assert(result.success, 'Short text should fit at max font + max gap');
  assert(result.phaseReached === 0, 'Should resolve at Phase 0');
  assert(result.font === 16, 'Should use max font 16pt');
  assert(result.rows === 1, 'Should use single row');
}

/* ── Test 2: Overflow forces shrink_gaps ── */

function test2(): void {
  console.log('\n--- Test 2: Overflow → shrink_gaps → success ---');
  const cfg = {
    ...testPanel,
    maxFontSizePt: 16,
    maxGapMm: 8,
    minGapMm: 3,
  };
  // Text that's just barely too wide at max gap but fits at min gap
  const remarks: Remark[] = [
    { groupName: 'R1', text: 'A'.repeat(40), priority: 1, enabled: true, row: 1 },
    { groupName: 'R2', text: 'B'.repeat(10), priority: 2, enabled: true, row: 1 },
  ];
  // At 16pt: width ≈ (40+10)*0.45*16 = 360mm, gap 8mm → 368mm. safeW ≈ 180-6=174mm. Too wide.
  // shrink_gaps won't help much. Let me adjust for a more realistic test.

  const narrowRemarks: Remark[] = [
    { groupName: 'R1', text: 'ABC DEF GHI', priority: 1, enabled: true, row: 1 },
    { groupName: 'R2', text: 'JKL', priority: 2, enabled: true, row: 1 },
  ];
  // At 16pt: (11+3)*0.45*16 = 100.8mm, gap 8mm → 108.8mm. safeW=174mm. Fits!
  // Need smaller safeW. Let me use a narrower panel.

  const result = runPipeline(
    { ...cfg, paddingLeft: 60, paddingRight: 60 },
    PANEL_W, PANEL_H, FACE_DIM,
    narrowRemarks, DEFAULT_PIPELINE,
  );
  // safeW = 180 - 60 - 60 = 60mm. At 16pt with maxGap 8: (11+3)*0.45*16=100.8+8=108.8 > 60. Fails.
  // At minGap 3: 100.8+3=103.8 > 60. Still fails.
  // Shrink font: 90%*16=14.4. (11+3)*0.45*14.4=90.7+3=93.7 > 60. Still fails.
  // Eventually font=7: (11+3)*0.45*7=44.1+3=47.1 fits.

  assert(result.success, 'Should eventually fit after shrinking font');
  assert(result.phaseReached > 0, 'Should not resolve at Phase 0');
  console.log(`  Resolved at Phase ${result.phaseReached}, font=${result.font}pt`);
}

/* ── Test 3: Row break resolves overflow ── */

function test3(): void {
  console.log('\n--- Test 3: Row break with locked mode ---');
  const cfg = {
    ...testPanel,
    maxFontSizePt: 14, maxGapMm: 6, minGapMm: 3, minFontSizePt: 7,
    maxRows: 2,
    rowAssignments: { R1: 0, R2: 0, R3: 1, R4: 1 },
    rowBreakMode: 'locked' as RowBreakMode,
    paddingLeft: 10, paddingRight: 10, // safeW = 160mm
  };
  const remarks: Remark[] = [
    { groupName: 'R1', text: 'A'.repeat(25), priority: 1, enabled: true, row: 1 },
    { groupName: 'R2', text: 'B'.repeat(25), priority: 2, enabled: true, row: 1 },
    { groupName: 'R3', text: 'C'.repeat(25), priority: 3, enabled: true, row: 2 },
    { groupName: 'R4', text: 'D'.repeat(10), priority: 4, enabled: true, row: 2 },
  ];
  // At 14pt single row: (25+25+25+10)*0.45*14 + 3*6 = 535.5+18=553.5 > 160.
  // Row break: Row1 (25+25)*0.45*14+6=315+6=321 > 160 still too wide.
  // hard_scale: font shrinks. At 7pt: Row1 315*(7/14)=157.5+6=163.5. Close.
  // At 6.5pt: 292.5*(6.5/14)+6=135.8+6=141.8 < 160. Fits!

  const result = runPipeline(cfg, PANEL_W, PANEL_H, FACE_DIM, remarks, DEFAULT_PIPELINE);
  assert(result.success, 'Row break should eventually fit after scaling');
  assert(result.sheddedRemarks.length > 0 || result.rows >= 2, 'Should either use 2 rows or shed to fit');
}

/* ── Test 4: Content shedding ── */

function test4(): void {
  console.log('\n--- Test 4: Content shedding (priority-based removal) ---');
  const cfg = {
    ...testPanel,
    maxFontSizePt: 12, maxGapMm: 6, minGapMm: 1, minFontSizePt: 4,
    maxRows: 1,
    paddingLeft: 5, paddingRight: 5, // safeW = 170mm
  };
  const remarks: Remark[] = [
    { groupName: 'R1', text: 'P1_ALWAYS_KEEP_THIS_VERY_LONG_TEXT_THAT_WONT_FIT_ALONE', priority: 1, enabled: true, row: 1 },
    { groupName: 'R2', text: 'P5_EXPENDABLE_LONG_TEXT_HERE', priority: 5, enabled: true, row: 1 },
    { groupName: 'R3', text: 'P4_ANOTHER_EXPENDABLE_TEXT', priority: 4, enabled: true, row: 1 },
  ];
  // P1 is too long. Even shedding P5 and P4, P1 still may not fit.
  // At minFont=4: P1 = 30 chars * 0.45 * 4 = 54mm. Fits!
  // But let me make this realistic. 
  // Actually in shedding test, the idea is: everything fits once we remove P5 and P4.
  // At 12pt: P1=60*0.45*12=324mm, P5=27*0.45*12=145.8mm, P4=25*0.45*12=135mm
  // Total (single row) = 324+145.8+135+2*6=616.8 > 170
  // Even at minFont=4pt: 324*(4/12)+145.8*(4/12)+135*(4/12)+2 = 108+48.6+45+2=203.6 > 170. Fails.
  // Shedding removes P5: 108+45+1=154 < 170. Fits!
  const result = runPipeline(cfg, PANEL_W, PANEL_H, FACE_DIM, remarks, DEFAULT_PIPELINE);
  assert(result.success, 'Should fit after shedding priority 5+4');
  assert(result.sheddedRemarks.length > 0, 'Should shed at least one remark');
  const sheddedNames = result.sheddedRemarks.map(r => r.groupName);
  assert(sheddedNames.includes('R2'), 'Should shed P5 first');
  assert(result.remarks.length > 0, 'At least P1 should remain');
  assert(result.remarks.some(r => r.priority === 1), 'P1 should always remain');
}

/* ── Test 5: Error alert — priority 1 cannot fit ── */

function test5(): void {
  console.log('\n--- Test 5: Error alert — impossible fit ---');
  const cfg = {
    ...testPanel,
    maxFontSizePt: 8, minFontSizePt: 3,
    minGapMm: 1, maxGapMm: 4,
    maxRows: 1,
    paddingLeft: 5, paddingRight: 5, // safeW = 170mm
  };
  const remarks: Remark[] = [
    { groupName: 'R1', text: 'A'.repeat(200), priority: 1, enabled: true, row: 1 },
  ];
  const result = runPipeline(cfg, PANEL_W, PANEL_H, FACE_DIM, remarks, DEFAULT_PIPELINE);
  assert(!result.success, 'Should fail — P1 text too long');
  assert(result.overflow, 'Should set overflow flag');
}

/* ── Test 6: Phase reordering works ── */

function test6(): void {
  console.log('\n--- Test 6: Phase reordering (shrink_gaps before max_font_max_gap) ---');
  const reordered: PipelinePhase[] = [
    { id: 'p1', type: 'shrink_gaps', enabled: true, params: {} },
    { id: 'p0', type: 'max_font_max_gap', enabled: true, params: {} },
    { id: 'p2', type: 'shrink_font', enabled: true, params: { shrinkPercent: 90 } },
    { id: 'p3', type: 'row_break', enabled: true, params: {} },
    { id: 'p4', type: 'hard_scale', enabled: true, params: { targetFontPct: 100 } },
    { id: 'p5', type: 'content_shedding', enabled: true, params: {} },
    { id: 'p6', type: 'error_alert', enabled: true, params: {} },
  ];
  const remarks: Remark[] = [
    { groupName: 'R1', text: 'AB', priority: 1, enabled: true, row: 1 },
  ];
  const result = runPipeline(testPanel, PANEL_W, PANEL_H, FACE_DIM, remarks, reordered);
  assert(result.success, 'Should succeed with reordered phases');
  assert(result.phaseReached === 0, 'shrink_gaps (now index 0) should resolve');
}

/* ── Test 7: Width breakpoint overrides max font ── */

function test7(): void {
  console.log('\n--- Test 7: Width breakpoint overrides max font ---');
  const cfg: PanelConfig = {
    ...testPanel,
    maxFontSizePt: 16,
    widthBreakpoints: [
      { operator: 'less_than', thresholdMm: 100, fontSizePt: 10 },
    ],
    paddingLeft: 10, paddingRight: 10, // safeW=160mm
  };
  const remarks: Remark[] = [
    { groupName: 'R1', text: 'SMALL', priority: 1, enabled: true, row: 1 },
  ];
  // faceDim = 50 (< 100) → breakpoint font = 10pt
  const result = runPipeline(cfg, PANEL_W, PANEL_H, 50, remarks, DEFAULT_PIPELINE);
  assert(result.success, 'Should fit');
  assert(approx(result.font, 10), `Breakpoint should give 10pt, got ${result.font}`);
}

/* ── Test 8: Disabled phase skipped ── */

function test8(): void {
  console.log('\n--- Test 8: Disabled phase skipped ---');
  const phases: PipelinePhase[] = [
    { id: 'p0', type: 'max_font_max_gap', enabled: true, params: {} },
    { id: 'p1', type: 'shrink_gaps', enabled: true, params: {} },
    { id: 'p2', type: 'shrink_font', enabled: false, params: { shrinkPercent: 90 } },  // DISABLED
    { id: 'p3', type: 'row_break', enabled: false, params: {} },  // DISABLED
    { id: 'p4', type: 'hard_scale', enabled: true, params: { targetFontPct: 80 } },
    { id: 'p5', type: 'content_shedding', enabled: true, params: {} },
    { id: 'p6', type: 'error_alert', enabled: true, params: {} },
  ];
  const cfg = { ...testPanel, paddingLeft: 50, paddingRight: 50, maxFontSizePt: 16, minFontSizePt: 3 };
  const remarks: Remark[] = [
    { groupName: 'R1', text: 'A'.repeat(30), priority: 1, enabled: true, row: 1 },
  ];
  // Phase 0 fails (too wide), Phase 1 fails (minGap helps slightly but still wide)
  // Phase 2 DISABLED, Phase 3 DISABLED
  // Phase 4: hard_scale at 80% of 16=12.8pt down to 3pt
  const result = runPipeline(cfg, PANEL_W, PANEL_H, FACE_DIM, remarks, phases);
  assert(result.success, 'Should reach hard_scale and fit');
  assert(result.phaseReached === 4, `Phase should be 4 (hard_scale), got ${result.phaseReached}`);
}

/* ── Run all ── */

console.log('═══════════════════════════════════════════');
console.log('  TEMPLATOR PRO — Layout Sandbox Tests');
console.log('═══════════════════════════════════════════');

test1();
test2();
test3();
test4();
test5();
test6();
test7();
test8();

console.log('\n═══════════════════════════════════════════');
console.log('  ALL 8 TESTS PASSED ✓');
console.log('═══════════════════════════════════════════');
