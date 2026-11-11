import { GeminiProvider } from './providers/GeminiProvider.js';
import { GrokProvider } from './providers/GrokProvider.js';
import { OpenAIProvider } from './providers/OpenAIProvider.js';

export class AIProviderFactory {
  static create(providerName, config = {}) {
    switch (providerName) {
      case 'gemini':
        return new GeminiProvider(config);
      case 'grok':
        return new GrokProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      default:
        throw new Error(`Unsupported AI provider: ${providerName}`);
    }
  }
}
