import { SupportedLanguage } from '@/types/scanner';
import { crawlAndExtractBusiness, ExtractedBusinessData } from '../crawler/multi-page-crawler';
import { generate10CustomerQuestions, GeneratedQuestionItem } from '../questions/generator';
import { executeOpenAICheck, executeGeminiCheck, executeGoogleSearchCheck, EngineObservation } from '../ai/engines';
import { analyzeAIResponseWithAI, StructuredAnalysisResult } from '../analysis/response-analyzer';
import { calculateVisibilityScores, QuestionObservationRecord } from '../scoring/calculator';
import {
  updateScanStatus,
  saveScanQuestions,
  saveDBAIResponse,
  saveDBMention,
  saveDBCompetitor,
  saveDBSource,
  saveDBReport,
} from '../database/repository';
import { sendReportEmail } from '../email/resend';

export interface ScanJobRuntimeProgress {
  scanId: string;
  totalChecks: number;
  completedChecks: number;
  currentMessage: string;
}

// In-memory runtime progress tracking for live UI polling (shared across Next.js route chunks)
const globalWithProgress = globalThis as typeof globalThis & {
  __picked_ai_progress_map?: Map<string, ScanJobRuntimeProgress>;
};

if (!globalWithProgress.__picked_ai_progress_map) {
  globalWithProgress.__picked_ai_progress_map = new Map<string, ScanJobRuntimeProgress>();
}

export const scanProgressMap = globalWithProgress.__picked_ai_progress_map;

/**
 * End-to-end background scan orchestrator for Picked AI Visibility Scanner.
 * Operates completely asynchronously from HTTP request with parallel concurrency and error isolation.
 */
