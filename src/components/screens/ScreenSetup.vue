<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTemplateStore } from '../../stores/template.store';
import { useSettingsStore } from '../../stores/settings.store';
import type { Face, PipelinePhase, TreeNode } from '../../types';
import { DEFAULT_PIPELINE, PANEL_DEFAULTS } from '../../types';
import AppTopBar from '../layout/AppTopBar.vue';
import ResizeDivider from '../layout/ResizeDivider.vue';
import CanvasPreview from '../ui/CanvasPreview.vue';
import LayerTree from '../ui/LayerTree.vue';
import PanelConfigPanel from '../ui/PanelConfigPanel.vue';
import NodeConfigPanel from '../ui/NodeConfigPanel.vue';
import PipelineEditor from '../ui/PipelineEditor.vue';

const templateStore = useTemplateStore();
const settingsStore = useSettingsStore();

const colWidths = ref([55, 22, 23]);
const isScanning = ref(false);

function onResizeLeft(delta: number): void {
  const total = colWidths.value[0] + colWidths.value[1];
  colWidths.value[0] = Math.max(25, Math.min(85, colWidths.value[0] + delta / 4));
  colWidths.value[1] = total - colWidths.value[0];
}

function onResizeRight(delta: number): void {
  const total = colWidths.value[1] + colWidths.value[2];
  colWidths.value[1] = Math.max(15, Math.min(50, colWidths.value[1] + delta / 4));
  colWidths.value[2] = total - colWidths.value[1];
}

const showPipelineSection = ref(false);
const showSettingsSection = ref(false);
const selectedFace = ref<Face>('bottom');

const configuredFaces = computed(() => {
  const s = new Set<string>();
  for (const [face, cfg] of Object.entries(templateStore.panelConfigs)) {
    if (!cfg || !cfg.enabled) continue;
    if (cfg.paddingTop !== PANEL_DEFAULTS.paddingTop) s.add(face);
    else if (cfg.minFontSizePt !== PANEL_DEFAULTS.minFontSizePt) s.add(face);
    else if (cfg.maxFontSizePt !== PANEL_DEFAULTS.maxFontSizePt) s.add(face);
    else if (cfg.remarks.length > 0) s.add(face);
  }
  return s;
});

const isFaceNode = computed(() => {
  const node = templateStore.selectedNode;
  if (!node) return false;
  return ['bottom', 'top', 'left', 'right'].includes(node.name.toLowerCase());
});

function onSelectNode(nodeId: string | null): void {
  templateStore.selectNode(nodeId);
  if (nodeId) {
    const node = templateStore.selectedNode;
    if (node) {
      const name = node.name.toLowerCase();
      if (['bottom', 'top', 'left', 'right'].includes(name)) {
        selectedFace.value = name as Face;
      }
    }
  }
}

function updateGlobalPipeline(phases: PipelinePhase[]): void {
  templateStore.updateGlobalPipeline(phases);
}

const topBarInfo = computed(() => {
  const scan = templateStore.scanResult;
  if (!scan) return { show: false, fileName: '', boxType: '', dimensions: '', savedAgo: '' };
  return {
    show: true,
    fileName: scan.aiFilePath.split(/[/\\]/).pop() || scan.aiFilePath,
    boxType: scan.boxType?.type || '',
    dimensions: `${scan.artboardWidth.toFixed(0)} × ${scan.artboardHeight.toFixed(1)} mm`,
    savedAgo: 'X',
  };
});

/** Drag & drop .ai file handler */
async function onFileDrop(e: DragEvent): Promise<void> {
  const file = (e.dataTransfer?.files?.[0] ?? null) as (File & { path?: string }) | null;
  if (!file || !file.path || !file.name.endsWith('.ai')) return;
  isScanning.value = true;
  try {
    const result = await window.templatorAPI.scanAiFile(file.path);
    templateStore.setScanResult(result);
    templateStore.initPanelConfigsFromScan(result.tree);
  } catch (err) {
    console.error('Scan failed:', err);
    templateStore.scanError = err instanceof Error ? err.message : 'Scan failed';
  } finally {
    isScanning.value = false;
  }
}

