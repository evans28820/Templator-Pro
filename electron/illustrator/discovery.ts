/**
 * Illustrator discovery — Windows registry search.
 * macOS uses mdfind (Phase 4 — secondary platform).
 */

import { execSync } from 'node:child_process';
import { platform } from 'node:os';

export interface IllustratorInstall {
  path: string;
  version: string;
}

export async function discoverIllustrator(): Promise<IllustratorInstall | null> {
  if (platform() === 'win32') {
    return discoverWindows();
  }
  if (platform() === 'darwin') {
    return discoverMacOS();
  }
  return null;
}

function discoverWindows(): IllustratorInstall | null {
  try {
    // Query registry for Illustrator CC paths
    const regQuery = 'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\Illustrator.exe" /ve 2>nul';
    const result = execSync(regQuery, { encoding: 'utf-8', shell: 'cmd.exe' });
    const match = result.match(/([A-Z]:\\[^\r\n]+Illustrator\.exe)/i);
    if (match) {
      return { path: match[1], version: detectVersion(match[1]) };
    }
  } catch {
    // Try Adobe Creative Cloud paths
    const ccPaths = [
      'C:\\Program Files\\Adobe\\Adobe Illustrator 2025\\Support Files\\Contents\\Windows\\Illustrator.exe',
      'C:\\Program Files\\Adobe\\Adobe Illustrator 2024\\Support Files\\Contents\\Windows\\Illustrator.exe',
      'C:\\Program Files\\Adobe\\Adobe Illustrator 2023\\Support Files\\Contents\\Windows\\Illustrator.exe',
    ];
    const fs = require('node:fs');
    for (const p of ccPaths) {
      if (fs.existsSync(p)) {
        return { path: p, version: detectVersion(p) };
      }
    }
  }
  return null;
}

function discoverMacOS(): IllustratorInstall | null {
  try {
    const result = execSync(
      'mdfind "kMDItemCFBundleIdentifier == com.adobe.illustrator" 2>/dev/null | head -1',
      { encoding: 'utf-8' },
    ).trim();
    if (result) {
      return { path: result, version: detectVersion(result) };
    }
  } catch {
    // fallback to default path
  }
  return null;
}

function detectVersion(illustratorPath: string): string {
  try {
    // Extract version from path or plist
    const match = illustratorPath.match(/Illustrator (\d{4})/);
    if (match) return match[1];
  } catch {
    // ignore
  }
  return 'unknown';
}
