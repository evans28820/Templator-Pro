/**
 * Electron main process entry.
 * Creates the BrowserWindow, registers all IPC handlers,
 * starts the Express server, and initializes the job queue.
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { setMainWindow, enqueue, cancelAll } from './jobQueue';
import { loadConfig, saveConfig } from './configStore';
import { scanAiFile } from './illustrator/scanner';
import { discoverIllustrator } from './illustrator/discovery';
import { startServer } from './server';
import { IPC_CHANNELS } from '../src/types/ipc';
import type { FileFilter, SavedConfig, IllustratorInfo } from '../src/types/ipc';
import type { JobMeta } from '../src/types/job';

/* ── Constants ── */
const isDev = !app.isPackaged;
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Templator Pro',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  setMainWindow(mainWindow);

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ── IPC Handlers ── */

function registerIpcHandlers(): void {
  /* ── File dialogs ── */
  ipcMain.handle(
    IPC_CHANNELS.OPEN_FILE_DIALOG,
    async (_event, filters: FileFilter[]) => {
      if (!mainWindow) return null;
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: filters.map(f => ({
          name: f.name,
          extensions: f.extensions,
        })),
      });
      return result.canceled ? null : result.filePaths[0];
    },
  );

  ipcMain.handle(IPC_CHANNELS.OPEN_FOLDER_DIALOG, async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(
    IPC_CHANNELS.SAVE_FILE_DIALOG,
    async (_event, filters: FileFilter[]) => {
      if (!mainWindow) return null;
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: filters.map(f => ({
          name: f.name,
          extensions: f.extensions,
        })),
      });
      return result.canceled ? null : result.filePath;
    },
  );

  /* ── Illustrator status ── */
  ipcMain.handle(IPC_CHANNELS.ILLUSTRATOR_STATUS, async (): Promise<IllustratorInfo> => {
    const discovered = await discoverIllustrator();
    return {
      installed: !!discovered,
      version: discovered?.version ?? '',
      path: discovered?.path ?? null,
    };
  });

  /* ── Illustrator scan ── */
  ipcMain.handle(IPC_CHANNELS.SCAN_AI_FILE, async (_event, filePath: string) => {
    return scanAiFile(filePath);
  });

  /* ── Job queue ── */
  ipcMain.handle(
    IPC_CHANNELS.ENQUEUE_JOB,
    async (_event, jsx: string, meta: JobMeta) => {
      const jobId = `${meta.templateId}_${meta.rowIndex}_${Date.now()}`;
      await enqueue({
        id: jobId,
        jsxContent: jsx,
        rowIndex: meta.rowIndex,
        templateId: meta.templateId,
        timeoutMs: 120_000,
      });
      return jobId;
    },
  );

  ipcMain.handle(IPC_CHANNELS.CANCEL_JOBS, async (_event, templateId: string) => {
    cancelAll(templateId);
  });

  /* ── Config persistence ── */
  ipcMain.handle(IPC_CHANNELS.LOAD_CONFIG, (_event, aiFilePath: string) => {
    return loadConfig(aiFilePath);
  });

  ipcMain.handle(
    IPC_CHANNELS.SAVE_CONFIG,
    (_event, aiFilePath: string, config: SavedConfig) => {
      saveConfig(aiFilePath, config);
    },
  );

  /* ── Excel ── */
  ipcMain.handle(IPC_CHANNELS.PARSE_EXCEL, async (_event, buffer: ArrayBuffer) => {
    const workbook = new ExcelJS.Workbook();
    const nodeBuffer = Buffer.from(buffer);
    await workbook.xlsx.load(nodeBuffer as never);

    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const rows: Array<{ rowNumber: number; cells: Record<string, unknown> }> = [];
    const headers: string[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = String(cell.value ?? '');
        });
        return;
      }
      if (rowNumber === 2) return;

      const cells: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1] || `col_${colNumber}`;
        cells[header] = cell.value;
      });

      if (Object.keys(cells).length > 0) {
        rows.push({ rowNumber, cells });
      }
    });

    return rows;
  });

  ipcMain.handle(
    IPC_CHANNELS.GENERATE_EXCEL,
    async (_event, columns: Array<{ label: string; type: string }>, outputPath: string) => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Orders');

      const headerRow = sheet.addRow(columns.map((c: { label: string }) => c.label));
      headerRow.eachCell((cell: ExcelJS.Cell) => {
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

      const descRow = sheet.addRow(columns.map((c: { type: string }) =>
        c.type === 'number' ? 'Number (mm)' : c.type === 'visibility' ? 'Y or N' : 'Text'));
      descRow.eachCell((cell: ExcelJS.Cell) => {
        cell.font = { italic: true, size: 10, color: { argb: 'FF888888' } };
      });

      sheet.addRow([]);
      sheet.views = [{ state: 'frozen', ySplit: 2 }];

      await workbook.xlsx.writeFile(outputPath);
    },
  );
}

/* ── App lifecycle ── */

app.whenReady().then(() => {
  registerIpcHandlers();
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
