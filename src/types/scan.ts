/**
 * Scan result types — derived from Illustrator .ai file analysis.
 * All spatial measurements in mm.
 */

/** Node types discovered during scan */
export type TreeNodeType = 'group' | 'textFrame' | 'pathItem' | 'compoundPath';

export interface TreeNode {
  id: string;
  name: string;
  type: TreeNodeType;
  /** Geometric bounds in mm relative to artboard origin (top-left) */
  x: number;
  y: number;
  w: number;
  h: number;
  children: TreeNode[];
  /** True if this text frame should be included in Excel output */
  includeInExcel: boolean;
  /** True if font can be scaled down to fit */
  canShrink: boolean;
  /** Text content for TextFrame nodes */
  content?: string;
  /** Expanded/collapsed state in layer tree UI */
  expanded: boolean;
  /** Grayed out — not selectable for config */
  readOnly: boolean;
}

export interface ScannedTextFrame {
  name: string;
  content: string;
  /** Bounding box in mm */
  x: number;
  y: number;
  w: number;
  h: number;
  /** True for frames with no .name property (static design elements) */
  isUnnamed: boolean;
  /** True for read-only fields like 'Type' */
  readOnly: boolean;
}

export interface BoxDimensions {
  /** Box length in mm */
  L: number;
  /** Box width in mm */
  W: number;
  /** Box height in mm */
  H: number;
}

export interface BoxTypeInfo {
  type: 'TOP OPEN' | 'TOP & BOTTOM';
  /** Ear width in mm, relevant for TOP OPEN only */
  earMm?: number;
}

export interface ScanResult {
  /** Absolute path to the scanned .ai file */
  aiFilePath: string;
  /** MD5 hash of aiFilePath — used as config key */
  fileHash: string;
  /** Full layer tree from Illustrator */
  tree: TreeNode[];
  /** Flat list of all named text frames in Remark group */
  textFrames: ScannedTextFrame[];
  /** Artboard dimensions in mm */
  artboardWidth: number;
  artboardHeight: number;
  /** Box type detected from 'Type' text frame */
  boxType: BoxTypeInfo | null;
  /** Box dimensions from Excel or manual entry in mm */
  boxDimensions: BoxDimensions | null;
  /** Base64-encoded PNG preview of the artboard */
  previewImageBase64: string | null;
  /** Layer names found in the document */
  layerNames: string[];
  /** ISO timestamp of when scan completed */
  scannedAt: string;
}

export type FieldType = 'text' | 'dimension' | 'visibility' | 'readonly';

export interface FieldConfig {
  name: string;
  type: FieldType;
  includeInExcel: boolean;
  columnLabel: string;
  readOnly: boolean;
  /** True for auto-calculated fields like XPoint, YPoint */
  autoCalculated: boolean;
}

/** Conversion constant: 1 mm = 2.83465 pt */
export const MM_TO_PT = 2.83465;
