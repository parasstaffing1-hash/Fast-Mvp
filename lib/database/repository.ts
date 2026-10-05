import fs from 'node:fs';
import path from 'node:path';
import { getSupabase } from './supabase';

const DATA_DIR = path.join(process.cwd(), '.next', 'cache', 'picked_ai_data');
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

function writeCacheFile(filename: string, data: any) {
  try {
    ensureDataDir();
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data), 'utf8');
  } catch {}
}

function readCacheFile<T>(filename: string): T | null {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw) as T;
    }
  } catch {}
  return null;
}

export interface DBLead {
  id: string;
  email: string;
  created_at: string;
}

export type DBScanStatus =
  | 'queued'
  | 'crawling'
  | 'analyzing'
  | 'generating_questions'
  | 'checking_ai'
  | 'building_report'
  | 'completed'
  | 'failed';

export interface DBScan {
  id: string;
  lead_id: string | null;
  url: string;
  business_name?: string;
  industry?: string;
  city?: string;
  language: string;
  status: DBScanStatus;
  progress: number;
  error?: string | null;
  started_at: string;
  completed_at?: string | null;
  created_at: string;
}

export interface DBQuestion {
  id: string;
  scan_id: string;
  question: string;
  language: string;
  order_index: number;
  created_at: string;
}

export interface DBAIResponse {
  id: string;
  scan_id: string;
  question_id: string;
  engine: 'openai' | 'gemini' | 'google_search';
  model: string;
  raw_response: string;
  response_json?: any;
  duration_ms: number;
  status: 'success' | 'failed' | 'timeout';
  error?: string | null;
  created_at: string;
}

export interface DBMention {
  id: string;
  ai_response_id: string;
  business_mentioned: boolean;
  position: number | null;
  confidence: number;
  evidence: string;
  created_at: string;
}

export interface DBCompetitor {
  id: string;
  ai_response_id: string;
  name: string;
  url?: string | null;
  position?: number | null;
  created_at: string;
}

export interface DBSource {
  id: string;
  ai_response_id: string;
  title?: string | null;
  url: string;
  domain: string;
  created_at: string;
}

export interface DBReport {
  id: string;
  scan_id: string;
  overall_score: number;
  openai_score: number;
  gemini_score: number;
  google_score: number;
  report_json: any;
  created_at: string;
}

interface GlobalRepositoryStore {
  leads: Map<string, DBLead>;
  scans: Map<string, DBScan>;
  questions: Map<string, DBQuestion[]>;
  aiResponses: Map<string, DBAIResponse[]>;
  mentions: Map<string, DBMention[]>;
  competitors: Map<string, DBCompetitor[]>;
  sources: Map<string, DBSource[]>;
  reports: Map<string, DBReport>;
}

const globalWithStore = globalThis as typeof globalThis & {
  __picked_ai_store?: GlobalRepositoryStore;
};

if (!globalWithStore.__picked_ai_store) {
  globalWithStore.__picked_ai_store = {
    leads: new Map<string, DBLead>(),
    scans: new Map<string, DBScan>(),
    questions: new Map<string, DBQuestion[]>(),
    aiResponses: new Map<string, DBAIResponse[]>(),
    mentions: new Map<string, DBMention[]>(),
    competitors: new Map<string, DBCompetitor[]>(),
    sources: new Map<string, DBSource[]>,
    reports: new Map<string, DBReport>(),
  };
}

const store = globalWithStore.__picked_ai_store;

/**
 * Finds or creates a lead by email address.
 */
