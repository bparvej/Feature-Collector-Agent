export class AIProvider {
  constructor(config = {}) {
    this.config = config;
  }

  parseListSection(rawText, sectionNames, { asObjects = false } = {}) {
    const sectionPattern = new RegExp(`(?:^|\\n)#+\\s*(?:${sectionNames.join('|')})\\s*[:\n]+([\\s\\S]*?)(?=\\n#+\\s*(?:${sectionNames.join('|')}|requirements?|business rules?|coverage|gaps?|functional test cases?|test cases?|scenarios?)\\b|$)`, 'i');
    const match = rawText.match(sectionPattern);
    const section = match ? match[1] : rawText;
    const items = section
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
      .filter((line) => line && line.length > 2)
      .filter((line) => !/^(features?|requirements?|business rules?|functional test cases?|test cases?|scenarios?|coverage|gaps?)\b/i.test(line));

    if (!asObjects) {
      return items;
    }

    return items.map((item) => {
      const normalized = item.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      if (!normalized) return null;
      const name = normalized.split(/[:\-–—]/)[0].trim();
      return {
        name: name || normalized,
        description: normalized.length > name.length ? normalized.slice(name.length).replace(/^[:\-–—\s]+/, '') : '',
      };
    }).filter(Boolean);
  }

  parseStructuredResponse(content) {
    if (!content) {
      return { summary: '', requirements: [], features: [], businessRules: [], testScenarios: [], testCases: [], coverage: {}, gaps: [], rawResponse: '' };
    }

    if (typeof content === 'object') {
      return { ...content, rawResponse: content.rawResponse || JSON.stringify(content) };
    }

    const raw = String(content).trim();
    const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fencedMatch ? fencedMatch[1].trim() : raw;
    const jsonMatch = candidate.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const normalized = jsonMatch ? jsonMatch[1] : candidate;

    try {
      const parsed = JSON.parse(normalized);
      if (parsed && typeof parsed === 'object') {
        return { ...parsed, rawResponse: raw };
      }
      return { summary: raw.slice(0, 200), requirements: [], features: [], businessRules: [], testScenarios: [], testCases: [], coverage: {}, gaps: [], rawResponse: raw };
    } catch (error) {
      const lines = raw
        .split(/\n+/)
        .map((line) => line.replace(/^\s*[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
        .filter((line) => line && line.length > 2);

      const summaryLine = lines.find((line) => !/^#+/.test(line) && !/requirements|features|test cases|scenarios|business rules|coverage|gaps/i.test(line)) || lines[0] || 'Analysis completed.';
      const requirements = this.parseListSection(raw, ['requirements?', 'requirement', 'goals?', 'objectives?']);
      const featureEntries = this.parseListSection(raw, ['features?', 'capabilities?', 'user stories?'], { asObjects: true });
      const businessRules = this.parseListSection(raw, ['business rules?'], { asObjects: false });
      const testCaseEntries = this.parseListSection(raw, ['functional test cases?', 'test cases?', 'test case'], { asObjects: false }).map((item) => ({
        title: item.split(/[:\-–—]/)[0].trim() || item,
        objective: item,
        preconditions: '',
        steps: [],
        expectedResult: '',
      }));

      const featureList = featureEntries.length ? featureEntries : (requirements.length ? requirements.map((item) => ({ name: item, description: item })) : []);

      return {
        summary: summaryLine.replace(/^#+\s*/, '').trim(),
        requirements: requirements.length ? requirements : [raw.slice(0, 200)],
        features: featureList,
        businessRules,
        testScenarios: [],
        testCases: testCaseEntries.length ? testCaseEntries : [{ title: 'Functional verification', objective: raw.slice(0, 200), preconditions: '', steps: [], expectedResult: 'Verify the documented behavior is working as expected.' }],
        coverage: {},
        gaps: [],
        rawResponse: raw,
      };
    }
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
