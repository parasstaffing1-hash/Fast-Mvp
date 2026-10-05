export type SupportedLanguage = 'en' | 'et';

export type AIModelType = 'openai' | 'gemini' | 'google_search';

export interface BusinessProfile {
  url: string;
  domain: string;
  name: string;
  industry: string;
  city: string;
  country?: string;
  detectedLanguage: SupportedLanguage;
  summary: string;
  services: string[];
  contactEmail?: string;
  phone?: string;
  metaTitle?: string;
  metaDescription?: string;
  socialLinks?: string[];
  schemaTypes?: string[];
}

export interface CustomerQuestion {
  id: string;
  question: string;
  intent: 'transactional' | 'commercial' | 'informational' | 'local';
  targetKeyword: string;
  relevanceExplanation: string;
}

export interface CitedSource {
  title?: string;
  url: string;
  domain: string;
  snippet?: string;
}

export interface AIResponseAudit {
  id: string;
  model: AIModelType;
  modelName: string;
  questionId: string;
  question: string;
  rawResponse: string;
  isMentioned: boolean;
  mentionType: 'recommended' | 'listed' | 'alternative' | 'not_mentioned';
  position: number | null; // 1-indexed order if recommended or ranked, null if not mentioned
  sentiment: 'positive' | 'neutral' | 'negative' | 'none';
  detectedCompetitors: string[];
  citedSources: CitedSource[];
  directUrlCited: boolean; // whether business domain is explicitly linked
  latencyMs: number;
  timestamp: string;
  error?: string;
}

export interface SearchVisibilityResult {
  questionId: string;
  question: string;
  isRanked: boolean;
  position: number | null;
  snippet?: string;
  url?: string;
  sourceType: 'organic_search';
  note: string; // explicitly clarifying this is legitimate search, not simulated AI overview
}

export interface QuestionAuditResult {
  question: CustomerQuestion;
  aiAudits: AIResponseAudit[];
  searchAudit?: SearchVisibilityResult;
  aggregateMentionRate: number; // 0 - 100%
  topCompetitors: string[];
}

export interface VisibilityReport {
  id: string;
  createdAt: string;
  businessProfile: BusinessProfile;
  language: SupportedLanguage;
  overallScore: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  modelBreakdown: {
    openai: {
      mentionRate: number;
      averagePosition: number | null;
      responseCount: number;
    };
    gemini: {
      mentionRate: number;
      averagePosition: number | null;
      responseCount: number;
    };
    googleSearch?: {
      indexedRate: number;
      topRankings: number;
    };
  };
  totalQuestions: number;
  mentionedQuestionsCount: number;
  citationShare: number; // % of audits where business URL was cited
  topCompetitors: Array<{
    name: string;
    mentionCount: number;
    shareOfVoice: number; // percentage
  }>;
  topCitationsFound: Array<{
    domain: string;
    occurrences: number;
  }>;
  actionableInsights: {
    criticalGaps: string[];
    quickWins: string[];
    geoRecommendations: string[];
  };
  questionResults: QuestionAuditResult[];
  emailStatus: 'pending' | 'sent' | 'failed' | 'skipped';
}

export type ScanStatus =
  | 'queued'
  | 'crawling'
  | 'profiling'
  | 'generating_questions'
  | 'querying_models'
  | 'analyzing'
  | 'generating_report'
  | 'emailing'
  | 'completed'
  | 'failed';

export interface ScanJob {
  id: string;
  url: string;
  email: string;
  language: SupportedLanguage;
  status: ScanStatus;
  progressPercent: number;
  currentStepMessage: string;
  startedAt: string;
  completedAt?: string;
  estimatedTimeRemainingSeconds?: number;
  businessProfile?: BusinessProfile;
  questions?: CustomerQuestion[];
  report?: VisibilityReport;
  error?: string;
}

export interface LeadRecord {
  id: string;
  email: string;
  websiteUrl: string;
  businessName?: string;
  industry?: string;
  city?: string;
  language: SupportedLanguage;
  visibilityScore?: number;
  scanId: string;
  createdAt: string;
}
