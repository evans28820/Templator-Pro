<script setup lang="ts">
import { useAppStore } from './stores/app.store';
import type { AppScreen } from './stores/app.store';

const appStore = useAppStore();

const screens: { id: AppScreen; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'excel', label: 'Excel' },
  { id: 'run', label: 'Run' },
];
</script>

<template>
  <div id="templator-app">
    <nav class="screen-nav">
      <button
        v-for="screen in screens"
        :key="screen.id"
        :class="{ active: appStore.currentScreen === screen.id }"
        @click="appStore.navigateTo(screen.id)"
      >
        {{ screen.label }}
      </button>
    </nav>

    <main class="screen-content">
      <div v-if="appStore.currentScreen === 'setup'" class="placeholder-screen">
        <h2>Job Setup</h2>
        <p>Screen 1 — Phase 2 implementation</p>
      </div>
      <div v-else-if="appStore.currentScreen === 'excel'" class="placeholder-screen">
        <h2>Excel</h2>
        <p>Screen 2 — Phase 2 implementation</p>
      </div>
      <div v-else-if="appStore.currentScreen === 'run'" class="placeholder-screen">
        <h2>Batch Run</h2>
        <p>Screen 3 — Phase 2 implementation</p>
      </div>
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

.screen-nav button:hover {
  background: #3c3c3c;
}

.screen-nav button.active {
  background: #094771;
  color: #ffffff;
}

.screen-content {
  flex: 1;
  overflow: auto;
}

.placeholder-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
}

.placeholder-screen h2 {
  font-size: 24px;
  color: #e0e0e0;
}

.placeholder-screen p {
  font-size: 14px;
  color: #888;
}
</style>
