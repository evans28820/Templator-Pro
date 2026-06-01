/**
 * Job and batch processing types.
 */

export type JobStatus = 'pending' | 'running' | 'done' | 'warning' | 'error';

export interface OrderRow {
  /** Row index in Excel (0-based from data start at row 3) */
  rowIndex: number;
  /** Artwork file path from Excel */
  artworkFile: string;
  /** Layer name for output */
  layerName: string;
  /** Box dimensions in mm */
  L: number;
  W: number;
  H: number;
  /** Dynamic fields — keyed by text frame name */
  fields: Record<string, string>;
  /** Visibility flags — keyed by group name */
  visibility: Record<string, boolean>;
  /** File name for output */
  fileName: string;
  /** Validation errors for this row */
  validationErrors: string[];
}

export interface JobRow {
  id: string;
  templateId: string;
  rowIndex: number;
  status: JobStatus;
  /** The generated JSX content to execute in Illustrator */
  jsxContent: string;
  /** Output file path after job completes */
  outputPath: string | null;
  /** Error or warning message */
  message: string | null;
  /** ISO timestamp of job start */
  startedAt: string | null;
  /** ISO timestamp of job completion */
  completedAt: string | null;
}

export interface JobMeta {
  templateId: string;
  rowIndex: number;
  layerName: string;
  fileName: string;
}

export interface JobProgressEvent {
  jobId: string;
  rowIndex: number;
  message: string;
}

export interface JobCompleteEvent {
  jobId: string;
  rowIndex: number;
  outputPath: string;
}

export interface JobErrorEvent {
  jobId: string;
  rowIndex: number;
  error: string;
}

export interface ExcelColumn {
  name: string;
  label: string;
  type: 'text' | 'number' | 'visibility';
  required: boolean;
  /** Column index in the generated Excel template */
  index: number;
}

export interface RawExcelRow {
  rowNumber: number;
  cells: Record<string, string | number | boolean | null>;
}
