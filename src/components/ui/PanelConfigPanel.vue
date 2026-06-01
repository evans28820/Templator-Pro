<script setup lang="ts">
import { computed } from 'vue';
import { useTemplateStore } from '../../stores/template.store';
import { PANEL_DEFAULTS } from '../../types';
import type { PanelConfig, Alignment, RowBreakMode, Face } from '../../types';
import WidthBreakpointList from './WidthBreakpointList.vue';
import PipelineEditor from './PipelineEditor.vue';

const props = defineProps<{ face: Face }>();

const store = useTemplateStore();

const config = computed(() => {
  const c = store.panelConfigs[props.face];
  if (!c) {
    const defaults = createDefaults(props.face);
    store.setPanelConfig(props.face, defaults);
    return defaults;
  }
  return c;
});

function createDefaults(face: Face): PanelConfig {
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
    rowBreakMode: store.globalRowBreakMode,
    maxRows: store.globalMaxRows,
    rowAssignments: {},
    usePanelPipeline: false,
    pipeline: [],
    remarks: [],
  };
}

function updateField<K extends keyof PanelConfig>(field: K, value: PanelConfig[K]): void {
  store.setPanelConfig(props.face, { [field]: value });
}

function getDimensions(): string {
  const scan = store.scanResult;
  if (!scan) return '— × — mm';
  const w = scan.artboardWidth;
  const h = scan.artboardHeight;
  return `${w.toFixed(1)} × ${h.toFixed(1)} mm`;
}

const faceLabel = computed(() => props.face.charAt(0).toUpperCase() + props.face.slice(1));

