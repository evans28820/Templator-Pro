/**
 * IPC bridge type definitions.
 * All renderer↔main communication uses these typed channels.
 * Direct ipcRenderer calls in components are forbidden.
 */

import type { ScanResult } from './scan';
import type { JobMeta, JobProgressEvent, JobCompleteEvent, JobErrorEvent, ExcelColumn, RawExcelRow } from './job';
import type { PanelConfig, PipelinePhase } from './panel';
import type { FieldConfig } from './scan';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface IllustratorInfo {
  installed: boolean;
  version: string;
  path: string | null;
}

export interface SavedConfig {
  aiFilePath: string;
  savedAt: string;
  appVersion: string;
  panelConfigs: Record<string, PanelConfig>;
  nodeConfigs: Record<string, NodeConfig>;
  fieldConfigs: FieldConfig[];
  globalPipeline: PipelinePhase[];
  globalRowBreakMode: 'locked' | 'fluid';
  globalMaxRows: number;
  scanMeta: {
    artboardWidth: number;
    artboardHeight: number;
    boxType: string;
    layerNames: string[];
    previewImagePath: string | null;
  };
}

export interface NodeConfig {
  nodeId: string;
  nodeName: string;
  enabled: boolean;
  canShrink: boolean;
  shrinkMode?: 'proportional' | 'fontOnly';
  minSizeMm?: number;
  allow2LineWrap: boolean;
  priority: 1 | 2 | 3 | 4 | 5;
  includeInExcel: boolean;
  columnLabel: string;
}

export interface TemplatorAPI {
  /* ── File dialogs ── */
  openFileDialog(filters: FileFilter[]): Promise<string | null>;
  openFolderDialog(): Promise<string | null>;
  saveFileDialog(filters: FileFilter[]): Promise<string | null>;

  /* ── Illustrator operations (queued) ── */
  scanAiFile(filePath: string): Promise<ScanResult>;
  enqueueJob(jsx: string, meta: JobMeta): Promise<string>;
  cancelJobs(templateId: string): Promise<void>;

  /* ── Config persistence ── */
  loadConfig(aiFilePath: string): Promise<SavedConfig | null>;
  saveConfig(aiFilePath: string, config: SavedConfig): Promise<void>;

  /* ── Excel ── */
  parseExcel(buffer: ArrayBuffer): Promise<RawExcelRow[]>;
  generateExcel(columns: ExcelColumn[], outputPath: string): Promise<void>;

  /* ── Status ── */
  getIllustratorStatus(): Promise<IllustratorInfo>;

  /* ── Event listeners (returns unsubscribe function) ── */
  onJobProgress(cb: (data: JobProgressEvent) => void): () => void;
  onJobComplete(cb: (data: JobCompleteEvent) => void): () => void;
  onJobError(cb: (data: JobErrorEvent) => void): () => void;
}

/** IPC channel name constants — single source of truth */
export const IPC_CHANNELS = {
  OPEN_FILE_DIALOG: 'dialog:openFile',
  OPEN_FOLDER_DIALOG: 'dialog:openFolder',
  SAVE_FILE_DIALOG: 'dialog:saveFile',
  SCAN_AI_FILE: 'ai:scan',
  ENQUEUE_JOB: 'job:enqueue',
  CANCEL_JOBS: 'job:cancel',
  LOAD_CONFIG: 'config:load',
  SAVE_CONFIG: 'config:save',
  PARSE_EXCEL: 'excel:parse',
  GENERATE_EXCEL: 'excel:generate',
  ILLUSTRATOR_STATUS: 'ai:status',

  /* main → renderer events */
  JOB_PROGRESS: 'job:progress',
  JOB_COMPLETE: 'job:complete',
  JOB_ERROR: 'job:error',
  JOB_QUEUE: 'job:queue',
} as const;
