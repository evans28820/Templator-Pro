<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTemplateStore } from '../../stores/template.store';
import { useSettingsStore } from '../../stores/settings.store';
import type { Face, PipelinePhase } from '../../types';
import { DEFAULT_PIPELINE } from '../../types';
import AppTopBar from '../layout/AppTopBar.vue';
import ResizeDivider from '../layout/ResizeDivider.vue';
import CanvasPreview from '../ui/CanvasPreview.vue';
import LayerTree from '../ui/LayerTree.vue';
import PanelConfigPanel from '../ui/PanelConfigPanel.vue';
import NodeConfigPanel from '../ui/NodeConfigPanel.vue';
import PipelineEditor from '../ui/PipelineEditor.vue';

const templateStore = useTemplateStore();
const settingsStore = useSettingsStore();

/* ── Column widths ── */
const colWidths = ref([42, 28, 30]);

function onResizeLeft(delta: number): void {
  const total = colWidths.value[0] + colWidths.value[1];
  colWidths.value[0] = Math.max(20, Math.min(60, colWidths.value[0] + delta / 4));
  colWidths.value[1] = total - colWidths.value[0];
}

function onResizeRight(delta: number): void {
  const total = colWidths.value[1] + colWidths.value[2];
  colWidths.value[1] = Math.max(15, Math.min(50, colWidths.value[1] + delta / 4));
  colWidths.value[2] = total - colWidths.value[1];
}

/* ── Section visibility ── */
const showPipelineSection = ref(false);
const showSettingsSection = ref(false);

/* ── Selected face for config panel ── */
const selectedFace = ref<Face>('bottom');

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

/* ── Pipeline ── */
function updateGlobalPipeline(phases: PipelinePhase[]): void {
  templateStore.updateGlobalPipeline(phases);
}

/* ── Top bar computed ── */
const topBarInfo = computed(() => {
  const scan = templateStore.scanResult;
  if (!scan) return { show: false, fileName: '', boxType: '', dimensions: '', savedAgo: '' };
  return {
    show: true,
    fileName: scan.aiFilePath.split(/[/\\]/).pop() || scan.aiFilePath,
    boxType: scan.boxType?.type || '',
    dimensions: `${scan.artboardWidth.toFixed(0)} × ${scan.artboardHeight.toFixed(1)} mm`,
    savedAgo: 'X', // TODO: real relative time
  };
});

/* ── Scan file selection ── */
async function selectAiFile(): Promise<void> {
  try {
    const filePath = await window.templatorAPI.openFileDialog([
      { name: 'Adobe Illustrator', extensions: ['ai'] },
    ]);
    if (filePath) {
      // Phase 4: actual scan
      settingsStore.setOutputPath(filePath);
    }
  } catch {
    // dialog cancelled
  }
}

function generateExcel(): void {
  // Phase 4 implementation
}
</script>

