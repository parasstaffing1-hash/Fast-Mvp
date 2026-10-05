import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { SupportedLanguage } from '@/types/scanner';
import { validateAndNormalizeUrl } from '../security/validation';

export interface ExtractedBusinessData {
  business_name: string;
  industry: string;
  city: string;
  language: SupportedLanguage;
  services: string[];
  description: string;
  target_customers: string[];
  phone?: string;
  email?: string;
  domain: string;
  pagesCrawled: string[];
}

interface SinglePageContent {
  url: string;
  title: string;
  description: string;
  headings: string[];
  textSnippet: string;
  links: string[];
  jsonLd: any[];
}

/**
 * Safely fetches an individual web page with timeout, max redirects, SSRF checks, and size limits.
 */
async function fetchPage(targetUrl: string, timeoutMs = 8000, maxRedirects = 3): Promise<SinglePageContent | null> {
  let currentUrl = targetUrl;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    const validation = validateAndNormalizeUrl(currentUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      console.warn(`[Crawler SSRF Block] Blocked target or redirect URL: ${currentUrl}`);
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(currentUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 PickedAI-Bot/2.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,et;q=0.8',
        },
        signal: controller.signal,
        redirect: 'manual', // Manually validate each redirect step for SSRF
      });

      clearTimeout(timeout);

      // Handle Redirects safely
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get('location');
        if (!location) return null;
        const resolved = new URL(location, currentUrl).href;
        currentUrl = resolved;
        redirectsRemaining--;
        continue;
      }

      if (!res.ok) return null;

      // Check Content-Type (must be HTML or text)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        return null;
      }

      // Check max response size (max 2MB)
      const MAX_SIZE = 2 * 1024 * 1024;
      const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
      if (contentLength > MAX_SIZE) {
        return null;
      }

      const html = await res.text();
      if (html.length > MAX_SIZE) {
        return null;
      }

      const $ = cheerio.load(html);

    const title = $('title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') || '';

    const description = $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') || '';

    const jsonLd: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).text());
        if (Array.isArray(parsed)) jsonLd.push(...parsed);
        else if (parsed) jsonLd.push(parsed);
      } catch {
        // Ignore malformed json-ld
      }
    });

    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const h = $(el).text().replace(/\s+/g, ' ').trim();
      if (h.length > 2 && h.length < 120) headings.push(h);
    });

    // Extract relevant internal sub-links for about, services, contact
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) links.push(href);
    });

    // Strip noise
    $('script, style, noscript, svg, iframe, nav, footer, header, form, .cookie-banner, #cookie-banner').remove();

    const paragraphs: string[] = [];
    $('p, article, section, li').each((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t.length > 20) paragraphs.push(t);
    });

      return {
        url: currentUrl,
        title,
        description,
        headings: headings.slice(0, 10),
        textSnippet: paragraphs.slice(0, 20).join('\n\n'),
        links,
        jsonLd,
      };
    } catch (err) {
      // Graceful error logging
      return null;
    }
  }

  return null;
}

/**
 * Determines relevant subpages to crawl (/about, /services, /contact, or Estonian /meist, /teenused, /kontakt).
 */
function findSubpageUrls(baseUrl: string, rootLinks: string[]): string[] {
  const origin = new URL(baseUrl).origin;
  const targetSubpaths = [
    '/about',
    '/about-us',
    '/meist',
    '/services',
    '/teenused',
    '/contact',
    '/kontakt',
  ];

  const matchedUrls = new Set<string>();

  // Check matching hrefs found on homepage
  for (const href of rootLinks) {
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.origin === origin) {
        const path = resolved.pathname.toLowerCase().replace(/\/$/, '');
        if (targetSubpaths.some((sp) => path === sp || path.endsWith(sp))) {
          matchedUrls.add(resolved.href);
          if (matchedUrls.size >= 3) break;
        }
      }
    } catch {
      // Ignore invalid hrefs
    }
  }

  // If no internal links matched, construct standard paths
  if (matchedUrls.size === 0) {
    matchedUrls.add(`${origin}/about`);
    matchedUrls.add(`${origin}/services`);
    matchedUrls.add(`${origin}/contact`);
  }

  return Array.from(matchedUrls).slice(0, 3);
}

/**
 * High-precision multi-page crawling and structured entity extraction.
 */
