/**
 * Electron main process entry.
 * Creates the BrowserWindow, loads the Vite dev server or production build.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { setMainWindow } from './jobQueue';
import { loadConfig, saveConfig } from './configStore';
import { IPC_CHANNELS } from '../src/types/ipc';

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for electron-store native modules
    },
  });

  // Wire the window into the job queue for IPC notifications
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
  /* Config persistence */
  ipcMain.handle(IPC_CHANNELS.LOAD_CONFIG, (_event, aiFilePath: string) => {
    return loadConfig(aiFilePath);
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_CONFIG, (_event, aiFilePath: string, config: unknown) => {
    saveConfig(aiFilePath, config as never);
  });

  /* File dialogs — stubbed for Phase 1, wired in Phase 4 */
  ipcMain.handle(IPC_CHANNELS.OPEN_FILE_DIALOG, async () => null);
  ipcMain.handle(IPC_CHANNELS.OPEN_FOLDER_DIALOG, async () => null);
  ipcMain.handle(IPC_CHANNELS.SAVE_FILE_DIALOG, async () => null);

  /* Illustrator — stubbed for Phase 4 */
  ipcMain.handle(IPC_CHANNELS.SCAN_AI_FILE, async () => {
    throw new Error('Illustrator scan not yet implemented (Phase 4)');
  });
  ipcMain.handle(IPC_CHANNELS.ILLUSTRATOR_STATUS, async () => ({
    installed: false,
    version: '',
    path: null,
  }));

  /* Job queue — stubbed for Phase 4 */
  ipcMain.handle(IPC_CHANNELS.ENQUEUE_JOB, async () => {
    throw new Error('Job execution not yet implemented (Phase 4)');
  });
  ipcMain.handle(IPC_CHANNELS.CANCEL_JOBS, async () => {
    // no-op for now
  });

  /* Excel — stubbed for Phase 4 */
  ipcMain.handle(IPC_CHANNELS.PARSE_EXCEL, async () => []);
  ipcMain.handle(IPC_CHANNELS.GENERATE_EXCEL, async () => {});
}

/* ── App lifecycle ── */

app.whenReady().then(() => {
  registerIpcHandlers();
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
