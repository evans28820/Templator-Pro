/**
 * Stable-write output polling.
 *
 * Illustrator writes output files asynchronously; we poll until
 * file size stabilizes (unchanged for 2 consecutive checks) to
 * confirm the write is complete.
 */

import { statSync, existsSync } from 'node:fs';

export async function waitForOutput(
  filePath: string,
  timeoutMs = 30_000,
  pollIntervalMs = 400,
): Promise<boolean> {
  const start = Date.now();
  let lastSize = -1;
  let stableCount = 0;

  while (Date.now() - start < timeoutMs) {
    if (!existsSync(filePath)) {
      await sleep(pollIntervalMs);
      continue;
    }

    const stats = statSync(filePath);
    if (stats.size === lastSize && stats.size > 0) {
      stableCount++;
      if (stableCount >= 2) return true;
    } else {
      stableCount = 0;
      lastSize = stats.size;
    }

    await sleep(pollIntervalMs);
  }

  return existsSync(filePath) && statSync(filePath).size > 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
