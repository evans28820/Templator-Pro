/**
 * Canvas pan/zoom/draw composable.
 * All spatial values in mm. Pixels per mm at 1x: 3.78.
 */

import { ref, computed, type Ref } from 'vue';
import type { ScanResult, TreeNode } from '../types';

export interface CanvasViewport { offsetX: number; offsetY: number; zoom: number; }

const GROUP_COLORS: Record<string, { stroke: string; fill: string }> = {
  Remark:  { stroke: '#534AB7', fill: 'rgba(83,74,183,0.08)' },
  Bottom:  { stroke: '#0F6E56', fill: 'rgba(15,110,86,0.08)' },
  Top:     { stroke: '#0F6E56', fill: 'rgba(15,110,86,0.08)' },
  Left:    { stroke: '#185FA5', fill: 'rgba(24,95,165,0.08)' },
  Right:   { stroke: '#185FA5', fill: 'rgba(24,95,165,0.08)' },
  LOGO:    { stroke: '#888780', fill: 'rgba(136,135,128,0.06)' },
};
const DEFAULT_COLORS = { stroke: '#888780', fill: 'transparent' };

export function useCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scanResult: Ref<ScanResult | null>,
  selectedNodeId: Ref<string | null>,
  _configuredFaces: Ref<Set<string>>,
) {
  const viewport = ref<CanvasViewport>({ offsetX: 0, offsetY: 0, zoom: 1 });
  const artworkImage = ref<HTMLImageElement | null>(null);
  const artworkLoading = ref(false);
  const showHint = ref(true);
  const viewMode = ref<'content' | 'boxes'>('content');

  // Feedback dots: shows where user clicked + what was found
  const feedbackDots = ref<Array<{ x: number; y: number; label: string; t: number }>>([]);

  function toggleViewMode(): void { viewMode.value = viewMode.value === 'content' ? 'boxes' : 'content'; }

  const pxPerMm = computed(() => viewport.value.zoom * 3.78);

  /* ── Coordinate transforms ── */
  function screenToMm(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - viewport.value.offsetX) / pxPerMm.value, y: (sy - viewport.value.offsetY) / pxPerMm.value };
  }

  /* ── Zoom ── */
  function initialZoom(): void {
    if (!canvasRef.value || !scanResult.value) return;
    const c = canvasRef.value;
    const w = scanResult.value.artboardWidth, h = scanResult.value.artboardHeight;
    const z = Math.max(0.3, Math.min(1, (c.height * 0.7) / (h * 3.78)));
    viewport.value = { zoom: z, offsetX: (c.width - w * 3.78 * z) / 2, offsetY: 0 };
    showHint.value = false;
  }

  function fitToCanvas(): void {
    if (!canvasRef.value || !scanResult.value) return;
    const c = canvasRef.value;
    const w = scanResult.value.artboardWidth, h = scanResult.value.artboardHeight;
    const z = Math.min((c.width - 60) / (w * 3.78), (c.height - 60) / (h * 3.78), 2);
    viewport.value = { zoom: z, offsetX: (c.width - w * 3.78 * z) / 2, offsetY: (c.height - h * 3.78 * z) / 2 };
    showHint.value = false;
  }

  /** Pan + zoom to show the selected node clearly. Minimum zoom 0.6x. */
  function centerOnNode(node: TreeNode): void {
    if (!canvasRef.value) return;
    const c = canvasRef.value;
    const mw = Math.max(node.w, 50), mh = Math.max(node.h, 30);
    const zw = (c.width * 0.7) / (mw * 3.78);
    const zh = (c.height * 0.7) / (mh * 3.78);
    const targetZoom = Math.max(0.6, Math.min(zw, zh, 3));
    const cx = (node.x + node.w / 2) * 3.78;
    const cy = (node.y + node.h / 2) * 3.78;
    viewport.value.zoom = targetZoom;
    viewport.value.offsetX = c.width / 2 - cx * targetZoom;
    viewport.value.offsetY = c.height / 2 - cy * targetZoom;
  }

  /* ── Hit test: deepest node at click point ── */
  function hitTest(sx: number, sy: number): TreeNode | null {
    if (!scanResult.value) return null;
    const { x: mx, y: my } = screenToMm(sx, sy);
    return findDeepest(scanResult.value.tree, mx, my);
  }

  function findDeepest(nodes: TreeNode[], mx: number, my: number): TreeNode | null {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.w > 0.1 && n.h > 0.1 && mx >= n.x && mx <= n.x + n.w && my >= n.y && my <= n.y + n.h) {
        const child = findDeepest(n.children, mx, my);
        return child || n;
      }
    }
    return null;
  }

  /* ── Mouse handlers ── */
  let panStart = { x: 0, y: 0 };
  let pendingHit: TreeNode | null = null;
  let isPan = false;
  let mouseDown = false;

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const z = viewport.value.zoom;
    // Pin cursor position: world = screen / zoom - offset
    const wx = sx / z - viewport.value.offsetX;
    const wy = sy / z - viewport.value.offsetY;
    const nz = Math.max(0.05, Math.min(10, z * (e.deltaY < 0 ? 1.08 : 0.93)));
    viewport.value.zoom = nz;
    viewport.value.offsetX = sx / nz - wx;
    viewport.value.offsetY = sy / nz - wy;
    showHint.value = false;
  }

  function onMouseDown(e: MouseEvent): void {
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return;
    mouseDown = true;
    panStart = { x: e.clientX, y: e.clientY };
    isPan = false;
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    pendingHit = (hit && !hit.readOnly) ? hit : null;
  }

  function onMouseMove(e: MouseEvent): void {
    if (!mouseDown) return;
    const dx = Math.abs(e.clientX - panStart.x), dy = Math.abs(e.clientY - panStart.y);
    if (pendingHit && (dx > 5 || dy > 5)) { pendingHit = null; isPan = true; }
    if (isPan || (!pendingHit && (dx > 2 || dy > 2))) {
      isPan = true;
      viewport.value.offsetX += e.clientX - panStart.x;
      viewport.value.offsetY += e.clientY - panStart.y;
      panStart = { x: e.clientX, y: e.clientY };
      showHint.value = false;
    }
  }

  function onMouseUp(): TreeNode | null {
    if (!mouseDown) return null;
    mouseDown = false;
    const hit = (!isPan && pendingHit) ? pendingHit : null;
    pendingHit = null; isPan = false;
    return hit;
  }

  /* ── Drawing ── */
  function draw(): void {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    if (!scanResult.value) {
      ctx.fillStyle = '#999'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Scan an .ai file to preview', canvas.clientWidth / 2, canvas.clientHeight / 2);
      ctx.textAlign = 'start';
      return;
    }

    const z = viewport.value.zoom, ox = viewport.value.offsetX, oy = viewport.value.offsetY;
    const aw = scanResult.value.artboardWidth * 3.78, ah = scanResult.value.artboardHeight * 3.78;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(z, z);

    // Artwork or placeholder
    if (artworkImage.value) {
      ctx.drawImage(artworkImage.value, 0, 0, aw, ah);
    } else {
      ctx.fillStyle = '#f5f5f5'; ctx.fillRect(0, 0, aw, ah);
      ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1 / z; ctx.strokeRect(0, 0, aw, ah);
      if (artworkLoading.value) {
        ctx.fillStyle = '#aaa'; ctx.font = `${Math.max(9, 14 / z)}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillText('Loading...', aw / 2, ah / 2); ctx.textAlign = 'start';
      }
    }

    // Overlays
    if (viewMode.value === 'boxes') {
      drawOverlays(ctx, scanResult.value.tree, z);
    }

    // Selected highlight
    if (selectedNodeId.value) {
      drawSelected(ctx, scanResult.value.tree, z, selectedNodeId.value);
    }

    // Content text
    if (viewMode.value === 'content') {
      drawContents(ctx, scanResult.value.tree, z);
    }

    ctx.restore();

    // Feedback dots (screen space, not drawing space)
    const now = Date.now();
    feedbackDots.value = feedbackDots.value.filter(d => now - d.t < 3000);
    for (const d of feedbackDots.value) {
      const age = now - d.t, alpha = Math.max(0, 1 - age / 3000);
      ctx.save();
      ctx.fillStyle = `rgba(255,0,0,${alpha})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.font = '11px monospace'; ctx.fillText(d.label, d.x + 8, d.y - 8);
      ctx.restore();
    }

    if (showHint.value) {
      ctx.fillStyle = '#aaa'; ctx.font = '9px sans-serif';
      ctx.fillText('Scroll=zoom  •  Drag=pan  •  Click=select  •  Dblclick=fit', 8, canvas.clientHeight - 6);
    }
  }

  function drawOverlays(ctx: CanvasRenderingContext2D, nodes: TreeNode[], z: number): void {
    for (const n of nodes) {
      if (n.w <= 0 || n.h <= 0) { drawOverlays(ctx, n.children, z); continue; }
      const c = GROUP_COLORS[n.name] || DEFAULT_COLORS;
      const x = n.x * 3.78, y = n.y * 3.78, w = n.w * 3.78, h = n.h * 3.78;
      ctx.fillStyle = c.fill; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = c.stroke; ctx.lineWidth = 1.5 / z; ctx.strokeRect(x, y, w, h);
      drawOverlays(ctx, n.children, z);
    }
  }

  function drawSelected(ctx: CanvasRenderingContext2D, nodes: TreeNode[], z: number, targetId: string): void {
    for (const n of nodes) {
      if (n.id === targetId && n.w > 0 && n.h > 0) {
        const x = n.x * 3.78, y = n.y * 3.78, w = n.w * 3.78, h = n.h * 3.78;
        ctx.fillStyle = 'rgba(83,74,183,0.15)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#534AB7'; ctx.lineWidth = 2.5 / z;
        ctx.setLineDash([5 / z, 3 / z]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
      }
      drawSelected(ctx, n.children, z, targetId);
    }
  }

  function drawContents(ctx: CanvasRenderingContext2D, nodes: TreeNode[], z: number): void {
    for (const n of nodes) {
      if (n.type === 'textFrame' && n.content && n.w > 0 && n.h > 0) {
        const fs = Math.max(4, Math.min(n.h * 0.7 * 3.78, 10 / z));
        ctx.save();
        ctx.fillStyle = n.name ? '#333' : '#999';
        ctx.font = `${fs}px sans-serif`;
        const maxChars = Math.floor(n.w * 3.78 / (fs * 0.55));
        const text = n.content.length > maxChars ? n.content.slice(0, maxChars - 1) + '…' : n.content;
        ctx.fillText(text, n.x * 3.78 + 1 / z, n.y * 3.78 + fs);
        ctx.restore();
      }
      drawContents(ctx, n.children, z);
    }
  }

  function loadArtwork(src: string): void {
    if (!src || src.length < 100) return;
    artworkLoading.value = true;
    const img = new Image();
    img.onload = () => { artworkImage.value = img; artworkLoading.value = false; };
    img.onerror = () => { artworkLoading.value = false; };
    img.src = src;
  }

  function addFeedbackDot(sx: number, sy: number, label: string): void {
    feedbackDots.value.push({ x: sx, y: sy, label, t: Date.now() });
  }

  return {
    viewport, pxPerMm, showHint, viewMode, artworkLoading,
    initialZoom, fitToCanvas, centerOnNode, toggleViewMode,
    onMouseDown, onMouseMove, onMouseUp, onWheel,
    draw, hitTest, addFeedbackDot, loadArtwork,
  };
}
