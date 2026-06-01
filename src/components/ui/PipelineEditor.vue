<script setup lang="ts">
import type { PipelinePhase, PipelinePhaseType } from '../../types';

const props = defineProps<{ phases: PipelinePhase[] }>();
const emit = defineEmits<{ update: [phases: PipelinePhase[]] }>();

const PHASE_LABELS: Record<PipelinePhaseType, string> = {
  max_font_max_gap: 'Max font + max gap (single line)',
  shrink_gaps: 'Shrink gaps to min',
  shrink_font: 'Shrink font to',
  row_break: 'Row break',
  hard_scale: 'Reset font to',
  content_shedding: 'Content shedding (priority 5 → 2)',
  error_alert: 'Overflow + flag as error',
};

function togglePhase(index: number): void {
  const updated = [...props.phases];
  updated[index] = { ...updated[index], enabled: !updated[index].enabled };
  emit('update', updated);
}

function updateParam(index: number, key: string, value: number): void {
  const updated = [...props.phases];
  updated[index] = {
    ...updated[index],
    params: { ...updated[index].params, [key]: value },
  };
  emit('update', updated);
}

let dragIndex: number | null = null;

function onDragStart(index: number, e: DragEvent): void {
  dragIndex = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }
}

function onDragOver(e: DragEvent): void {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function onDrop(targetIndex: number): void {
  if (dragIndex === null || dragIndex === targetIndex) return;
  const updated = [...props.phases];
  const [moved] = updated.splice(dragIndex, 1);
  updated.splice(targetIndex, 0, moved);
  dragIndex = null;
  emit('update', updated);
}
</script>

<template>
  <div class="pipeline-editor">
    <div
      v-for="(phase, i) in phases"
      :key="phase.id"
      class="phase-row"
      draggable="true"
      @dragstart="onDragStart(i, $event)"
      @dragover="onDragOver"
      @drop="onDrop(i)"
    >
      <span class="drag-handle">⠿</span>
      <button
        class="toggle-icon"
        :class="{ enabled: phase.enabled }"
        @click="togglePhase(i)"
      >
        {{ phase.enabled ? '✓' : '✗' }}
      </button>
      <span class="phase-label">
        Phase {{ i }}
        <span class="phase-desc">{{ PHASE_LABELS[phase.type] }}</span>
      </span>
      <template v-if="phase.type === 'shrink_font'">
        <input
          type="number"
          class="phase-param"
          :value="phase.params.shrinkPercent ?? 90"
          min="10"
          max="100"
          @change="updateParam(i, 'shrinkPercent', Number(($event.target as HTMLInputElement).value))"
        /> %
      </template>
      <template v-if="phase.type === 'hard_scale'">
        <input
          type="number"
          class="phase-param"
          :value="phase.params.targetFontPct ?? 100"
          min="10"
          max="200"
          @change="updateParam(i, 'targetFontPct', Number(($event.target as HTMLInputElement).value))"
        /> %
      </template>
    </div>
  </div>
</template>

<style scoped>
.pipeline-editor {
  margin-top: 4px;
}
.phase-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 4px;
  margin-bottom: 2px;
  cursor: grab;
  font-size: 12px;
}
.phase-row:hover {
  background: #2a2d2e;
}
.drag-handle {
  color: #555;
  cursor: grab;
  font-size: 12px;
}
.toggle-icon {
  width: 18px;
  height: 18px;
  border: 1px solid #555;
  border-radius: 3px;
  background: transparent;
  color: #888;
  cursor: pointer;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.toggle-icon.enabled {
  background: #0e639c;
  color: #fff;
  border-color: #0e639c;
}
.phase-label {
  flex: 1;
  color: #d4d4d4;
}
.phase-desc {
  color: #888;
  font-size: 11px;
  margin-left: 4px;
}
.phase-param {
  width: 44px;
  padding: 2px 4px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  color: #ce9178;
  font-size: 11px;
  text-align: center;
}
</style>
