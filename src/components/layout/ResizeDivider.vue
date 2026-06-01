<script setup lang="ts">
import { ref, onUnmounted } from 'vue';

defineProps<{ side: 'left' | 'right' }>();
const emit = defineEmits<{ resize: [delta: number] }>();

const isDragging = ref(false);
let startX = 0;

function onMouseDown(e: MouseEvent): void {
  isDragging.value = true;
  startX = e.clientX;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  e.preventDefault();
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging.value) return;
  emit('resize', e.clientX - startX);
  startX = e.clientX;
}

function onMouseUp(): void {
  isDragging.value = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
});
</script>

<template>
  <div class="resize-divider" :class="{ dragging: isDragging }" @mousedown="onMouseDown">
    <div class="divider-handle" />
  </div>
</template>

<style scoped>
.resize-divider {
  width: 6px; cursor: col-resize;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-secondary); flex-shrink: 0; z-index: 10;
}
.resize-divider:hover, .resize-divider.dragging {
  background: var(--accent);
}
.divider-handle {
  width: 2px; height: 32px; border-radius: 1px;
  background: var(--border-primary);
}
.resize-divider:hover .divider-handle,
.resize-divider.dragging .divider-handle {
  background: #fff;
}
</style>
