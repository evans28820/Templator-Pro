<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useCanvas } from '../../composables/useCanvas';
import { useTemplateStore } from '../../stores/template.store';
import { findNodeById } from '../../utils/treeUtils';
import { PANEL_DEFAULTS } from '../../types';

const emit = defineEmits<{ 'select-node': [nodeId: string | null] }>();
const templateStore = useTemplateStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const zoomDisplay = ref('100%');

const configuredFaces = computed(() => {
  const s = new Set<string>();
  const configs = templateStore.panelConfigs;
  for (const face of ['bottom','top','left','right']) {
    const cfg = configs[face];
    if (!cfg || !cfg.enabled) continue;
    if (cfg.paddingTop !== PANEL_DEFAULTS.paddingTop) s.add(face);
    else if (cfg.minFontSizePt !== PANEL_DEFAULTS.minFontSizePt) s.add(face);
    else if (cfg.remarks.length > 0) s.add(face);
  }
  return s;
});

const api = useCanvas(
  canvasRef,
  computed(() => templateStore.scanResult),
  computed(() => templateStore.selectedNodeId),
  configuredFaces,
);

const {
  viewport, viewMode, draw, initialZoom, fitToCanvas, centerOnNode, toggleViewMode,
  onMouseDown, onMouseMove, onMouseUp, onWheel, loadArtwork, hitTest, addFeedbackDot,
} = api;

function handleDown(e: MouseEvent): void {
  onMouseDown(e);
  const rect = canvasRef.value?.getBoundingClientRect();
  if (rect) {
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const h = hitTest(sx, sy);
    addFeedbackDot(sx, sy, h ? (h.readOnly ? h.name + ' (RO)' : h.name) : '—');
  }
}
function handleMove(e: MouseEvent): void { onMouseMove(e); }
function handleUp(_e: MouseEvent): void {
  const hit = onMouseUp();
  console.log('[canvas:select]', hit?.name || 'none', hit?.type || '');
  if (hit) {
    templateStore.selectNode(hit.id);
    emit('select-node', hit.id);
    centerOnNode(hit);
  }
}

watch(() => viewport.value.zoom, z => { zoomDisplay.value = `${Math.round(z * 100)}%`; }, { immediate: true });

watch(() => templateStore.scanResult, r => {
  if (r?.previewImageBase64) loadArtwork(`data:image/png;base64,${r.previewImageBase64}`);
  setTimeout(() => initialZoom(), 200);
}, { immediate: true });

// Tree click → zoom to node
watch(() => templateStore.selectedNodeId, id => {
  if (!id) return;
  const node = findNodeById(templateStore.scanResult?.tree ?? [], id);
  if (node) setTimeout(() => centerOnNode(node), 80);
});

let raf = 0;
onMounted(() => {
  function loop() { draw(); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
  window.addEventListener('resize', draw);
});
onUnmounted(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', draw); });
</script>

<template>
  <div class="cp">
    <div class="cp-bar">
      <button class="cp-btn" title="Fit (Ctrl+0)" @click="fitToCanvas">⊡</button>
      <span class="cp-zoom">{{ zoomDisplay }}</span>
      <button class="cp-btn" @click="viewport.zoom = Math.min(10, viewport.zoom * 1.1)">＋</button>
      <button class="cp-btn" @click="viewport.zoom = Math.max(0.1, viewport.zoom * 0.9)">−</button>
      <span class="cp-spacer" />
      <button class="cp-btn" :class="{ on: viewMode === 'content' }" @click="toggleViewMode">
        {{ viewMode === 'content' ? '☰ Content' : '⊡ Boxes' }}
      </button>
    </div>
    <canvas ref="canvasRef"
      class="cp-canvas"
      @mousedown="handleDown"
      @mousemove="handleMove"
      @mouseup="handleUp"
      @mouseleave="handleUp"
      @wheel.prevent="onWheel"
      @dblclick="fitToCanvas"
      @contextmenu.prevent
    />
  </div>
</template>

<style scoped>
.cp { display:flex; flex-direction:column; height:100%; background:var(--bg-primary); }
.cp-bar { display:flex; align-items:center; gap:4px; padding:4px 8px; background:var(--bg-secondary); border-bottom:1px solid var(--border-primary); flex-shrink:0; }
.cp-btn { padding:2px 8px; border:1px solid var(--border-primary); border-radius:3px; background:var(--bg-primary); color:var(--text-secondary); cursor:pointer; font-size:12px; }
.cp-btn:hover { background:var(--bg-hover); }
.cp-btn.on { background:var(--accent); color:#fff; border-color:var(--accent); }
.cp-zoom { font-size:11px; color:var(--text-muted); min-width:40px; text-align:center; }
.cp-spacer { flex:1; }
.cp-canvas { flex:1; width:100%; cursor:crosshair; display:block; }
</style>
