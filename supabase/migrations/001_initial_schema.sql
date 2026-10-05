-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core schema for Picked AI Visibility Scanner MVP
-- Includes: leads, scans, questions, ai_responses, mentions, competitors, sources, reports
-- ==============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SCANS TABLE
CREATE TABLE IF NOT EXISTS public.scans (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id TEXT REFERENCES public.leads(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    business_name TEXT,
    industry TEXT,
    city TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (
        status IN (
            'queued',
            'crawling',
            'analyzing',
            'generating_questions',
            'checking_ai',
            'building_report',
            'completed',
            'failed'
        )
    ),
    progress INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    scan_id TEXT NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. AI RESPONSES TABLE
CREATE TABLE IF NOT EXISTS public.ai_responses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    scan_id TEXT NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    engine TEXT NOT NULL CHECK (engine IN ('openai', 'gemini', 'google_search')),
    model TEXT NOT NULL,
    raw_response TEXT,
    response_json JSONB,
    duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'timeout')),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MENTIONS TABLE
CREATE TABLE IF NOT EXISTS public.mentions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ai_response_id TEXT NOT NULL REFERENCES public.ai_responses(id) ON DELETE CASCADE,
    business_mentioned BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER,
    confidence NUMERIC(4, 2) DEFAULT 0.90,
    evidence TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. COMPETITORS TABLE
CREATE TABLE IF NOT EXISTS public.competitors (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ai_response_id TEXT NOT NULL REFERENCES public.ai_responses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT,
    position INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SOURCES TABLE
CREATE TABLE IF NOT EXISTS public.sources (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ai_response_id TEXT NOT NULL REFERENCES public.ai_responses(id) ON DELETE CASCADE,
    title TEXT,
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    scan_id TEXT NOT NULL UNIQUE REFERENCES public.scans(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL DEFAULT 0,
    openai_score INTEGER NOT NULL DEFAULT 0,
    gemini_score INTEGER NOT NULL DEFAULT 0,
    google_score INTEGER NOT NULL DEFAULT 0,
    report_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES for fast lookup and aggregation
CREATE INDEX IF NOT EXISTS idx_scans_lead_id ON public.scans(lead_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON public.scans(status);
CREATE INDEX IF NOT EXISTS idx_questions_scan_id ON public.questions(scan_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_scan_id ON public.ai_responses(scan_id);
CREATE INDEX IF NOT EXISTS idx_ai_responses_question_id ON public.ai_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_mentions_ai_response_id ON public.mentions(ai_response_id);
CREATE INDEX IF NOT EXISTS idx_competitors_ai_response_id ON public.competitors(ai_response_id);
CREATE INDEX IF NOT EXISTS idx_sources_ai_response_id ON public.sources(ai_response_id);
CREATE INDEX IF NOT EXISTS idx_reports_scan_id ON public.reports(scan_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow public read of reports and scan progress by specific scan ID
CREATE POLICY "Public can view scan by id" ON public.scans
    FOR SELECT USING (true);

CREATE POLICY "Public can view report by scan_id" ON public.reports
    FOR SELECT USING (true);

CREATE POLICY "Public can view questions by scan_id" ON public.questions
    FOR SELECT USING (true);

CREATE POLICY "Public can view ai_responses by scan_id" ON public.ai_responses
    FOR SELECT USING (true);

CREATE POLICY "Public can view mentions" ON public.mentions
    FOR SELECT USING (true);

CREATE POLICY "Public can view competitors" ON public.competitors
    FOR SELECT USING (true);

CREATE POLICY "Public can view sources" ON public.sources
    FOR SELECT USING (true);

-- Leads table restricted to service role only (no public reading)
CREATE POLICY "Service role only for leads" ON public.leads
    FOR ALL USING (auth.role() = 'service_role');
