export const analysisResultSchema = {
  type: 'object',
  required: ['projectName', 'summary', 'requirements', 'features', 'testScenarios', 'testCases'],
  properties: {
    projectName: { type: 'string' },
    summary: { type: 'string' },
    requirements: { type: 'array' },
    features: { type: 'array' },
    businessRules: { type: 'array' },
    testScenarios: { type: 'array' },
    testCases: { type: 'array' },
    coverage: { type: 'object' },
    gaps: { type: 'array' },
    analysisMetadata: { type: 'object' },
  },
  additionalProperties: true,
};

export const validateAnalysisResult = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('AI response is not a valid JSON object.');
  }

  const missing = analysisResultSchema.required.filter((field) => !Object.prototype.hasOwnProperty.call(payload, field));
  if (missing.length) {
    throw new Error(`AI output missing required fields: ${missing.join(', ')}`);
  }

  if (!Array.isArray(payload.requirements) || !Array.isArray(payload.features) || !Array.isArray(payload.testCases)) {
    throw new Error('AI output does not contain array-based results.');
  }

  return true;
};
