/**
 * Central type re-exports.
 * All shared TypeScript interfaces — zero `any`, zero compile errors.
 */

export type {
  PipelinePhaseType,
  PipelinePhase,
  WidthBreakpoint,
  RemarkConfig,
  Face,
  Alignment,
  RowBreakMode,
  PanelConfig,
} from './panel';
export { DEFAULT_PIPELINE, PANEL_DEFAULTS } from './panel';

export type {
  TreeNodeType,
  TreeNode,
  ScannedTextFrame,
  BoxDimensions,
  BoxTypeInfo,
  ScanResult,
  FieldType,
  FieldConfig,
} from './scan';
export { MM_TO_PT } from './scan';

export type {
  JobStatus,
  OrderRow,
  JobRow,
  JobMeta,
  JobProgressEvent,
  JobCompleteEvent,
  JobErrorEvent,
  ExcelColumn,
  RawExcelRow,
} from './job';

export type {
  FileFilter,
  IllustratorInfo,
  SavedConfig,
  NodeConfig,
  TemplatorAPI,
} from './ipc';
export { IPC_CHANNELS } from './ipc';
