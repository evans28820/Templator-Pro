<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useCanvas } from '../../composables/useCanvas';
import { useTemplateStore } from '../../stores/template.store';
const emit = defineEmits<{ 'select-node': [nodeId: string | null] }>();

const templateStore = useTemplateStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const zoomDisplay = ref('100%');

const {
  viewport,
  draw,
  fitToCanvas,
  centerOnNode,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  onDblClick,
  loadArtwork,
} = useCanvas(
  canvasRef,
  computed(() => templateStore.scanResult),
  computed(() => templateStore.selectedNodeId),
);

function handleMouseDown(e: MouseEvent): void {
  const hit = onMouseDown(e);
  if (hit) {
    templateStore.selectNode(hit.id);
    emit('select-node', hit.id);
    centerOnNode(hit);
  } else if (!hit) {
    templateStore.selectNode(null);
    emit('select-node', null);
  }
}

function handleDblClick(): void {
  onDblClick();
}

watch(() => viewport.value.zoom, (z) => {
  zoomDisplay.value = `${Math.round(z * 100)}%`;
}, { immediate: true });

watch(
  () => templateStore.scanResult,
  (result) => {
    if (result?.previewImageBase64) {
      loadArtwork(`data:image/png;base64,${result.previewImageBase64}`);
    }
    setTimeout(() => fitToCanvas(), 100);
  },
  { immediate: true },
);

let animFrameId = 0;
function renderLoop(): void {
  draw();
  animFrameId = requestAnimationFrame(renderLoop);
}

onMounted(() => {
  animFrameId = requestAnimationFrame(renderLoop);
  window.addEventListener('resize', draw);
});

onUnmounted(() => {
  cancelAnimationFrame(animFrameId);
  window.removeEventListener('resize', draw);
});
</script>

<template>
  <div class="canvas-preview">
    <div class="canvas-toolbar">
      <button class="tool-btn" title="Fit to canvas (Ctrl+0)" @click="fitToCanvas">− Fit +</button>
      <span class="zoom-badge">{{ zoomDisplay }}</span>
      <button class="tool-btn" title="Zoom in" @click="viewport.zoom = Math.min(10, viewport.zoom * 1.1)">+</button>
      <button class="tool-btn" title="Zoom out" @click="viewport.zoom = Math.max(0.1, viewport.zoom * 0.9)">−</button>
    </div>
    <canvas
      ref="canvasRef"
      class="preview-canvas"
      @mousedown="handleMouseDown"
      @mousemove="(e) => onMouseMove(e)"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @wheel="(e) => onWheel(e)"
      @dblclick="handleDblClick"
      @contextmenu.prevent
    />
  </div>
</template>

<style scoped>
.canvas-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}
.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  flex-shrink: 0;
}
.tool-btn {
  padding: 2px 8px;
  border: 1px solid #444;
  border-radius: 3px;
  background: transparent;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
}
.tool-btn:hover {
  background: #3c3c3c;
}
.zoom-badge {
  font-size: 11px;
  color: #888;
  min-width: 40px;
  text-align: center;
}
.preview-canvas {
  flex: 1;
  width: 100%;
  cursor: grab;
  display: block;
}
.preview-canvas:active {
  cursor: grabbing;
}
</style>
