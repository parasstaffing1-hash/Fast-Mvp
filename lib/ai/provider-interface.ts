import { extractCitationsFromText } from './providers';
import { executeOpenAICheck, executeGeminiCheck, executeGoogleSearchCheck, EngineObservation } from './engines';

export interface ProviderAnswerResult extends EngineObservation {}

export interface AIProvider {
  getProviderName(): 'openai' | 'gemini' | 'google_search';
  getModelName(): string;
  generateAnswer(
    question: string,
    context?: { businessName?: string; targetDomain?: string }
  ): Promise<ProviderAnswerResult>;
  extractSources(text: string): Array<{ title?: string; url: string; domain: string }>;
}

export class OpenAIProvider implements AIProvider {
  getProviderName(): 'openai' {
    return 'openai';
  }

  getModelName(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async generateAnswer(
    question: string,
    context?: { businessName?: string }
  ): Promise<ProviderAnswerResult> {
    return await executeOpenAICheck(question, context?.businessName || '');
  }

  extractSources(text: string): Array<{ title?: string; url: string; domain: string }> {
    return extractCitationsFromText(text);
  }
}

export class GeminiProvider implements AIProvider {
  getProviderName(): 'gemini' {
    return 'gemini';
  }

  getModelName(): string {
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  async generateAnswer(
    question: string,
    context?: { businessName?: string }
  ): Promise<ProviderAnswerResult> {
    return await executeGeminiCheck(question, context?.businessName || '');
  }

  extractSources(text: string): Array<{ title?: string; url: string; domain: string }> {
    return extractCitationsFromText(text);
  }
}

export class GoogleSearchProvider implements AIProvider {
  getProviderName(): 'google_search' {
    return 'google_search';
  }

  getModelName(): string {
    return 'Google Search Visibility';
  }

  async generateAnswer(
    question: string,
    context?: { businessName?: string; targetDomain?: string }
  ): Promise<ProviderAnswerResult> {
    return await executeGoogleSearchCheck(
      question,
      context?.targetDomain || '',
      context?.businessName || ''
    );
  }

  extractSources(text: string): Array<{ title?: string; url: string; domain: string }> {
    return extractCitationsFromText(text);
  }
}

// Registry / Factory
export const defaultProviders: Record<'openai' | 'gemini' | 'google_search', AIProvider> = {
  openai: new OpenAIProvider(),
  gemini: new GeminiProvider(),
  google_search: new GoogleSearchProvider(),
};