export async function findOrCreateLead(email: string): Promise<DBLead> {
  const normalized = email.trim().toLowerCase();

  // Check in-memory
  for (const lead of store.leads.values()) {
    if (lead.email.toLowerCase() === normalized) {
      return lead;
    }
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('leads')
        .select('*')
        .eq('email', normalized)
        .maybeSingle();

      if (existing) {
        store.leads.set(existing.id, existing);
        return existing;
      }

      const { data: created, error } = await supabase
        .from('leads')
        .insert({ email: normalized })
        .select()
        .single();

      if (!error && created) {
        store.leads.set(created.id, created);
        return created;
      }
    } catch (err) {
      console.warn('[Repository] Supabase findOrCreateLead error, using local:', err);
    }
  }

  const newLead: DBLead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: normalized,
    created_at: new Date().toISOString(),
  };
  store.leads.set(newLead.id, newLead);
  writeCacheFile('leads.json', Array.from(store.leads.values()));
  return newLead;
}

/**
 * Retrieves all leads for admin reporting.
 */
export async function getAllLeads(): Promise<DBLead[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        for (const l of data) store.leads.set(l.id, l);
        return data;
      }
    } catch {}
  }

  const cached = readCacheFile<DBLead[]>('leads.json');
  if (cached && Array.isArray(cached)) {
    for (const l of cached) store.leads.set(l.id, l);
  }

  return Array.from(store.leads.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Creates a new scan record.
 */
export async function createScanRecord(data: {
  id?: string;
  lead_id: string | null;
  url: string;
  language: string;
}): Promise<DBScan> {
  const scan: DBScan = {
    id: data.id || `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    lead_id: data.lead_id,
    url: data.url,
    language: data.language,
    status: 'queued',
    progress: 5,
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  store.scans.set(scan.id, scan);
  writeCacheFile(`scan_${scan.id}.json`, scan);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('scans').insert({
        id: scan.id,
        lead_id: scan.lead_id,
        url: scan.url,
        language: scan.language,
        status: scan.status,
        progress: scan.progress,
        started_at: scan.started_at,
        created_at: scan.created_at,
      });
    } catch (err) {
      // Non-blocking
    }
  }

  return scan;
}

/**
 * Updates scan status, progress, and metadata.
 */
export async function updateScanStatus(
  id: string,
  updates: Partial<DBScan>
): Promise<DBScan | null> {
  let scan = store.scans.get(id);
  if (!scan) {
    scan = readCacheFile<DBScan>(`scan_${id}.json`) || undefined;
  }
  if (!scan) return null;

  Object.assign(scan, updates);
  store.scans.set(id, scan);
  writeCacheFile(`scan_${id}.json`, scan);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('scans')
        .update({
          business_name: scan.business_name,
          industry: scan.industry,
          city: scan.city,
          language: scan.language,
          status: scan.status,
          progress: scan.progress,
          error: scan.error,
          completed_at: scan.completed_at,
        })
        .eq('id', id);
    } catch {
      // Non-blocking
    }
  }

  return scan;
}

/**
 * Saves generated questions.
 */
export async function saveScanQuestions(
  scanId: string,
  questions: Array<{ id: string; question: string; language: string; order_index: number }>
): Promise<DBQuestion[]> {
  const dbQuestions: DBQuestion[] = questions.map((q) => ({
    id: q.id,
    scan_id: scanId,
    question: q.question,
    language: q.language,
    order_index: q.order_index,
    created_at: new Date().toISOString(),
  }));

  store.questions.set(scanId, dbQuestions);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('questions').insert(
        dbQuestions.map((q) => ({
          id: q.id,
          scan_id: q.scan_id,
          question: q.question,
          language: q.language,
          order_index: q.order_index,
        }))
      );
    } catch {
      // Non-blocking
    }
  }

  return dbQuestions;
}

/**
 * Saves an AI response observation.
 */
export async function saveDBAIResponse(data: Omit<DBAIResponse, 'created_at'>): Promise<DBAIResponse> {
  const record: DBAIResponse = {
    ...data,
    created_at: new Date().toISOString(),
  };

  const list = store.aiResponses.get(data.scan_id) || [];
  list.push(record);
  store.aiResponses.set(data.scan_id, list);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('ai_responses').insert({
        id: record.id,
        scan_id: record.scan_id,
        question_id: record.question_id,
        engine: record.engine,
        model: record.model,
        raw_response: record.raw_response,
        response_json: record.response_json,
        duration_ms: record.duration_ms,
        status: record.status,
        error: record.error,
      });
    } catch {
      // Non-blocking
    }
  }

  return record;
}

/**
 * Saves mention analysis.
 */
export async function saveDBMention(data: Omit<DBMention, 'created_at'>): Promise<DBMention> {
  const record: DBMention = {
    ...data,
    created_at: new Date().toISOString(),
  };

  const list = store.mentions.get(data.ai_response_id) || [];
  list.push(record);
  store.mentions.set(data.ai_response_id, list);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('mentions').insert({
        id: record.id,
        ai_response_id: record.ai_response_id,
        business_mentioned: record.business_mentioned,
        position: record.position,
        confidence: record.confidence,
        evidence: record.evidence,
      });
    } catch {}
  }

  return record;
}

/**
 * Saves competitor detected in AI response.
 */
export async function saveDBCompetitor(data: Omit<DBCompetitor, 'created_at'>): Promise<DBCompetitor> {
  const record: DBCompetitor = {
    ...data,
    created_at: new Date().toISOString(),
  };

  const list = store.competitors.get(data.ai_response_id) || [];
  list.push(record);
  store.competitors.set(data.ai_response_id, list);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('competitors').insert({
        id: record.id,
        ai_response_id: record.ai_response_id,
        name: record.name,
        url: record.url,
        position: record.position,
      });
    } catch {}
  }

  return record;
}

/**
 * Saves source citation.
 */
export async function saveDBSource(data: Omit<DBSource, 'created_at'>): Promise<DBSource> {
  const record: DBSource = {
    ...data,
    created_at: new Date().toISOString(),
  };

  const list = store.sources.get(data.ai_response_id) || [];
  list.push(record);
  store.sources.set(data.ai_response_id, list);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('sources').insert({
        id: record.id,
        ai_response_id: record.ai_response_id,
        title: record.title,
        url: record.url,
        domain: record.domain,
      });
    } catch {}
  }

  return record;
}

/**
 * Saves final report record.
 */
export async function saveDBReport(data: Omit<DBReport, 'created_at'>): Promise<DBReport> {
  const record: DBReport = {
    ...data,
    created_at: new Date().toISOString(),
  };

  store.reports.set(data.scan_id, record);
  writeCacheFile(`report_${data.scan_id}.json`, record);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('reports').upsert({
        id: record.id,
        scan_id: record.scan_id,
        overall_score: record.overall_score,
        openai_score: record.openai_score,
        gemini_score: record.gemini_score,
        google_score: record.google_score,
        report_json: record.report_json,
      });
    } catch {}
  }

  return record;
}

/**
 * Retrieves scan with its current status.
 */
export async function getScanRecord(scanId: string): Promise<DBScan | null> {
  let local = store.scans.get(scanId);
  if (!local) {
    local = readCacheFile<DBScan>(`scan_${scanId}.json`) || undefined;
    if (local) store.scans.set(scanId, local);
  }
  if (local) return local;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.from('scans').select('*').eq('id', scanId).single();
      if (data) {
        store.scans.set(scanId, data);
        return data;
      }
    } catch {}
  }

  return null;
}

/**
 * Retrieves report by scan id.
 */
export async function getReportByScanId(scanId: string): Promise<DBReport | null> {
  let local = store.reports.get(scanId);
  if (!local) {
    local = readCacheFile<DBReport>(`report_${scanId}.json`) || undefined;
    if (local) store.reports.set(scanId, local);
  }
  if (local) return local;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.from('reports').select('*').eq('scan_id', scanId).single();
      if (data) {
        store.reports.set(scanId, data);
        return data;
      }
    } catch {}
  }

  return null;
}
