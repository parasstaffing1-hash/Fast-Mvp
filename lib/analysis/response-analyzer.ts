import { GoogleGenAI } from '@google/genai';

export interface CompetitorAnalysisItem {
  name: string;
  url?: string;
  position?: number;
}

export interface SourceAnalysisItem {
  title?: string;
  url: string;
  domain?: string;
}

export interface StructuredAnalysisResult {
  businessMentioned: boolean;
  position: number | null;
  confidence: number;
  evidence: string;
  competitors: CompetitorAnalysisItem[];
  sources: SourceAnalysisItem[];
}

/**
 * Normalizes text for clean entity comparison.
 */
function cleanString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9äöõüšž\s]/gi, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Fast deterministic analysis for brand mentions, ranking positions, and competitors.
 */
export function analyzeResponseFast(
  targetBusinessName: string,
  targetDomain: string,
  rawResponse: string,
  citations: Array<{ title?: string; url: string; domain?: string }>
): StructuredAnalysisResult {
  if (!rawResponse || !rawResponse.trim()) {
    return {
      businessMentioned: false,
      position: null,
      confidence: 1.0,
      evidence: 'Empty response returned from model.',
      competitors: [],
      sources: citations.map((c) => ({ title: c.title, url: c.url, domain: c.domain })),
    };
  }

  const textLower = rawResponse.toLowerCase();
  const cleanTarget = cleanString(targetBusinessName);
  const domainTarget = cleanString(targetDomain.split('.')[0]);

  // Check mention
  const nameMentioned = cleanTarget.length > 2 && textLower.includes(cleanTarget);
  const domainMentioned = domainTarget.length > 2 && textLower.includes(domainTarget);

  const businessMentioned = nameMentioned || domainMentioned;

  // Evidence extraction
  let evidence = '';
  if (businessMentioned) {
    const lines = rawResponse.split('\n');
    const matchedLine = lines.find(
      (l) => cleanString(l).includes(cleanTarget) || cleanString(l).includes(domainTarget)
    );
    evidence = matchedLine ? matchedLine.trim().slice(0, 200) : `Brand name "${targetBusinessName}" found in text.`;
  } else {
    evidence = `Target brand "${targetBusinessName}" was not recommended or mentioned in the AI response.`;
  }

  // Detect position
  let position: number | null = null;
  if (businessMentioned) {
    const lines = rawResponse.split('\n');
    let listIdx = 1;
    for (const line of lines) {
      const trimmed = line.trim();
      const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/i) || trimmed.match(/^\*\*(\d+)[\.\)]\s+(.*)/i);
      if (numMatch) {
        const itemNum = parseInt(numMatch[1], 10);
        const itemText = cleanString(numMatch[2]);
        if (itemText.includes(cleanTarget) || itemText.includes(domainTarget)) {
          position = itemNum;
          break;
        }
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const itemText = cleanString(trimmed);
        if (itemText.includes(cleanTarget) || itemText.includes(domainTarget)) {
          position = listIdx;
          break;
        }
        listIdx++;
      }
    }

    if (position === null) {
      // Check if mentioned in opening summary
      if (rawResponse.slice(0, 250).toLowerCase().includes(cleanTarget)) {
        position = 1;
      } else {
        position = 3;
      }
    }
  }

  // Extract competitors
  const competitors: CompetitorAnalysisItem[] = [];
  const boldRegex = /\*\*([^\*:\n]+)\*\*/g;
  let match;
  let compPos = 1;

  const stopWords = new Set([
    'overview', 'summary', 'services', 'pros', 'cons', 'key features', 'why choose', 'conclusion',
    'contact', 'pricing', 'website', 'note', 'recommendation', 'recommendations', 'top options',
    'eesti', 'estonia', 'tallinn', 'parimad', 'teenused', 'ettevõtted', 'firmad', 'hinnad',
    'alternatives', 'features', 'ratings', 'address', 'phone', 'email', 'step 1', 'step 2',
    'tips', 'guide', 'consulting', 'solutions', 'platform', 'app', 'tool'
  ]);

  while ((match = boldRegex.exec(rawResponse)) !== null) {
    let nameCandidate = match[1].replace(/^\d+[\.\)]\s*/, '').replace(/[:\-–]/g, '').trim();
    if (nameCandidate.length > 2 && nameCandidate.length < 35) {
      const lower = nameCandidate.toLowerCase();
      if (
        !stopWords.has(lower) &&
        !lower.includes(cleanTarget) &&
        !lower.includes(domainTarget) &&
        !lower.startsWith('http') &&
        !competitors.some((c) => c.name.toLowerCase() === lower)
      ) {
        competitors.push({
          name: nameCandidate,
          position: compPos++,
        });
        if (competitors.length >= 5) break;
      }
    }
  }

  const sources: SourceAnalysisItem[] = citations.map((c) => ({
    title: c.title || c.domain || 'External Reference',
    url: c.url,
    domain: c.domain,
  }));

  return {
    businessMentioned,
    position,
    confidence: businessMentioned ? 0.95 : 0.90,
    evidence,
    competitors,
    sources,
  };
}

/**
 * Structured analysis using Gemini LLM for complex responses.
 */
export async function analyzeAIResponseWithAI(
  targetBusinessName: string,
  targetDomain: string,
  question: string,
  rawResponse: string,
  citations: Array<{ title?: string; url: string; domain?: string }>
): Promise<StructuredAnalysisResult> {
  const fallback = analyzeResponseFast(targetBusinessName, targetDomain, rawResponse, citations);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || rawResponse.length < 50) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analyze this AI response for brand mention, position, competitors, and sources.

Target Business Name: "${targetBusinessName}"
Target Domain: "${targetDomain}"
Customer Question: "${question}"

AI Response to evaluate:
"""
${rawResponse.slice(0, 3500)}
"""

Task:
1. Determine if "${targetBusinessName}" (or domain "${targetDomain}") was mentioned or recommended.
2. If mentioned, determine the 1-indexed position/rank in recommendation order (1 if first recommended, 2 if second, etc., null if not mentioned).
3. Confidence score between 0.0 and 1.0.
4. Extract 1-sentence evidence quote.
5. Extract competitor companies/brands recommended in the response.

Return strictly valid JSON matching this schema:
{
  "businessMentioned": true,
  "position": 1,
  "confidence": 0.95,
  "evidence": "Quoted sentence or explanation",
  "competitors": [
    { "name": "Competitor Brand Name", "position": 2 }
  ]
}
No markdown fences or code blocks.`;

    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = res.text?.trim() || '';
    if (text) {
      const data = JSON.parse(text);
      return {
        businessMentioned: Boolean(data.businessMentioned),
        position: typeof data.position === 'number' ? data.position : fallback.position,
        confidence: typeof data.confidence === 'number' ? data.confidence : fallback.confidence,
        evidence: data.evidence || fallback.evidence,
        competitors: Array.isArray(data.competitors) && data.competitors.length > 0 ? data.competitors.slice(0, 5) : fallback.competitors,
        sources: fallback.sources,
      };
    }
  } catch (err) {
    // Fall back smoothly
  }

  return fallback;
}
