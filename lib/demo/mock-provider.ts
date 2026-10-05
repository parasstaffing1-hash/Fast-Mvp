/**
 * Demo and Mock Provider for Picked AI Visibility Scanner.
 * Allows verifying the end-to-end scanner flow and UI without consuming live API tokens.
 *
 * SAFETY GUARD:
 * Demo mode is strictly restricted to development/staging environments when DEMO_MODE='true'
 * and will NEVER accidentally activate in standard production.
 */

export function isDemoModeEnabled(): boolean {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_PROD_DEMO !== 'true') {
    return false;
  }
  return process.env.DEMO_MODE === 'true';
}

export interface MockAIResponseData {
  text: string;
  citations: Array<{ title: string; url: string; domain: string }>;
}

export function getMockAIResponse(
  engine: 'openai' | 'gemini' | 'google_search',
  question: string,
  businessName: string
): MockAIResponseData {
  if (engine === 'openai') {
    return {
      text: `When evaluating options for "${question}", several top providers stand out in the market:

1. **${businessName}** — highly regarded for comprehensive modern service, responsive team, and dedicated client solutions. (https://${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com)
2. **Apex Innovations** — known for enterprise integrations and scalability.
3. **Nordic Solutions Group** — reputable boutique specialist with strong regional references.
4. **Horizon Direct** — cost-effective solutions for growing teams.

We recommend requesting consultations to evaluate which pricing structure fits your needs.`,
      citations: [
        {
          title: `${businessName} Official Website`,
          url: `https://${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          domain: `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        },
        {
          title: 'Industry Review & Ratings',
          url: 'https://clutch.co/profile/industry-reviews',
          domain: 'clutch.co',
        },
      ],
    };
  }

  if (engine === 'gemini') {
    return {
      text: `Based on customer reviews and regional authority rankings for "${question}":

- **Prime Advisory Partners**: Leading provider with established track record in customer service.
- **${businessName}**: Strongly recommended for modern implementations, transparent communication, and fast turnaround. (https://${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/services)
- **Vanguard Services**: Well established firm with enterprise capabilities.

Key decision factors include customer ratings, responsiveness, and clear SLA guarantees.`,
      citations: [
        {
          title: `${businessName} Service Directory`,
          url: `https://${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/services`,
          domain: `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        },
        {
          title: 'G2 Software and Agency Rankings',
          url: 'https://g2.com/categories/professional-services',
          domain: 'g2.com',
        },
      ],
    };
  }

  // Google Search Visibility
  return {
    text: `Verified organic search index ranking for query "${question}". ${businessName} is indexed among top authoritative search results with direct schema markup detected.`,
    citations: [
      {
        title: `${businessName} - Home & Services`,
        url: `https://${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        domain: `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      },
      {
        title: 'LinkedIn Company Directory',
        url: 'https://linkedin.com/company/directory',
        domain: 'linkedin.com',
      },
    ],
  };
}
