import { NextRequest, NextResponse } from 'next/server';
import { getReportByScanId } from '@/lib/database/repository';
import { sendReportEmail } from '@/lib/email/resend';

export async function POST(req: NextRequest) {
  try {
    const { reportId, email } = await req.json();

    if (!reportId || !email) {
      return NextResponse.json({ error: 'reportId and email are required.' }, { status: 400 });
    }

    const dbReport = await getReportByScanId(reportId);
    if (!dbReport || !dbReport.report_json) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    const r = dbReport.report_json;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const emailResult = await sendReportEmail(
      email,
      {
        id: reportId,
        createdAt: dbReport.created_at,
        businessProfile: {
          url: r.business.url,
          domain: r.business.domain,
          name: r.business.name,
          industry: r.business.industry,
          city: r.business.city,
          detectedLanguage: r.business.language,
          summary: r.business.description,
          services: r.business.services,
        },
        language: r.business.language || 'en',
        overallScore: dbReport.overall_score,
        grade: r.scores?.grade || 'C',
        modelBreakdown: {
          openai: {
            mentionRate: dbReport.openai_score,
            averagePosition: null,
            responseCount: r.questionResults?.length || 10,
          },
          gemini: {
            mentionRate: dbReport.gemini_score,
            averagePosition: null,
            responseCount: r.questionResults?.length || 10,
          },
        },
        totalQuestions: r.questionResults?.length || 10,
        mentionedQuestionsCount: r.scores?.questions_mentioned || 0,
        citationShare: Math.round(
          (r.scores?.citation_count / Math.max(1, (r.questionResults?.length || 10) * 3)) * 100
        ),
        topCompetitors: (r.topCompetitors || []).map((c: any) => ({
          name: c.name,
          mentionCount: c.appearances,
          shareOfVoice: Math.round((c.appearances / Math.max(1, (r.questionResults?.length || 10) * 3)) * 100),
        })),
        topCitationsFound: (r.topSources || []).map((s: any) => ({
          domain: s.domain,
          occurrences: s.occurrences,
        })),
        actionableInsights: {
          criticalGaps: [r.recommendations?.[0] || ''],
          quickWins: [r.recommendations?.[1] || '', r.recommendations?.[2] || ''],
          geoRecommendations: [r.recommendations?.[3] || ''],
        },
        questionResults: [],
        emailStatus: 'sent',
      },
      appUrl
    );

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        message: emailResult.error || 'Failed to dispatch email. Check RESEND_API_KEY.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Email dispatched successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error sending report email.' }, { status: 500 });
  }
}
