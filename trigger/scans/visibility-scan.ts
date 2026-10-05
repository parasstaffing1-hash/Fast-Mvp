import { task } from '@trigger.dev/sdk/v3';
import { executeBackgroundScan } from '@/lib/jobs/scan-orchestrator';

/**
 * Trigger.dev v3 background task for Picked AI Visibility Scanner.
 * Enables serverless distributed scan processing with retries and concurrency control.
 */
export const visibilityScanTask = task({
  id: 'picked-ai-visibility-scan',
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: { scanId: string; url: string; email: string; language: 'en' | 'et' }) => {
    console.log(`[Trigger.dev Task] Initiating scan for ${payload.url} (Scan ID: ${payload.scanId})`);
    await executeBackgroundScan(payload.scanId, payload.url, payload.email, payload.language);
    return {
      success: true,
      scanId: payload.scanId,
    };
  },
});
