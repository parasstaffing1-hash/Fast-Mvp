import { GoogleGenAI } from '@google/genai';
import { SupportedLanguage } from '@/types/scanner';
import { ExtractedBusinessData } from '../crawler/multi-page-crawler';

export interface GeneratedQuestionItem {
  id: string;
  order_index: number;
  question: string;
  language: SupportedLanguage;
  intent: 'commercial' | 'transactional' | 'informational' | 'local';
  target_keyword: string;
}

/**
 * Deterministic fallback questions tailored to the business profile.
 */
function getFallbackQuestions(business: ExtractedBusinessData, lang: SupportedLanguage): GeneratedQuestionItem[] {
  const isEt = lang === 'et';
  const ind = business.industry || (isEt ? 'teenused' : 'services');
  const city = business.city || (isEt ? 'Tallinn' : 'local area');
  const s1 = business.services[0] || (isEt ? 'põhiteenus' : 'main solution');
  const s2 = business.services[1] || (isEt ? 'konsultatsioon' : 'consulting');
  const s3 = business.services[2] || (isEt ? 'tugiteenus' : 'implementation');

  if (isEt) {
    return [
      { id: 'q1', order_index: 1, question: `Millised on parimad ${ind} pakkujad linnas ${city}?`, language: 'et', intent: 'commercial', target_keyword: `${ind} ${city}` },
      { id: 'q2', order_index: 2, question: `Keda soovitatakse teenuse "${s1}" tellimiseks Eestis?`, language: 'et', intent: 'transactional', target_keyword: s1 },
      { id: 'q3', order_index: 3, question: `Top usaldusväärsed ${ind} spetsialistid piirkonnas ${city}`, language: 'et', intent: 'local', target_keyword: `usaldusväärne ${ind}` },
      { id: 'q4', order_index: 4, question: `Kust leida kvaliteetne ja taskukohane ${s2}?`, language: 'et', intent: 'commercial', target_keyword: `${s2} valik` },
      { id: 'q5', order_index: 5, question: `Millist firmat valida teenuse "${s3}" teostamiseks ja millised on hinnad?`, language: 'et', intent: 'transactional', target_keyword: s3 },
      { id: 'q6', order_index: 6, question: `Võrdle juhtivaid ${ind} ettevõtteid Baltikumis.`, language: 'et', intent: 'commercial', target_keyword: `${ind} võrdlus` },
      { id: 'q7', order_index: 7, question: `Kuidas valida õige partner valdkonnas ${ind}?`, language: 'et', intent: 'informational', target_keyword: `${ind} partneri valik` },
      { id: 'q8', order_index: 8, question: `Soovita innovaatilisi ja kiire klienditoega ${ind} lahendusi.`, language: 'et', intent: 'informational', target_keyword: `innovaatiline ${ind}` },
      { id: 'q9', order_index: 9, question: `Kas ${business.business_name} on usaldusväärne ja soovitatav valik?`, language: 'et', intent: 'commercial', target_keyword: `${business.business_name} maine` },
      { id: 'q10', order_index: 10, question: `Top 5 hinnatud ${ind} eksperti ja agentuuri asukohas ${city}`, language: 'et', intent: 'local', target_keyword: `top 5 ${ind} ${city}` },
    ];
  }

  return [
    { id: 'q1', order_index: 1, question: `What are the best ${ind} companies in ${city}?`, language: 'en', intent: 'commercial', target_keyword: `best ${ind} ${city}` },
    { id: 'q2', order_index: 2, question: `Who is recommended for ${s1}?`, language: 'en', intent: 'transactional', target_keyword: s1 },
    { id: 'q3', order_index: 3, question: `Top rated ${ind} providers known for quality in ${city}`, language: 'en', intent: 'local', target_keyword: `top rated ${ind} ${city}` },
    { id: 'q4', order_index: 4, question: `Which firm is best to hire for ${s2}?`, language: 'en', intent: 'transactional', target_keyword: `${s2} hire` },
    { id: 'q5', order_index: 5, question: `Compare the leading ${ind} providers and their key strengths`, language: 'en', intent: 'commercial', target_keyword: `${ind} comparison` },
    { id: 'q6', order_index: 6, question: `Affordable and reliable options for ${s3}`, language: 'en', intent: 'commercial', target_keyword: `affordable ${s3}` },
    { id: 'q7', order_index: 7, question: `How to choose a reputable ${ind} partner with proven results?`, language: 'en', intent: 'informational', target_keyword: `reputable ${ind}` },
    { id: 'q8', order_index: 8, question: `Who are the fastest growing innovators in ${ind}?`, language: 'en', intent: 'informational', target_keyword: `${ind} innovators` },
    { id: 'q9', order_index: 9, question: `Is ${business.business_name} a reputable choice for ${ind}?`, language: 'en', intent: 'commercial', target_keyword: `${business.business_name} reputation` },
    { id: 'q10', order_index: 10, question: `Top 5 recommended ${ind} experts serving ${city}`, language: 'en', intent: 'local', target_keyword: `top 5 ${ind} ${city}` },
  ];
}

