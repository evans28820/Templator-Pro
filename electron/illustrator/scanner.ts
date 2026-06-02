/**
 * Illustrator .ai file scanner.
 * Generates and executes a JSX script that extracts:
 *   - Full layer tree with bounding boxes
 *   - Named text frame contents
 *   - Artboard dimensions
 *   - PNG preview (base64)
 *
 * All bounds converted to mm relative to artboard top-left.
 */

import { readFileSync, unlinkSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runJsx } from './runner';
import { discoverIllustrator } from './discovery';
import type { ScanResult, TreeNode, ScannedTextFrame } from '../../src/types/scan';

export async function scanAiFile(filePath: string): Promise<ScanResult> {
  const illustrator = await discoverIllustrator();
  if (!illustrator) {
    throw new Error('Adobe Illustrator not found. Please install Illustrator CC 2023+.');
  }

  const outputFile = join(tmpdir(), `templator_scan_${Date.now()}.json`);
  const pngFile = join(tmpdir(), `templator_preview_${Date.now()}.png`);

  const jsx = generateScanJsx(filePath, outputFile, pngFile);
  const result = await runJsx(jsx, illustrator, 120_000);

  if (!result.success) {
    throw new Error(`Illustrator scan failed: ${result.error}`);
  }

  let raw: ScanJsxOutput;
  try {
    const rawText = readFileSync(outputFile, 'utf-8');
    raw = JSON.parse(rawText);
  } catch (err) {
    const exists = existsSync(outputFile);
    const sizes = exists ? statSync(outputFile).size : 0;
    throw new Error(
      `Failed to parse scan output (file exists: ${exists}, size: ${sizes}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Clean up temp files
  try { unlinkSync(outputFile); } catch { /* */ }

  console.log('[scanner] scan result — pngOk:', raw.pngOk, 'tree nodes:', raw.tree.length, 'text frames:', raw.textFrames.length);
  let previewBase64: string | null = null;
  if (raw.pngOk && existsSync(pngFile)) {
    previewBase64 = readFileSync(pngFile, 'base64');
    try { unlinkSync(pngFile); } catch { /* */ }
  }

  return convertScanOutput(raw, filePath, previewBase64);
}

/* ── JSX generation ── */

function generateScanJsx(aiPath: string, outputPath: string, pngPath: string): string {
  return [
    '// Suppress security prompts and alert dialogs',
    'app.preferences.setBooleanPreference("ShowExternalJSXWarning", false);',
    'app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;',
    'var MM = 2.83465;',
    '',
    '// Custom JSON serializer (ES3 — Illustrator has no JSON object)',
    'function toJSON(obj) {',
    '  if (obj === null) return "null";',
    '  if (obj === undefined) return "null";',
    '  var t = typeof obj;',
    '  if (t === "string") return _jsonStr(obj);',
    '  if (t === "number") return obj.toString();',
    '  if (t === "boolean") return obj.toString();',
    '  if (obj instanceof Array) {',
    '    var arr = [];',
    '    for (var i = 0; i < obj.length; i++) arr.push(toJSON(obj[i]));',
    '    return "[" + arr.join(",") + "]";',
    '  }',
    '  if (t === "object") {',
    '    var parts = [];',
    '    for (var key in obj) {',
    '      if (typeof obj[key] === "function") continue;',
    '      parts.push(toJSON(String(key)) + ":" + toJSON(obj[key]));',
    '    }',
    '    return "{" + parts.join(",") + "}";',
    '  }',
    '  return "null";',
    '}',
    'function _jsonStr(s) {',
    '  var r = "";',
    '  var Q = String.fromCharCode(34);',
    '  var B = String.fromCharCode(92);',
    '  for (var i = 0; i < s.length; i++) {',
    '    var c = s.charCodeAt(i);',
    '    if (c === 34)      r += B + Q;',
    '    else if (c === 92) r += B + B;',
    '    else if (c === 10) r += B + "n";',
    '    else if (c === 13) r += B + "r";',
    '    else r += s.charAt(i);',
    '  }',
    '  return Q + r + Q;',
    '}',
    '',
    'try {',
    'var doc = app.open(File("' + escapeJsx(aiPath) + '"));',
    'var artboard = doc.artboards[0];',
    'var artboardRect = artboard.artboardRect;',
    'var artboardLeft = artboardRect[0];',
    'var artboardTop = artboardRect[1];',
    '',
    '// Export PNG preview via imageCapture (more reliable than exportFile)',
    'var pngOk = false;',
    'try {',
    '  var pngFile = new File("' + escapeJsx(pngPath) + '");',
    '  var pngFile.remove();',
    '  var capOpts = new ImageCaptureOptions();',
    '  capOpts.resolution = 72;',
    '  capOpts.antiAliasing = true;',
    '  doc.imageCapture(pngFile, artboardRect, capOpts);',
    '  pngOk = pngFile.exists;',
    '} catch(e) {',
    '  pngOk = false;',
    '}',
    '',
    'var result = {',
    '  artboardWidth: (artboardRect[2] - artboardRect[0]) / MM,',
    '  artboardHeight: (artboardRect[1] - artboardRect[3]) / MM,',
    '  pngOk: pngOk,',
    '  layerNames: [],',
    '  textFrames: [],',
    '  tree: [],',
    '};',
    '',
    'function scanGroup(container) {',
    '  var node = {',
    '    id: "",',
    '    name: container.name || "",',
    '    type: "group",',
    '    x: 0, y: 0, w: 0, h: 0,',
    '    children: [],',
    '  };',
    '',
    '  // Bounds',
    '  try {',
    '    var gb = container.geometricBounds;',
    '    node.x = (gb[0] - artboardLeft) / MM;',
    '    node.y = (artboardTop - gb[1]) / MM;',
    '    node.w = (gb[2] - gb[0]) / MM;',
    '    node.h = (gb[1] - gb[3]) / MM;',
    '  } catch(e) {}',
    '',
    '  node.id = node.name + "_" + node.x.toFixed(0) + "_" + node.y.toFixed(0);',
    '',
    '  // Group items',
    '  try {',
    '    var groups = container.groupItems;',
    '    for (var gi = 0; gi < groups.length; gi++) {',
    '      node.children.push(scanGroup(groups[gi]));',
    '    }',
    '  } catch(e) {}',
    '',
    '  // Text frames',
    '  try {',
    '    var tfs = container.textFrames;',
    '    for (var ti = 0; ti < tfs.length; ti++) {',
    '      var tf = tfs[ti];',
    '      var tfNode = {',
    '        id: (tf.name || "tf") + "_" + ti,',
    '        name: tf.name || "",',
    '        type: "textFrame",',
    '        x: 0, y: 0, w: 0, h: 0,',
    '        children: [],',
    '        content: tf.contents || "",',
    '        isUnnamed: !tf.name,',
    '      };',
    '      try {',
    '        var tgb = tf.geometricBounds;',
    '        tfNode.x = (tgb[0] - artboardLeft) / MM;',
    '        tfNode.y = (artboardTop - tgb[1]) / MM;',
    '        tfNode.w = (tgb[2] - tgb[0]) / MM;',
    '        tfNode.h = (tgb[1] - tgb[3]) / MM;',
    '      } catch(e) {}',
    '      node.children.push(tfNode);',
    '',
    '      if (tf.name) {',
    '        result.textFrames.push({',
    '          name: tf.name,',
    '          content: tf.contents || "",',
    '          x: tfNode.x, y: tfNode.y, w: tfNode.w, h: tfNode.h,',
    '          isUnnamed: false,',
    '          readOnly: tf.name === "Type",',
    '        });',
    '      }',
    '    }',
    '  } catch(e) {}',
    '',
    '  // Path items',
    '  try {',
    '    var pis = container.pathItems;',
    '    for (var pi = 0; pi < pis.length; pi++) {',
    '      var pathItem = pis[pi];',
    '      var pNode = {',
    '        id: (pathItem.name || "path") + "_" + pi,',
    '        name: pathItem.name || "",',
    '        type: "pathItem",',
    '        x: 0, y: 0, w: 0, h: 0,',
    '        children: [],',
    '      };',
    '      try {',
    '        var pgb = pathItem.geometricBounds;',
    '        pNode.x = (pgb[0] - artboardLeft) / MM;',
    '        pNode.y = (artboardTop - pgb[1]) / MM;',
    '        pNode.w = (pgb[2] - pgb[0]) / MM;',
    '        pNode.h = (pgb[1] - pgb[3]) / MM;',
    '      } catch(e) {}',
    '      node.children.push(pNode);',
    '    }',
    '  } catch(e) {}',
    '',
    '  return node;',
    '}',
    '',
    'var layer = doc.layers[0];',
    'result.layerNames.push(layer.name);',
    'result.tree.push(scanGroup(layer));',
    '',
    '// Detect box type from Type text frame',
    'for (var fi = 0; fi < result.textFrames.length; fi++) {',
    '  if (result.textFrames[fi].name === "Type") {',
    '    result.boxType = result.textFrames[fi].content;',
    '  }',
    '}',
    '',
    '// Write output',
    'var outFile = File("' + escapeJsx(outputPath) + '");',
    'outFile.open("w");',
    'outFile.write(toJSON(result));',
    'outFile.close();',
    '',
    'doc.close(SaveOptions.DONOTSAVECHANGES);',
    '} catch(e) {',
    '  var errFile = File("' + escapeJsx(outputPath) + '");',
    '  errFile.open("w");',
    '  errFile.write(\'{"error":"\' + String(e) + \'"}\');',
    '  errFile.close();',
    '}',
  ].join('\n');
}

interface ScanJsxOutput {
  artboardWidth: number;
  artboardHeight: number;
  pngOk: boolean;
  layerNames: string[];
  textFrames: ScanJsxTextFrame[];
  tree: ScanJsxNode[];
  boxType?: string;
}

interface ScanJsxTextFrame {
  name: string;
  content: string;
  x: number; y: number; w: number; h: number;
  isUnnamed: boolean;
  readOnly: boolean;
}

interface ScanJsxNode {
  id: string;
  name: string;
  type: string;
  x: number; y: number; w: number; h: number;
  children: ScanJsxNode[];
  content?: string;
  isUnnamed?: boolean;
}

function convertScanOutput(raw: ScanJsxOutput, aiPath: string, previewBase64: string | null): ScanResult {
  console.log('[scanner] previewBase64 length:', previewBase64?.length ?? 0);
  const crypto = require('node:crypto');
  const hash = crypto.createHash('md5').update(aiPath).digest('hex');

  const tree = raw.tree.map(convertNode);
  const textFrames: ScannedTextFrame[] = raw.textFrames.map(tf => ({
    name: tf.name,
    content: tf.content,
    x: tf.x,
    y: tf.y,
    w: tf.w,
    h: tf.h,
    isUnnamed: tf.isUnnamed,
    readOnly: tf.readOnly || tf.name === 'Type',
  }));

  const boxTypeInfo = raw.boxType
    ? { type: raw.boxType as 'TOP OPEN' | 'TOP & BOTTOM' }
    : null;

  return {
    aiFilePath: aiPath,
    fileHash: hash,
    tree,
    textFrames,
    artboardWidth: raw.artboardWidth,
    artboardHeight: raw.artboardHeight,
    boxType: boxTypeInfo,
    boxDimensions: null,
    previewImageBase64: previewBase64,
    layerNames: raw.layerNames,
    scannedAt: new Date().toISOString(),
  };
}

function convertNode(n: ScanJsxNode): TreeNode {
  return {
    id: n.id,
    name: n.name,
    type: n.type as TreeNode['type'],
    x: n.x, y: n.y, w: n.w, h: n.h,
    children: n.children.map(convertNode),
    includeInExcel: n.type === 'textFrame' && !!n.name && n.name !== 'Type',
    canShrink: n.type === 'textFrame',
    content: n.content || undefined,
    expanded: n.name === 'Remark' || n.name === 'PrintingLayer',
    readOnly: !n.name || n.name === 'Type',
  };
}

function escapeJsx(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
