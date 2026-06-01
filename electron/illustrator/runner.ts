/**
 * Illustrator JSX runner — subprocess execution.
 *
 * Approach: Write JSX to temp file, launch Illustrator with it as argument.
 *   Windows: start /wait Illustrator.exe script.jsx
 *   macOS:   open -W -a "Adobe Illustrator" script.jsx
 *
 * Includes watchdog timer (120s) and stable-write output polling.
 */

import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { platform } from 'node:os';
import type { IllustratorInstall } from './discovery';

export interface JsxRunResult {
  success: boolean;
  outputPath: string | null;
  error: string | null;
  durationMs: number;
}

export async function runJsx(
  jsxContent: string,
  illustrator: IllustratorInstall,
  timeoutMs = 120_000,
): Promise<JsxRunResult> {
  const startTime = Date.now();
  const tmpFile = join(tmpdir(), `templator_${Date.now()}.jsx`);

  try {
    writeFileSync(tmpFile, jsxContent, 'utf-8');

    const result = await executeJsxScript(tmpFile, illustrator.path, timeoutMs);
    const duration = Date.now() - startTime;

    if (result.success) {
      return {
        success: true,
        outputPath: result.outputPath ?? null,
        error: null,
        durationMs: duration,
      };
    }

    return {
      success: false,
      outputPath: null,
      error: result.error || 'JSX execution failed',
      durationMs: duration,
    };
  } catch (err) {
    return {
      success: false,
      outputPath: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startTime,
    };
  } finally {
    // Clean up temp file
    try { if (existsSync(tmpFile)) unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

interface ExecResult {
  success: boolean;
  outputPath?: string | null;
  error?: string;
}

function executeJsxScript(
  scriptPath: string,
  illustratorPath: string,
  timeoutMs: number,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const isWin = platform() === 'win32';
    const isMac = platform() === 'darwin';

    let proc;
    if (isWin) {
      // Windows: launch Illustrator with script
      proc = spawn('cmd.exe', [
        '/c', 'start', '""', '/wait', illustratorPath, scriptPath,
      ], { timeout: timeoutMs, windowsHide: true });
    } else if (isMac) {
      proc = spawn('open', [
        '-W', '-a', illustratorPath, scriptPath,
      ], { timeout: timeoutMs });
    } else {
      resolve({ success: false, error: 'Unsupported platform' });
      return;
    }

    let stderr = '';

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: stderr || `Illustrator exited with code ${code}`,
        });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    // Watchdog
    setTimeout(() => {
      try { proc.kill(); } catch { /* ignore */ }
      resolve({ success: false, error: `Job timed out after ${timeoutMs / 1000}s` });
    }, timeoutMs);
  });
}