async function selectAiFile(): Promise<void> {
  try {
    const filePath = await window.templatorAPI.openFileDialog([
      { name: 'Adobe Illustrator', extensions: ['ai'] },
    ]);
    if (!filePath) return;
    isScanning.value = true;
    try {
      const result = await window.templatorAPI.scanAiFile(filePath);
      templateStore.setScanResult(result);
      templateStore.initPanelConfigsFromScan(result.tree);
      settingsStore.setOutputPath(filePath);
    } catch (err) {
      console.error('Scan failed:', err);
      templateStore.scanError = err instanceof Error ? err.message : 'Scan failed';
    } finally {
      isScanning.value = false;
    }
  } catch {
    // cancelled
  }
}

function generateExcel(): void {
  // Phase 4
}

/* ── FIX 6: Click field → focus canvas ── */
function findNodesByName(nodes: TreeNode[], name: string): TreeNode[] {
  const r: TreeNode[] = [];
  walk(nodes, name, r);
  return r;
}
function walk(nodes: TreeNode[], name: string, out: TreeNode[]): void {
  for (const n of nodes) { if (n.name === name) out.push(n); walk(n.children, name, out); }
}
const fieldCycleIndex = ref<Record<string, number>>({});
function focusField(fieldName: string): void {
  const nodes = findNodesByName(templateStore.scanResult?.tree ?? [], fieldName);
  if (nodes.length === 0) return;
  const idx = fieldCycleIndex.value[fieldName] ?? 0;
  const next = (idx + 1) % nodes.length;
  fieldCycleIndex.value[fieldName] = next;
  templateStore.selectNode(nodes[idx].id);
}
</script>

