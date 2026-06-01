/**
 * Excel template generation using ExcelJS.
 * Creates a template .xlsx with correct columns from fieldConfigs.
 */

import ExcelJS from 'exceljs';
import type { FieldConfig } from '../../src/types/scan';
import type { ExcelColumn } from '../../src/types/job';

export async function generateExcel(
  columns: ExcelColumn[],
  outputPath: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Orders');

  // Row 1: Headers
  const headerRow = sheet.addRow(columns.map(c => c.label));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 12 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD6E4F0' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Row 2: Description/notes
  const descRow = sheet.addRow(columns.map(c => {
    if (c.type === 'number') return 'Number (mm)';
    if (c.type === 'visibility') return 'Y or N';
    return 'Text';
  }));
  descRow.eachCell((cell) => {
    cell.font = { italic: true, size: 10, color: { argb: 'FF888888' } };
  });

  // Row 3: Empty (data starts here)
  sheet.addRow([]);

  // Set column widths
  columns.forEach((col, i) => {
    const colLetter = String.fromCharCode(65 + (i % 26));
    sheet.getColumn(colLetter).width = Math.max(12, col.label.length + 4);
  });

  // Freeze top 2 rows
  sheet.views = [{ state: 'frozen', ySplit: 2 }];

  await workbook.xlsx.writeFile(outputPath);
}

/**
 * Build Excel columns from field configs.
 */
export function buildColumns(fieldConfigs: FieldConfig[]): ExcelColumn[] {
  const columns: ExcelColumn[] = [];

  columns.push({
    name: 'artworkFile',
    label: 'Artwork File',
    type: 'text',
    required: true,
    index: 0,
  });

  columns.push({
    name: 'layerName',
    label: 'Layer Name',
    type: 'text',
    required: true,
    index: 1,
  });

  let idx = 2;
  for (const field of fieldConfigs) {
    if (!field.includeInExcel) continue;
    columns.push({
      name: field.name,
      label: field.columnLabel || field.name,
      type: field.type === 'visibility' ? 'visibility' : 'text',
      required: false,
      index: idx++,
    });
  }

  columns.push({
    name: 'L',
    label: 'Length (mm)',
    type: 'number',
    required: true,
    index: idx++,
  });

  columns.push({
    name: 'W',
    label: 'Width (mm)',
    type: 'number',
    required: true,
    index: idx++,
  });

  columns.push({
    name: 'H',
    label: 'Height (mm)',
    type: 'number',
    required: true,
    index: idx++,
  });

  columns.push({
    name: 'fileName',
    label: 'File Name',
    type: 'text',
    required: true,
    index: idx++,
  });

  return columns;
}
