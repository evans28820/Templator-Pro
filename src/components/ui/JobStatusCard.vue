<script setup lang="ts">
import type { JobRow } from '../../types';

defineProps<{ job: JobRow }>();

function statusClass(status: string): string {
  return `status-${status}`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Ready',
    running: 'Running...',
    done: 'Done ✓',
    warning: 'Warning ⚠',
    error: 'Error ✗',
  };
  return labels[status] ?? status;
}
</script>

<template>
  <div class="job-card" :class="statusClass(job.status)">
    <span class="row-index">#{{ job.rowIndex + 1 }}</span>
    <span class="job-template">{{ job.templateId }}</span>
    <span class="job-status-pill" :class="statusClass(job.status)">{{ statusLabel(job.status) }}</span>
    <span v-if="job.message" class="job-message">{{ job.message }}</span>
    <span v-if="job.outputPath" class="job-output">{{ job.outputPath }}</span>
  </div>
</template>

<style scoped>
.job-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 4px solid #555;
  background: #252526;
  font-size: 13px;
}
.job-card.status-running { border-left-color: #534AB7; }
.job-card.status-done { border-left-color: #4ec9b0; }
.job-card.status-warning { border-left-color: #ce9178; }
.job-card.status-error { border-left-color: #f44747; }
.row-index { color: #888; font-weight: 600; min-width: 32px; }
.job-template { flex: 1; color: #d4d4d4; }
.job-status-pill {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.status-pending { background: #333; color: #888; }
.status-running { background: #2a2354; color: #534AB7; }
.status-done { background: #1a3a2a; color: #4ec9b0; }
.status-warning { background: #3a2a1a; color: #ce9178; }
.status-error { background: #3a1a1a; color: #f44747; }
.job-message { color: #888; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.job-output { color: #569cd6; font-size: 12px; }
</style>
