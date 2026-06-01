<script setup lang="ts">
import { ref } from 'vue';
import type { ExcelColumn } from '../../types';

const columns = ref<ExcelColumn[]>([]);
const loadedFileName = ref('');
const rowCount = ref(0);
const isLoaded = ref(false);

async function importExcel(): Promise<void> {
  try {
    const filePath = await window.templatorAPI.openFileDialog([
      { name: 'Excel', extensions: ['xlsx', 'xls'] },
    ]);
    if (!filePath) return;
    // Phase 4: actual parse via IPC
    loadedFileName.value = filePath.split(/[/\\]/).pop() || filePath;
    rowCount.value = 0; // placeholder
    isLoaded.value = true;
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="screen-excel">
    <div class="excel-header">
      <h2>Excel Import</h2>
      <div v-if="isLoaded" class="loaded-badge">
        ✓ {{ loadedFileName }} — {{ rowCount }} rows loaded
      </div>
    </div>

    <!-- Column pills -->
    <div class="pill-section">
      <h3>Columns</h3>
      <div class="pill-list">
        <span class="pill pill-file">filePath</span>
        <span v-for="col in columns" :key="col.name" class="pill" :class="`pill-${col.type}`">
          {{ col.label || col.name }}
        </span>
        <span class="pill pill-special">LayerName</span>
        <span class="pill pill-special">FileName</span>
      </div>
    </div>

    <!-- Import zone -->
    <div class="import-zone" @click="importExcel" @dragover.prevent @drop.prevent="importExcel">
      <div class="import-icon">📄</div>
      <p>Click or drop an .xlsx file to import</p>
      <p class="import-hint">Row 1 = headers, Row 2 = description — data starts at Row 3</p>
    </div>

    <div v-if="isLoaded" class="actions">
      <button class="run-btn" @click="$emit('goToRun')">Continue to Batch Run →</button>
    </div>
  </div>
</template>

<style scoped>
.screen-excel {
  padding: 24px;
  color: #d4d4d4;
}
.excel-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.excel-header h2 { font-size: 20px; color: #e0e0e0; }
.loaded-badge { color: #4ec9b0; font-size: 13px; }
.pill-section { margin-bottom: 20px; }
.pill-section h3 { font-size: 12px; color: #888; margin-bottom: 8px; }
.pill-list { display: flex; flex-wrap: wrap; gap: 6px; }
.pill {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  border: 1px solid;
}
.pill-file { border-color: #534AB7; color: #534AB7; }
.pill-special { border-color: #ce9178; color: #ce9178; }
.pill-text { border-color: #569cd6; color: #569cd6; }
.pill-number { border-color: #4ec9b0; color: #4ec9b0; }
.pill-visibility { border-color: #6a9955; color: #6a9955; }
.import-zone {
  border: 2px dashed #555;
  border-radius: 8px;
  padding: 48px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}
.import-zone:hover { border-color: #0e639c; }
.import-icon { font-size: 32px; margin-bottom: 8px; }
.import-zone p { color: #888; font-size: 14px; }
.import-hint { margin-top: 4px; font-size: 11px; color: #666; }
.actions { margin-top: 20px; }
.run-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  background: #0e639c;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
.run-btn:hover { background: #1177bb; }
</style>
