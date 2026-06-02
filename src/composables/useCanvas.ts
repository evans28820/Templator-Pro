/**
 * Canvas pan/zoom/draw composable.
 * Canvas transform order: translate(ox,oy) then scale(z,z)
 *   → cssX = z * (drawX + ox), cssY = z * (drawY + oy)
 * All spatial values in mm. Pixels per mm at 1x: 3.78.
 */

import { ref, computed, type Ref } from 'vue';
import type { ScanResult, TreeNode } from '../types';

export interface CanvasViewport { offsetX: number; offsetY: number; zoom: number; }

const GROUP_COLORS: Record<string, { stroke: string; fill: string }> = {
  Remark: { stroke: '#534AB7', fill: 'rgba(83,74,183,0.08)' },
  Bottom: { stroke: '#0F6E56', fill: 'rgba(15,110,86,0.08)' },
  Top:    { stroke: '#0F6E56', fill: 'rgba(15,110,86,0.08)' },
  Left:   { stroke: '#185FA5', fill: 'rgba(24,95,165,0.08)' },
  Right:  { stroke: '#185FA5', fill: 'rgba(24,95,165,0.08)' },
  LOGO:   { stroke: '#888780', fill: 'rgba(136,135,128,0.06)' },
};
const DF = { stroke: '#888780', fill: 'transparent' };

