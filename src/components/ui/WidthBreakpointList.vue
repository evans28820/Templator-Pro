<script setup lang="ts">
import type { WidthBreakpoint, Face } from '../../types';

const props = defineProps<{
  breakpoints: WidthBreakpoint[];
  face: Face;
}>();

const emit = defineEmits<{ update: [breakpoints: WidthBreakpoint[]] }>();

let nextId = 0;
function genId(): string {
  return `bp_${Date.now()}_${nextId++}`;
}

function addBreakpoint(): void {
  const updated = [...props.breakpoints, {
    id: genId(),
    operator: 'less_than' as const,
    thresholdMm: 100,
    fontSizePt: 12,
  }];
  emit('update', updated);
}

function removeBreakpoint(index: number): void {
  const updated = [...props.breakpoints];
  updated.splice(index, 1);
  emit('update', updated);
}

function updateField(index: number, field: keyof WidthBreakpoint, value: unknown): void {
  const updated = [...props.breakpoints];
  updated[index] = { ...updated[index], [field]: value };
  emit('update', updated);
}

const faceDimensionHint = props.face === 'left' || props.face === 'right'
  ? 'Left/Right = box H'
  : 'Bottom/Top = box W';
</script>

<template>
  <div>
    <label class="section-label">WIDTH BREAKPOINTS <button class="add-btn" @click="addBreakpoint">+ Add rule</button></label>
    <div class="breakpoint-hint">{{ faceDimensionHint }}</div>
    <div v-for="(bp, i) in breakpoints" :key="bp.id" class="breakpoint-row">
      <span>if face width</span>
      <select :value="bp.operator" @change="updateField(i, 'operator', ($event.target as HTMLSelectElement).value)" class="bp-select">
        <option value="less_than">&lt;</option>
        <option value="greater_than">&gt;</option>
        <option value="less_equal">≤</option>
        <option value="greater_equal">≥</option>
      </select>
      <input type="number" :value="bp.thresholdMm" min="0" step="1"
        @change="updateField(i, 'thresholdMm', Number(($event.target as HTMLInputElement).value))" class="bp-input" /> mm
      <span>→</span>
      <input type="number" :value="bp.fontSizePt" min="1" max="200" step="0.5"
        @change="updateField(i, 'fontSizePt', Number(($event.target as HTMLInputElement).value))" class="bp-input" /> pt
      <button class="remove-btn" @click="removeBreakpoint(i)">×</button>
    </div>
  </div>
</template>

<style scoped>
.section-label { font-size: 11px; color: #888; font-weight: 600; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
.add-btn {
  padding: 1px 8px;
  border: 1px solid #0e639c;
  border-radius: 3px;
  background: transparent;
  color: #569cd6;
  cursor: pointer;
  font-size: 10px;
  font-weight: normal;
}
.add-btn:hover { background: #094771; }
.breakpoint-hint { font-size: 10px; color: #666; font-style: italic; margin: 2px 0 4px; }
.breakpoint-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #888;
  margin-bottom: 4px;
}
.bp-select {
  padding: 2px 4px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 11px;
}
.bp-input {
  width: 48px;
  padding: 2px 4px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #d4d4d4;
  font-size: 11px;
  text-align: center;
}
.remove-btn {
  padding: 0 4px;
  border: none;
  background: transparent;
  color: #888;
  cursor: pointer;
  font-size: 14px;
}
.remove-btn:hover { color: #f44747; }
</style>
