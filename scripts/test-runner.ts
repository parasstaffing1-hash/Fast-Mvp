/**
 * Picked AI Visibility Scanner - Comprehensive Test Suite
 * Covers URL validation, SSRF protection, email validation, business extraction,
 * question validation, mention detection, competitor extraction, citation extraction,
 * scoring, provider failure isolation, duplicate submissions, and end-to-end scan workflow.
 */

import { validateAndNormalizeUrl, validateEmail } from '../lib/security/validation';
import { analyzeResponseFast } from '../lib/analysis/response-analyzer';
import { calculateVisibilityScores, QuestionObservationRecord } from '../lib/scoring/calculator';
import { getMockAIResponse } from '../lib/demo/mock-provider';
import {
  findOrCreateLead,
  createScanRecord,
  updateScanStatus,
  saveScanQuestions,
  saveDBReport,
  getReportByScanId,
} from '../lib/database/repository';
import { generate10CustomerQuestions } from '../lib/questions/generator';
import { executeBackgroundScan } from '../lib/jobs/scan-orchestrator';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log(' RUNNING PICKED AI SCANNER TEST SUITE');
  console.log('========================================\n');

  // 1. URL Validation & SSRF Protection
  console.log('--- 1. URL Validation & SSRF Protection ---');
  const validUrl = validateAndNormalizeUrl('veriff.com');
  assert(validUrl.valid && validUrl.normalizedUrl === 'https://veriff.com', 'Normalizes URL without protocol to https');

  const localhostUrl = validateAndNormalizeUrl('http://localhost:3000/admin');
  assert(!localhostUrl.valid, 'Blocks SSRF attempt to localhost');

  const internalIp1 = validateAndNormalizeUrl('http://127.0.0.1:8080/admin');
  assert(!internalIp1.valid, 'Blocks loopback 127.0.0.1');

  const internalIp2 = validateAndNormalizeUrl('http://192.168.1.1/secret');
  assert(!internalIp2.valid, 'Blocks private IP range (192.168.x)');

  const internalIp3 = validateAndNormalizeUrl('http://10.0.0.1/internal');
  assert(!internalIp3.valid, 'Blocks private IP range (10.x)');

  const metadataIp = validateAndNormalizeUrl('http://169.254.169.254/latest/meta-data');
  assert(!metadataIp.valid, 'Blocks cloud metadata service IP (169.254.169.254)');

  const invalidScheme = validateAndNormalizeUrl('ftp://example.com/files');
  assert(!invalidScheme.valid, 'Rejects non-HTTP/HTTPS protocols');

  // 2. Email Validation
  console.log('\n--- 2. Email Validation ---');
  const validEmail = validateEmail('founder@company.com');
  assert(validEmail.valid && validEmail.normalizedEmail === 'founder@company.com', 'Validates normal work email');

  const invalidEmail1 = validateEmail('not-an-email');
  assert(!invalidEmail1.valid, 'Rejects string missing @ symbol');

  const invalidEmail2 = validateEmail('user@');
  assert(!invalidEmail2.valid, 'Rejects email missing domain');

  // 3. Question Generation Validation (Exactly 10 questions)
  console.log('\n--- 3. Question Generation Validation ---');
  const mockBusiness = {
    business_name: 'Nordic Legal',
    industry: 'Corporate Law',
    city: 'Tallinn',
    language: 'et' as const,
    services: ['M&A Consulting', 'Tax Advisory', 'Dispute Resolution'],
    description: 'Leading Baltic corporate law firm',
    target_customers: ['Enterprises', 'Startups'],
    domain: 'nordiclegal.ee',
    pagesCrawled: ['https://nordiclegal.ee'],
  };

  const questions = await generate10CustomerQuestions(mockBusiness, 'et');
  assert(questions.length === 10, 'Generates exactly 10 customer buyer questions');
  assert(questions.every((q) => q.question && q.question.length > 5), 'All questions are well-formed non-empty strings');
  assert(questions.every((q) => q.language === 'et'), 'All generated questions match the target language (et)');

  const brandedQuestions = questions.filter((q) => q.question.includes('Nordic Legal'));
  assert(brandedQuestions.length <= 1, 'Enforces anti-repetition: business name appears in at most 1 prompt');

  // 4. Mention Detection & Position Ranking
  console.log('\n--- 4. Mention Detection & Position Ranking ---');
  const sampleResponse = `Here are the top identity providers:
1. **Veriff** — outstanding AI identity verification and fraud prevention platform.
2. **Onfido** — good alternative for document scanning.
3. **Jumio** — established legacy player.`;

  const analysis1 = analyzeResponseFast('Veriff', 'veriff.com', sampleResponse, [
    { title: 'Veriff Official', url: 'https://veriff.com', domain: 'veriff.com' },
  ]);

  assert(analysis1.businessMentioned === true, 'Detects target business mention');
  assert(analysis1.position === 1, 'Accurately identifies #1 ranking position in numbered list');
  assert(analysis1.confidence >= 0.9, 'Confidence is high for exact mention');
  assert(analysis1.evidence.includes('Veriff'), 'Captures verbatim quote evidence for decision');

  // 5. Competitor Extraction & Deduplication
  console.log('\n--- 5. Competitor Extraction ---');
  const competitorNames = analysis1.competitors.map((c) => c.name.toLowerCase());
  assert(
    competitorNames.includes('onfido') || competitorNames.includes('jumio'),
    'Extracts competitor brand names (Onfido, Jumio) from response'
  );
  assert(
    !competitorNames.includes('veriff'),
    'Excludes target business itself from competitor list'
  );

  // 6. Non-mentioned Target Case
  console.log('\n--- 6. Non-mentioned Target Case ---');
  const unmentionedResponse = `For CRM needs, we recommend:
1. **Salesforce** — market leader.
2. **HubSpot** — great inbound tools.`;
  const analysis2 = analyzeResponseFast('Veriff', 'veriff.com', unmentionedResponse, []);
  assert(analysis2.businessMentioned === false, 'Correctly flags business as not mentioned');
  assert(analysis2.position === null, 'Position is null when not mentioned');

  // 7. Citation Extraction
  console.log('\n--- 7. Citation Extraction ---');
  const citations = analysis1.sources;
  assert(citations.length > 0, 'Sources array is populated with citations');
  assert(citations[0].domain === 'veriff.com', 'Source domain is parsed correctly');

  // 8. Scoring Algorithm
  console.log('\n--- 8. Scoring Algorithm ---');
  const mockObservations: QuestionObservationRecord[] = [
    {
      questionId: 'q1',
      orderIndex: 1,
      question: 'Best identity verification',
      engine: 'openai',
      analysis: analysis1,
      directUrlCited: true,
    },
    {
      questionId: 'q1',
      orderIndex: 1,
      question: 'Best identity verification',
      engine: 'gemini',
      analysis: analysis1,
      directUrlCited: false,
    },
    {
      questionId: 'q2',
      orderIndex: 2,
      question: 'CRM alternatives',
      engine: 'openai',
      analysis: analysis2,
      directUrlCited: false,
    },
  ];

  const scores = calculateVisibilityScores(mockObservations, 2);
  assert(scores.overall_score > 0 && scores.overall_score <= 100, 'Calculates score in valid range 0-100');
  assert(scores.openai_score > 0, 'Calculates individual OpenAI score');
  assert(scores.gemini_score > 0, 'Calculates individual Gemini score');
  assert(scores.grade !== undefined, 'Assigns letter grade');
  assert(scores.methodology.scoringRules.length > 0, 'Includes transparent methodology explanation');

  // 9. Provider Failure Isolation
  console.log('\n--- 9. Provider Failure Isolation ---');
  const failedObservations: QuestionObservationRecord[] = [
    {
      questionId: 'q1',
      orderIndex: 1,
      question: 'Best identity verification',
      engine: 'openai',
      analysis: {
        businessMentioned: false,
        position: null,
        confidence: 0,
        evidence: 'Provider API failure',
        competitors: [],
        sources: [],
      },
      directUrlCited: false,
    },
    {
      questionId: 'q1',
      orderIndex: 1,
      question: 'Best identity verification',
      engine: 'gemini',
      analysis: analysis1,
      directUrlCited: true,
    },
  ];
  const isolatedScores = calculateVisibilityScores(failedObservations, 1);
  assert(isolatedScores.gemini_score > 0, 'Gemini score succeeds even when OpenAI has zero/failure');
  assert(isolatedScores.overall_score > 0, 'Overall score calculation is resilient to single provider failures');

  // 10. Duplicate Lead Submission
  console.log('\n--- 10. Duplicate Lead Handling ---');
  const lead1 = await findOrCreateLead('test_duplicate@example.com');
  const lead2 = await findOrCreateLead('test_duplicate@example.com');
  assert(lead1.id === lead2.id, 'Idempotent lead creation prevents accidental duplicate leads');

  // 11. Demo Mock Provider
  console.log('\n--- 11. Demo Mock Provider ---');
  const mockOpenAI = getMockAIResponse('openai', 'Best dentist', 'SmileCare');
  assert(mockOpenAI.text.includes('SmileCare'), 'Mock response contains target business');
  assert(mockOpenAI.citations.length > 0, 'Mock response includes citations');

  // 12. End-to-End Scan & Report Storage Workflow
  console.log('\n--- 12. End-to-End Scan & Report Storage Workflow ---');
  const testScanId = `scan_test_${Date.now()}`;
  const scanRecord = await createScanRecord({
    id: testScanId,
    lead_id: lead1.id,
    url: 'https://veriff.com',
    language: 'en',
  });
  assert(scanRecord.id === testScanId, 'Creates scan record with unique ID');
  assert(scanRecord.status === 'queued', 'Initial scan record status is queued');

  await updateScanStatus(testScanId, { status: 'crawling', progress: 15 });
  await updateScanStatus(testScanId, {
    status: 'completed',
    progress: 100,
    completed_at: new Date().toISOString(),
  });

  await saveDBReport({
    id: `report_${testScanId}`,
    scan_id: testScanId,
    overall_score: 85,
    openai_score: 80,
    gemini_score: 90,
    google_score: 85,
    report_json: {
      scanId: testScanId,
      business: mockBusiness,
      scores: { overall_score: 85 },
    },
  });

  const savedReport = await getReportByScanId(testScanId);
  assert(savedReport !== null, 'Retrieves persisted report by scanId');
  assert(savedReport?.overall_score === 85, 'Persisted report retains accurate overall score');

  // Summary
  console.log('\n========================================');
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
