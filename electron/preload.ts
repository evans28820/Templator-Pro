/**
 * Electron preload script — contextBridge IPC definitions.
 * contextIsolation: true — renderer has zero direct Node/Electron access.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { TemplatorAPI } from '../src/types/ipc';
import { IPC_CHANNELS } from '../src/types/ipc';

const api: TemplatorAPI = {
  /* ── File dialogs ── */
  openFileDialog: (filters) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE_DIALOG, filters),

  openFolderDialog: () =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_FOLDER_DIALOG),

  saveFileDialog: (filters) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_FILE_DIALOG, filters),

  /* ── Illustrator operations (queued) ── */
  scanAiFile: (filePath) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCAN_AI_FILE, filePath),

  enqueueJob: (jsx, meta) =>
    ipcRenderer.invoke(IPC_CHANNELS.ENQUEUE_JOB, jsx, meta),

  cancelJobs: (templateId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CANCEL_JOBS, templateId),

  /* ── Config persistence ── */
  loadConfig: (aiFilePath) =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_CONFIG, aiFilePath),

  saveConfig: (aiFilePath, config) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONFIG, aiFilePath, config),

  /* ── Excel ── */
  parseExcel: (buffer) =>
    ipcRenderer.invoke(IPC_CHANNELS.PARSE_EXCEL, buffer),

  generateExcel: (columns, outputPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_EXCEL, columns, outputPath),

  /* ── Status ── */
  getIllustratorStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ILLUSTRATOR_STATUS),

  /* ── Event listeners (main → renderer) ── */
  onJobProgress: (cb) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown): void => cb(data as never);
    ipcRenderer.on(IPC_CHANNELS.JOB_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.JOB_PROGRESS, handler);
  },

  onJobComplete: (cb) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown): void => cb(data as never);
    ipcRenderer.on(IPC_CHANNELS.JOB_COMPLETE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.JOB_COMPLETE, handler);
  },

  onJobError: (cb) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown): void => cb(data as never);
    ipcRenderer.on(IPC_CHANNELS.JOB_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.JOB_ERROR, handler);
  },
};

contextBridge.exposeInMainWorld('templatorAPI', api);
