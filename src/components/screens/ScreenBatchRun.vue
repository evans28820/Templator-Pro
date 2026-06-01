<script setup lang="ts">
import { computed } from 'vue';
import { useJobStore } from '../../stores/job.store';
import JobStatusCard from '../ui/JobStatusCard.vue';

const jobStore = useJobStore();

const summary = computed(() => {
  const c = jobStore.jobCountByStatus;
  return `${c.done} done  ${c.warning} warnings  ${c.error} errors`;
});

const allDone = computed(() => jobStore.allJobsComplete);
</script>

<template>
  <div class="screen-run">
    <div class="run-header">
      <h2>Batch Run</h2>
      <div v-if="jobStore.jobs.length > 0" class="summary" :class="{ complete: allDone }">
        {{ summary }}
      </div>
    </div>

    <div v-if="jobStore.jobs.length === 0" class="empty-state">
      <p>No jobs queued. Import an Excel file first.</p>
      <button @click="$emit('goToExcel')">Go to Excel →</button>
    </div>

    <div v-else class="job-list">
      <JobStatusCard
        v-for="job in jobStore.jobs"
        :key="job.id"
        :job="job"
      />
    </div>

    <div v-if="allDone" class="post-run-actions">
      <button class="folder-btn">Open output folder</button>
    </div>
  </div>
</template>

<style scoped>
.screen-run {
  padding: 24px;
  color: #d4d4d4;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.run-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.run-header h2 { font-size: 20px; color: #e0e0e0; }
.summary { color: #888; font-size: 13px; }
.summary.complete { color: #4ec9b0; }
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #888;
}
.empty-state button {
  padding: 8px 16px;
  border: 1px solid #555;
  border-radius: 4px;
  background: transparent;
  color: #ccc;
  cursor: pointer;
}
.job-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.post-run-actions {
  flex-shrink: 0;
  padding-top: 16px;
}
.folder-btn {
  padding: 8px 16px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #2d2d2d;
  color: #ccc;
  cursor: pointer;
  font-size: 13px;
}
.folder-btn:hover { background: #3c3c3c; }
</style>
