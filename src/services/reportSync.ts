import { getStoredReports, updateReportStatus } from './storage.ts';
import { sendReportToBackend } from './api.ts';

let isSyncing = false;

/**
 * Attempts to automatically deliver any pending error reports to the developer
 * when online connection is active.
 */
export async function syncPendingReports(): Promise<number> {
  if (isSyncing) return 0;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;

  isSyncing = true;
  let syncedCount = 0;

  try {
    const reports = getStoredReports();
    const pending = reports.filter((r) => r.status === 'pending');

    for (const report of pending) {
      try {
        await sendReportToBackend(report);
        updateReportStatus(report.id, 'sent');
        syncedCount++;
      } catch (err) {
        // Stop syncing on network failure
        console.warn('[ReportSync] delivery failed, will retry later:', err);
        break;
      }
    }
  } finally {
    isSyncing = false;
  }

  return syncedCount;
}

/**
 * Attaches event listeners for online reconnect and initial check
 */
export function initReportSync(): void {
  if (typeof window === 'undefined') return;

  // Initial sync attempt after 3 seconds
  setTimeout(() => {
    syncPendingReports();
  }, 3000);

  // Sync whenever network reconnects
  window.addEventListener('online', () => {
    console.log('[ReportSync] Network online, attempting to deliver pending reports...');
    syncPendingReports();
  });
}
