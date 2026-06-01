/**
 * Panel-level configuration types.
 * All spatial measurements in mm, font sizes in pt.
 */

export type PipelinePhaseType =
  | 'max_font_max_gap'
  | 'shrink_gaps'
  | 'shrink_font'
  | 'row_break'
  | 'hard_scale'
  | 'content_shedding'
  | 'error_alert';

export interface PipelinePhase {
  id: string;
  type: PipelinePhaseType;
  enabled: boolean;
  params: {
    /** Used by shrink_font phase (default: 90) */
    shrinkPercent?: number;
    /** Used by hard_scale phase (default: 100) */
    targetFontPct?: number;
  };
}

export interface WidthBreakpoint {
  id: string;
  operator: 'less_than' | 'greater_than' | 'less_equal' | 'greater_equal';
  /** Breakpoint threshold in mm */
  thresholdMm: number;
  /** Target font size in pt when breakpoint matches */
  fontSizePt: number;
}

export interface RemarkConfig {
  /** e.g. 'LeftRemark1', 'BottomRemark4' */
  groupName: string;
  /** 1 = most important, never delete; 5 = least important, delete first */
  priority: 1 | 2 | 3 | 4 | 5;
  enabled: boolean;
  /** Row number for Locked Mode (1 or 2) */
  row: number;
}

export type Face = 'bottom' | 'top' | 'left' | 'right';
export type Alignment = 'left' | 'center' | 'right';
export type RowBreakMode = 'locked' | 'fluid';

export interface PanelConfig {
  face: Face;
  enabled: boolean;

  /** Safe zone padding — all four directions in mm */
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;

  /** Row group alignment within safe zone */
  alignment: Alignment;

  /** Gap between remarks within a row in mm */
  minGapMm: number;
  maxGapMm: number;

  /** Font size range in pt */
  minFontSizePt: number;
  maxFontSizePt: number;

  /** Width-based font size overrides.
   *  Face dimension used: Left/Right = box H, Bottom/Top = box W */
  widthBreakpoints: WidthBreakpoint[];

  /** Row break configuration */
  rowBreakMode: RowBreakMode;
  maxRows: number;

  /** Remark-to-row assignments (Locked Mode only).
   *  Key = remark group name, value = row number */
  rowAssignments: Record<string, number>;

  /** Pipeline override */
  usePanelPipeline: boolean;
  pipeline: PipelinePhase[];

  /** Remarks in this panel, ordered by priority */
  remarks: RemarkConfig[];
}

export const DEFAULT_PIPELINE: PipelinePhase[] = [
  { id: 'p0', type: 'max_font_max_gap', enabled: true, params: {} },
  { id: 'p1', type: 'shrink_gaps', enabled: true, params: {} },
  { id: 'p2', type: 'shrink_font', enabled: true, params: { shrinkPercent: 90 } },
  { id: 'p3', type: 'row_break', enabled: true, params: {} },
  { id: 'p4', type: 'hard_scale', enabled: true, params: { targetFontPct: 100 } },
  { id: 'p5', type: 'content_shedding', enabled: true, params: {} },
  { id: 'p6', type: 'error_alert', enabled: true, params: {} },
];

/** Default panel config values (mm for spatial, pt for fonts) */
export const PANEL_DEFAULTS = {
  paddingTop: 3,
  paddingBottom: 3,
  paddingLeft: 3,
  paddingRight: 3,
  alignment: 'center' as Alignment,
  minGapMm: 3,
  maxGapMm: 8,
  minFontSizePt: 7,
  maxFontSizePt: 16,
  maxRows: 2,
  rowBreakMode: 'locked' as RowBreakMode,
} as const;
