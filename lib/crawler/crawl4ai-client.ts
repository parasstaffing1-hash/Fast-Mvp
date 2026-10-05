import * as cheerio from 'cheerio';

export interface CrawlResult {
  url: string;
  success: boolean;
  status: number;
  markdown: string;
  cleanedText: string;
  title: string;
  metaDescription: string;
  language: string;
  jsonLd: Record<string, any>[];
  headings: { level: string; text: string }[];
  emails: string[];
  phones: string[];
  links: string[];
  source: 'crawl4ai_service' | 'native_clean_extractor';
  error?: string;
}

/**
 * Normalizes input URL with proper protocol.
 */
export function normalizeUrl(rawUrl: string): string {
  let trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Attempts to crawl via a Crawl4AI HTTP microservice if configured.
 * Crawl4AI provides self-hosted containerized crawling with LLM-friendly extraction.
 */
async function crawlWithCrawl4AiService(targetUrl: string): Promise<CrawlResult | null> {
  const serviceUrl = process.env.CRAWL4AI_API_URL;
  if (!serviceUrl) return null;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.CRAWL4AI_API_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.CRAWL4AI_API_TOKEN}`;
    }

    const endpoint = serviceUrl.endsWith('/crawl') ? serviceUrl : `${serviceUrl.replace(/\/+$/, '')}/crawl`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        urls: [targetUrl],
        crawler_params: {
          headless: true,
          remove_overlay_elements: true,
        },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const resultItem = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);

    if (resultItem && (resultItem.markdown || resultItem.extracted_content || resultItem.html)) {
      const rawText = resultItem.markdown || resultItem.extracted_content || '';
      return {
        url: targetUrl,
        success: true,
        status: 200,
        markdown: rawText,
        cleanedText: rawText.slice(0, 8000),
        title: resultItem.metadata?.title || '',
        metaDescription: resultItem.metadata?.description || '',
        language: resultItem.metadata?.language || 'en',
        jsonLd: [],
        headings: [],
        emails: [],
        phones: [],
        links: [],
        source: 'crawl4ai_service',
      };
    }
  } catch (err) {
    console.warn('[Crawl4AI Service] Failed to call microservice, using native extractor fallback:', err);
  }
  return null;
}

/**
 * Robust Native Node.js / Cheerio clean content extractor.
 * Strips junk, parses JSON-LD schemas, extracts structured content and contact signals.
 */
export async function crawlWebsite(rawUrl: string): Promise<CrawlResult> {
  const url = normalizeUrl(rawUrl);

  // 1. Try external Crawl4AI instance first if configured
  const crawl4AiResult = await crawlWithCrawl4AiService(url);
  if (crawl4AiResult) {
    return crawl4AiResult;
  }

  // 2. High-performance native extraction
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 PickedAI-Bot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,et;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract HTML metadata
    const title = $('title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      '';

    const metaDescription = $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    const rawLang = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content') || 'en';
    const language = rawLang.toLowerCase().includes('et') ? 'et' : 'en';

    // Parse JSON-LD structures
    const jsonLd: Record<string, any>[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const rawJson = $(el).text();
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          jsonLd.push(...parsed);
        } else if (parsed && typeof parsed === 'object') {
          jsonLd.push(parsed);
        }
      } catch {
        // Skip malformed script tags
      }
    });

    // Extract Headings
    const headings: { level: string; text: string }[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length > 2 && text.length < 150) {
        headings.push({ level: el.tagName.toLowerCase(), text });
      }
    });

    // Extract Emails & Phones
    const emails: Set<string> = new Set();
    const phones: Set<string> = new Set();

    $('a[href^="mailto:"]').each((_, el) => {
      const mail = $(el).attr('href')?.replace('mailto:', '').split('?')[0].trim();
      if (mail && mail.includes('@')) emails.add(mail.toLowerCase());
    });

    $('a[href^="tel:"]').each((_, el) => {
      const phone = $(el).attr('href')?.replace('tel:', '').trim();
      if (phone) phones.add(phone);
    });

    // Remove unwanted non-content elements
    $('script, style, noscript, svg, iframe, nav, footer, header, form, [role="banner"], [role="navigation"], .cookie-banner, #cookie-banner, .advertisement').remove();

    // Extract clean body text
    const paragraphs: string[] = [];
    $('p, article, section, li').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t.length > 25) {
        paragraphs.push(t);
      }
    });

    // Cleaned text output
    const cleanedText = paragraphs.slice(0, 45).join('\n\n');

    // Create simple markdown representation
    const mdParts: string[] = [];
    if (title) mdParts.push(`# ${title}\n`);
    if (metaDescription) mdParts.push(`> ${metaDescription}\n`);
    headings.slice(0, 15).forEach((h) => {
      mdParts.push(`### ${h.text}`);
    });
    mdParts.push('\n' + cleanedText);

    return {
      url,
      success: true,
      status: res.status,
      markdown: mdParts.join('\n'),
      cleanedText,
      title,
      metaDescription,
      language,
      jsonLd,
      headings,
      emails: Array.from(emails),
      phones: Array.from(phones),
      links: [],
      source: 'native_clean_extractor',
    };
  } catch (error: any) {
    console.error(`[Crawler] Failed to crawl ${url}:`, error);
    return {
      url,
      success: false,
      status: 500,
      markdown: '',
      cleanedText: '',
      title: '',
      metaDescription: '',
      language: 'en',
      jsonLd: [],
      headings: [],
      emails: [],
      phones: [],
      links: [],
      source: 'native_clean_extractor',
      error: error?.message || 'Failed to crawl website',
    };
  }
}
