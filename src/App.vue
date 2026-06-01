<script setup lang="ts">
import { useAppStore } from './stores/app.store';

const appStore = useAppStore();

import ScreenSetup from './components/screens/ScreenSetup.vue';
import ScreenExcel from './components/screens/ScreenExcel.vue';
import ScreenBatchRun from './components/screens/ScreenBatchRun.vue';

function goToRun(): void { appStore.navigateTo('run'); }
function goToExcel(): void { appStore.navigateTo('excel'); }
</script>

<template>
  <div id="templator-app">
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
  background: #1e1e1e;
  color: #d4d4d4;
  overflow: hidden;
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
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  flex-shrink: 0;
}

.screen-nav button {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #cccccc;
  cursor: pointer;
  font-size: 13px;
}

.screen-nav button:hover:not(:disabled) {
  background: #3c3c3c;
}

.screen-nav button.active {
  background: #094771;
  color: #ffffff;
}

.screen-nav button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.screen-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
