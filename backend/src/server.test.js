import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './server.js';

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
});
