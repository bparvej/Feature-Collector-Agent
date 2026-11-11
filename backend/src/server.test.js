import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './server.js';
import { OpenRouterProvider } from './services/ai/providers/OpenRouterProvider.js';

const app = createApp();

describe('Feature Collector Agent API', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('creates a project and lists projects', async () => {
    const create = await request(app).post('/api/projects').send({ name: 'Test Project', description: 'Example' });
    expect(create.status).toBe(201);
    expect(create.body.success).toBe(true);

    const list = await request(app).get('/api/projects');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);
  });

  it('lists AI providers', async () => {
    const response = await request(app).get('/api/ai/providers');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('parses OpenRouter responses that include narrative text around JSON', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: 'Based on the requirements, here is the result.\n```json\n{"summary":"ok","requirements":["signup"]}\n```',
          },
        }],
      }),
    });

    const provider = new OpenRouterProvider({ apiKey: 'test-key', model: 'meta-llama/llama-3.1-8b-instruct:free' });
    const result = await provider.reviewResults('Project description');

    expect(result.summary).toBe('ok');
    expect(result.requirements).toEqual(['signup']);
  });

  it('keeps full plain-text model responses when no JSON is returned', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '### Document Classification\n**Document Type:** README\n**Project Name:** Ummah Connect\n### Requirements\n1. Project Overview',
          },
        }],
      }),
    });

    const provider = new OpenRouterProvider({ apiKey: 'test-key', model: 'openai/gpt-4o-mini' });
    const result = await provider.reviewResults('Project description');

    expect(result.rawResponse).toContain('Document Classification');
    expect(result.summary).toContain('Document Type');
    expect(Array.isArray(result.requirements)).toBe(true);
  });

  it('extracts feature and functional test case lists from plain-text model output', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '## Features\n- User login\n- Profile update\n\n## Functional Test Cases\n1. Login with valid credentials\n2. Reject invalid password\n3. Update profile bio',
          },
        }],
      }),
    });

    const provider = new OpenRouterProvider({ apiKey: 'test-key', model: 'openai/gpt-4o-mini' });
    const features = await provider.extractFeatures('Project description');
    const testCases = await provider.generateTestCases('Project description');

    expect(features.features.length).toBeGreaterThan(0);
    expect(testCases.testCases.length).toBeGreaterThan(0);
    expect(features.features[0].name).toMatch(/login/i);
    expect(testCases.testCases[0].title).toMatch(/login/i);
  });
});
