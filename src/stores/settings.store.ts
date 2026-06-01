import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  /* ── State ── */
  /** Path to the month-icon .ai library file */
  const iconLibraryPath = ref<string>('');

  /** Output folder for individual .ai + .tif files */
  const outputPath = ref<string>('');

  /** Master output path for combined multi-artboard .ai file */
  const masterOutputPath = ref<string>('');

  /** UI font size preference (pt) */
  const uiFontSize = ref<number>(12);

  /* ── Actions ── */
  function setIconLibraryPath(path: string): void {
    iconLibraryPath.value = path;
  }

  function setOutputPath(path: string): void {
    outputPath.value = path;
  }

  function setMasterOutputPath(path: string): void {
    masterOutputPath.value = path;
  }

  function setUiFontSize(size: number): void {
    uiFontSize.value = size;
  }

  function reset(): void {
    iconLibraryPath.value = '';
    outputPath.value = '';
    masterOutputPath.value = '';
    uiFontSize.value = 12;
  }

  return {
    iconLibraryPath,
    outputPath,
    masterOutputPath,
    uiFontSize,
    setIconLibraryPath,
    setOutputPath,
    setMasterOutputPath,
    setUiFontSize,
    reset,
  };
});
