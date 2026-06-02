/**
 * Illustrator JSX runner — COM/VBScript bridge execution.
 *
 * Windows: Uses VBScript + COM (CreateObject("Illustrator.Application"))
 *   to call DoJavaScriptFile() — no security dialogs, no prompts.
 * macOS: Uses osascript to send JSX via AppleScript.
 *
 * Watchdog timeout: 120s.
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
  _illustrator: IllustratorInstall,
  timeoutMs = 120_000,
): Promise<JsxRunResult> {
  const startTime = Date.now();
  const tmpFile = join(tmpdir(), `templator_${Date.now()}.jsx`);

  try {
    writeFileSync(tmpFile, jsxContent, 'utf-8');
    const result = await executeJsxScript(tmpFile, timeoutMs);
    const duration = Date.now() - startTime;
    return {
      success: result.success,
      outputPath: result.outputPath ?? null,
      error: result.error ?? null,
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
    try { if (existsSync(tmpFile)) unlinkSync(tmpFile); } catch { /* */ }
  }
}

interface ExecResult {
  success: boolean;
  outputPath?: string | null;
  error?: string;
}

function executeJsxScript(
  scriptPath: string,
  timeoutMs: number,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    if (platform() === 'win32') {
      executeViaCom(scriptPath, timeoutMs, resolve);
    } else if (platform() === 'darwin') {
      executeViaAppleScript(scriptPath, timeoutMs, resolve);
    } else {
      resolve({ success: false, error: 'Unsupported platform' });
    }
  });
}

/* ── Windows: VBScript + COM bridge ── */

function executeViaCom(
  scriptPath: string,
  timeoutMs: number,
  resolve: (r: ExecResult) => void,
): void {
  const vbsPath = scriptPath.replace(/\.jsx$/, '.vbs');
  const vbs = [
    'Dim app',
    'On Error Resume Next',
    'Set app = CreateObject("Illustrator.Application")',
    'If Err.Number <> 0 Then',
    '  WScript.StdErr.WriteLine "Illustrator COM error: " & Err.Description',
    '  WScript.Quit 1',
    'End If',
    '',
    'app.DoJavaScriptFile "' + scriptPath + '"',
    'If Err.Number <> 0 Then',
    '  WScript.StdErr.WriteLine "JSX error: " & Err.Description',
    '  WScript.Quit 2',
    'End If',
    '',
    'WScript.Quit 0',
  ].join('\r\n');

  writeFileSync(vbsPath, vbs, 'utf-8');

  const proc = spawn('cscript', ['//Nologo', vbsPath], {
    timeout: timeoutMs,
    windowsHide: true,
  });

  let stderr = '';

  proc.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  proc.on('close', (code) => {
    try { if (existsSync(vbsPath)) unlinkSync(vbsPath); } catch { /* */ }
    if (code === 0) {
      resolve({ success: true });
    } else {
      resolve({
        success: false,
        error: stderr.trim() || 'Illustrator script failed (exit code ' + code + ')',
      });
    }
  });

  proc.on('error', (err) => {
    try { if (existsSync(vbsPath)) unlinkSync(vbsPath); } catch { /* */ }
    resolve({ success: false, error: err.message });
  });

  setTimeout(() => {
    try { proc.kill(); } catch { /* */ }
    try { if (existsSync(vbsPath)) unlinkSync(vbsPath); } catch { /* */ }
    resolve({ success: false, error: 'Job timed out after ' + (timeoutMs / 1000) + 's' });
  }, timeoutMs);
}

/* ── macOS: AppleScript bridge ── */

function executeViaAppleScript(
  scriptPath: string,
  timeoutMs: number,
  resolve: (r: ExecResult) => void,
): void {
  const scpt = 'tell application "Adobe Illustrator" to do javascript file "' + scriptPath + '"';

  const proc = spawn('osascript', ['-e', scpt], {
    timeout: timeoutMs,
  });

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
        error: stderr.trim() || 'AppleScript exited code ' + code,
      });
    }
  });

  proc.on('error', (err) => {
    resolve({ success: false, error: err.message });
  });

  setTimeout(() => {
    try { proc.kill(); } catch { /* */ }
    resolve({ success: false, error: 'Job timed out after ' + (timeoutMs / 1000) + 's' });
  }, timeoutMs);
}
