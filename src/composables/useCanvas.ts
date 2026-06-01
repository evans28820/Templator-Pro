/**
 * Canvas pan/zoom/draw composable.
 * Pure mathematical approach — zero DOM measurement.
 * All spatial values in mm, converted to screen pixels on draw.
 */

import { ref, computed, type Ref } from 'vue';
import type { ScanResult, TreeNode } from '../types';

export interface CanvasViewport {
  offsetX: number; offsetY: number; zoom: number;
}

const GROUP_COLORS: Record<string, { stroke: string; fill: string; fillHover: string; fillSelected: string }> = {
  Remark:  { stroke: '#534AB7', fill: 'rgba(83,74,183,0.08)',  fillHover: 'rgba(83,74,183,0.18)',  fillSelected: 'rgba(83,74,183,0.28)' },
  Bottom:  { stroke: '#0F6E56', fill: 'rgba(15,110,86,0.08)',  fillHover: 'rgba(15,110,86,0.18)',  fillSelected: 'rgba(15,110,86,0.28)' },
  Top:     { stroke: '#0F6E56', fill: 'rgba(15,110,86,0.08)',  fillHover: 'rgba(15,110,86,0.18)',  fillSelected: 'rgba(15,110,86,0.28)' },
  Left:    { stroke: '#185FA5', fill: 'rgba(24,95,165,0.08)',  fillHover: 'rgba(24,95,165,0.18)',  fillSelected: 'rgba(24,95,165,0.28)' },
  Right:   { stroke: '#185FA5', fill: 'rgba(24,95,165,0.08)',  fillHover: 'rgba(24,95,165,0.18)',  fillSelected: 'rgba(24,95,165,0.28)' },
  LOGO:    { stroke: '#888780', fill: 'rgba(136,135,128,0.06)', fillHover: 'rgba(136,135,128,0.14)', fillSelected: 'rgba(136,135,128,0.14)' },
};
const DEFAULT_COLORS = { stroke: '#888780', fill: 'transparent', fillHover: 'rgba(136,135,128,0.10)', fillSelected: 'rgba(136,135,128,0.20)' };
const CANVAS_BG = '#2d2d2d';
const DASHED_PURPLE = '#534AB7';
const CONFIGURED_DOT = '#ce9178';
const HINT_TEXT_COLOR = '#666666';
const FACE_NAMES = ['bottom', 'top', 'left', 'right'];

