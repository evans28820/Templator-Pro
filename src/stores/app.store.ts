import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IllustratorInfo } from '../types';

export type AppScreen = 'setup' | 'excel' | 'run';

export const useAppStore = defineStore('app', () => {
  /* ── State ── */
  const currentScreen = ref<AppScreen>('setup');
  const illustratorStatus = ref<IllustratorInfo>({
    installed: false,
    version: '',
    path: null,
  });
  const isScanning = ref(false);
  const scanError = ref<string | null>(null);
  const isLoading = ref(false);

  /* ── Getters ── */
  const isIllustratorReady = computed(() => illustratorStatus.value.installed);
  const canNavigateToRun = computed(() => illustratorStatus.value.installed);

  /* ── Actions ── */
  function navigateTo(screen: AppScreen): void {
    currentScreen.value = screen;
  }

  function setIllustratorStatus(status: IllustratorInfo): void {
    illustratorStatus.value = status;
  }

  function setScanning(scanning: boolean): void {
    isScanning.value = scanning;
  }

  function setScanError(error: string | null): void {
    scanError.value = error;
  }

  function setLoading(loading: boolean): void {
    isLoading.value = loading;
  }

  return {
    currentScreen,
    illustratorStatus,
    isScanning,
    scanError,
    isLoading,
    isIllustratorReady,
    canNavigateToRun,
    navigateTo,
    setIllustratorStatus,
    setScanning,
    setScanError,
    setLoading,
  };
});
