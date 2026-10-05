import React from 'react';
import { notFound } from 'next/navigation';
import { getReportByScanId } from '@/lib/database/repository';
import { FullReportPage } from '@/components/report/FullReportPage';

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let reportData = (await getReportByScanId(id))?.report_json || null;

  // If in an isolated SSR process, fetch from internal API endpoint
  if (!reportData) {
    try {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const res = await fetch(`${appUrl}/api/scans/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.report) {
          reportData = json.report;
        }
      }
    } catch {}
  }

  if (!reportData) {
    return notFound();
  }

  return <FullReportPage report={reportData} />;
}
