/**
 * Illustrator path discovery — Phase 4 implementation.
 * Detects Adobe Illustrator installation on Windows (registry) and macOS (mdfind).
 */

export interface IllustratorInstall {
  path: string;
  version: string;
}

export async function discoverIllustrator(): Promise<IllustratorInstall | null> {
  // Phase 4: search Windows registry / macOS applications
  return null;
}
