<script setup lang="ts">
const emit = defineEmits<{
  'change-file': [];
  rescan: [];
}>();

defineProps<{
  fileName: string;
  boxType: string;
  dimensions: string;
  savedAgo: string;
  show: boolean;
}>();
</script>

<template>
  <header v-if="show" class="top-bar">
    <span class="file-icon">✓</span>
    <span class="file-name">{{ fileName }}</span>
    <span class="box-type">{{ boxType }}</span>
    <span class="dimensions">{{ dimensions }}</span>
    <span class="saved-ago">· Saved {{ savedAgo }} ago</span>
    <span class="spacer" />
    <button class="bar-btn" @click="emit('change-file')">Change file</button>
    <button class="bar-btn" @click="emit('rescan')">Rescan</button>
  </header>
  <header v-else class="top-bar empty">
    <span class="empty-text">No file scanned — use Setup section to select an .ai file</span>
  </header>
</template>

<style scoped>
.top-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px; height: 40px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  font-size: 13px; flex-shrink: 0;
}
.top-bar.empty {
  color: var(--text-muted);
}
.file-icon { color: var(--success); font-weight: bold; }
.file-name {
  color: var(--text-primary);
  max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.box-type { color: #569cd6; font-weight: 500; }
.dimensions { color: #ce9178; }
.saved-ago { color: var(--text-muted); font-size: 12px; }
.spacer { flex: 1; }
.bar-btn {
  padding: 4px 12px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: transparent; color: var(--text-secondary);
  cursor: pointer; font-size: 12px;
}
.bar-btn:hover { background: var(--bg-hover); }
</style>
