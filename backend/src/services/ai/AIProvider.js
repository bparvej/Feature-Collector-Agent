export class AIProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async analyzeDocument() {
    throw new Error('analyzeDocument must be implemented by the provider.');
  }

  async extractFeatures() {
    throw new Error('extractFeatures must be implemented by the provider.');
  }

  async generateTestScenarios() {
    throw new Error('generateTestScenarios must be implemented by the provider.');
  }

  async generateTestCases() {
    throw new Error('generateTestCases must be implemented by the provider.');
  }

  async analyzeCoverage() {
    throw new Error('analyzeCoverage must be implemented by the provider.');
  }

  async reviewResults() {
    throw new Error('reviewResults must be implemented by the provider.');
  }
}
