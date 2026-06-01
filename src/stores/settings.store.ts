import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ThemeMode = 'light' | 'dark';

export const useSettingsStore = defineStore('settings', () => {
  const iconLibraryPath = ref<string>('');
  const outputPath = ref<string>('');
  const masterOutputPath = ref<string>('');
  const uiFontSize = ref<number>(12);
  const theme = ref<ThemeMode>('light');

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

  function setTheme(t: ThemeMode): void {
    theme.value = t;
  }

  function toggleTheme(): void {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  function reset(): void {
    iconLibraryPath.value = '';
    outputPath.value = '';
    masterOutputPath.value = '';
    uiFontSize.value = 12;
    theme.value = 'light';
  }

  return {
    iconLibraryPath,
    outputPath,
    masterOutputPath,
    uiFontSize,
    theme,
    setIconLibraryPath,
    setOutputPath,
    setMasterOutputPath,
    setUiFontSize,
    setTheme,
    toggleTheme,
    reset,
  };
});
