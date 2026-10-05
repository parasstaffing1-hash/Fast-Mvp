import { NextRequest, NextResponse } from 'next/server';
import { getReportByScanId } from '@/lib/database/repository';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbReport = await getReportByScanId(id);

    if (!dbReport || !dbReport.report_json) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    return NextResponse.json({ report: dbReport.report_json });
  } catch (error: any) {
    console.error('[GET /api/report/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve report.' }, { status: 500 });
  }
}
