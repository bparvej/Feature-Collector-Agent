import dotenv from 'dotenv';

dotenv.config({ path: process.cwd() + '/.env' });

export const env = {
  port: Number(process.env.PORT || 4000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  aiModel: process.env.AI_MODEL || 'gemini-3.8-flash',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  grokApiKey: process.env.GROK_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  aiTemperature: Number(process.env.AI_TEMPERATURE || 0.2),
  aiMaxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || 8192),
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 20),
  maxUploadCount: Number(process.env.MAX_UPLOAD_COUNT || 20),
  dbPath: process.env.DB_PATH || './storage/database/feature-collector.db',
  uploadDir: process.env.UPLOAD_DIR || './storage/uploads',
  exportDir: process.env.EXPORT_DIR || './storage/exports',
  logLevel: process.env.LOG_LEVEL || 'info',
};
