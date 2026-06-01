/**
 * Job queue submission and status polling composable.
 * Bridges the renderer ↔ main process IPC job events.
 */

import { onMounted, onUnmounted } from 'vue';
import { useJobStore } from '../stores/job.store';
import type { JobMeta } from '../types';

export function useJobQueue() {
  const jobStore = useJobStore();
  const unsubscribers: (() => void)[] = [];

  function subscribe(): void {
    unsubscribers.push(
      window.templatorAPI.onJobProgress((data) => {
        jobStore.handleProgress(data);
      }),
      window.templatorAPI.onJobComplete((data) => {
        jobStore.handleComplete(data);
      }),
      window.templatorAPI.onJobError((data) => {
        jobStore.handleError(data);
      }),
    );
  }

  async function enqueueJob(jsx: string, meta: JobMeta): Promise<string> {
    try {
      const jobId = await window.templatorAPI.enqueueJob(jsx, meta);
      return jobId;
    } catch (err) {
      console.error('Failed to enqueue job:', err);
      throw err;
    }
  }

  async function cancelJobs(templateId: string): Promise<void> {
    await window.templatorAPI.cancelJobs(templateId);
    jobStore.cancelAllJobs(templateId);
  }

  onMounted(() => subscribe());
  onUnmounted(() => unsubscribers.forEach(fn => fn()));

  return { enqueueJob, cancelJobs };
}
