<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from './stores/app.store';
import { useSettingsStore } from './stores/settings.store';

const appStore = useAppStore();
const settingsStore = useSettingsStore();

import ScreenSetup from './components/screens/ScreenSetup.vue';
import ScreenExcel from './components/screens/ScreenExcel.vue';
import ScreenBatchRun from './components/screens/ScreenBatchRun.vue';

const themeClass = computed(() => `theme-${settingsStore.theme}`);

function goToRun(): void { appStore.navigateTo('run'); }
function goToExcel(): void { appStore.navigateTo('excel'); }
</script>

<template>
  <div id="templator-app" :class="themeClass">
    <nav class="screen-nav">
      <button
        :class="{ active: appStore.currentScreen === 'setup' }"
        @click="appStore.navigateTo('setup')"
      >Setup</button>
      <button
        :class="{ active: appStore.currentScreen === 'excel' }"
        @click="appStore.navigateTo('excel')"
      >Excel</button>
      <button
        :class="{ active: appStore.currentScreen === 'run' }"
        @click="appStore.navigateTo('run')"
        :disabled="!appStore.canNavigateToRun"
      >Run</button>

      <span class="nav-spacer" />

      <button class="theme-toggle" @click="settingsStore.toggleTheme()" :title="settingsStore.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'">
        {{ settingsStore.theme === 'light' ? '☀' : '☾' }}
      </button>
    </nav>

    <main class="screen-content">
      <ScreenSetup v-if="appStore.currentScreen === 'setup'" />
      <ScreenExcel v-else-if="appStore.currentScreen === 'excel'" @go-to-run="goToRun" />
      <ScreenBatchRun v-else-if="appStore.currentScreen === 'run'" @go-to-excel="goToExcel" />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

/* ═══ Theme: Light (default) ═══ */
.theme-light {
  --bg-primary: #ffffff;
  --bg-secondary: #f3f3f3;
  --bg-tertiary: #e8e8e8;
  --bg-hover: #e0e0e0;
  --bg-input: #ffffff;
  --bg-card: #f9f9f9;
  --border-primary: #d4d4d4;
  --border-secondary: #e0e0e0;
  --text-primary: #1a1a1a;
  --text-secondary: #555555;
  --text-muted: #999999;
  --accent: #0e639c;
  --accent-hover: #1177bb;
  --accent-bg: #e8f4fd;
  --danger: #d32f2f;
  --danger-bg: #fdecea;
  --warning: #e67e22;
  --warning-bg: #fef5e7;
  --success: #27ae60;
  --success-bg: #eafaf1;
  --canvas-bg: #fafafa;
  --canvas-grid: #e0e0e0;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* ═══ Theme: Dark ═══ */
.theme-dark {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d2d;
  --bg-hover: #3c3c3c;
  --bg-input: #3c3c3c;
  --bg-card: #2a2a2a;
  --border-primary: #3c3c3c;
  --border-secondary: #444444;
  --text-primary: #d4d4d4;
  --text-secondary: #888888;
  --text-muted: #666666;
  --accent: #0e639c;
  --accent-hover: #1177bb;
  --accent-bg: #094771;
  --danger: #f44747;
  --danger-bg: #3a1a1a;
  --warning: #ce9178;
  --warning-bg: #3a2a1a;
  --success: #4ec9b0;
  --success-bg: #1a3a2a;
  --canvas-bg: #2d2d2d;
  --canvas-grid: #3c3c3c;
  background: var(--bg-primary);
  color: var(--text-primary);
}

#templator-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.screen-nav {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.screen-nav button {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
}

.screen-nav button:hover:not(:disabled) {
  background: var(--bg-hover);
}

.screen-nav button.active {
  background: var(--accent);
  color: #ffffff;
}

.screen-nav button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-spacer {
  flex: 1;
}

.theme-toggle {
  font-size: 16px !important;
  padding: 4px 10px !important;
  line-height: 1;
  border-radius: 6px !important;
}

.screen-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
