import { SupportedLanguage } from '@/types/scanner';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  tagline: string;
  heroBadge: string;
  inputUrlLabel: string;
  inputUrlPlaceholder: string;
  inputEmailLabel: string;
  inputEmailPlaceholder: string;
  languageSelectLabel: string;
  startButton: string;
  scanningButton: string;
  sampleSitesTitle: string;
  sampleSitesSubtitle: string;
  targetNotice: string;
  status: {
    queued: string;
    crawling: string;
    profiling: string;
    generating_questions: string;
    querying_models: string;
    analyzing: string;
    generating_report: string;
    emailing: string;
    completed: string;
    failed: string;
  };
  metrics: {
    overallVisibility: string;
    grade: string;
    openAiRate: string;
    geminiRate: string;
    googleSearchRate: string;
    citationShare: string;
    competitorShare: string;
    topSources: string;
  };
  report: {
    title: string;
    profileTitle: string;
    businessName: string;
    industry: string;
    location: string;
    services: string;
    auditMatrixTitle: string;
    auditMatrixSubtitle: string;
    questionColumn: string;
    openaiColumn: string;
    geminiColumn: string;
    searchColumn: string;
    actionableTitle: string;
    criticalGaps: string;
    quickWins: string;
    geoRecommendations: string;
    viewAiResponse: string;
    resendEmail: string;
    emailSentSuccess: string;
    newScan: string;
  };
  transparency: {
    title: string;
    searchNotice: string;
    aiNotice: string;
  };
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    appTitle: 'Picked AI Visibility Scanner',
    appSubtitle: 'Measure how your business appears across ChatGPT, Gemini, and search engines',
    tagline: 'Generative Engine Optimization (GEO) audit completed under 3 minutes.',
    heroBadge: '14-Day MVP • Parallel AI Audit Engine',
    inputUrlLabel: 'Company Website URL',
    inputUrlPlaceholder: 'https://example.com',
    inputEmailLabel: 'Work Email for Audit Report',
    inputEmailPlaceholder: 'name@company.com',
    languageSelectLabel: 'Audit Language',
    startButton: 'Start Free AI Visibility Audit',
    scanningButton: 'Running Scan...',
    sampleSitesTitle: 'Or test a sample business:',
    sampleSitesSubtitle: 'Click any example to autofill and run an audit demo',
    targetNotice: 'Parallel background scan targets completion under 3 minutes.',
    status: {
      queued: 'Scan job queued in parallel background runner...',
      crawling: 'Crawling website & extracting clean structured content...',
      profiling: 'Profiling business identity, industry, city & key services...',
      generating_questions: 'Generating 10 realistic, high-intent buyer questions...',
      querying_models: 'Dispatching concurrent queries to OpenAI & Gemini...',
      analyzing: 'Analyzing brand mentions, rank positions, and cited URLs...',
      generating_report: 'Synthesizing visibility score & competitor share of voice...',
      emailing: 'Sending executive report summary to your email...',
      completed: 'Scan completed successfully!',
      failed: 'Scan encountered an issue during execution.',
    },
    metrics: {
      overallVisibility: 'AI Visibility Score',
      grade: 'GEO Grade',
      openAiRate: 'ChatGPT Visibility',
      geminiRate: 'Gemini Visibility',
      googleSearchRate: 'Google Search Index',
      citationShare: 'Citation Rate',
      competitorShare: 'Top Competitor Share',
      topSources: 'Dominant Cited Sources',
    },
    report: {
      title: 'Executive AI Visibility & GEO Audit',
      profileTitle: 'Detected Business Profile',
      businessName: 'Business Name',
      industry: 'Industry & Sector',
      location: 'Primary Location',
      services: 'Core Services Detected',
      auditMatrixTitle: '10 Customer Queries Audit Matrix',
      auditMatrixSubtitle: 'Comparing actual conversational AI answers and citation sources',
      questionColumn: 'Prompt / Customer Query',
      openaiColumn: 'ChatGPT (OpenAI)',
      geminiColumn: 'Gemini',
      searchColumn: 'Search Visibility',
      actionableTitle: 'GEO Optimization Recommendations',
      criticalGaps: 'Critical Visibility Gaps',
      quickWins: 'Quick Wins (Next 14 Days)',
      geoRecommendations: 'LLM & Citation Architecture Strategy',
      viewAiResponse: 'Inspect Raw AI Output & Citations',
      resendEmail: 'Email Report Again',
      emailSentSuccess: 'Report sent to your email!',
      newScan: 'Scan Another Website',
    },
    transparency: {
      title: 'Data & Methodology Transparency',
      searchNotice: 'Google Search visibility is verified via legitimate search API endpoints without scraping Google or fabricating AI Overview rankings.',
      aiNotice: 'Audits reflect live LLM responses to realistic customer buyer intents in your target market.',
    },
  },
  et: {
    appTitle: 'Picked AI Nähtavuse Skanner',
    appSubtitle: 'Mõõda, kuidas Sinu ettevõte paistab ChatGPT, Gemini ja otsingumootorite vastustes',
    tagline: 'Generatiivse otsingu optimeerimise (GEO) audit valmib alla 3 minuti.',
    heroBadge: '14-päeva MVP • Paralleelne AI auditi mootor',
    inputUrlLabel: 'Ettevõtte veebisaidi aadress (URL)',
    inputUrlPlaceholder: 'https://minu-ari.ee',
    inputEmailLabel: 'Tööalane e-posti aadress raporti saamiseks',
    inputEmailPlaceholder: 'nimi@ettevote.ee',
    languageSelectLabel: 'Auditi keel',
    startButton: 'Käivita tasuta AI nähtavuse audit',
    scanningButton: 'Skannimine käib...',
    sampleSitesTitle: 'Või proovi näidisettevõtet:',
    sampleSitesSubtitle: 'Klõpsa näidist, et täita vorm ja käivitada audit',
    targetNotice: 'Paralleelne taustatöö sihib valmimist alla 3 minutiga.',
    status: {
      queued: 'Skannimistöö on lisatud paralleelsesse järjekorda...',
      crawling: 'Veebilehe kraapimine ja puhta sisu eraldamine...',
      profiling: 'Ettevõtte nime, tegevusala, asukoha ja teenuste tuvastamine...',
      generating_questions: '10 asjakohase kliendipäringu genereerimine...',
      querying_models: 'Paralleelsete päringute tegemine OpenAI ja Gemini mudelitele...',
      analyzing: 'Brändi mainimiste, positsioonide ja viidatud linkide analüüs...',
      generating_report: 'Nähtavusskoori ja konkurentide turuosa arvutamine...',
      emailing: 'Kokkuvõtva raporti saatmine e-postile...',
      completed: 'Audit on edukalt valmis!',
      failed: 'Skannimisel tekkis tõrge.',
    },
    metrics: {
      overallVisibility: 'AI Nähtavuse Skoor',
      grade: 'GEO Hinne',
      openAiRate: 'ChatGPT nähtavus',
      geminiRate: 'Gemini nähtavus',
      googleSearchRate: 'Google otsingu indeks',
      citationShare: 'Viidete osakaal',
      competitorShare: 'Peamiste konkurentide osakaal',
      topSources: 'Sagedamini viidatud allikad',
    },
    report: {
      title: 'Juhtkonna AI Nähtavuse ja GEO Audit',
      profileTitle: 'Tuvastatud ettevõtte profiil',
      businessName: 'Ettevõtte nimi',
      industry: 'Tegevusala',
      location: 'Peamine asukoht',
      services: 'Põhiteenused',
      auditMatrixTitle: '10 kliendipäringu auditi maatriks',
      auditMatrixSubtitle: 'Võrdlus reaalses tehisintellekti dialoogis ja allikaviidetes',
      questionColumn: 'Kliendi otsingupäring',
      openaiColumn: 'ChatGPT (OpenAI)',
      geminiColumn: 'Gemini',
      searchColumn: 'Otsingu nähtavus',
      actionableTitle: 'GEO Optimeerimise soovitused',
      criticalGaps: 'Kriitilised nähtavuse puudujäägid',
      quickWins: 'Kiired võidud (järgmise 14 päeva jooksul)',
      geoRecommendations: 'LLM & viidete arhitektuuri strateegia',
      viewAiResponse: 'Vaata tehisintellekti täisteksti ja viiteid',
      resendEmail: 'Saada raport uuesti e-postile',
      emailSentSuccess: 'Raport on saadetud Sinu e-posti aadressile!',
      newScan: 'Skanni teine veebisait',
    },
    transparency: {
      title: 'Andmete ja metoodika läbipaistvus',
      searchNotice: 'Google otsingu nähtavust kontrollitakse ametlike liideste kaudu ilma Google reegleid rikkumata ega AI Overview andmeid võltsimata.',
      aiNotice: 'Auditid kajastavad otseseid mudelivastuseid reaalsetele ostukavatsustega päringutele sihtturul.',
    },
  },
};
