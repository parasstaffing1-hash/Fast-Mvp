import { StructuredAnalysisResult } from '../analysis/response-analyzer';

export interface QuestionObservationRecord {
  questionId: string;
  orderIndex: number;
  question: string;
  engine: 'openai' | 'gemini' | 'google_search';
  analysis: StructuredAnalysisResult;
  directUrlCited: boolean;
  rawResponse?: string;
  citations?: Array<{ title?: string; url: string; domain?: string }>;
}

export interface CalculatedScores {
  overall_score: number;
  openai_score: number;
  gemini_score: number;
  google_score: number;
  questions_checked: number;
  questions_mentioned: number;
  mention_rate: number; // percentage
  competitor_count: number;
  citation_count: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  methodology: {
    description: string;
    engineWeights: Record<string, string>;
    scoringRules: string[];
  };
}

/**
 * Calculates question score for an individual observation (0 - 100).
 */
export function calculateObservationScore(
  analysis: StructuredAnalysisResult,
  directUrlCited: boolean
): number {
  if (!analysis.businessMentioned) {
    return 0;
  }

  // Base score for presence
  let score = 50;

  // Position bonuses
  if (analysis.position === 1) {
    score += 40; // 90
  } else if (analysis.position === 2) {
    score += 30; // 80
  } else if (analysis.position === 3) {
    score += 20; // 70
  } else if (analysis.position && analysis.position > 3) {
    score += 10; // 60
  } else {
    score += 10;
  }

  // Citation bonus
  if (directUrlCited) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculates complete transparent AI visibility scores and metrics.
 */
export function calculateVisibilityScores(
  observations: QuestionObservationRecord[],
  totalQuestionsCount = 10
): CalculatedScores {
  const openaiScores: number[] = [];
  const geminiScores: number[] = [];
  const googleScores: number[] = [];

  const uniqueCompetitors = new Set<string>();
  const uniqueSources = new Set<string>();
  const questionsWithMention = new Set<string>();

  for (const obs of observations) {
    const obsScore = calculateObservationScore(obs.analysis, obs.directUrlCited);

    if (obs.engine === 'openai') {
      openaiScores.push(obsScore);
    } else if (obs.engine === 'gemini') {
      geminiScores.push(obsScore);
    } else if (obs.engine === 'google_search') {
      googleScores.push(obsScore);
    }

    if (obs.analysis.businessMentioned) {
      questionsWithMention.add(obs.questionId);
    }

    for (const comp of obs.analysis.competitors) {
      if (comp.name) uniqueCompetitors.add(comp.name.toLowerCase().trim());
    }

    for (const src of obs.analysis.sources) {
      if (src.url) uniqueSources.add(src.url);
    }
  }

  const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

  const openai_score = avg(openaiScores);
  const gemini_score = avg(geminiScores);
  const google_score = avg(googleScores);

  // Overall Score weighting: 40% OpenAI, 40% Gemini, 20% Google Search
  let overall_score = 0;
  if (googleScores.length > 0) {
    overall_score = Math.round(openai_score * 0.4 + gemini_score * 0.4 + google_score * 0.2);
  } else {
    overall_score = Math.round(openai_score * 0.5 + gemini_score * 0.5);
  }

  overall_score = Math.min(100, Math.max(0, overall_score));

  let grade: CalculatedScores['grade'] = 'F';
  if (overall_score >= 90) grade = 'A+';
  else if (overall_score >= 80) grade = 'A';
  else if (overall_score >= 65) grade = 'B';
  else if (overall_score >= 45) grade = 'C';
  else if (overall_score >= 25) grade = 'D';

  const questions_checked = totalQuestionsCount;
  const questions_mentioned = questionsWithMention.size;
  const mention_rate = questions_checked > 0 ? Math.round((questions_mentioned / questions_checked) * 100) : 0;

  return {
    overall_score,
    openai_score,
    gemini_score,
    google_score,
    questions_checked,
    questions_mentioned,
    mention_rate,
    competitor_count: uniqueCompetitors.size,
    citation_count: uniqueSources.size,
    grade,
    methodology: {
      description:
        'The Picked AI Visibility Score evaluates brand presence, recommendation rank, and source citations across real consumer prompts.',
      engineWeights: {
        'ChatGPT (OpenAI)': '40% weight',
        'Google Gemini': '40% weight',
        'Google Search Visibility': '20% weight',
      },
      scoringRules: [
        'Brand Mentioned: Base 50 points',
        'Ranked #1 Position: +40 points (90 total)',
        'Ranked #2 Position: +30 points (80 total)',
        'Ranked #3 Position: +20 points (70 total)',
        'Direct Website Citation / Domain Link: +10 points bonus',
        'Not Mentioned: 0 points',
      ],
    },
  };
}
