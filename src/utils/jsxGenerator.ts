/**
 * ES3-compatible JSX string generator.
 * Produces Adobe Illustrator ExtendScript from panelConfigs + nodeConfigs + Excel row data.
 *
 * Rules:
 *   - var only, no const/let, no arrow functions, no forEach, no Object.keys
 *   - Line 1 MUST be: app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
 *   - Recursive findGroupByName (never flat .groupItems["name"])
 *   - TIF: 300dpi, CMYK, LZW, embedICCProfile, ARTOPTIMIZED
 *   - Work on duplicated layer — never modify original
 */

import type { PanelConfig, PipelinePhase, FieldConfig } from '../types';
import type { RemarkLayout } from '../workers/layout.worker';

export interface JsxGenerationInput {
  templateAiPath: string;
  outputAiPath: string;
  outputTifPath: string;
  layerName: string;
  boxType: 'TOP OPEN' | 'TOP & BOTTOM';
  boxDimensions: { L: number; W: number; H: number };
  fields: Record<string, string>;
  panelConfigs: PanelConfig[];
  fieldConfigs: FieldConfig[];
  pipeline: PipelinePhase[];
  layouts: Record<string, RemarkLayout[]>;
  iconLibraryPath: string;
}

export function generateJsx(input: JsxGenerationInput): string {
  const lines: string[] = [];

  /* ── Header: disable alerts + conversion ── */
  lines.push('app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;');
  lines.push('var MM = 2.83465;');
  lines.push('');

  /* ── Helper: recursive findGroupByName ── */
  lines.push('function findGroupByName(container, targetName) {');
  lines.push('  var items = container.groupItems;');
  lines.push('  for (var i = 0; i < items.length; i++) {');
  lines.push('    if (items[i].name === targetName) return items[i];');
  lines.push('    var found = findGroupByName(items[i], targetName);');
  lines.push('    if (found) return found;');
  lines.push('  }');
  lines.push('  return null;');
  lines.push('}');
  lines.push('');

  /* ── Main ── */
  lines.push('var doc = app.open(File("' + escapeJsxString(input.templateAiPath) + '"));');
  lines.push('');

  // Duplicate layer
  lines.push('var srcLayer = doc.layers[0];');
  lines.push('srcLayer.name = "' + escapeJsxString(input.layerName) + '";');
  lines.push('');

  // Apply text field updates
  lines.push('// ── Text field updates ──');
  for (const [key, value] of Object.entries(input.fields)) {
    if (!value) continue;
    lines.push('var tf = findTextFrame(srcLayer, "' + escapeJsxString(key) + '");');
    lines.push('if (tf) tf.contents = "' + escapeJsxString(value) + '";');
  }
  lines.push('');

  // Process each panel
  for (const panelCfg of input.panelConfigs) {
    if (!panelCfg.enabled) continue;
    const layout = input.layouts[panelCfg.face];
    if (!layout || layout.length === 0) continue;

    lines.push('// ── Panel: ' + panelCfg.face + ' ──');
    lines.push('var panelGroup = findGroupByName(srcLayer, "' + panelCfg.face + '");');
    lines.push('if (panelGroup) {');

    for (const item of layout) {
      if (!item.enabled) continue;
      lines.push('  var remark = findGroupByName(panelGroup, "' + escapeJsxString(item.groupName) + '");');
      lines.push('  if (remark) {');
      lines.push('    var tf = findTextFrame(remark, "");');
      lines.push('    if (tf) {');
      lines.push('      tf.textRange.characterAttributes.size = ' + item.font.toFixed(1) + ';');
      lines.push('      tf.left = ' + (item.x * 2.83465).toFixed(2) + ';');
      lines.push('      tf.top  = ' + (item.y * 2.83465).toFixed(2) + ';');
      lines.push('    }');
      lines.push('  }');
    }

    lines.push('}');
    lines.push('');
  }

  // TIF Export
  lines.push('// ── TIF Export ──');
  lines.push('var opts = new ExportOptionsTIFF();');
  lines.push('opts.resolution = 300;');
  lines.push('opts.imageColorSpace = ImageColorSpace.CMYK;');
  lines.push('opts.antiAliasing = AntiAliasingMethod.ARTOPTIMIZED;');
  lines.push('opts.embedICCProfile = true;');
  lines.push('opts.lZWCompression = true;');
  lines.push('');
  lines.push('var printingLayer = findGroupByName(srcLayer, "PrintingLayer");');
  lines.push('if (printingLayer) {');
  lines.push('  doc.selection = [printingLayer];');
  lines.push('  doc.exportFile(File("' + escapeJsxString(input.outputTifPath) + '"), ExportType.TIFF, opts);');
  lines.push('}');
  lines.push('');

  // Save
  lines.push('doc.saveAs(File("' + escapeJsxString(input.outputAiPath) + '"));');
  lines.push('doc.close();');

  return lines.join('\n');
}

function escapeJsxString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
