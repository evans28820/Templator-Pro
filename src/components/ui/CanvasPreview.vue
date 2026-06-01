<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useCanvas } from '../../composables/useCanvas';
import { useTemplateStore } from '../../stores/template.store';
import { PANEL_DEFAULTS } from '../../types';

const emit = defineEmits<{ 'select-node': [nodeId: string | null] }>();

const templateStore = useTemplateStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const zoomDisplay = ref('100%');

const configuredFaces = computed(() => {
  const s = new Set<string>();
  const configs = templateStore.panelConfigs;
  for (const face of ['bottom', 'top', 'left', 'right']) {
    const cfg = configs[face];
    if (!cfg || !cfg.enabled) { continue; }
    if (
      cfg.paddingTop !== PANEL_DEFAULTS.paddingTop ||
      cfg.paddingLeft !== PANEL_DEFAULTS.paddingLeft ||
      cfg.minFontSizePt !== PANEL_DEFAULTS.minFontSizePt ||
      cfg.maxFontSizePt !== PANEL_DEFAULTS.maxFontSizePt ||
      cfg.remarks.length > 0
    ) {
      s.add(face);
    }
  }
  return s;
});

const canvasApi = useCanvas(
  canvasRef,
  computed(() => templateStore.scanResult),
  computed(() => templateStore.selectedNodeId),
  configuredFaces,
);

const {
  viewport,
  draw,
  initialZoom,
  fitToCanvas,
  centerOnNode,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  onDblClick,
  loadArtwork,
} = canvasApi;

function handleMouseDown(e: MouseEvent): void {
  const hit = onMouseDown(e);
  if (hit) {
    templateStore.selectNode(hit.id);
    emit('select-node', hit.id);
    centerOnNode(hit);
  } else {
    templateStore.selectNode(null);
    emit('select-node', null);
  }
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
    setTimeout(() => initialZoom(), 200);
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
      <button class="tool-btn" title="Fit to canvas (Ctrl+0)" @click="fitToCanvas">⊡ Fit</button>
      <span class="zoom-badge">{{ zoomDisplay }}</span>
      <button class="tool-btn" title="Zoom in" @click="viewport.zoom = Math.min(10, viewport.zoom * 1.1)">＋</button>
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
      @dblclick="onDblClick"
      @contextmenu.prevent
    />
  </div>
</template>

<style scoped>
.canvas-preview { display:flex; flex-direction:column; height:100%; background:var(--bg-primary); }
.canvas-toolbar { display:flex; align-items:center; gap:6px; padding:5px 10px; background:var(--bg-secondary); border-bottom:1px solid var(--border-primary); flex-shrink:0; }
.tool-btn { padding:3px 10px; border:1px solid var(--border-primary); border-radius:4px; background:var(--bg-primary); color:var(--text-secondary); cursor:pointer; font-size:12px; }
.tool-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
.zoom-badge { font-size:11px; color:var(--text-muted); min-width:42px; text-align:center; }
.preview-canvas { flex:1; width:100%; cursor:grab; display:block; }
.preview-canvas:active { cursor:grabbing; }
</style>
