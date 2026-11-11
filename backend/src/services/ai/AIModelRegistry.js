export const AIModelRegistry = {
  gemini: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.1-flash', 'gemini-2.5-flash'],
  grok: ['grok-2-latest', 'grok-2', 'grok-beta'],
  openai: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'],
  openrouter: ['meta-llama/llama-3.1-8b-instruct:free', 'openai/gpt-4o-mini'],
};

export const getModelsForProvider = (providerName) => AIModelRegistry[providerName] || [];