function applyPaddingToAll(): void {
  store.applyPanelConfigToAll(props.face, [
    'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  ]);
}

function applyFontRangeToAll(): void {
  store.applyPanelConfigToAll(props.face, ['minFontSizePt', 'maxFontSizePt']);
}

function copyAllSettingsToAll(): void {
  store.applyPanelConfigToAll(props.face, [
    'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'alignment', 'minGapMm', 'maxGapMm',
    'minFontSizePt', 'maxFontSizePt',
    'rowBreakMode', 'maxRows',
  ]);
}

function onTogglePipeline(val: boolean): void {
  if (val) {
    store.enablePerPanelPipeline(props.face);
  } else {
    store.setPanelConfig(props.face, { usePanelPipeline: false, pipeline: [] });
  }
}
</script>

<template>
  <div class="panel-config">
    <!-- Header -->
    <div class="config-header">
      <span class="config-icon">●</span>
      <span class="config-title">{{ faceLabel }}</span>
      <span class="config-type">GroupItem</span>
    </div>
    <div class="config-dims">{{ getDimensions() }}</div>
    <hr class="config-divider" />

    <!-- Enabled toggle -->
    <div class="config-row">
      <label class="config-label">ENABLED</label>
      <button
        class="toggle-btn"
        :class="{ active: config.enabled }"
        @click="updateField('enabled', !config.enabled)"
      >
        {{ config.enabled ? 'Yes' : 'No' }}
      </button>
    </div>

    <hr class="config-divider" />

    <!-- Safe zone padding -->
    <label class="section-label">SAFE ZONE PADDING (mm)</label>
    <div class="padding-grid">
      <div class="padding-cell empty" />
      <div class="padding-cell">
        <label>Top</label>
        <input
          type="number"
          :value="config.paddingTop"
          min="0"
          max="50"
          step="0.5"
          @change="updateField('paddingTop', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="padding-cell empty" />
      <div class="padding-cell">
        <label>Left</label>
        <input
          type="number"
          :value="config.paddingLeft"
          min="0"
          max="50"
          step="0.5"
          @change="updateField('paddingLeft', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="padding-cell center-cell" />
      <div class="padding-cell">
        <label>Right</label>
        <input
          type="number"
          :value="config.paddingRight"
          min="0"
          max="50"
          step="0.5"
          @change="updateField('paddingRight', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="padding-cell empty" />
      <div class="padding-cell">
        <label>Bottom</label>
        <input
          type="number"
          :value="config.paddingBottom"
          min="0"
          max="50"
          step="0.5"
          @change="updateField('paddingBottom', Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="padding-cell empty" />
    </div>

    <hr class="config-divider" />

    <!-- Alignment -->
    <label class="section-label">ALIGNMENT</label>
    <div class="pill-group">
      <button
        v-for="a in (['left','center','right'] as Alignment[])"
        :key="a"
        class="pill-btn"
        :class="{ active: config.alignment === a }"
        @click="updateField('alignment', a)"
      >{{ a }}</button>
    </div>

    <hr class="config-divider" />

    <!-- Gap -->
    <label class="section-label">GAP BETWEEN REMARKS</label>
    <div class="inline-inputs">
      <label>Min <input type="number" :value="config.minGapMm" min="0" max="50" step="0.5"
        @change="updateField('minGapMm', Number(($event.target as HTMLInputElement).value))" /> mm</label>
      <label>Max <input type="number" :value="config.maxGapMm" min="0" max="100" step="0.5"
        @change="updateField('maxGapMm', Number(($event.target as HTMLInputElement).value))" /> mm</label>
    </div>

    <hr class="config-divider" />

    <!-- Font size -->
    <label class="section-label">FONT SIZE</label>
    <div class="inline-inputs">
      <label>Min <input type="number" :value="config.minFontSizePt" min="1" max="72" step="0.5"
        @change="updateField('minFontSizePt', Number(($event.target as HTMLInputElement).value))" /> pt</label>
      <label>Max <input type="number" :value="config.maxFontSizePt" min="1" max="200" step="0.5"
        @change="updateField('maxFontSizePt', Number(($event.target as HTMLInputElement).value))" /> pt</label>
    </div>

    <hr class="config-divider" />

    <!-- Width breakpoints -->
    <WidthBreakpointList
      :breakpoints="config.widthBreakpoints"
      :face="face"
      @update="(bps) => updateField('widthBreakpoints', bps)"
    />

    <hr class="config-divider" />

    <!-- Row break -->
    <label class="section-label">ROW BREAK</label>
    <div class="inline-inputs">
      <label>Mode
        <select :value="config.rowBreakMode" @change="updateField('rowBreakMode', ($event.target as HTMLSelectElement).value as RowBreakMode)">
          <option value="locked">Locked</option>
          <option value="fluid">Fluid</option>
        </select>
        <span class="hint">inherits from global</span>
      </label>
      <label>Max rows <input type="number" :value="config.maxRows" min="1" max="5"
        @change="updateField('maxRows', Number(($event.target as HTMLInputElement).value))" /></label>
    </div>

    <hr class="config-divider" />

    <!-- Remarks -->
    <label class="section-label">REMARKS <span class="hint">drag ⠿ to reorder</span></label>
    <div v-if="config.remarks.length === 0" class="empty-hint">No remarks detected for this face</div>
    <div v-for="remark in config.remarks" :key="remark.groupName" class="remark-row">
      <span class="drag-handle">⠿</span>
      <span class="remark-name">{{ remark.groupName }}</span>
      <select :value="remark.priority" @change="() => {}" class="small-select">
        <option v-for="p in [1,2,3,4,5]" :key="p" :value="p">P{{ p }}</option>
      </select>
      <select
        :value="remark.row"
        :disabled="config.rowBreakMode === 'fluid'"
        class="small-select"
        @change="() => {}"
      >
        <option v-for="r in config.maxRows" :key="r" :value="r">Row{{ r }}</option>
      </select>
      <button class="toggle-btn small" :class="{ active: remark.enabled }" @click="remark.enabled = !remark.enabled">
        {{ remark.enabled ? '●' : '○' }}
      </button>
    </div>

    <hr class="config-divider" />

    <!-- Pipeline override -->
    <label class="section-label">PIPELINE</label>
    <div class="pipeline-toggle">
      <label>Use panel pipeline</label>
      <select :value="config.usePanelPipeline ? 'yes' : 'no'" @change="onTogglePipeline(($event.target as HTMLSelectElement).value === 'yes')">
        <option value="no">No</option>
        <option value="yes">Yes</option>
      </select>
    </div>
    <div v-if="!config.usePanelPipeline" class="pipeline-hint">Using global pipeline</div>
    <PipelineEditor
      v-if="config.usePanelPipeline"
      :phases="config.pipeline"
      @update="(p) => updateField('pipeline', p)"
    />

    <hr class="config-divider" />

    <!-- Bulk apply -->
    <div class="bulk-actions">
      <button class="bulk-btn" @click="applyPaddingToAll">Apply padding to all faces</button>
      <button class="bulk-btn" @click="applyFontRangeToAll">Apply font range to all faces</button>
      <button class="bulk-btn" @click="copyAllSettingsToAll">Copy ALL settings to all faces</button>
    </div>
  </div>
</template>

<style scoped>
.panel-config {
  padding: 12px;
  color: #d4d4d4;
  font-size: 12px;
}
.config-header {
  display: flex;
  align-items: center;
  gap: 6px;
}
.config-icon { color: #569cd6; }
.config-title { font-size: 15px; font-weight: 600; color: #e0e0e0; }
.config-type { color: #888; font-size: 11px; }
.config-dims { color: #ce9178; margin-top: 2px; font-size: 12px; }
.config-divider { border: none; border-top: 1px solid #3c3c3c; margin: 10px 0; }
.config-row { display: flex; align-items: center; justify-content: space-between; }
.config-label { font-size: 11px; color: #888; font-weight: 600; letter-spacing: 0.5px; }
.section-label { font-size: 11px; color: #888; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
.toggle-btn {
  padding: 3px 14px;
  border: 1px solid #555;
  border-radius: 4px;
  background: transparent;
  color: #888;
  cursor: pointer;
  font-size: 12px;
}
.toggle-btn.active { background: #0e639c; color: #fff; border-color: #0e639c; }
.toggle-btn.small { padding: 2px 8px; font-size: 10px; }
.padding-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin-top: 4px;
}
.padding-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.padding-cell label { font-size: 10px; color: #888; }
.padding-cell input {
  width: 60px;
  padding: 3px 6px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 12px;
  text-align: center;
}
.padding-cell.empty { visibility: hidden; }
.pill-group { display: flex; gap: 0; margin-top: 4px; }
.pill-btn {
  padding: 3px 12px;
  border: 1px solid #555;
  background: transparent;
  color: #888;
  cursor: pointer;
  font-size: 11px;
  text-transform: capitalize;
}
.pill-btn:first-child { border-radius: 4px 0 0 4px; }
.pill-btn:last-child { border-radius: 0 4px 4px 0; }
.pill-btn.active { background: #0e639c; color: #fff; border-color: #0e639c; }
.inline-inputs {
  display: flex;
  gap: 16px;
  margin-top: 4px;
}
.inline-inputs label { font-size: 11px; color: #888; display: flex; align-items: center; gap: 4px; }
.inline-inputs input,
.inline-inputs select {
  width: 56px;
  padding: 3px 4px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 12px;
}
.hint { font-size: 10px; color: #666; font-style: italic; }
.empty-hint { color: #555; font-size: 11px; padding: 4px 0; }
.remark-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
}
.drag-handle { color: #555; cursor: grab; font-size: 12px; }
.remark-name { flex: 1; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.small-select {
  padding: 2px 4px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 11px;
  width: 52px;
}
.pipeline-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.pipeline-toggle select {
  padding: 2px 8px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 11px;
}
.pipeline-hint { color: #666; font-size: 11px; font-style: italic; margin-top: 4px; }
.bulk-actions { display: flex; flex-direction: column; gap: 4px; }
.bulk-btn {
  padding: 5px 12px;
  border: 1px solid #444;
  border-radius: 4px;
  background: #2d2d2d;
  color: #888;
  cursor: pointer;
  font-size: 11px;
  text-align: left;
}
.bulk-btn:hover { background: #3c3c3c; color: #ccc; }
</style>
