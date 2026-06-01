<script setup lang="ts">
import { computed } from 'vue';
import { useTemplateStore } from '../../stores/template.store';
const store = useTemplateStore();

const node = computed(() => store.selectedNode);
const nodeConfig = computed(() => {
  if (!node.value) return null;
  return store.nodeConfigs[node.value.id] ?? ensureConfig();
});

const isTextFrame = computed(() => node.value?.type === 'textFrame');
const isGroup = computed(() => node.value?.type === 'group');
const isPath = computed(() =>
  node.value?.type === 'pathItem' || node.value?.type === 'compoundPath'
);

function ensureConfig() {
  if (!node.value) throw new Error('No node selected');
  if (!store.nodeConfigs[node.value.id]) {
    store.nodeConfigs[node.value.id] = {
      nodeId: node.value.id,
      nodeName: node.value.name,
      enabled: true,
      canShrink: false,
      allow2LineWrap: false,
      priority: 3,
      includeInExcel: !!node.value.name,
      columnLabel: node.value.name || '',
    };
  }
  return store.nodeConfigs[node.value.id];
}

function getDimensions(): string {
  if (!node.value) return '';
  return `${node.value.w.toFixed(1)} × ${node.value.h.toFixed(1)} mm`;
}

function updateField(field: string, value: unknown): void {
  if (!node.value) return;
  const config = ensureConfig();
  (config as unknown as Record<string, unknown>)[field] = value;
}

function getNodeIcon(): string {
  if (!node.value) return '○';
  switch (node.value.type) {
    case 'textFrame': return 'T';
    case 'pathItem':
    case 'compoundPath': return '●';
    default: return '▸';
  }
}
</script>

<template>
  <!-- No selection -->
  <div v-if="!node" class="no-selection">
    <div class="no-sel-circle">○</div>
    <p>Click any item in the layer tree or click on the canvas</p>
  </div>

  <!-- PathItem panel -->
  <div v-else-if="isPath" class="config-panel">
    <div class="config-header">
      <span class="config-icon">{{ getNodeIcon() }}</span>
      <span class="config-title">{{ node.name || '<path>' }}</span>
      <span class="config-type">PathItem</span>
    </div>
    <div class="config-dims">{{ getDimensions() }}</div>
    <hr class="config-divider" />
    <p class="static-note">This is a graphic element — not configurable.</p>
  </div>

  <!-- TextFrame panel (named) -->
  <div v-else-if="isTextFrame && node.name" class="config-panel">
    <div class="config-header">
      <span class="config-icon">{{ getNodeIcon() }}</span>
      <span class="config-title">{{ node.name }}</span>
      <span class="config-type">TextFrame</span>
    </div>
    <div v-if="node.content" class="current-content">Current content: "{{ node.content }}"</div>
    <hr class="config-divider" />

    <div class="config-row">
      <label class="config-label">ENABLED</label>
      <button class="toggle-btn" :class="{ active: nodeConfig?.enabled !== false }"
        @click="updateField('enabled', nodeConfig?.enabled === false)">
        {{ nodeConfig?.enabled !== false ? 'Yes' : 'No' }}
      </button>
    </div>

    <hr class="config-divider" />
    <label class="section-label">EXCEL</label>
    <div class="config-row">
      <label>Include in Excel</label>
      <button class="toggle-btn" :class="{ active: nodeConfig?.includeInExcel }"
        @click="updateField('includeInExcel', !nodeConfig?.includeInExcel)">
        {{ nodeConfig?.includeInExcel ? 'Yes' : 'No' }}
      </button>
    </div>
    <div v-if="nodeConfig?.includeInExcel" class="inline-input" style="margin-top:6px">
      <label>Column label <input type="text" :value="nodeConfig?.columnLabel"
        @change="updateField('columnLabel', ($event.target as HTMLInputElement).value)" /></label>
    </div>

    <hr class="config-divider" />
    <label class="section-label">SIZING</label>
    <div class="config-row">
      <label>Can shrink font</label>
      <button class="toggle-btn" :class="{ active: nodeConfig?.canShrink }"
        @click="updateField('canShrink', !nodeConfig?.canShrink)">
        {{ nodeConfig?.canShrink ? 'Yes' : 'No' }}
      </button>
    </div>
    <div v-if="nodeConfig?.canShrink" class="inline-input" style="margin-top:6px">
      <label>Min font size <input type="number" :value="nodeConfig?.minFontSizePt ?? 6" min="1" max="72" step="0.5"
        @change="updateField('minFontSizePt', Number(($event.target as HTMLInputElement).value))" /> pt</label>
    </div>

    <hr class="config-divider" />
    <button class="bulk-btn">Apply same rules to matching field names in other faces</button>
  </div>

  <!-- TextFrame panel (unnamed/static) -->
  <div v-else-if="isTextFrame && !node.name" class="config-panel">
    <div class="config-header">
      <span class="config-icon">{{ getNodeIcon() }}</span>
      <span class="config-title">&lt;unnamed&gt;</span>
      <span class="config-type">TextFrame — static label</span>
    </div>
    <div class="current-content">Content: "{{ node.content || '(empty)' }}"</div>
    <hr class="config-divider" />
    <p class="static-note">This is a static design element.<br />It will not be modified by the script.</p>
  </div>

  <!-- Generic GroupItem panel -->
  <div v-else-if="isGroup" class="config-panel">
    <div class="config-header">
      <span class="config-icon">{{ getNodeIcon() }}</span>
      <span class="config-title">{{ node.name || '<unnamed>' }}</span>
      <span class="config-type">GroupItem</span>
    </div>
    <div class="config-dims">{{ getDimensions() }}</div>
    <hr class="config-divider" />

    <div class="config-row">
      <label class="config-label">ENABLED</label>
      <button class="toggle-btn" :class="{ active: nodeConfig?.enabled !== false }"
        @click="updateField('enabled', nodeConfig?.enabled === false)">
        {{ nodeConfig?.enabled !== false ? 'Yes' : 'No' }}
      </button>
    </div>

    <hr class="config-divider" />
    <label class="section-label">SIZING RULES</label>
    <div class="config-row">
      <label>Can shrink to fit</label>
      <button class="toggle-btn" :class="{ active: nodeConfig?.canShrink }"
        @click="updateField('canShrink', !nodeConfig?.canShrink)">
        {{ nodeConfig?.canShrink ? 'Yes' : 'No' }}
      </button>
    </div>
    <div v-if="nodeConfig?.canShrink" style="margin-top:6px; display:flex; flex-direction:column; gap:6px;">
      <div class="inline-input">
        <label>Shrink mode
          <select :value="nodeConfig?.shrinkMode ?? 'proportional'"
            @change="updateField('shrinkMode', ($event.target as HTMLSelectElement).value)">
            <option value="proportional">Proportional</option>
            <option value="fontOnly">Font only</option>
          </select>
        </label>
      </div>
      <div class="inline-input">
        <label>Minimum size <input type="number" :value="nodeConfig?.minSizeMm ?? 0" min="0" step="0.5"
          @change="updateField('minSizeMm', Number(($event.target as HTMLInputElement).value))" /> mm</label>
      </div>
    </div>

    <div class="config-row" style="margin-top:8px;">
      <label>Allow 2-line wrap</label>
      <button class="toggle-btn" :class="{ active: nodeConfig?.allow2LineWrap }"
        @click="updateField('allow2LineWrap', !nodeConfig?.allow2LineWrap)">
        {{ nodeConfig?.allow2LineWrap ? 'Yes' : 'No' }}
      </button>
    </div>

    <hr class="config-divider" />
    <label class="section-label">PRIORITY</label>
    <div class="pill-group" style="margin-top:4px">
      <button v-for="p in ([1,2,3,4,5] as const)" :key="p"
        class="pill-btn" :class="{ active: (nodeConfig?.priority ?? 3) === p }"
        @click="updateField('priority', p)">
        {{ p }}
      </button>
    </div>

    <hr class="config-divider" />
    <label class="section-label">EXCEL</label>
    <div class="config-row">
      <label>Include in Excel</label>
      <button class="toggle-btn" :class="{ active: nodeConfig?.includeInExcel }"
        @click="updateField('includeInExcel', !nodeConfig?.includeInExcel)">
        {{ nodeConfig?.includeInExcel ? 'Yes' : 'No' }}
      </button>
    </div>
    <div v-if="nodeConfig?.includeInExcel" class="inline-input" style="margin-top:6px">
      <label>Column label <input type="text" :value="nodeConfig?.columnLabel"
        @change="updateField('columnLabel', ($event.target as HTMLInputElement).value)" /></label>
    </div>

    <hr class="config-divider" />
    <button class="bulk-btn">Apply to all siblings</button>
    <button class="bulk-btn" style="margin-top:4px">Apply to all faces</button>
  </div>
