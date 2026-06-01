/**
 * Canvas pan/zoom/draw composable.
 * Pure mathematical approach — zero DOM measurement.
 * All spatial values in mm, converted to screen pixels on draw.
 */

import { ref, computed, type Ref } from 'vue';
import type { ScanResult, TreeNode } from '../types';
export interface CanvasViewport {
  /** Pan offset in screen pixels */
  offsetX: number;
  offsetY: number;
  /** Zoom level (1 = 100%) */
  zoom: number;
}

/** Group overlay colors — matches UI_AND_TYPES_SPEC */
const GROUP_COLORS: Record<string, { stroke: string; fill: string; fillHover: string; fillSelected: string }> = {
  Remark:          { stroke: '#534AB7', fill: 'rgba(83,74,183,0.08)',  fillHover: 'rgba(83,74,183,0.18)',  fillSelected: 'rgba(83,74,183,0.28)' },
  Bottom:          { stroke: '#0F6E56', fill: 'rgba(15,110,86,0.08)',  fillHover: 'rgba(15,110,86,0.18)',  fillSelected: 'rgba(15,110,86,0.28)' },
  Top:             { stroke: '#0F6E56', fill: 'rgba(15,110,86,0.08)',  fillHover: 'rgba(15,110,86,0.18)',  fillSelected: 'rgba(15,110,86,0.28)' },
  Left:            { stroke: '#185FA5', fill: 'rgba(24,95,165,0.08)',  fillHover: 'rgba(24,95,165,0.18)',  fillSelected: 'rgba(24,95,165,0.28)' },
  Right:           { stroke: '#185FA5', fill: 'rgba(24,95,165,0.08)',  fillHover: 'rgba(24,95,165,0.18)',  fillSelected: 'rgba(24,95,165,0.28)' },
  LOGO:            { stroke: '#888780', fill: 'rgba(136,135,128,0.06)', fillHover: 'rgba(136,135,128,0.14)', fillSelected: 'rgba(136,135,128,0.14)' },
};

const DEFAULT_COLORS = { stroke: '#888780', fill: 'transparent', fillHover: 'rgba(136,135,128,0.10)', fillSelected: 'rgba(136,135,128,0.20)' };

const CANVAS_BG = '#2d2d2d';
const DASHED_PURPLE = '#534AB7';
const HINT_TEXT_COLOR = '#666666';