/**
 * Generates exactly 10 realistic customer buyer questions.
 * Enforces anti-repetition rules: business name is NOT included in every query.
 */
export async function generate10CustomerQuestions(
  business: ExtractedBusinessData,
  lang: SupportedLanguage
): Promise<GeneratedQuestionItem[]> {
  const fallback = getFallbackQuestions(business, lang);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const isEt = lang === 'et';

    const prompt = `Generate exactly 10 realistic, high-intent customer search questions that buyers ask generative AI (ChatGPT, Gemini, Perplexity) when seeking services in this company's domain.

Business Entity:
- Name: "${business.business_name}"
- Industry: "${business.industry}"
- City / Location: "${business.city}"
- Services: ${business.services.join(', ')}
- Target Customers: ${business.target_customers.join(', ')}
- Language: ${isEt ? 'Estonian (eesti keel)' : 'English'}

CRITICAL RULES:
1. Exactly 10 questions.
2. All questions MUST be in ${isEt ? 'Estonian' : 'English'}.
3. DO NOT include the business name "${business.business_name}" in every query! Include it in AT MOST ONE reputation query (e.g. query #9). The other 9 queries must be natural unbranded customer queries (e.g. "Best [industry] in [city]", "Who to hire for [service]").
4. Mix of intents:
   - 3 Commercial queries seeking best providers/companies.
   - 3 Transactional recommendation queries for specific services.
   - 2 Comparison or selection criteria queries.
   - 1 Local provider query for ${business.city}.
   - 1 Direct reputation query for "${business.business_name}".

Format strictly as JSON array of 10 objects:
[
  {
    "order_index": 1,
    "question": "Natural customer query string",
    "intent": "commercial" | "transactional" | "informational" | "local",
    "target_keyword": "keyword"
  }
]
No backticks, no markdown, raw JSON only.`;

    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = res.text?.trim() || '';
    if (text) {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validItems: GeneratedQuestionItem[] = parsed.slice(0, 10).map((item, idx) => ({
          id: `q_${idx + 1}`,
          order_index: idx + 1,
          question: item.question || fallback[idx]?.question || 'Recommended provider query',
          language: isEt ? 'et' : 'en',
          intent: item.intent || fallback[idx]?.intent || 'commercial',
          target_keyword: item.target_keyword || business.industry,
        }));

        // Guarantee exactly 10 questions by filling any deficit from deterministic fallback
        while (validItems.length < 10) {
          const nextIdx = validItems.length;
          const fallbackItem = fallback[nextIdx];
          validItems.push({
            id: `q_${nextIdx + 1}`,
            order_index: nextIdx + 1,
            question: fallbackItem.question,
            language: isEt ? 'et' : 'en',
            intent: fallbackItem.intent,
            target_keyword: fallbackItem.target_keyword,
          });
        }

        return validItems;
      }
    }
  } catch (err) {
    console.warn('[Question Generator] AI generation failed, using fallback:', err);
  }

  return fallback;
}
