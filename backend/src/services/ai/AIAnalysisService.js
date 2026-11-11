import { validateAnalysisResult } from '../../validators/analysisSchema.js';
import { AIProviderFactory } from './AIProviderFactory.js';

export class AIAnalysisService {
  constructor({ provider, model, apiKey, temperature, maxOutputTokens }) {
    this.provider = provider;
    this.model = model;
    this.apiKey = apiKey;
    this.temperature = temperature;
    this.maxOutputTokens = maxOutputTokens;
  }

  async analyzeProjectDocuments(documentText) {
    const providerClass = AIProviderFactory.create(this.provider, {
      apiKey: this.apiKey,
      model: this.model,
      temperature: this.temperature,
      maxOutputTokens: this.maxOutputTokens,
    });

    const classification = await providerClass.analyzeDocument(documentText);
    const features = await providerClass.extractFeatures(documentText);
    const scenarios = await providerClass.generateTestScenarios(documentText);
    const testCases = await providerClass.generateTestCases(documentText);
    const coverage = await providerClass.analyzeCoverage(documentText);
    const review = await providerClass.reviewResults(documentText);

    const result = {
      projectName: 'Generated Project',
      summary: review.summary || 'Analysis completed successfully.',
      requirements: classification.requirements || [],
      features: features.features || [],
      businessRules: features.businessRules || [],
      testScenarios: scenarios.scenarios || [],
      testCases: testCases.testCases || [],
      coverage: coverage.coverage || {},
      gaps: coverage.gaps || [],
      analysisMetadata: {
        provider: this.provider,
        model: this.model,
        reviewed: true,
      },
    };

    validateAnalysisResult(result);
    return result;
  }
}
