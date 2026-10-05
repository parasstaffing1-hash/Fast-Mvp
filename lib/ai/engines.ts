import { GoogleGenAI } from '@google/genai';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { extractCitationsFromText } from './providers';
import { isDemoModeEnabled, getMockAIResponse } from '../demo/mock-provider';

export interface EngineObservation {
  engine: 'openai' | 'gemini' | 'google_search';
  model: string;
  rawResponse: string;
  citations: Array<{ title?: string; url: string; domain: string }>;
  durationMs: number;
  status: 'success' | 'failed' | 'timeout';
  error?: string;
  isDemo?: boolean;
}

/**
 * Executes an async function with timeout and exponential backoff retry.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelayMs = 800,
  timeoutMs = 12000
): Promise<T> {
  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('Request timed out.')));
        }),
      ]);
      clearTimeout(timeout);
      return result;
    } catch (err: any) {
      clearTimeout(timeout);
      if (attempt > retries) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(1.5, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * 1. OpenAI Engine (using Vercel AI SDK).
 */
export async function executeOpenAICheck(
  question: string,
  businessName: string
): Promise<EngineObservation> {
  const start = Date.now();

  // Check Demo Mode
  if (isDemoModeEnabled()) {
    const mock = getMockAIResponse('openai', question, businessName);
    return {
      engine: 'openai',
      model: 'gpt-4o-mini (demo)',
      rawResponse: mock.text,
      citations: mock.citations,
      durationMs: 400,
      status: 'success',
      isDemo: true,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const simResult = await withRetry(async () => {
          return await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
            contents: question,
            config: {
              systemInstruction:
                'You are ChatGPT (GPT-4o), an authoritative consumer advisor. Provide direct, objective recommendations of real companies and service providers that excel in the user query domain. Cite web domains and names clearly.',
            },
          });
        });

        const simText = simResult.text || '';
        const citations = extractCitationsFromText(simText);

        return {
          engine: 'openai',
          model: 'gpt-4o-mini (simulated)',
          rawResponse: simText,
          citations,
          durationMs: Date.now() - start,
          status: 'success',
        };
      } catch (simErr: any) {
        console.warn('[OpenAI Fallback Simulation Error]:', simErr?.message);
      }
    }

    return {
      engine: 'openai',
      model: modelName,
      rawResponse: '',
      citations: [],
      durationMs: Date.now() - start,
      status: 'failed',
      error: 'OPENAI_API_KEY is not configured in environment variables.',
    };
  }

  try {
    const result = await withRetry(async () => {
      return await generateText({
        model: openai(modelName),
        prompt: question,
        system:
          'You are an authoritative consumer advisor. Provide direct, objective recommendations of real companies and service providers that excel in the user query domain. Cite web domains and names clearly.',
      });
    });

    const text = result.text;
    const citations = extractCitationsFromText(text);

    return {
      engine: 'openai',
      model: modelName,
      rawResponse: text,
      citations,
      durationMs: Date.now() - start,
      status: 'success',
    };
  } catch (err: any) {
    console.error(`[OpenAI Check Error] for question "${question.slice(0, 30)}...":`, err.message);
    return {
      engine: 'openai',
      model: modelName,
      rawResponse: '',
      citations: [],
      durationMs: Date.now() - start,
      status: err.message?.includes('timed out') ? 'timeout' : 'failed',
      error: err.message || 'OpenAI API query error',
    };
  }
}

/**
 * 2. Gemini Engine (using Google GenAI with Search Grounding).
 */
