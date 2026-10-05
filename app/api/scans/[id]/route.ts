import { NextRequest, NextResponse } from 'next/server';
import { getScanRecord, getReportByScanId } from '@/lib/database/repository';
import { scanProgressMap } from '@/lib/jobs/scan-orchestrator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scan = await getScanRecord(id);

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found.' }, { status: 404 });
    }

    const liveProgress = scanProgressMap.get(id);

    let report = null;
    if (scan.status === 'completed') {
      const dbReport = await getReportByScanId(id);
      report = dbReport?.report_json || null;
    }

    return NextResponse.json({
      scan: {
        id: scan.id,
        url: scan.url,
        business_name: scan.business_name,
        industry: scan.industry,
        city: scan.city,
        language: scan.language,
        status: scan.status,
        progress: scan.progress,
        error: scan.error,
        started_at: scan.started_at,
        completed_at: scan.completed_at,
        checks: liveProgress
          ? {
              total: liveProgress.totalChecks,
              completed: liveProgress.completedChecks,
              message: liveProgress.currentMessage,
            }
          : {
              total: 30,
              completed: scan.status === 'completed' ? 30 : Math.round((scan.progress / 100) * 30),
              message: scan.status === 'completed' ? 'Completed' : 'Processing...',
            },
      },
      report,
    });
  } catch (error: any) {
    console.error('[GET /api/scans/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve scan status.' }, { status: 500 });
  }
}