<template>
  <div class="screen-setup">
    <!-- ═══ WELCOME LANDING (no scan yet) ═══ -->
    <template v-if="!templateStore.scanResult">
      <div
        class="welcome"
        @dragover.prevent
        @drop.prevent="onFileDrop"
      >
        <div class="welcome-box">
          <div class="welcome-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#569cd6" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 class="welcome-title">Templator Pro</h1>
          <p class="welcome-sub">Select an Adobe Illustrator template to get started</p>

          <button
            class="scan-btn"
            :disabled="isScanning"
            @click="selectAiFile"
          >
            <span v-if="isScanning" class="spinner"></span>
            {{ isScanning ? 'Scanning...' : 'Select .ai file' }}
          </button>

          <p class="welcome-hint">
            Or drag & drop an <code>.ai</code> file here
          </p>

          <div v-if="templateStore.scanError" class="welcome-error">
            ⚠ {{ templateStore.scanError }}
          </div>
        </div>
      </div>
    </template>

    <!-- ═══ EDITOR (after scan) ═══ -->
    <template v-else>
      <AppTopBar
        v-bind="topBarInfo"
        @change-file="selectAiFile"
        @rescan="selectAiFile"
      />

      <div class="preview-section">
        <div class="col" :style="{ width: colWidths[0] + '%' }">
          <CanvasPreview @select-node="onSelectNode" />
        </div>

        <ResizeDivider side="right" @resize="onResizeLeft" />

        <div class="col" :style="{ width: colWidths[1] + '%' }">
          <LayerTree
            :tree="templateStore.scanResult?.tree ?? []"
            :selected-id="templateStore.selectedNodeId"
            :configured-faces="configuredFaces"
            @select-node="onSelectNode"
          />
        </div>

        <ResizeDivider side="right" @resize="onResizeRight" />

        <div class="col" :style="{ width: colWidths[2] + '%' }">
          <template v-if="isFaceNode && templateStore.selectedNode">
            <PanelConfigPanel :face="selectedFace" />
          </template>
          <template v-else>
            <NodeConfigPanel />
          </template>
        </div>
      </div>

      <!-- Pipeline -->
      <div class="section">
        <div class="section-header" @click="showPipelineSection = !showPipelineSection">
          <span class="section-num">5</span><span>PIPELINE</span>
          <span class="section-toggle">{{ showPipelineSection ? '▼' : '▶' }}</span>
        </div>
        <div v-if="showPipelineSection" class="section-body">
          <p class="section-desc">Global pipeline — applies to all panels unless overridden</p>
          <div class="pipeline-global-controls">
            <label>Global row break:
              <select :value="templateStore.globalRowBreakMode"
                @change="templateStore.setGlobalRowBreakMode(($event.target as HTMLSelectElement).value as 'locked' | 'fluid')">
                <option value="locked">Locked</option><option value="fluid">Fluid</option>
              </select>
            </label>
            <label>Max rows:
              <input type="number" :value="templateStore.globalMaxRows" min="1" max="5"
                @change="templateStore.setGlobalMaxRows(Number(($event.target as HTMLInputElement).value))" />
            </label>
          </div>
          <PipelineEditor :phases="templateStore.globalPipeline" @update="updateGlobalPipeline" />
          <button class="reset-btn" @click="templateStore.updateGlobalPipeline([...DEFAULT_PIPELINE])">Reset</button>
        </div>
      </div>

      <!-- Settings -->
      <div class="section">
        <div class="section-header" @click="showSettingsSection = !showSettingsSection">
          <span class="section-num">4</span><span>SETTINGS</span>
          <span class="section-toggle">{{ showSettingsSection ? '▼' : '▶' }}</span>
        </div>
        <div v-if="showSettingsSection" class="section-body">
          <div class="setting-row">
            <label>Icon library (.ai)</label>
            <div class="setting-path">
              <input type="text" :value="settingsStore.iconLibraryPath" readonly placeholder="Path to month-icon .ai file..." />
              <button @click="selectAiFile">Browse</button>
            </div>
          </div>
          <div class="setting-row">
            <label>Output folder</label>
            <div class="setting-path">
              <input type="text" :value="settingsStore.outputPath" readonly placeholder="Where to save individual .ai + .tif files..." />
              <button @click="selectAiFile">Browse</button>
            </div>
          </div>
          <div class="setting-row">
            <label>Master output path</label>
            <div class="setting-path">
              <input type="text" :value="settingsStore.masterOutputPath" readonly placeholder="Where to save the master multi-artboard .ai file..." />
              <button @click="selectAiFile">Browse</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Text fields -->
      <div class="section">
        <div class="section-header">
          <span class="section-num">3</span><span>DETECTED TEXT FIELDS</span>
        </div>
        <div class="section-body">
          <p class="section-desc">Unnamed frames are skipped (static design elements). Grey = read-only.</p>
          <table class="fields-table">
            <thead>
              <tr><th>In Excel?</th><th>Field name</th><th>Current content</th><th>Notes</th></tr>
            </thead>
            <tbody>
              <!-- FIX 6: clickable field rows -->
              <tr v-for="tf in templateStore.scanResult?.textFrames ?? []" :key="tf.name" :class="{ readonly: tf.readOnly, clickable: !tf.readOnly && tf.name }" @click="!tf.readOnly && tf.name && focusField(tf.name)">
                <td><input v-if="!tf.readOnly" type="checkbox" checked /><span v-else>–</span></td>
                <td>{{ tf.name || '&lt;unnamed&gt;' }}</td>
                <td>{{ tf.content || '(empty)' }}</td>
                <td class="notes">
                  <template v-if="tf.readOnly">Read-only — box type identifier</template>
                  <template v-else-if="!tf.name">Static design element</template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <button class="generate-btn" @click="generateExcel">Generate Excel template →</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.screen-setup {
  display: flex; flex-direction: column; height: 100%; overflow: hidden;
}

