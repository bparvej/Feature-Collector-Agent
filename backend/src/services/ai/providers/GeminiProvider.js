import { AIProvider } from '../AIProvider.js';

export class GeminiProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'gemini';
    this.apiKey = config.apiKey || '';
  }

  async callModel(payload) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is missing. Add it in the AI configuration panel or .env.');
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + (this.config.model || 'gemini-3.5-flash-lite') + ':generateContent?key=' + this.apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: JSON.stringify(payload) }] }],
        generationConfig: {
          temperature: this.config.temperature || 0.2,
          maxOutputTokens: this.config.maxOutputTokens || 8192,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API request failed: ${error}`);
    }

    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '{}';
    return this.parseStructuredResponse(text);
  }

  async analyzeDocument(documentText) {
    return this.callModel({
      task: 'document_classification_and_requirements',
      documentText,
    });
  }

  async extractFeatures(documentText) {
    return this.callModel({
      task: 'extract_features',
      documentText,
    });
  }

  async generateTestScenarios(documentText) {
    return this.callModel({
      task: 'generate_test_scenarios',
      documentText,
    });
  }

  async generateTestCases(documentText) {
    return this.callModel({
      task: 'generate_test_cases',
      documentText,
    });
  }

  async analyzeCoverage(documentText) {
    return this.callModel({
      task: 'coverage_gap_analysis',
      documentText,
    });
  }

  async reviewResults(documentText) {
    return this.callModel({
      task: 'quality_review',
      documentText,
    });
  }
}
