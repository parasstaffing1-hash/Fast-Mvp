import { NextRequest, NextResponse } from 'next/server';
import { validateAndNormalizeUrl, validateEmail, checkRateLimit } from '@/lib/security/validation';
import { findOrCreateLead, createScanRecord } from '@/lib/database/repository';
import { executeBackgroundScan } from '@/lib/jobs/scan-orchestrator';
import { SupportedLanguage } from '@/types/scanner';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Rate limiting check
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a minute before requesting another scan.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { url, email, language } = body;

    // 1. Validate & normalize URL
    const urlValidation = validateAndNormalizeUrl(url);
    if (!urlValidation.valid || !urlValidation.normalizedUrl) {
      return NextResponse.json(
        { error: urlValidation.error || 'Please provide a valid website URL.' },
        { status: 400 }
      );
    }

    // 2. Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid || !emailValidation.normalizedEmail) {
      return NextResponse.json(
        { error: emailValidation.error || 'Please provide a valid work email address.' },
        { status: 400 }
      );
    }

    const chosenLanguage: SupportedLanguage = language === 'et' ? 'et' : 'en';

    // 3. Find or create lead
    const lead = await findOrCreateLead(emailValidation.normalizedEmail);

    // 4. Create scan record
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await createScanRecord({
      id: scanId,
      lead_id: lead.id,
      url: urlValidation.normalizedUrl,
      language: chosenLanguage,
    });

    // 5. Start background scan job asynchronously (Do NOT block HTTP response)
    executeBackgroundScan(
      scanId,
      urlValidation.normalizedUrl,
      emailValidation.normalizedEmail,
      chosenLanguage
    ).catch((err) => {
      console.error(`[Background Job Error] Scan ${scanId}:`, err);
    });

    // 6. Return immediate response
    return NextResponse.json(
      {
        scanId,
        status: 'queued',
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('[POST /api/scans] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while queueing the scan.' },
      { status: 500 }
    );
  }
}