/* ═══ Welcome ═══ */
.welcome {
  flex: 1; display: flex; align-items: center; justify-content: center;
  background: var(--bg-primary);
}
.welcome-box {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  padding: 48px; border: 2px dashed var(--border-primary);
  border-radius: 16px; background: var(--bg-secondary);
  min-width: 380px; transition: border-color .2s;
}
.welcome-box:hover { border-color: var(--accent); }
.welcome-icon svg { opacity: .7; }
.welcome-title { font-size: 28px; font-weight: 300; color: var(--text-primary); margin: 0; }
.welcome-sub { font-size: 13px; color: var(--text-secondary); margin: 0; }
.scan-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 32px; border: none; border-radius: 8px;
  background: var(--accent); color: #fff;
  font-size: 15px; font-weight: 600; cursor: pointer; transition: background .15s;
}
.scan-btn:hover:not(:disabled) { background: var(--accent-hover); }
.scan-btn:disabled { opacity: .6; cursor: wait; }
.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.welcome-hint { font-size: 12px; color: var(--text-muted); margin: 0; }
.welcome-hint code { color: var(--text-secondary); background: var(--bg-primary); padding: 1px 6px; border-radius: 3px; }
.welcome-error { color: var(--danger); font-size: 12px; padding: 8px 16px; background: var(--danger-bg); border-radius: 6px; }

/* ═══ Editor ═══ */
.preview-section { display: flex; flex: 1; min-height: 0; overflow: hidden; }
.col { overflow: hidden; display: flex; flex-direction: column; }
.section { border-top: 1px solid var(--border-primary); flex-shrink: 0; }
.section-header {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; background: var(--bg-secondary);
  cursor: pointer; font-size: 12px;
  color: var(--text-primary); font-weight: 600;
}
.section-header:hover { background: var(--bg-hover); }
.section-num { color: var(--text-muted); font-size: 11px; }
.section-toggle { margin-left: auto; color: var(--text-muted); font-size: 10px; }
.section-body { padding: 10px 12px; max-height: 250px; overflow-y: auto; }
.section-desc { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; }
.pipeline-global-controls { display: flex; gap: 24px; margin-bottom: 8px; }
.pipeline-global-controls label { font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
.pipeline-global-controls select,
.pipeline-global-controls input {
  padding: 2px 6px; background: var(--bg-input);
  border: 1px solid var(--border-primary); border-radius: 3px;
  color: var(--text-primary); font-size: 11px; width: 70px;
}
.reset-btn {
  margin-top: 6px; padding: 4px 12px;
  border: 1px solid var(--border-primary); border-radius: 4px;
  background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 11px;
}
.reset-btn:hover { background: var(--bg-hover); }
.setting-row { margin-bottom: 10px; }
.setting-row label { font-size: 11px; color: var(--text-secondary); display: block; margin-bottom: 4px; }
.setting-path { display: flex; gap: 6px; }
.setting-path input {
  flex: 1; padding: 4px 8px; background: var(--bg-input);
  border: 1px solid var(--border-primary); border-radius: 3px;
  color: var(--text-primary); font-size: 12px;
}
.setting-path button {
  padding: 4px 12px; border: 1px solid var(--border-primary); border-radius: 3px;
  background: var(--bg-tertiary); color: var(--text-secondary); cursor: pointer; font-size: 11px;
}
.setting-path button:hover { background: var(--bg-hover); }
.fields-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.fields-table th {
  text-align: left; padding: 4px 8px; color: var(--text-muted);
  font-weight: 600; border-bottom: 1px solid var(--border-primary);
}
.fields-table td { padding: 4px 8px; border-bottom: 1px solid var(--bg-secondary); color: var(--text-primary); }
.fields-table tr.readonly td { color: var(--text-muted); }
.fields-table tr.clickable { cursor: pointer; }
.fields-table tr.clickable:hover td { background: var(--bg-hover); }
.fields-table .notes { color: var(--text-muted); font-size: 11px; font-style: italic; }
.generate-btn {
  display: block; width: 100%; padding: 10px;
  border: 2px solid var(--accent); border-radius: 6px;
  background: var(--accent-bg); color: var(--accent);
  cursor: pointer; font-size: 14px; font-weight: 600;
}
.generate-btn:hover { background: var(--accent); color: #fff; }
</style>
