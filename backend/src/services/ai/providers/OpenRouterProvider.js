import { AIProvider } from '../AIProvider.js';

export class OpenRouterProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'openrouter';
    this.apiKey = config.apiKey || '';
  }

  async callModel(payload) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is missing. Add it in the AI configuration panel or .env.');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Feature Collector Agent',
      },
      body: JSON.stringify({
        model: this.config.model || 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
        temperature: this.config.temperature || 0.2,
        max_tokens: this.config.maxOutputTokens || 8192,
      }),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`OpenRouter API request failed: ${errorMessage}`);
    }

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content || '{}';
    return this.parseStructuredResponse(text);
  }

  async analyzeDocument(documentText) {
    return this.callModel({ task: 'document_classification_and_requirements', documentText });
  }

  async extractFeatures(documentText) {
    return this.callModel({ task: 'extract_features', documentText });
  }

  async generateTestScenarios(documentText) {
    return this.callModel({ task: 'generate_test_scenarios', documentText });
  }

  async generateTestCases(documentText) {
    return this.callModel({ task: 'generate_test_cases', documentText });
  }

  async analyzeCoverage(documentText) {
    return this.callModel({ task: 'coverage_gap_analysis', documentText });
  }

  async reviewResults(documentText) {
    return this.callModel({ task: 'quality_review', documentText });
  }
}