</template>

<style scoped>
.config-panel { padding: 12px; color: #d4d4d4; font-size: 12px; }
.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #555;
  gap: 8px;
  padding: 24px;
  text-align: center;
}
.no-sel-circle { font-size: 32px; }
.config-header { display: flex; align-items: center; gap: 6px; }
.config-icon { color: #569cd6; }
.config-title { font-size: 15px; font-weight: 600; color: #e0e0e0; }
.config-type { color: #888; font-size: 11px; }
.config-dims { color: #ce9178; margin-top: 2px; }
.current-content { color: #888; font-size: 12px; margin-top: 2px; font-style: italic; }
.config-divider { border: none; border-top: 1px solid #3c3c3c; margin: 10px 0; }
.config-row { display: flex; align-items: center; justify-content: space-between; }
.config-label { font-size: 11px; color: #888; font-weight: 600; letter-spacing: 0.5px; }
.section-label { font-size: 11px; color: #888; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }
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
.pill-group { display: flex; gap: 0; }
.pill-btn {
  padding: 3px 12px;
  border: 1px solid #555;
  background: transparent;
  color: #888;
  cursor: pointer;
  font-size: 11px;
}
.pill-btn:first-child { border-radius: 4px 0 0 4px; }
.pill-btn:last-child { border-radius: 0 4px 4px 0; }
.pill-btn.active { background: #0e639c; color: #fff; border-color: #0e639c; }
.inline-input label { font-size: 11px; color: #888; display: flex; align-items: center; gap: 6px; }
.inline-input input,
.inline-input select {
  width: 80px;
  padding: 3px 6px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 12px;
}
.static-note { color: #666; font-size: 12px; line-height: 1.5; }
.bulk-btn {
  padding: 5px 12px;
  border: 1px solid #444;
  border-radius: 4px;
  background: #2d2d2d;
  color: #888;
  cursor: pointer;
  font-size: 11px;
  text-align: left;
  display: block;
  width: 100%;
}
.bulk-btn:hover { background: #3c3c3c; color: #ccc; }
</style>