export function useCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  scanResult: Ref<ScanResult | null>,
  selectedNodeId: Ref<string | null>,
) {
  const viewport = ref<CanvasViewport>({ offsetX: 0, offsetY: 0, zoom: 1 });
  const isPanning = ref(false);
  const hoveredNodeId = ref<string | null>(null);
  const panStart = ref({ x: 0, y: 0 });
  const artworkImage = ref<HTMLImageElement | null>(null);
  const showHint = ref(true);

  /** Pixels per mm at current zoom */
  const pxPerMm = computed(() => viewport.value.zoom * 3.78); // ~96dpi / 25.4

  function mmToScreen(mmX: number, mmY: number): { x: number; y: number } {
    return {
      x: mmX * pxPerMm.value + viewport.value.offsetX,
      y: mmY * pxPerMm.value + viewport.value.offsetY,
    };
  }

  function screenToMm(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - viewport.value.offsetX) / pxPerMm.value,
      y: (screenY - viewport.value.offsetY) / pxPerMm.value,
    };
  }

  function getGroupColor(node: TreeNode) {
    const name = node.name;
    for (const [key, colors] of Object.entries(GROUP_COLORS)) {
      if (name === key || name.startsWith(key)) return colors;
    }
    return DEFAULT_COLORS;
  }

  function fitToCanvas(): void {
    if (!canvasRef.value || !scanResult.value) return;
    const canvas = canvasRef.value;
    const w = scanResult.value.artboardWidth;
    const h = scanResult.value.artboardHeight;
    const padding = 40;
    const scaleX = (canvas.width - padding * 2) / (w * 3.78);
    const scaleY = (canvas.height - padding * 2) / (h * 3.78);
    const zoom = Math.min(scaleX, scaleY, 2);
    const imgW = w * 3.78 * zoom;
    const imgH = h * 3.78 * zoom;
    viewport.value = {
      zoom,
      offsetX: (canvas.width - imgW) / 2,
      offsetY: (canvas.height - imgH) / 2,
    };
    showHint.value = false;
  }

  function zoomAtPoint(screenX: number, screenY: number, factor: number): void {
    const worldBefore = screenToMm(screenX, screenY);
    viewport.value.zoom = Math.max(0.1, Math.min(10, viewport.value.zoom * factor));
    const worldAfter = screenToMm(screenX, screenY);
    viewport.value.offsetX += (worldAfter.x - worldBefore.x) * pxPerMm.value;
    viewport.value.offsetY += (worldAfter.y - worldBefore.y) * pxPerMm.value;
    showHint.value = false;
  }

  function centerOnNode(node: TreeNode): void {
    if (!canvasRef.value) return;
    const canvas = canvasRef.value;
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;
    const padding = 60;
    const targetZoom = Math.min(
      canvas.width / ((node.w + padding * 2 / 3.78) * 3.78),
      canvas.height / ((node.h + padding * 2 / 3.78) * 3.78),
      3,
    );
    viewport.value.zoom = targetZoom;
    const screenCx = cx * 3.78 * targetZoom;
    const screenCy = cy * 3.78 * targetZoom;
    viewport.value.offsetX = canvas.width / 2 - screenCx;
    viewport.value.offsetY = canvas.height / 2 - screenCy;
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

    if (!scanResult.value) {
      drawPlaceholder(ctx, canvas.clientWidth, canvas.clientHeight);
      return;
    }

    ctx.save();
    ctx.translate(viewport.value.offsetX, viewport.value.offsetY);
    ctx.scale(viewport.value.zoom, viewport.value.zoom);

    // Draw artwork if loaded
    if (artworkImage.value) {
      const w = scanResult.value.artboardWidth * 3.78;
      const h = scanResult.value.artboardHeight * 3.78;
      ctx.drawImage(artworkImage.value, 0, 0, w, h);
    } else {
      // Placeholder artboard rect
      const w = scanResult.value.artboardWidth * 3.78;
      const h = scanResult.value.artboardHeight * 3.78;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1 / viewport.value.zoom;
      ctx.strokeRect(0, 0, w, h);
    }

    // Draw group overlays
    if (scanResult.value.tree) {
      drawTree(ctx, scanResult.value.tree, viewport.value.zoom);
    }

    ctx.restore();

    // Draw hint
    if (showHint.value) {
      ctx.fillStyle = HINT_TEXT_COLOR;
      ctx.font = '8px sans-serif';
      ctx.fillText('Ctrl+scroll zoom  •  drag to pan  •  double-click to fit', 8, canvas.clientHeight - 8);
    }
  }

  function drawTree(ctx: CanvasRenderingContext2D, nodes: TreeNode[], zoom: number): void {
    const MM = 3.78; // px per mm at 1x
    for (const node of nodes) {
      if (node.w <= 0 || node.h <= 0) {
        drawTree(ctx, node.children, zoom);
        continue;
      }

      const colors = getGroupColor(node);
      const isSelected = node.id === selectedNodeId.value;
      const isHovered = node.id === hoveredNodeId.value;
      const x = node.x * MM;
      const y = node.y * MM;
      const w = node.w * MM;
      const h = node.h * MM;

      ctx.lineWidth = 1.5 / zoom;

      if (isSelected) {
        ctx.fillStyle = DASHED_PURPLE.replace(')', ',0.15)');
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = DASHED_PURPLE;
        ctx.setLineDash([4 / zoom, 3 / zoom]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        // Label
        const fontSize = Math.max(8, 11 / zoom);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = DASHED_PURPLE;
        ctx.fillText(node.name || '<unnamed>', x, y - 4 / zoom);
      } else {
        ctx.fillStyle = isHovered ? colors.fillHover : colors.fill;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = colors.stroke;
        ctx.strokeRect(x, y, w, h);
      }

      drawTree(ctx, node.children, zoom);
    }
  }

  function drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = '#555';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan an .ai file to preview', w / 2, h / 2);
    ctx.textAlign = 'start';
  }

  /* ── Hit testing ── */

  function hitTest(screenX: number, screenY: number): TreeNode | null {
    if (!scanResult.value) return null;
    const mm = screenToMm(screenX, screenY);
    return hitTestTree(scanResult.value.tree, mm.x, mm.y);
  }

  function hitTestTree(nodes: TreeNode[], mmX: number, mmY: number): TreeNode | null {
    // Check children first (deeper = higher z-order)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const child = nodes[i];
      const found = hitTestTree(child.children, mmX, mmY);
      if (found) return found;
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.w > 0 && node.h > 0 &&
          mmX >= node.x && mmX <= node.x + node.w &&
          mmY >= node.y && mmY <= node.y + node.h) {
        return node;
      }
    }
    return null;
  }

  /* ── Event handlers ── */

  function onMouseDown(e: MouseEvent): TreeNode | null {
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return null;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const hit = hitTest(sx, sy);
    if (hit && !hit.readOnly) return hit;

    isPanning.value = true;
    panStart.value = { x: e.clientX, y: e.clientY };
    return null;
  }

  function onMouseMove(e: MouseEvent): void {
    if (isPanning.value) {
      viewport.value.offsetX += e.clientX - panStart.value.x;
      viewport.value.offsetY += e.clientY - panStart.value.y;
      panStart.value = { x: e.clientX, y: e.clientY };
      showHint.value = false;
      return;
    }
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const hit = hitTest(sx, sy);
    hoveredNodeId.value = hit?.id ?? null;
  }

  function onMouseUp(): void {
    isPanning.value = false;
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = canvasRef.value?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomAtPoint(sx, sy, factor);
  }

  function onDblClick(): void {
    fitToCanvas();
  }

  /** Load artwork image from base64 or URL */
  function loadArtwork(src: string): void {
    const img = new Image();
    img.onload = () => {
      artworkImage.value = img;
    };
    img.src = src;
  }

  return {
    viewport,
    hoveredNodeId,
    pxPerMm,
    showHint,
    mmToScreen,
    screenToMm,
    fitToCanvas,
    centerOnNode,
    zoomAtPoint,
    draw,
    hitTest,
    loadArtwork,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    onDblClick,
  };
}