export function useCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scanResult: Ref<ScanResult | null>,
  selectedNodeId: Ref<string | null>,
  _configuredFaces: Ref<Set<string>>,
) {
  const vp = ref<CanvasViewport>({ offsetX: 0, offsetY: 0, zoom: 1 });
  const artworkImage = ref<HTMLImageElement | null>(null);
  const artworkLoading = ref(false);
  const showHint = ref(true);
  const viewMode = ref<'content' | 'boxes'>('content');
  const feedbackDots = ref<Array<{ x: number; y: number; label: string; t: number }>>([]);
  const pxPerMm = computed(() => vp.value.zoom * 3.78);

  function toggleViewMode(): void { viewMode.value = viewMode.value === 'content' ? 'boxes' : 'content'; }

  /* ── Coordinate transforms for translate-then-scale ── */
  function screenToMm(sx: number, sy: number): { x: number; y: number } {
    // cssX = z * (mm*3.78 + ox) → mm = (cssX/z - ox) / 3.78
    return { x: (sx / vp.value.zoom - vp.value.offsetX) / 3.78, y: (sy / vp.value.zoom - vp.value.offsetY) / 3.78 };
  }

  /* ── Zoom / Pan ── */
  function initialZoom(): void {
    if (!canvasRef.value || !scanResult.value) return;
    const c = canvasRef.value;
    const w = scanResult.value.artboardWidth, h = scanResult.value.artboardHeight;
    const z = Math.max(0.3, Math.min(1, c.height * 0.7 / (h * 3.78)));
    vp.value = { zoom: z, offsetX: c.width / (2 * z) - w * 3.78 / 2, offsetY: 0 };
    showHint.value = false;
  }

  function fitToCanvas(): void {
    if (!canvasRef.value || !scanResult.value) return;
    const c = canvasRef.value;
    const w = scanResult.value.artboardWidth, h = scanResult.value.artboardHeight;
    const z = Math.min((c.width - 40) / (w * 3.78), (c.height - 40) / (h * 3.78), 2);
    vp.value = { zoom: z, offsetX: c.width / (2 * z) - w * 3.78 / 2, offsetY: c.height / (2 * z) - h * 3.78 / 2 };
    showHint.value = false;
  }

  function centerOnNode(node: TreeNode): void {
    if (!canvasRef.value) return;
    const c = canvasRef.value;
    const mw = Math.max(node.w, 40), mh = Math.max(node.h, 25);
    const nz = Math.max(0.4, Math.min(c.width * 0.7 / (mw * 3.78), c.height * 0.7 / (mh * 3.78), 3));
    const cx = (node.x + node.w / 2) * 3.78;
    const cy = (node.y + node.h / 2) * 3.78;
    vp.value.zoom = nz;
    vp.value.offsetX = c.width / (2 * nz) - cx;
    vp.value.offsetY = c.height / (2 * nz) - cy;
  }

  /* ── Hit test ── */
  function hitTest(sx: number, sy: number): TreeNode | null {
    if (!scanResult.value) return null;
    const { x: mx, y: my } = screenToMm(sx, sy);
    return _deepest(scanResult.value.tree, mx, my);
  }
  function _deepest(nodes: TreeNode[], mx: number, my: number): TreeNode | null {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.w > 0 && n.h > 0 && mx >= n.x && mx <= n.x + n.w && my >= n.y && my <= n.y + n.h) {
        const c = _deepest(n.children, mx, my);
        return c || n;
      }
    }
    return null;
  }

  /* ── Mouse handlers ── */
  let ps = { x: 0, y: 0 }, ph: TreeNode | null = null, md = false, ip = false;
  function onMouseDown(e: MouseEvent): void {
    const r = canvasRef.value?.getBoundingClientRect(); if (!r) return;
    md = true; ps = { x: e.clientX, y: e.clientY }; ip = false;
    const h = hitTest(e.clientX - r.left, e.clientY - r.top);
    ph = (h && !h.readOnly) ? h : null;
  }
  function onMouseMove(e: MouseEvent): void {
    if (!md) return;
    const dx = Math.abs(e.clientX - ps.x), dy = Math.abs(e.clientY - ps.y);
    if (ph && (dx > 4 || dy > 4)) { ph = null; ip = true; }
    if (ip || (!ph && (dx > 2 || dy > 2))) {
      ip = true;
      vp.value.offsetX += (e.clientX - ps.x) / vp.value.zoom;
      vp.value.offsetY += (e.clientY - ps.y) / vp.value.zoom;
      ps = { x: e.clientX, y: e.clientY };
      showHint.value = false;
    }
  }
  function onMouseUp(): TreeNode | null {
    if (!md) return null;
    md = false;
    const h = (!ip && ph) ? ph : null;
    ph = null; ip = false;
    return h;
  }
  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const r = canvasRef.value?.getBoundingClientRect(); if (!r) return;
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const z = vp.value.zoom;
    const wx = sx / z - vp.value.offsetX, wy = sy / z - vp.value.offsetY;
    const nz = Math.max(0.05, Math.min(10, z * (e.deltaY < 0 ? 1.08 : 0.93)));
    vp.value.zoom = nz;
    vp.value.offsetX = sx / nz - wx;
    vp.value.offsetY = sy / nz - wy;
    showHint.value = false;
  }

  /* ── Drawing ── */
  function draw(): void {
    const c = canvasRef.value; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);

    if (!scanResult.value) {
      ctx.fillStyle = '#999'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Scan an .ai file to preview', c.clientWidth / 2, c.clientHeight / 2);
      ctx.textAlign = 'start'; return;
    }

    const z = vp.value.zoom, ox = vp.value.offsetX, oy = vp.value.offsetY;
    const aw = scanResult.value.artboardWidth * 3.78, ah = scanResult.value.artboardHeight * 3.78;

    ctx.save();
    ctx.translate(ox, oy); ctx.scale(z, z);

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

    if (viewMode.value === 'boxes') _drawOverlays(ctx, scanResult.value.tree, z);
    if (selectedNodeId.value) _drawSel(ctx, scanResult.value.tree, z, selectedNodeId.value);
    if (viewMode.value === 'content') _drawContent(ctx, scanResult.value.tree, z);

    ctx.restore();

    // Feedback dots
    const now = Date.now();
    feedbackDots.value = feedbackDots.value.filter(d => now - d.t < 3000);
    for (const d of feedbackDots.value) {
      const a = Math.max(0, 1 - (now - d.t) / 3000);
      ctx.save(); ctx.fillStyle = `rgba(255,0,0,${a})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.font = '10px monospace';
      ctx.fillText(d.label, d.x + 7, d.y - 7); ctx.restore();
    }

    if (showHint.value) {
      ctx.fillStyle = '#aaa'; ctx.font = '9px sans-serif';
      ctx.fillText('Scroll=zoom · Drag=pan · Click=select · Dblclick=fit', 8, c.clientHeight - 4);
    }
  }

  function _drawOverlays(ctx: CanvasRenderingContext2D, nodes: TreeNode[], z: number): void {
    for (const n of nodes) {
      if (n.w <= 0 || n.h <= 0) { _drawOverlays(ctx, n.children, z); continue; }
      const c = GROUP_COLORS[n.name] || DF;
      const x = n.x * 3.78, y = n.y * 3.78, w = n.w * 3.78, h = n.h * 3.78;
      ctx.fillStyle = c.fill; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = c.stroke; ctx.lineWidth = 1.5 / z; ctx.strokeRect(x, y, w, h);
      _drawOverlays(ctx, n.children, z);
    }
  }

  function _drawSel(ctx: CanvasRenderingContext2D, nodes: TreeNode[], z: number, tid: string): void {
    for (const n of nodes) {
      if (n.id === tid && n.w > 0 && n.h > 0) {
        const x = n.x * 3.78, y = n.y * 3.78, w = n.w * 3.78, h = n.h * 3.78;
        ctx.fillStyle = 'rgba(83,74,183,0.15)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#534AB7'; ctx.lineWidth = 2.5 / z;
        ctx.setLineDash([5 / z, 3 / z]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
      }
      _drawSel(ctx, n.children, z, tid);
    }
  }

  function _drawContent(ctx: CanvasRenderingContext2D, nodes: TreeNode[], z: number): void {
    for (const n of nodes) {
      if (n.type === 'textFrame' && n.content && n.w > 0 && n.h > 0) {
        const fs = Math.max(4, Math.min(n.h * 0.7 * 3.78, 10 / z));
        ctx.save(); ctx.fillStyle = n.name ? '#333' : '#999'; ctx.font = `${fs}px sans-serif`;
        const mc = Math.floor(n.w * 3.78 / (fs * 0.55));
        const t = n.content.length > mc ? n.content.slice(0, mc - 1) + '…' : n.content;
        ctx.fillText(t, n.x * 3.78 + 1 / z, n.y * 3.78 + fs);
        ctx.restore();
      }
      _drawContent(ctx, n.children, z);
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
    viewport: vp, pxPerMm, showHint, viewMode, artworkLoading,
    initialZoom, fitToCanvas, centerOnNode, toggleViewMode,
    onMouseDown, onMouseMove, onMouseUp, onWheel,
    draw, hitTest, addFeedbackDot, loadArtwork,
  };
}
