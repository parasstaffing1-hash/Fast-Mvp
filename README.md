# Picked AI Visibility Scanner — 14-Day MVP

A SaaS-style AI Visibility & Generative Engine Optimization (GEO) scanner.
Evaluates how conversational AI assistants (ChatGPT, Gemini) and search engines recommend your business vs. competitors across 10 high-value customer buyer queries.

---

## Key Capabilities

- **Multi-Page Website Crawling:** Crawls homepage, `/about`, `/services`, `/contact` (or Estonian equivalents) using clean HTML/DOM extraction and JSON-LD schema parsing.
- **Business Entity Profiling:** Automatically extracts business name, industry, city/location, language, services, description, and target customers.
- **10 Customer Buyer Queries:** Generates 10 high-intent customer prompts in English or Estonian (commercial, transactional, comparison, local, reputation).
- **Parallel Multi-Model Auditing:** Evaluates 10 questions across 3 engines (OpenAI, Gemini, Google Search visibility) = 30 observations in parallel under 3 minutes.
- **Structured Mention & Competitor Extraction:** Identifies exact and fuzzy brand mentions, recommendation rank/position (#1, #2, #3), competitor companies mentioned, and cited source URLs.
- **Transparent 0–100 Scoring:** Calculates overall score, OpenAI score, Gemini score, Google search score, competitor share of voice, and citation rates.
- **Dedicated Report Page (`/report/[scanId]`):** Executive presentation with KPIs, competitor comparisons, citation sources, and actionable GEO recommendations.
- **Automated Lead Capture & Email Delivery:** Saves user email, business profile, and scan score as leads, and dispatches HTML reports via Resend.
- **Bilingual:** Full native support for English and Estonian (Eesti).
- **Strict Search Transparency:** Clear separation of legitimate organic search indexing from conversational LLM recommendations—no scraping Google or fabricating AI Overview rankings.

---

## Architecture & Directory Structure

```
├── supabase/migrations/
│   └── 001_initial_schema.sql        # Supabase PostgreSQL schema & RLS policies
├── types/
│   └── scanner.ts                    # Core TypeScript interfaces
├── lib/
│   ├── ai/
│   │   ├── engines.ts                # OpenAI, Gemini, and Google Search check executors
│   │   └── providers.ts              # Citation & link extraction utilities
│   ├── crawler/
│   │   ├── multi-page-crawler.ts     # Multi-page crawler (/, /about, /services, /contact)
│   │   └── crawl4ai-client.ts        # Crawl4AI client integration
│   ├── analysis/
│   │   └── response-analyzer.ts      # Structured mention, position, competitor, citation analysis
│   ├── scoring/
│   │   └── calculator.ts             # Transparent 0-100 scoring algorithm
│   ├── database/
│   │   └── repository.ts             # Data layer syncing with Supabase PostgreSQL
│   ├── questions/
│   │   └── generator.ts              # 10 realistic customer questions generator (EN & ET)
│   ├── email/
│   │   └── resend.ts                 # Executive HTML report dispatcher via Resend
│   ├── security/
│   │   └── validation.ts             # SSRF protection, URL normalization & rate limits
│   └── demo/
│       └── mock-provider.ts          # Test mock provider (safe dev/demo mode)
├── components/
│   ├── scanner/
│   │   ├── DarkHeroForm.tsx          # Premium dark navy & gold hero submission card
│   │   └── RealProgressView.tsx      # Real database/job progress stepper (18 / 30 checks)
│   └── report/
│       └── FullReportPage.tsx        # Executive report viewer for /report/[scanId]
├── app/
│   ├── page.tsx                      # Main landing page
│   ├── report/[id]/page.tsx          # Dedicated report view
│   └── api/
│       ├── scans/route.ts            # POST /api/scans (Queues background scan)
│       ├── scans/[id]/route.ts       # GET /api/scans/[id] (Polls live status & report)
│       └── report/[id]/route.ts      # GET /api/report/[id] (Retrieves report JSON)
└── scripts/
    └── test-runner.ts                # Test suite verifying security, parsing & scoring
```

---

## Database Migration Instructions

To run migrations in Supabase:

1. Open your Supabase Dashboard -> **SQL Editor**.
2. Run the script found in `supabase/migrations/001_initial_schema.sql`.
3. The migration sets up:
   - `leads` (id, email, created_at)
   - `scans` (id, lead_id, url, business_name, industry, city, language, status, progress, error, dates)
   - `questions` (id, scan_id, question, language, order_index)
   - `ai_responses` (id, scan_id, question_id, engine, model, raw_response, response_json, duration_ms, status)
   - `mentions` (id, ai_response_id, business_mentioned, position, confidence, evidence)
   - `competitors` (id, ai_response_id, name, url, position)
   - `sources` (id, ai_response_id, title, url, domain)
   - `reports` (id, scan_id, overall_score, openai_score, gemini_score, google_score, report_json)
   - Indexes and Row Level Security (RLS) policies.

---

## Local Development & Testing

### 1. Install dependencies
```bash
npm install
```

### 2. Run test suite
```bash
npm test
```

### 3. Start local dev server
```bash
npm run dev
```

### 4. Running a Demo Scan
Set `DEMO_MODE="true"` in `.env.local` to run full scans without consuming external API credits. Demo mode uses realistic mock responses and clearly labels them as `(demo)`.

---

## Enabling Production AI Providers

To run live audits with real external models, configure the following in `.env`:
- `GEMINI_API_KEY`: For live Gemini 3.8 queries and Google search grounding.
- `OPENAI_API_KEY`: For live ChatGPT queries (`gpt-4o-mini`).
- `RESEND_API_KEY`: For emailing reports to users.
- `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: For PostgreSQL persistence.
