import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url) => {
      if (String(url).includes('/api/projects')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });
      }

      if (String(url).includes('/api/ai/providers')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [{ provider: 'gemini', models: ['gemini-3.8-flash'] }] }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) });
    }),
  );
});

describe('App', () => {
  it('renders the dashboard heading', async () => {
    render(<App />);
    expect(await screen.findByText(/QA Analysis Dashboard/i)).toBeInTheDocument();
  });
});
