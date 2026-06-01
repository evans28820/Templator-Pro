/**
 * Config persistence — JSON file store.
 * Saved per .ai file — keyed by hash of the absolute file path.
 * Full tree and textFrames are NOT persisted — re-derived on rescan.
 *
 * Phase 4 can swap this for electron-store without changing the public API.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import type { SavedConfig } from '../src/types/ipc';

const CONFIGS_DIR = path.join(app.getPath('userData'), 'configs');

function ensureDir(): void {
  if (!fs.existsSync(CONFIGS_DIR)) {
    fs.mkdirSync(CONFIGS_DIR, { recursive: true });
  }
}

function configFilePath(hash: string): string {
  return path.join(CONFIGS_DIR, `${hash}.json`);
}

/**
 * Simple string hash for config key (djb2).
 */
function computeHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & hash; // 32-bit
  }
  return Math.abs(hash).toString(16);
}

export function loadConfig(aiFilePath: string): SavedConfig | null {
  ensureDir();
  const hash = computeHash(aiFilePath);
  const filePath = configFilePath(hash);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as SavedConfig;
  } catch {
    return null;
  }
}

export function saveConfig(aiFilePath: string, config: SavedConfig): void {
  ensureDir();
  const hash = computeHash(aiFilePath);
  const filePath = configFilePath(hash);
  const toSave: SavedConfig = {
    ...config,
    aiFilePath,
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
}

export function deleteConfig(aiFilePath: string): void {
  const hash = computeHash(aiFilePath);
  const filePath = configFilePath(hash);
  try {
    fs.unlinkSync(filePath);
  } catch {
    // file doesn't exist — nothing to do
  }
}