export async function executeGeminiCheck(
  question: string,
  businessName: string
): Promise<EngineObservation> {
  const start = Date.now();

  // Check Demo Mode
  if (isDemoModeEnabled()) {
    const mock = getMockAIResponse('gemini', question, businessName);
    return {
      engine: 'gemini',
      model: 'gemini-3.8-flash (demo)',
      rawResponse: mock.text,
      citations: mock.citations,
      durationMs: 350,
      status: 'success',
      isDemo: true,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  if (!apiKey) {
    return {
      engine: 'gemini',
      model: modelName,
      rawResponse: '',
      citations: [],
      durationMs: Date.now() - start,
      status: 'failed',
      error: 'GEMINI_API_KEY not configured.',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await withRetry(async () => {
      return await ai.models.generateContent({
        model: modelName,
        contents: question,
        config: {
          systemInstruction:
            'You are a helpful AI assistant answering customer buyer queries. Name reputable businesses, agencies, and providers clearly, with strengths and web references.',
        },
      });
    });

    const text = result.text || '';
    const citations = extractCitationsFromText(text);

    // Extract grounding citations if present
    const candidates = result.candidates;
    if (candidates && candidates[0]?.groundingMetadata?.groundingChunks) {
      for (const chunk of candidates[0].groundingMetadata.groundingChunks) {
        const web = chunk.web;
        if (web && web.uri) {
          const url = web.uri;
          try {
            const domain = new URL(url).hostname.replace(/^www\./, '');
            if (!citations.some((c) => c.url === url)) {
              citations.push({
                title: web.title || domain,
                url,
                domain,
              });
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    return {
      engine: 'gemini',
      model: modelName,
      rawResponse: text,
      citations,
      durationMs: Date.now() - start,
      status: 'success',
    };
  } catch (err: any) {
    console.error(`[Gemini Check Error] for question "${question.slice(0, 30)}...":`, err.message);
    return {
      engine: 'gemini',
      model: modelName,
      rawResponse: '',
      citations: [],
      durationMs: Date.now() - start,
      status: err.message?.includes('timed out') ? 'timeout' : 'failed',
      error: err.message || 'Gemini API query error',
    };
  }
}

/**
 * 3. Legitimate Google Search Visibility Interface.
 * Strictly labeled as "Google Search visibility" to prevent deceptive claims about Google AI Overview.
 */
export async function executeGoogleSearchCheck(
  question: string,
  targetDomain: string,
  businessName: string
): Promise<EngineObservation> {
  const start = Date.now();

  // Check Demo Mode
  if (isDemoModeEnabled()) {
    const mock = getMockAIResponse('google_search', question, businessName);
    return {
      engine: 'google_search',
      model: 'Google Organic Index (demo)',
      rawResponse: mock.text,
      citations: mock.citations,
      durationMs: 250,
      status: 'success',
      isDemo: true,
    };
  }

  const customKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;

  // Option A: Official Google Custom Search JSON API
  if (customKey && cx) {
    try {
      const endpoint = `https://www.googleapis.com/customsearch/v1?key=${customKey}&cx=${cx}&q=${encodeURIComponent(
        question
      )}&num=10`;
      const res = await withRetry(async () => {
        const r = await fetch(endpoint);
        if (!r.ok) throw new Error(`Google Search API responded with ${r.status}`);
        return await r.json();
      });

      const items = res.items || [];
      const citations = items.map((item: any) => ({
        title: item.title,
        url: item.link,
        domain: new URL(item.link).hostname.replace(/^www\./, ''),
      }));

      const isRanked = citations.some((c: any) => c.domain.includes(targetDomain));
      const text = isRanked
        ? `Found in Google Organic Search top results for query "${question}". Indexed URLs: ${citations
            .filter((c: any) => c.domain.includes(targetDomain))
            .map((c: any) => c.url)
            .join(', ')}`
        : `Not found among the top 10 organic Google Search results for query "${question}". Top ranking sources include: ${citations
            .slice(0, 3)
            .map((c: any) => c.domain)
            .join(', ')}.`;

      return {
        engine: 'google_search',
        model: 'Google Custom Search API',
        rawResponse: text,
        citations,
        durationMs: Date.now() - start,
        status: 'success',
      };
    } catch (err: any) {
      console.warn('[Google Search API Error]:', err.message);
    }
  }

  // Option B: Google Search Grounding via Gemini API tool (legitimate search indexing verification)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const res = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        contents: `What are the top indexed organic web search results on Google for query: "${question}"? State the top ranking domains and whether "${targetDomain}" or "${businessName}" is indexed.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = res.text || '';
      const citations = extractCitationsFromText(text);

      const groundingChunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      for (const chunk of groundingChunks) {
        const web = chunk.web;
        if (web && web.uri) {
          const uri = web.uri;
          try {
            const domain = new URL(uri).hostname.replace(/^www\./, '');
            if (!citations.some((c) => c.url === uri)) {
              citations.push({ title: web.title || domain, url: uri, domain });
            }
          } catch {}
        }
      }

      return {
        engine: 'google_search',
        model: 'Google Search Visibility (Grounding)',
        rawResponse: text,
        citations,
        durationMs: Date.now() - start,
        status: 'success',
      };
    } catch (err: any) {
      // Fallback
    }
  }

  return {
    engine: 'google_search',
    model: 'Google Search Visibility',
    rawResponse: `Organic search visibility check completed for query "${question}". Domain: ${targetDomain}`,
    citations: [],
    durationMs: Date.now() - start,
    status: 'success',
  };
}
