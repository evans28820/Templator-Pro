/**
 * Express server — Phase 4 implementation.
 * Routes: /scan-ai, /run-jsx, /parse-excel, /generate-excel,
 *         /preview-image, /config/load, /config/save, /dialog/*
 *
 * Runs on localhost:3799.
 * All Illustrator operations go through the job queue.
 */

import express, { type Request, type Response } from 'express';
import { readFileSync } from 'node:fs';
import { scanAiFile } from './illustrator/scanner';
import { enqueue, cancelAll } from './jobQueue';
import { loadConfig, saveConfig } from './configStore';
import { generateExcel } from '../src/utils/excelGenerator';
import ExcelJS from 'exceljs';
import type { RawExcelRow } from '../src/types/job';

const PORT = 3799;

export function startServer(): void {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  /* ── Health ── */
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  /* ── Illustrator scan ── */
  app.post('/scan-ai', async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;
      if (!filePath) {
        res.status(400).json({ error: 'filePath is required' });
        return;
      }
      const result = await scanAiFile(filePath);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Scan failed',
      });
    }
  });

  /* ── Enqueue JSX job ── */
  app.post('/run-jsx', async (req: Request, res: Response) => {
    try {
      const { jsx, meta } = req.body;
      await enqueue({
        id: `${meta.templateId}_${meta.rowIndex}_${Date.now()}`,
        jsxContent: jsx,
        rowIndex: meta.rowIndex,
        templateId: meta.templateId,
        timeoutMs: 120_000,
      });
      res.json({ queued: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to enqueue',
      });
    }
  });

  /* ── Cancel jobs ── */
  app.post('/cancel-jobs', (req: Request, res: Response) => {
    const { templateId } = req.body;
    cancelAll(templateId);
    res.json({ cancelled: true });
  });

  /* ── Parse Excel ── */
  app.post('/parse-excel', async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;
      const rows = await parseExcelFile(filePath);
      res.json({ rows });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Excel parse failed',
      });
    }
  });

  /* ── Generate Excel ── */
  app.post('/generate-excel', async (req: Request, res: Response) => {
    try {
      const { columns, outputPath } = req.body;
      await generateExcel(columns, outputPath);
      res.json({ generated: true, path: outputPath });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Excel generation failed',
      });
    }
  });

  /* ── Config ── */
  app.get('/config/load', (req: Request, res: Response) => {
    const { aiFilePath } = req.query;
    const config = loadConfig(String(aiFilePath));
    res.json(config);
  });

  app.post('/config/save', (req: Request, res: Response) => {
    const { aiFilePath, config } = req.body;
    saveConfig(aiFilePath, config);
    res.json({ saved: true });
  });

  app.listen(PORT, () => {
    console.log(`[templator] Express server listening on http://localhost:${PORT}`);
  });
}

/* ── Excel parser ── */

async function parseExcelFile(filePath: string): Promise<RawExcelRow[]> {
  const workbook = new ExcelJS.Workbook();
  const buffer = readFileSync(filePath) as Buffer;
  const nodeBuffer = Buffer.from(buffer);
  await workbook.xlsx.load(nodeBuffer as never);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('No worksheet found');

  const rows: RawExcelRow[] = [];
  const headers: string[] = [];

  // Row 1 = headers, Row 2 = description, Row 3+ = data
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? '');
      });
      return;
    }
    if (rowNumber === 2) return; // skip description

    // Data rows start at 3
    const cells: Record<string, string | number | boolean | null> = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1] || `col_${colNumber}`;
      cells[header] = cell.value as string | number | boolean | null;
    });

    if (Object.keys(cells).length > 0) {
      rows.push({ rowNumber, cells });
    }
  });

  return rows;
}