export async function executeBackgroundScan(
  scanId: string,
  normalizedUrl: string,
  userEmail: string,
  preferredLanguage?: SupportedLanguage
): Promise<void> {
  const startTime = Date.now();
  console.log(`[Scan Orchestrator] Starting scan ${scanId} for ${normalizedUrl}`);

  scanProgressMap.set(scanId, {
    scanId,
    totalChecks: 30,
    completedChecks: 0,
    currentMessage: 'Website analysis queued...',
  });

  try {
    // --------------------------------------------------------------------------
    // 1. CRAWLING
    // --------------------------------------------------------------------------
    await updateScanStatus(scanId, {
      status: 'crawling',
      progress: 15,
    });
    scanProgressMap.set(scanId, {
      scanId,
      totalChecks: 30,
      completedChecks: 0,
      currentMessage: 'Crawling website pages (/ , /about, /services, /contact)...',
    });

    const business = await crawlAndExtractBusiness(normalizedUrl, preferredLanguage);

    // --------------------------------------------------------------------------
    // 2. ANALYZING / PROFILING
    // --------------------------------------------------------------------------
    await updateScanStatus(scanId, {
      status: 'analyzing',
      progress: 30,
      business_name: business.business_name,
      industry: business.industry,
      city: business.city,
      language: business.language,
    });
    scanProgressMap.set(scanId, {
      scanId,
      totalChecks: 30,
      completedChecks: 0,
      currentMessage: `Identified ${business.business_name} in ${business.city} (${business.industry})`,
    });

    // --------------------------------------------------------------------------
    // 3. GENERATING QUESTIONS (10 high-value customer prompts)
    // --------------------------------------------------------------------------
    await updateScanStatus(scanId, {
      status: 'generating_questions',
      progress: 45,
    });
    scanProgressMap.set(scanId, {
      scanId,
      totalChecks: 30,
      completedChecks: 0,
      currentMessage: `Generating 10 realistic customer buyer prompts in ${business.language.toUpperCase()}...`,
    });

    const questions = await generate10CustomerQuestions(business, business.language);

    await saveScanQuestions(
      scanId,
      questions.map((q) => ({
        id: `q_${scanId}_${q.order_index}`,
        question: q.question,
        language: q.language,
        order_index: q.order_index,
      }))
    );

    // --------------------------------------------------------------------------
    // 4. CHECKING AI VISIBILITY (10 questions x 3 engines = 30 checks in parallel)
    // --------------------------------------------------------------------------
    await updateScanStatus(scanId, {
      status: 'checking_ai',
      progress: 55,
    });

    const observations: QuestionObservationRecord[] = [];
    const totalObservationsCount = questions.length * 3;
    let completedCount = 0;

    // Execute in controlled batches of 3 questions (9 concurrent checks per batch) to respect rate limits
    const batchSize = 3;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batchQuestions = questions.slice(i, i + batchSize);

      await Promise.all(
        batchQuestions.map(async (q) => {
          const qDbId = `q_${scanId}_${q.order_index}`;

          // Run OpenAI, Gemini, and Google Search concurrently for this question
          const [openaiObs, geminiObs, googleObs] = await Promise.all([
            executeOpenAICheck(q.question, business.business_name),
            executeGeminiCheck(q.question, business.business_name),
            executeGoogleSearchCheck(q.question, business.domain, business.business_name),
          ]);

          const rawList: EngineObservation[] = [openaiObs, geminiObs, googleObs];

          for (const obs of rawList) {
            completedCount++;
            scanProgressMap.set(scanId, {
              scanId,
              totalChecks: totalObservationsCount,
              completedChecks: completedCount,
              currentMessage: `Checking AI visibility (${completedCount} / ${totalObservationsCount} checks)...`,
            });

            // Save AI Response to database
            const aiResponseId = `resp_${scanId}_${q.order_index}_${obs.engine}_${Date.now()}`;
            await saveDBAIResponse({
              id: aiResponseId,
              scan_id: scanId,
              question_id: qDbId,
              engine: obs.engine,
              model: obs.model,
              raw_response: obs.rawResponse,
              response_json: { citations: obs.citations },
              duration_ms: obs.durationMs,
              status: obs.status,
              error: obs.error,
            });

            // Analyze response for mentions, competitors, citations, position
            const analysis = await analyzeAIResponseWithAI(
              business.business_name,
              business.domain,
              q.question,
              obs.rawResponse,
              obs.citations
            );

            // Save mention
            await saveDBMention({
              id: `mention_${aiResponseId}`,
              ai_response_id: aiResponseId,
              business_mentioned: analysis.businessMentioned,
              position: analysis.position,
              confidence: analysis.confidence,
              evidence: analysis.evidence,
            });

            // Save competitors
            for (const comp of analysis.competitors) {
              await saveDBCompetitor({
                id: `comp_${aiResponseId}_${Math.random().toString(36).substring(2, 6)}`,
                ai_response_id: aiResponseId,
                name: comp.name,
                url: comp.url,
                position: comp.position,
              });
            }

            // Save sources
            for (const src of analysis.sources) {
              await saveDBSource({
                id: `src_${aiResponseId}_${Math.random().toString(36).substring(2, 6)}`,
                ai_response_id: aiResponseId,
                title: src.title,
                url: src.url,
                domain: src.domain || 'web',
              });
            }

            // Check if direct website URL was cited
            const directUrlCited = obs.citations.some(
              (c) => c.domain.toLowerCase().includes(business.domain.toLowerCase()) || c.url.includes(business.domain)
            );

            observations.push({
              questionId: qDbId,
              orderIndex: q.order_index,
              question: q.question,
              engine: obs.engine,
              analysis,
              directUrlCited,
              rawResponse: obs.rawResponse,
              citations: obs.citations,
            });
          }
        })
      );

      // Update progress proportionally (between 55% and 88%)
      const progressSoFar = Math.min(88, 55 + Math.round((completedCount / totalObservationsCount) * 33));
      await updateScanStatus(scanId, { progress: progressSoFar });
    }

    // --------------------------------------------------------------------------
    // 5. BUILDING REPORT & SCORING
    // --------------------------------------------------------------------------
    await updateScanStatus(scanId, {
      status: 'building_report',
      progress: 90,
    });
    scanProgressMap.set(scanId, {
      scanId,
      totalChecks: totalObservationsCount,
      completedChecks: totalObservationsCount,
      currentMessage: 'Calculating overall AI visibility score and recommendations...',
    });

    const calculatedScores = calculateVisibilityScores(observations, questions.length);

    // Group observations by question for the report UI
    const questionResultsForReport = questions.map((q) => {
      const qDbId = `q_${scanId}_${q.order_index}`;
      const qObs = observations.filter((o) => o.questionId === qDbId);
      const openaiObs = qObs.find((o) => o.engine === 'openai');
      const geminiObs = qObs.find((o) => o.engine === 'gemini');
      const googleObs = qObs.find((o) => o.engine === 'google_search');

      return {
        orderIndex: q.order_index,
        question: q.question,
        intent: q.intent,
        openai: openaiObs ? {
          mentioned: openaiObs.analysis.businessMentioned,
          position: openaiObs.analysis.position,
          evidence: openaiObs.analysis.evidence,
          competitors: openaiObs.analysis.competitors,
          sources: openaiObs.analysis.sources,
          rawResponse: openaiObs.rawResponse || openaiObs.analysis.evidence,
        } : null,
        gemini: geminiObs ? {
          mentioned: geminiObs.analysis.businessMentioned,
          position: geminiObs.analysis.position,
          evidence: geminiObs.analysis.evidence,
          competitors: geminiObs.analysis.competitors,
          sources: geminiObs.analysis.sources,
          rawResponse: geminiObs.rawResponse || geminiObs.analysis.evidence,
        } : null,
        google: googleObs ? {
          visible: googleObs.analysis.businessMentioned,
          position: googleObs.analysis.position,
          snippet: googleObs.analysis.evidence,
          sources: googleObs.analysis.sources,
          rawResponse: googleObs.rawResponse || googleObs.analysis.evidence,
        } : null,
      };
    });

    // Aggregate competitors
    const competitorCounts: Record<string, { count: number; positions: number[] }> = {};
    for (const obs of observations) {
      for (const comp of obs.analysis.competitors) {
        if (!competitorCounts[comp.name]) {
          competitorCounts[comp.name] = { count: 0, positions: [] };
        }
        competitorCounts[comp.name].count++;
        if (comp.position) competitorCounts[comp.name].positions.push(comp.position);
      }
    }

    const topCompetitorsSummary = Object.entries(competitorCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        appearances: data.count,
        averagePosition: data.positions.length > 0 ? Number((data.positions.reduce((a, b) => a + b, 0) / data.positions.length).toFixed(1)) : null,
      }));

    // Aggregate sources
    const domainCounts: Record<string, { occurrences: number; sampleTitle: string; sampleUrl: string }> = {};
    for (const obs of observations) {
      for (const s of obs.analysis.sources) {
        if (s.domain) {
          if (!domainCounts[s.domain]) {
            domainCounts[s.domain] = { occurrences: 0, sampleTitle: s.title || s.domain, sampleUrl: s.url };
          }
          domainCounts[s.domain].occurrences++;
        }
      }
    }

    const topSourcesSummary = Object.entries(domainCounts)
      .sort((a, b) => b[1].occurrences - a[1].occurrences)
      .slice(0, 6)
      .map(([domain, data]) => ({
        domain,
        title: data.sampleTitle,
        url: data.sampleUrl,
        occurrences: data.occurrences,
      }));

    // Recommendations based on real data
    const isEt = business.language === 'et';
    const topCompName = topCompetitorsSummary[0]?.name || (isEt ? 'turu liidrid' : 'market leaders');
    const topDomName = topSourcesSummary[0]?.domain || 'industry directories';

    const recommendations = isEt ? [
      calculatedScores.overall_score < 50
        ? `Tehisintellekt eelistab praegu konkurente (eriti ${topCompName}). Teie brändi digitaalne jalajälg vajab laiendamist autoriteetsetes tehisintellekti koolitusallikates.`
        : `Teie brändi tuntus on hea, kuid konkurent ${topCompName} paigutub otsestes teenusepäringutes sageli kõrgemale.`,
      `Lisage veebilehele selge masinloetav Schema.org struktuur (LocalBusiness, Organization, Service), mis määratleb ${business.city} asukoha ja põhiteenused (${business.services.slice(0, 3).join(', ')}).`,
      `Hankige mainimisi ja linke allikatest, mida AI mudelid kõige enam tsiteerivad (nt ${topDomName}).`,
      `Loo eraldi KKK ja teenuste lehed, mis vastavad otse klientide ostuküsimustele.`,
    ] : [
      calculatedScores.overall_score < 50
        ? `Conversational AI models currently favor competitors (notably ${topCompName}) because your website lacks authority citations in LLM training corpora.`
        : `Your business has recognizable presence, but ${topCompName} frequently captures top recommendation positions for high-intent queries.`,
      `Deploy verified Schema.org JSON-LD microdata on your website specifying "${business.business_name}", headquarters in ${business.city}, and core services (${business.services.slice(0, 3).join(', ')}).`,
      `Secure digital PR and listings on high-citation domains frequently referenced by AI models (such as ${topDomName}).`,
      `Publish structured FAQ and comparison pages tailored to high-intent buyer queries.`,
    ];

    const reportJson = {
      scanId,
      userEmail,
      business: {
        name: business.business_name,
        url: normalizedUrl,
        domain: business.domain,
        industry: business.industry,
        city: business.city,
        language: business.language,
        services: business.services,
        description: business.description,
      },
      scores: calculatedScores,
      questionResults: questionResultsForReport,
      topCompetitors: topCompetitorsSummary,
      topSources: topSourcesSummary,
      recommendations,
      createdAt: new Date().toISOString(),
      scanDurationSeconds: Math.round((Date.now() - startTime) / 1000),
    };

    // Save final report
    await saveDBReport({
      id: `report_${scanId}`,
      scan_id: scanId,
      overall_score: calculatedScores.overall_score,
      openai_score: calculatedScores.openai_score,
      gemini_score: calculatedScores.gemini_score,
      google_score: calculatedScores.google_score,
      report_json: reportJson,
    });

    // --------------------------------------------------------------------------
    // 6. EMAIL REPORT LINK TO USER (Resend)
    // --------------------------------------------------------------------------
    scanProgressMap.set(scanId, {
      scanId,
      totalChecks: totalObservationsCount,
      completedChecks: totalObservationsCount,
      currentMessage: `Sending executive report to ${userEmail}...`,
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    try {
      // Create lightweight representation for email
      await sendReportEmail(userEmail, {
        id: scanId,
        createdAt: new Date().toISOString(),
        businessProfile: {
          url: normalizedUrl,
          domain: business.domain,
          name: business.business_name,
          industry: business.industry,
          city: business.city,
          detectedLanguage: business.language,
          summary: business.description,
          services: business.services,
        },
        language: business.language,
        overallScore: calculatedScores.overall_score,
        grade: calculatedScores.grade,
        modelBreakdown: {
          openai: {
            mentionRate: calculatedScores.openai_score,
            averagePosition: null,
            responseCount: questions.length,
          },
          gemini: {
            mentionRate: calculatedScores.gemini_score,
            averagePosition: null,
            responseCount: questions.length,
          },
        },
        totalQuestions: questions.length,
        mentionedQuestionsCount: calculatedScores.questions_mentioned,
        citationShare: Math.round((calculatedScores.citation_count / Math.max(1, totalObservationsCount)) * 100),
        topCompetitors: topCompetitorsSummary.map((c) => ({
          name: c.name,
          mentionCount: c.appearances,
          shareOfVoice: Math.round((c.appearances / Math.max(1, observations.length)) * 100),
        })),
        topCitationsFound: topSourcesSummary.map((s) => ({
          domain: s.domain,
          occurrences: s.occurrences,
        })),
        actionableInsights: {
          criticalGaps: [recommendations[0]],
          quickWins: [recommendations[1], recommendations[2]],
          geoRecommendations: [recommendations[3] || ''],
        },
        questionResults: [],
        emailStatus: 'sent',
      }, appUrl);
    } catch (emailErr) {
      console.warn('[Scan Orchestrator] Email delivery error (non-fatal):', emailErr);
    }

    // --------------------------------------------------------------------------
    // 7. COMPLETED
    // --------------------------------------------------------------------------
    await updateScanStatus(scanId, {
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
    });

    scanProgressMap.set(scanId, {
      scanId,
      totalChecks: totalObservationsCount,
      completedChecks: totalObservationsCount,
      currentMessage: 'Scan completed successfully!',
    });

    console.log(
      `[Scan Orchestrator] Scan ${scanId} completed in ${Math.round((Date.now() - startTime) / 1000)}s with score ${calculatedScores.overall_score}/100`
    );
  } catch (error: any) {
    console.error(`[Scan Orchestrator] Fatal scan error for ${scanId}:`, error);
    await updateScanStatus(scanId, {
      status: 'failed',
      error: error?.message || 'An unexpected error occurred during scan.',
      completed_at: new Date().toISOString(),
    });

    scanProgressMap.set(scanId, {
      scanId,
      totalChecks: 30,
      completedChecks: 0,
      currentMessage: 'We could not complete this scan. Please try again.',
    });
  }
}