export async function crawlAndExtractBusiness(
  rawUrl: string,
  preferredLanguage?: SupportedLanguage
): Promise<ExtractedBusinessData> {
  const { normalizedUrl } = validateAndNormalizeUrl(rawUrl);
  const baseUrl = normalizedUrl || rawUrl;
  const domain = new URL(baseUrl).hostname.replace(/^www\./, '');

  // 1. Crawl root homepage
  const homeContent = await fetchPage(baseUrl);
  const pagesCrawled = [baseUrl];

  // 2. Discover and crawl relevant subpages concurrently (/about, /services, /contact)
  const candidateSubpages = findSubpageUrls(baseUrl, homeContent?.links || []);
  const subpageContents = await Promise.all(
    candidateSubpages.map(async (subUrl) => {
      const sub = await fetchPage(subUrl, 6000);
      if (sub && sub.textSnippet.length > 50) {
        pagesCrawled.push(subUrl);
        return sub;
      }
      return null;
    })
  );

  const validPages = [homeContent, ...subpageContents].filter((p): p is SinglePageContent => Boolean(p));

  // Synthesize text extracts
  const combinedHeadings = Array.from(new Set(validPages.flatMap((p) => p.headings))).slice(0, 15);
  const combinedText = validPages.map((p) => `--- PAGE: ${p.url} ---\n${p.textSnippet}`).join('\n\n');

  // Detect language hint
  const combinedLower = (homeContent?.title || '' + ' ' + combinedText).toLowerCase();
  const hasEstonianKeywords =
    domain.endsWith('.ee') ||
    combinedLower.includes('kontakt') ||
    combinedLower.includes('teenused') ||
    combinedLower.includes('ettevõte') ||
    combinedLower.includes('tallinn') ||
    combinedLower.includes('tartu') ||
    preferredLanguage === 'et';

  const detectedLanguage: SupportedLanguage = hasEstonianKeywords ? 'et' : 'en';

  // Fallback defaults
  let fallbackName = homeContent?.title ? homeContent.title.split(/[|\-–•:]/)[0].trim() : domain;
  if (!fallbackName || fallbackName.length > 40) {
    fallbackName = domain.split('.')[0].toUpperCase();
  }

  const fallback: ExtractedBusinessData = {
    business_name: fallbackName,
    industry: detectedLanguage === 'et' ? 'Tehnoloogia ja professionaalsed teenused' : 'Professional & Digital Services',
    city: detectedLanguage === 'et' ? 'Tallinn' : 'Global / Online',
    language: detectedLanguage,
    services: [
      detectedLanguage === 'et' ? 'Põhiteenus' : 'Core Solutions',
      detectedLanguage === 'et' ? 'Konsultatsioon' : 'Consulting & Advisory',
      detectedLanguage === 'et' ? 'Klienditugi' : 'Support',
    ],
    description: homeContent?.description || `${fallbackName} delivers professional services worldwide.`,
    target_customers: [
      detectedLanguage === 'et' ? 'Ettevõtted ja eraisikud' : 'Businesses & Individual Customers',
    ],
    domain,
    pagesCrawled,
  };

  // Structured extraction with Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an expert business intelligence engine. Analyze the following crawled website text from multiple pages (${pagesCrawled.join(', ')}) and extract structured business entity data.

Domain: ${domain}
Language Hint: ${detectedLanguage}

Website Text & Headings:
"""
Title: ${homeContent?.title || ''}
Description: ${homeContent?.description || ''}
Headings: ${combinedHeadings.join(' | ')}

${combinedText.slice(0, 5000)}
"""

Output strictly valid JSON matching this schema with NO markdown code fences or backticks:
{
  "business_name": "Official Brand / Trade Name",
  "industry": "Specific industry (e.g. Legal Services, Dental Clinic, B2B SaaS, IT Consulting, Real Estate, E-Commerce)",
  "city": "Primary city location (e.g. Tallinn, Tartu, London, New York, or Remote/Global)",
  "language": "en" or "et",
  "services": ["Specific service 1", "Specific service 2", "Specific service 3", "Specific service 4", "Specific service 5"],
  "description": "Crisp 1-2 sentence executive summary of the business offering",
  "target_customers": ["Customer segment 1", "Customer segment 2"]
}`;

    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = res.text?.trim() || '';
    if (jsonText) {
      const parsed = JSON.parse(jsonText);
      return {
        business_name: parsed.business_name || fallback.business_name,
        industry: parsed.industry || fallback.industry,
        city: parsed.city || fallback.city,
        language: (parsed.language === 'et' || detectedLanguage === 'et') ? 'et' : 'en',
        services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services.slice(0, 8) : fallback.services,
        description: parsed.description || fallback.description,
        target_customers: Array.isArray(parsed.target_customers) && parsed.target_customers.length > 0 ? parsed.target_customers : fallback.target_customers,
        domain,
        pagesCrawled,
      };
    }
  } catch (err) {
    console.warn('[MultiPageCrawler] AI structured extraction error, using fallback:', err);
  }

  return fallback;
}
