import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ScanResult,
  TreeNode,
  PanelConfig,
  PipelinePhase,
  FieldConfig,
  Face,
  RowBreakMode,
} from '../types';
import { DEFAULT_PIPELINE, PANEL_DEFAULTS } from '../types';

export const useTemplateStore = defineStore('template', () => {
  /* ── State ── */
  const scanResult = ref<ScanResult | null>(null);
  const panelConfigs = ref<Record<string, PanelConfig>>({});
  const nodeConfigs = ref<Record<string, NodeConfig>>({});
  const fieldConfigs = ref<FieldConfig[]>([]);
  const globalPipeline = ref<PipelinePhase[]>([...DEFAULT_PIPELINE]);
  const globalRowBreakMode = ref<RowBreakMode>('locked');
  const globalMaxRows = ref(2);
  const selectedNodeId = ref<string | null>(null);
  const scanError = ref<string | null>(null);

  /* ── Getters ── */
  const hasScanResult = computed(() => scanResult.value !== null);

  const selectedNode = computed(() => {
    if (!scanResult.value || !selectedNodeId.value) return null;
    return findNodeById(scanResult.value.tree, selectedNodeId.value);
  });

  const facePanels = computed(() => {
    const faces: Face[] = ['bottom', 'top', 'left', 'right'];
    return faces.map(face => panelConfigs.value[face]).filter(Boolean) as PanelConfig[];
  });

  /* ── Actions ── */
  function setScanResult(result: ScanResult): void {
    scanResult.value = result;
  }

  function clearScanResult(): void {
    scanResult.value = null;
    selectedNodeId.value = null;
  }

  function setPanelConfig(face: string, updates: Partial<PanelConfig>): void {
    if (!panelConfigs.value[face]) {
      panelConfigs.value[face] = createDefaultPanelConfig(face as Face);
    }
    Object.assign(panelConfigs.value[face], updates);
  }

  function applyPanelConfigToAll(sourceFace: string, fields: (keyof PanelConfig)[]): void {
    const source = panelConfigs.value[sourceFace];
    if (!source) return;
    for (const [face, config] of Object.entries(panelConfigs.value)) {
      if (face === sourceFace) continue;
      for (const field of fields) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config as unknown as Record<string, unknown>)[field as string] =
          (source as unknown as Record<string, unknown>)[field as string];
      }
    }
  }

  function enablePerPanelPipeline(face: string): void {
    if (!panelConfigs.value[face]) return;
    const config = panelConfigs.value[face];
    config.usePanelPipeline = true;
    config.pipeline = globalPipeline.value.map(p => ({ ...p, params: { ...p.params } }));
  }

  function initPanelConfigsFromScan(_tree: TreeNode[]): void {
    const faces: Face[] = ['bottom', 'top', 'left', 'right'];
    for (const face of faces) {
      if (!panelConfigs.value[face]) {
        panelConfigs.value[face] = createDefaultPanelConfig(face);
      }
    }
  }

  function updateGlobalPipeline(phases: PipelinePhase[]): void {
    globalPipeline.value = phases;
  }

  function setGlobalRowBreakMode(mode: RowBreakMode): void {
    globalRowBreakMode.value = mode;
  }

  function setGlobalMaxRows(rows: number): void {
    globalMaxRows.value = rows;
  }

  function selectNode(nodeId: string | null): void {
    selectedNodeId.value = nodeId;
  }

  function reset(): void {
    scanResult.value = null;
    panelConfigs.value = {};
    nodeConfigs.value = {};
    fieldConfigs.value = [];
    globalPipeline.value = [...DEFAULT_PIPELINE];
    globalRowBreakMode.value = 'locked';
    globalMaxRows.value = 2;
    selectedNodeId.value = null;
    scanError.value = null;
  }

  return {
    scanResult,
    panelConfigs,
    nodeConfigs,
    fieldConfigs,
    globalPipeline,
    globalRowBreakMode,
    globalMaxRows,
    selectedNodeId,
    scanError,
    hasScanResult,
    selectedNode,
    facePanels,
    setScanResult,
    clearScanResult,
    setPanelConfig,
    applyPanelConfigToAll,
    enablePerPanelPipeline,
    initPanelConfigsFromScan,
    updateGlobalPipeline,
    setGlobalRowBreakMode,
    setGlobalMaxRows,
    selectNode,
    reset,
  };
});

/* ── Internal helpers ── */

interface NodeConfig {
  nodeId: string;
  nodeName: string;
  enabled: boolean;
  canShrink: boolean;
  shrinkMode?: 'proportional' | 'fontOnly';
  minSizeMm?: number;
  minFontSizePt?: number;
  allow2LineWrap: boolean;
  priority: 1 | 2 | 3 | 4 | 5;
  includeInExcel: boolean;
  columnLabel: string;
}

function createDefaultPanelConfig(face: Face): PanelConfig {
  return {
    face,
    enabled: true,
    paddingTop: PANEL_DEFAULTS.paddingTop,
    paddingBottom: PANEL_DEFAULTS.paddingBottom,
    paddingLeft: PANEL_DEFAULTS.paddingLeft,
    paddingRight: PANEL_DEFAULTS.paddingRight,
    alignment: PANEL_DEFAULTS.alignment,
    minGapMm: PANEL_DEFAULTS.minGapMm,
    maxGapMm: PANEL_DEFAULTS.maxGapMm,
    minFontSizePt: PANEL_DEFAULTS.minFontSizePt,
    maxFontSizePt: PANEL_DEFAULTS.maxFontSizePt,
    widthBreakpoints: [],
    rowBreakMode: PANEL_DEFAULTS.rowBreakMode,
    maxRows: PANEL_DEFAULTS.maxRows,
    rowAssignments: {},
    usePanelPipeline: false,
    pipeline: [],
    remarks: [],
  };
}

function findNodeById(nodes: TreeNode[], targetId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    const found = findNodeById(node.children, targetId);
    if (found) return found;
  }
  return null;
}
