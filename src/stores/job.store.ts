import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { JobRow, JobStatus, JobProgressEvent, JobCompleteEvent, JobErrorEvent } from '../types';

export const useJobStore = defineStore('job', () => {
  /* ── State ── */
  const jobs = ref<JobRow[]>([]);
  const queueLength = ref(0);
  const currentJobId = ref<string | null>(null);
  const isRunning = ref(false);

  /* ── Getters ── */
  const jobCountByStatus = computed(() => {
    const counts: Record<JobStatus, number> = {
      pending: 0,
      running: 0,
      done: 0,
      warning: 0,
      error: 0,
    };
    for (const job of jobs.value) {
      counts[job.status]++;
    }
    return counts;
  });

  const hasRunningJobs = computed(() => isRunning.value || jobs.value.some(j => j.status === 'running'));

  const allJobsComplete = computed(() =>
    jobs.value.length > 0 && jobs.value.every(j => j.status === 'done' || j.status === 'warning' || j.status === 'error')
  );

  /* ── Actions ── */
  function setJobs(newJobs: JobRow[]): void {
    jobs.value = newJobs;
  }

  function updateJobStatus(jobId: string, status: JobStatus, message?: string): void {
    const job = jobs.value.find(j => j.id === jobId);
    if (job) {
      job.status = status;
      if (message !== undefined) job.message = message;
      if (status === 'running' && !job.startedAt) job.startedAt = new Date().toISOString();
      if (status === 'done' || status === 'warning' || status === 'error') {
        job.completedAt = new Date().toISOString();
      }
    }
  }

  function setJobOutput(jobId: string, outputPath: string): void {
    const job = jobs.value.find(j => j.id === jobId);
    if (job) {
      job.outputPath = outputPath;
    }
  }

  function handleProgress(event: JobProgressEvent): void {
    currentJobId.value = event.jobId;
    updateJobStatus(event.jobId, 'running', event.message);
  }

  function handleComplete(event: JobCompleteEvent): void {
    updateJobStatus(event.jobId, 'done');
    setJobOutput(event.jobId, event.outputPath);
    currentJobId.value = null;
  }

  function handleError(event: JobErrorEvent): void {
    updateJobStatus(event.jobId, 'error', event.error);
    currentJobId.value = null;
  }

  function handleQueueUpdate(length: number, currentId: string | null): void {
    queueLength.value = length;
    currentJobId.value = currentId;
    isRunning.value = length > 0;
  }

  function cancelAllJobs(templateId: string): void {
    jobs.value
      .filter(j => j.templateId === templateId && (j.status === 'pending' || j.status === 'running'))
      .forEach(j => {
        j.status = 'error';
        j.message = 'Cancelled by user';
      });
  }

  function reset(): void {
    jobs.value = [];
    queueLength.value = 0;
    currentJobId.value = null;
    isRunning.value = false;
  }

  return {
    jobs,
    queueLength,
    currentJobId,
    isRunning,
    jobCountByStatus,
    hasRunningJobs,
    allJobsComplete,
    setJobs,
    updateJobStatus,
    setJobOutput,
    handleProgress,
    handleComplete,
    handleError,
    handleQueueUpdate,
    cancelAllJobs,
    reset,
  };
});