<template>
  <div class="screen-setup">
    <!-- Top bar -->
    <AppTopBar
      v-bind="topBarInfo"
      @change-file="selectAiFile"
      @rescan="selectAiFile"
    />

    <!-- Preview section: 3 columns -->
    <div class="preview-section">
      <!-- Column 1: Canvas -->
      <div class="col" :style="{ width: colWidths[0] + '%' }">
        <CanvasPreview @select-node="onSelectNode" />
      </div>

      <ResizeDivider side="right" @resize="onResizeLeft" />

      <!-- Column 2: Tree -->
      <div class="col" :style="{ width: colWidths[1] + '%' }">
        <LayerTree
          :tree="templateStore.scanResult?.tree ?? []"
          :selected-id="templateStore.selectedNodeId"
          @select-node="onSelectNode"
        />
      </div>

      <ResizeDivider side="right" @resize="onResizeRight" />

      <!-- Column 3: Config panel -->
      <div class="col" :style="{ width: colWidths[2] + '%' }">
        <template v-if="isFaceNode && templateStore.selectedNode">
          <PanelConfigPanel :face="selectedFace" />
        </template>
        <template v-else>
          <NodeConfigPanel />
        </template>
      </div>
    </div>

    <!-- Pipeline section (collapsible) -->
    <div class="section">
      <div class="section-header" @click="showPipelineSection = !showPipelineSection">
        <span class="section-num">5</span>
        <span>PIPELINE</span>
        <span class="section-toggle">{{ showPipelineSection ? '▼' : '▶' }}</span>
      </div>
      <div v-if="showPipelineSection" class="section-body">
        <p class="section-desc">Global pipeline — applies to all panels unless overridden</p>
        <div class="pipeline-global-controls">
          <label>Global row break:
            <select :value="templateStore.globalRowBreakMode"
              @change="templateStore.setGlobalRowBreakMode(($event.target as HTMLSelectElement).value as 'locked' | 'fluid')">
              <option value="locked">Locked</option>
              <option value="fluid">Fluid</option>
            </select>
          </label>
          <label>Max rows:
            <input type="number" :value="templateStore.globalMaxRows" min="1" max="5"
              @change="templateStore.setGlobalMaxRows(Number(($event.target as HTMLInputElement).value))" />
          </label>
        </div>
        <PipelineEditor :phases="templateStore.globalPipeline" @update="updateGlobalPipeline" />
        <button class="reset-btn" @click="templateStore.updateGlobalPipeline([...DEFAULT_PIPELINE])">Reset to defaults</button>
      </div>
    </div>

    <!-- Settings section (collapsible) -->
    <div class="section">
      <div class="section-header" @click="showSettingsSection = !showSettingsSection">
        <span class="section-num">4</span>
        <span>SETTINGS</span>
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
          <label>Output folder (individual files)</label>
          <div class="setting-path">
            <input type="text" :value="settingsStore.outputPath" readonly placeholder="Where to save individual .ai + .tif files..." />
            <button @click="selectAiFile">Browse</button>
          </div>
        </div>
        <div class="setting-row">
          <label>Master output path (all artboards combined)</label>
          <div class="setting-path">
            <input type="text" :value="settingsStore.masterOutputPath" readonly placeholder="Where to save the master multi-artboard .ai file..." />
            <button @click="selectAiFile">Browse</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detected text fields -->
    <div class="section">
      <div class="section-header">
        <span class="section-num">3</span>
        <span>DETECTED TEXT FIELDS</span>
      </div>
      <div class="section-body">
        <p class="section-desc">Unnamed frames are skipped (static design elements). Grey = read-only.</p>
        <div v-if="!templateStore.scanResult" class="empty-note">Scan a file to detect text fields</div>
        <table v-else class="fields-table">
          <thead>
            <tr>
              <th>In Excel?</th>
              <th>Field name</th>
              <th>Current content</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tf in templateStore.scanResult.textFrames" :key="tf.name" :class="{ readonly: tf.readOnly }">
              <td>
                <input v-if="!tf.readOnly" type="checkbox" :checked="!tf.isUnnamed" />
                <span v-else>–</span>
              </td>
              <td>{{ tf.name || '<unnamed>' }}</td>
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

    <!-- Generate Excel -->
    <div class="section">
      <button class="generate-btn" @click="generateExcel">Generate Excel template →</button>
    </div>
  </div>
</template>

<style scoped>
.screen-setup {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.preview-section {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.col {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
/* Collapsible sections */
.section {
  border-top: 1px solid #3c3c3c;
  flex-shrink: 0;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #252526;
  cursor: pointer;
  font-size: 12px;
  color: #e0e0e0;
  font-weight: 600;
}
.section-header:hover { background: #2a2d2e; }
.section-num { color: #888; font-size: 11px; }
.section-toggle { margin-left: auto; color: #888; font-size: 10px; }
.section-body { padding: 10px 12px; max-height: 250px; overflow-y: auto; }
.section-desc { font-size: 11px; color: #888; margin-bottom: 8px; }
.pipeline-global-controls {
  display: flex;
  gap: 24px;
  margin-bottom: 8px;
}
.pipeline-global-controls label {
  font-size: 11px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
}
.pipeline-global-controls select,
.pipeline-global-controls input {
  padding: 2px 6px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 11px;
  width: 70px;
}
.reset-btn {
  margin-top: 6px;
  padding: 4px 12px;
  border: 1px solid #555;
  border-radius: 4px;
  background: transparent;
  color: #888;
  cursor: pointer;
  font-size: 11px;
}
.reset-btn:hover { background: #3c3c3c; }
.setting-row {
  margin-bottom: 10px;
}
.setting-row label {
  font-size: 11px;
  color: #aaa;
  display: block;
  margin-bottom: 4px;
}
.setting-path {
  display: flex;
  gap: 6px;
}
.setting-path input {
  flex: 1;
  padding: 4px 8px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 12px;
}
.setting-path button {
  padding: 4px 12px;
  border: 1px solid #555;
  border-radius: 3px;
  background: #2d2d2d;
  color: #ccc;
  cursor: pointer;
  font-size: 11px;
}
.setting-path button:hover { background: #3c3c3c; }
.fields-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.fields-table th {
  text-align: left;
  padding: 4px 8px;
  color: #888;
  font-weight: 600;
  border-bottom: 1px solid #3c3c3c;
}
.fields-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #252526;
  color: #d4d4d4;
}
.fields-table tr.readonly td { color: #666; }
.fields-table .notes { color: #666; font-size: 11px; font-style: italic; }
.empty-note { color: #555; font-size: 12px; padding: 8px 0; }
.generate-btn {
  display: block;
  width: 100%;
  padding: 10px;
  border: 2px solid #0e639c;
  border-radius: 6px;
  background: #094771;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
.generate-btn:hover { background: #0e639c; }
</style>
