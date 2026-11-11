import { AIProvider } from '../AIProvider.js';

export class OpenAIProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'openai';
    this.apiKey = config.apiKey || '';
  }

  async callModel(payload) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is missing. Add it in the AI configuration panel or .env.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
        temperature: this.config.temperature || 0.2,
        max_tokens: this.config.maxOutputTokens || 8192,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${await response.text()}`);
    }

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content || '{}';
    return JSON.parse(text);
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