export function useCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scanResult: Ref<ScanResult | null>,
  selectedNodeId: Ref<string | null>,
  configuredFaces: Ref<Set<string>>,
) {
  const viewport = ref<CanvasViewport>({ offsetX: 0, offsetY: 0, zoom: 1 });
  const isPanning = ref(false);
  const hoveredNodeId = ref<string | null>(null);
  const panStart = ref({ x: 0, y: 0 });
  const artworkImage = ref<HTMLImageElement | null>(null);
  const showHint = ref(true);

  const pxPerMm = computed(() => viewport.value.zoom * 3.78);

  function mmToScreen(mmX: number, mmY: number): { x: number; y: number } {
    return { x: mmX * pxPerMm.value + viewport.value.offsetX, y: mmY * pxPerMm.value + viewport.value.offsetY };
  }
  function screenToMm(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - viewport.value.offsetX) / pxPerMm.value, y: (sy - viewport.value.offsetY) / pxPerMm.value };
  }

  function getGroupColor(node: TreeNode) {
    for (const [key, colors] of Object.entries(GROUP_COLORS)) {
      if (node.name === key || node.name.startsWith(key)) return colors;
    }
    return DEFAULT_COLORS;
  }

  /* ── FIX 1: Initial zoom → 70% canvas height, top portion ── */
  function initialZoom(): void {
    if (!canvasRef.value || !scanResult.value) return;
    const canvas = canvasRef.value;
    const h = scanResult.value.artboardHeight;
    const w = scanResult.value.artboardWidth;
    const targetH = canvas.height * 0.7;
    const zoom = targetH / (h * 3.78);
    const clamped = Math.max(0.3, Math.min(2, zoom));
    viewport.value = {
      zoom: clamped,
      offsetX: (canvas.width - w * 3.78 * clamped) / 2,
      offsetY: 0,
    };
    showHint.value = false;
  }

  function fitToCanvas(): void {
    if (!canvasRef.value || !scanResult.value) return;
    const canvas = canvasRef.value;
    const w = scanResult.value.artboardWidth;
    const h = scanResult.value.artboardHeight;
    const pad = 40;
    const zx = (canvas.width - pad * 2) / (w * 3.78);
    const zy = (canvas.height - pad * 2) / (h * 3.78);
    const zoom = Math.min(zx, zy, 2);
    viewport.value = {
      zoom,
      offsetX: (canvas.width - w * 3.78 * zoom) / 2,
      offsetY: (canvas.height - h * 3.78 * zoom) / 2,
    };
    showHint.value = false;
  }

  function zoomAtPoint(sx: number, sy: number, factor: number): void {
    const before = screenToMm(sx, sy);
    viewport.value.zoom = Math.max(0.1, Math.min(10, viewport.value.zoom * factor));
    const after = screenToMm(sx, sy);
    viewport.value.offsetX += (after.x - before.x) * pxPerMm.value;
    viewport.value.offsetY += (after.y - before.y) * pxPerMm.value;
    showHint.value = false;
  }

  /* ── FIX 2: Zoom to parent face group context ── */
  function findParentFace(nodes: TreeNode[], targetId: string): TreeNode | null {
    for (const node of nodes) {
      if (node.children.some(c => c.id === targetId || findInTree(c, targetId))) {
        const name = node.name.toLowerCase();
        if (FACE_NAMES.includes(name) || node.name === 'Remark') return node;
        if (node.name === 'PrintingLayer') {
          for (const c of node.children) {
            const cn = c.name.toLowerCase();
            if (FACE_NAMES.includes(cn) && (c.id === targetId || findInTree(c, targetId))) return c;
          }
        }
      }
      const found = findParentFace(node.children, targetId);
      if (found) return found;
    }
    return null;
  }

  function findInTree(node: TreeNode, targetId: string): boolean {
    if (node.id === targetId) return true;
    return node.children.some(c => findInTree(c, targetId));
  }

  function centerOnNode(node: TreeNode): void {
    if (!canvasRef.value) return;
    const tree = scanResult.value?.tree ?? [];
    const parentFace = findParentFace(tree, node.id);
    const target = parentFace && parentFace.w > 0 ? parentFace : node;

    const canvas = canvasRef.value;
    const cx = target.x + target.w / 2;
    const cy = target.y + target.h / 2;
    const pad = 40;
    const zw = canvas.width / ((target.w + pad * 2 / 3.78) * 3.78);
    const zh = canvas.height / ((target.h + pad * 2 / 3.78) * 3.78);
    const zoom = Math.min(zw, zh, 3);
    viewport.value.zoom = zoom;
    viewport.value.offsetX = canvas.width / 2 - cx * 3.78 * zoom;
    viewport.value.offsetY = canvas.height / 2 - cy * 3.78 * zoom;
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
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    if (!scanResult.value) { drawPlaceholder(ctx, canvas.clientWidth, canvas.clientHeight); return; }

    ctx.save();
    ctx.translate(viewport.value.offsetX, viewport.value.offsetY);
    ctx.scale(viewport.value.zoom, viewport.value.zoom);

    if (artworkImage.value) {
      ctx.drawImage(artworkImage.value, 0, 0, scanResult.value.artboardWidth * 3.78, scanResult.value.artboardHeight * 3.78);
    } else {
      // Clean placeholder
      const w = scanResult.value.artboardWidth * 3.78;
      const h = scanResult.value.artboardHeight * 3.78;
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 2 / viewport.value.zoom;
      ctx.strokeRect(0, 0, w, h);
      ctx.save();
      ctx.fillStyle = '#ddd';
      ctx.font = `${Math.max(9, 14 / viewport.value.zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Preview unavailable — scan to load artwork', w / 2, h / 2 - 30);
      ctx.fillText(`${scanResult.value.artboardWidth.toFixed(0)} × ${scanResult.value.artboardHeight.toFixed(0)} mm`, w / 2, h / 2);
      ctx.textAlign = 'start';
      ctx.restore();
      // Draw group overlays even without artwork
      drawTree(ctx, scanResult.value.tree, viewport.value.zoom);
      ctx.restore();
      if (showHint.value) drawHint(ctx, canvas.clientWidth, canvas.clientHeight);
      return;
    }

    drawTree(ctx, scanResult.value.tree, viewport.value.zoom);
    ctx.restore();
    if (showHint.value) drawHint(ctx, canvas.clientWidth, canvas.clientHeight);
  }

  function drawHint(ctx: CanvasRenderingContext2D, _cw: number, ch: number): void {
    ctx.fillStyle = HINT_TEXT_COLOR;
    ctx.font = '8px sans-serif';
    ctx.fillText('Ctrl+scroll zoom  •  drag to pan  •  double-click to fit', 8, ch - 8);
  }

  function drawTree(ctx: CanvasRenderingContext2D, nodes: TreeNode[], zoom: number): void {
    const MM = 3.78;
    for (const node of nodes) {
      if (node.w <= 0 || node.h <= 0) { drawTree(ctx, node.children, zoom); continue; }

      const colors = getGroupColor(node);
      const isSelected = node.id === selectedNodeId.value;
      const isHovered = node.id === hoveredNodeId.value;
      const x = node.x * MM, y = node.y * MM, w = node.w * MM, h = node.h * MM;
      const name = node.name.toLowerCase();
      const isFace = FACE_NAMES.includes(name);

      ctx.lineWidth = 1.5 / zoom;

      if (isSelected) {
        ctx.fillStyle = 'rgba(83,74,183,0.15)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = DASHED_PURPLE;
        ctx.setLineDash([4 / zoom, 3 / zoom]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
        const fs = Math.max(8, 11 / zoom);
        ctx.font = `${fs}px sans-serif`;
        ctx.fillStyle = DASHED_PURPLE;
        ctx.fillText(node.name || '', x, y - 4 / zoom);
      } else {
        ctx.fillStyle = isHovered ? colors.fillHover : colors.fill;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = colors.stroke;
        ctx.strokeRect(x, y, w, h);
      }

      // FIX 5: Configured indicator dot on face groups
      if (isFace && configuredFaces.value.has(name)) {
        ctx.fillStyle = CONFIGURED_DOT;
        ctx.beginPath();
        ctx.arc(x + w - 4 / zoom, y + 4 / zoom, 3 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // FIX 7: Face group labels always visible
      if (isFace && !isSelected) {
        const fs = Math.max(7, 10 / zoom);
        ctx.font = `600 ${fs}px sans-serif`;
        ctx.fillStyle = colors.stroke;
        ctx.globalAlpha = 0.7;
        ctx.fillText(node.name, x + 3 / zoom, y + 12 / zoom);
        ctx.globalAlpha = 1;
      }

      drawTree(ctx, node.children, zoom);
    }
  }

  function drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = '#999';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan an .ai file to preview', w / 2, h / 2);
    ctx.textAlign = 'start';
  }

  /* ── Hit testing ── */
  function hitTest(screenX: number, screenY: number): TreeNode | null {
    if (!scanResult.value) return null;
    return hitTestTree(scanResult.value.tree, screenToMm(screenX, screenY).x, screenToMm(screenX, screenY).y);
  }

  function hitTestTree(nodes: TreeNode[], mmX: number, mmY: number): TreeNode | null {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const found = hitTestTree(nodes[i].children, mmX, mmY);
      if (found) return found;
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.w > 0 && node.h > 0 && mmX >= node.x && mmX <= node.x + node.w && mmY >= node.y && mmY <= node.y + node.h) {
        return node;
      }
    }
    return null;
  }

  function onMouseDown(e: MouseEvent): TreeNode | null {
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return null;
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (hit && !hit.readOnly) return hit;
    isPanning.value = true;
    panStart.value = { x: e.clientX, y: e.clientY };
    return null;
  }

  function onMouseMove(e: MouseEvent): void {
    if (isPanning.value) { viewport.value.offsetX += e.clientX - panStart.value.x; viewport.value.offsetY += e.clientY - panStart.value.y; panStart.value = { x: e.clientX, y: e.clientY }; showHint.value = false; return; }
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return;
    hoveredNodeId.value = hitTest(e.clientX - rect.left, e.clientY - rect.top)?.id ?? null;
  }

  function onMouseUp(): void { isPanning.value = false; }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return;
    zoomAtPoint(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.1 : 0.9);
  }

  function onDblClick(): void { fitToCanvas(); }

  function loadArtwork(src: string): void {
    const img = new Image();
    img.onload = () => { console.log('[canvas] artwork loaded', img.width, 'x', img.height); artworkImage.value = img; };
    img.onerror = () => { console.error('[canvas] artwork failed to load'); };
    img.src = src;
  }

  return {
    viewport, hoveredNodeId, pxPerMm, showHint,
    mmToScreen, screenToMm,
    initialZoom, fitToCanvas, centerOnNode, zoomAtPoint,
    draw, hitTest, loadArtwork,
    onMouseDown, onMouseMove, onMouseUp, onWheel, onDblClick,
  };
}
