import { Resend } from 'resend';
import { VisibilityReport } from '@/types/scanner';

/**
 * Sends executive AI visibility audit report email via Resend.
 */
export async function sendReportEmail(
  toEmail: string,
  report: VisibilityReport,
  appUrl: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const isEt = report.language === 'et';
  const reportUrl = `${appUrl}/report/${report.id}`;

  if (!apiKey) {
    console.log(`[Resend Email] No RESEND_API_KEY configured. Skipping email to ${toEmail}.`);
    return { success: false, error: 'RESEND_API_KEY is not configured in environment.' };
  }

  try {
    const resend = new Resend(apiKey);
    const fromAddress = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'Picked AI Scanner <onboarding@resend.dev>';

    const subject = isEt
      ? `Teie AI nähtavuse raport: ${report.businessProfile.name} (Skoor: ${report.overallScore}/100)`
      : `Your AI Visibility Report: ${report.businessProfile.name} (Score: ${report.overallScore}/100)`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 700; color: #0284c7; letter-spacing: -0.5px; }
    .score-badge { display: inline-block; padding: 12px 24px; background: #0f172a; color: #ffffff; border-radius: 9999px; font-size: 28px; font-weight: 800; margin: 16px 0; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; }
    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
    .stat-num { font-size: 20px; font-weight: 700; color: #0f172a; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    .section-title { font-size: 16px; font-weight: 700; margin-top: 24px; margin-bottom: 12px; }
    .btn { display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-align: center; margin-top: 20px; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">Picked AI Visibility Scanner</div>
      <h1 style="font-size: 22px; margin: 12px 0 6px 0;">${isEt ? 'AI Nähtavuse & GEO Audit' : 'AI Visibility & GEO Audit'}</h1>
      <p style="color: #64748b; margin: 0;">${report.businessProfile.name} • ${report.businessProfile.city}</p>
      
      <div class="score-badge">
        ${report.overallScore} / 100 <span style="font-size: 16px; opacity: 0.8;">(${report.grade})</span>
      </div>
      <p style="font-size: 14px; color: #475569;">
        ${isEt 
          ? `Tehisintellekt mainis Teie ettevõtet ${report.mentionedQuestionsCount} päringu puhul 10-st.`
          : `AI models recommended your business in ${report.mentionedQuestionsCount} out of 10 customer buyer queries.`}
      </p>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-num">${report.modelBreakdown.openai.mentionRate}%</div>
        <div class="stat-label">ChatGPT (OpenAI)</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${report.modelBreakdown.gemini.mentionRate}%</div>
        <div class="stat-label">Google Gemini</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${report.citationShare}%</div>
        <div class="stat-label">${isEt ? 'Viidatud lingid' : 'Direct Citation Rate'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${report.topCompetitors[0]?.name || 'N/A'}</div>
        <div class="stat-label">${isEt ? 'Turu liider tehisintellektis' : 'Top Cited Competitor'}</div>
      </div>
    </div>

    <div class="section-title">${isEt ? 'Peamised soovitused järgmiseks 14 päevaks' : 'Key Quick Wins (Next 14 Days)'}</div>
    <ul style="color: #334155; line-height: 1.6; padding-left: 20px;">
      ${report.actionableInsights.quickWins.map((w) => `<li>${w}</li>`).join('')}
    </ul>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${reportUrl}" class="btn" style="color: #ffffff !important;">
        ${isEt ? 'Vaata täismahus interaktiivset raportit' : 'View Full Interactive Audit Report'}
      </a>
    </div>

    <div class="footer">
      Picked AI Visibility Scanner • 14-Day MVP GEO Engine<br>
      ${isEt ? 'Audit viidi läbi reaalajas mudelipäringute põhjal.' : 'Generated via parallel real-time conversational AI queries.'}
    </div>
  </div>
</body>
</html>
`;

    const res = await resend.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject,
      html,
    });

    return {
      success: true,
      id: res.data?.id,
    };
  } catch (err: any) {
    console.error('[Resend Email] Failed to send email:', err);
    return {
      success: false,
      error: err?.message || 'Failed to dispatch email',
    };
  }
}
