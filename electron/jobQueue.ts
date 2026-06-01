/**
 * Illustrator Job Queue
 * Concurrency = 1 — only one JSX script runs at any time.
 * Watchdog timeout = 120s — kill and mark as error if exceeded.
 * Non-blocking: queue runs in main process, status pushed via IPC.
 */

import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../src/types/ipc';

/* ── Types ── */

interface Job {
  id: string;
  jsxContent: string;
  rowIndex: number;
  templateId: string;
  timeoutMs: number;
}

interface QueuedJob extends Job {
  resolve: () => void;
  reject: (err: Error) => void;
}

/* ── State ── */

const queue: QueuedJob[] = [];
let currentJob: QueuedJob | null = null;
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
let mainWindow: BrowserWindow | null = null;

/* ── Helpers ── */

function notifyRenderer(channel: string, data: Record<string, unknown>): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function emitQueueStatus(): void {
  notifyRenderer(IPC_CHANNELS.JOB_QUEUE, {
    queueLength: queue.length + (currentJob ? 1 : 0),
    currentJobId: currentJob?.id ?? null,
  });
}

function clearWatchdog(): void {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

function startWatchdog(job: QueuedJob): void {
  clearWatchdog();
  watchdogTimer = setTimeout(() => {
    const err = new Error(`Job ${job.id} timed out after ${job.timeoutMs / 1000}s`);
    handleJobError(job, err);
  }, job.timeoutMs);
}

function handleJobError(job: QueuedJob, err: Error): void {
  clearWatchdog();
  currentJob = null;
  notifyRenderer(IPC_CHANNELS.JOB_ERROR, {
    jobId: job.id,
    rowIndex: job.rowIndex,
    error: err.message,
  });
  job.reject(err);
  emitQueueStatus();
  processNext();
}

function handleJobComplete(job: QueuedJob): void {
  clearWatchdog();
  currentJob = null;
  // outputPath will be set by the runner before calling complete
  notifyRenderer(IPC_CHANNELS.JOB_COMPLETE, {
    jobId: job.id,
    rowIndex: job.rowIndex,
    outputPath: '',
  });
  job.resolve();
  emitQueueStatus();
  processNext();
}

async function executeJob(job: QueuedJob): Promise<void> {
  currentJob = job;
  emitQueueStatus();
  notifyRenderer(IPC_CHANNELS.JOB_PROGRESS, {
    jobId: job.id,
    rowIndex: job.rowIndex,
    message: 'Starting job...',
  });

  startWatchdog(job);

  try {
    // Phase 4 will wire this to the actual Illustrator JSX runner.
    // For now, the job completes immediately as a placeholder.
    notifyRenderer(IPC_CHANNELS.JOB_PROGRESS, {
      jobId: job.id,
      rowIndex: job.rowIndex,
      message: 'Job executed (runner not yet implemented)',
    });
    handleJobComplete(job);
  } catch (err) {
    handleJobError(job, err instanceof Error ? err : new Error(String(err)));
  }
}

function processNext(): void {
  if (currentJob) return; // concurrency = 1
  const next = queue.shift();
  if (next) {
    void executeJob(next);
  }
}

/* ── Public API ── */

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window;
}

export function enqueue(job: Job): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const queued: QueuedJob = { ...job, resolve, reject };
    queue.push(queued);
    emitQueueStatus();
    processNext();
  });
}

export function cancelAll(templateId: string): void {
  // Remove pending jobs for this template
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].templateId === templateId) {
      const job = queue[i];
      queue.splice(i, 1);
      job.reject(new Error('Cancelled'));
    }
  }
  // If current job matches, kill it
  if (currentJob && currentJob.templateId === templateId) {
    handleJobError(currentJob, new Error('Cancelled'));
  }
  emitQueueStatus();
}

export function getStatus(): { status: 'idle' | 'running'; queueLength: number } {
  return {
    status: currentJob ? 'running' : 'idle',
    queueLength: queue.length + (currentJob ? 1 : 0),
  };
}
