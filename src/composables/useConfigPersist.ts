/**
 * Config auto-save debounce composable.
 * Saves panelConfigs + nodeConfigs to main process via IPC,
 * debounced by 800ms after the last change.
 */

import { watch, type Ref } from 'vue';
import type { PanelConfig } from '../types';
import { useTemplateStore } from '../stores/template.store';

export function useConfigPersist(
  aiFilePath: Ref<string | null>,
  debounceMs = 800,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function scheduleSave(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const path = aiFilePath.value;
      if (!path) return;
      const store = useTemplateStore();
      const config = {
        aiFilePath: path,
        savedAt: new Date().toISOString(),
        appVersion: '0.1.0',
        panelConfigs: { ...store.panelConfigs } as Record<string, PanelConfig>,
        nodeConfigs: { ...store.nodeConfigs },
        fieldConfigs: [...store.fieldConfigs],
        globalPipeline: [...store.globalPipeline],
        globalRowBreakMode: store.globalRowBreakMode,
        globalMaxRows: store.globalMaxRows,
        scanMeta: store.scanResult ? {
          artboardWidth: store.scanResult.artboardWidth,
          artboardHeight: store.scanResult.artboardHeight,
          boxType: store.scanResult.boxType?.type ?? '',
          layerNames: [...store.scanResult.layerNames],
          previewImagePath: null,
        } : null as unknown as {
          artboardWidth: number;
          artboardHeight: number;
          boxType: string;
          layerNames: string[];
          previewImagePath: string | null;
        },
      };
      window.templatorAPI.saveConfig(path, config).catch(console.error);
    }, debounceMs);
  }

  function startWatching(): void {
    const store = useTemplateStore();
    watch(
      () => [
        store.panelConfigs,
        store.nodeConfigs,
        store.globalPipeline,
        store.globalRowBreakMode,
        store.globalMaxRows,
      ],
      () => scheduleSave(),
      { deep: true },
    );
  }

  function flushNow(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    scheduleSave();
  }

  return { scheduleSave, startWatching, flushNow };
}
