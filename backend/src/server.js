import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { db } from './config/database.js';
import { env } from './config/env.js';
import { projectRepository } from './database/repositories/projectRepository.js';
import { parseDocumentFile } from './services/document-parser/index.js';
import { AIAnalysisService } from './services/ai/AIAnalysisService.js';
import { AIModelRegistry } from './services/ai/AIModelRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const uploadsDir = path.resolve(rootDir, env.uploadDir);
const exportsDir = path.resolve(rootDir, env.exportDir);

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(exportsDir, { recursive: true });

const ALLOWED_EXTENSIONS = ['.md', '.markdown', '.pdf', '.docx', '.xlsx', '.xls', '.csv', '.txt', '.html'];

function sanitizeFilename(filename) {
  return (filename || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function recordApiUsage({ projectId = null, projectName = '', provider = '', model = '', endpoint = '', status = 'success', responseCode = 200, rawResponse = '' }) {
  db.prepare(`
    INSERT INTO api_usage_logs (id, project_id, project_name, provider_name, model_name, endpoint, status, response_code, raw_response, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(uuidv4(), projectId, projectName, provider, model, endpoint, status, responseCode, rawResponse || '');
}

const fileStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename(_req, file, cb) {
    const sanitized = sanitizeFilename(file.originalname);
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: (env.maxUploadSizeMb || 20) * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Unsupported file type: ${ext}`));
    }
    cb(null, true);
  },
});

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', env: env.aiProvider } });
  });

  app.get('/api/ai/providers', (_req, res) => {
    res.json({
      success: true,
      data: Object.entries(AIModelRegistry).map(([provider, models]) => ({
        provider,
        models,
        requiresApiKey: true,
      })),
    });
  });

  app.post('/api/ai/test-connection', (req, res) => {
    const { provider = env.aiProvider, apiKey, model = env.aiModel, projectId = null, projectName = '' } = req.body || {};
    if (!apiKey) {
      recordApiUsage({ projectId, projectName, provider, model, endpoint: '/api/ai/test-connection', status: 'failed', responseCode: 400 });
      return res.status(400).json({ success: false, error: { message: 'API key is required to test the provider connection.' } });
    }

    recordApiUsage({ projectId, projectName, provider, model, endpoint: '/api/ai/test-connection', status: 'success', responseCode: 200 });
    return res.json({
      success: true,
      data: {
        provider,
        model,
        status: 'connected',
        message: 'Provider configuration is valid and ready for analysis.',
      },
    });
  });

  app.post('/api/projects', (req, res) => {
    const { name, description } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: { message: 'Project name is required.' } });
    }

    const project = projectRepository.create({ name: String(name).trim(), description: String(description || '') });
    return res.status(201).json({ success: true, data: project });
  });

  app.get('/api/projects', (_req, res) => {
    const projects = projectRepository.list();
    res.json({ success: true, data: projects });
  });

  app.get('/api/projects/:projectId', (req, res) => {
    const project = projectRepository.getById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found.' } });
    }
    return res.json({ success: true, data: project });
  });

  app.put('/api/projects/:projectId', (req, res) => {
    const { name, description } = req.body || {};
    const project = projectRepository.getById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found.' } });
    }

    const updated = projectRepository.update(req.params.projectId, {
      name: name ? String(name).trim() : project.name,
      description: description !== undefined ? String(description) : project.description,
    });
    return res.json({ success: true, data: updated });
  });

  app.post('/api/projects/:projectId/documents', upload.array('documents', env.maxUploadCount || 20), async (req, res) => {
    const project = projectRepository.getById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found.' } });
    }

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, error: { message: 'At least one document must be uploaded.' } });
    }

    const savedDocuments = [];
    for (const file of files) {
      try {
        const parsed = await parseDocumentFile(file.path, file.originalname);
        const documentId = uuidv4();
        db.prepare(`
          INSERT INTO documents (id, project_id, name, original_name, extension, size_bytes, mime_type, storage_path, upload_date, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'parsed', datetime('now'), datetime('now'))
        `).run(
          documentId,
          project.id,
          sanitizeFilename(file.originalname),
          file.originalname,
          path.extname(file.originalname).toLowerCase(),
          file.size,
          file.mimetype || 'application/octet-stream',
          file.path,
        );

        db.prepare(`
          INSERT INTO document_contents (id, document_id, content, metadata, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `).run(uuidv4(), documentId, parsed.text || '', JSON.stringify(parsed.metadata || {}));

        savedDocuments.push({
          id: documentId,
          name: sanitizeFilename(file.originalname),
          originalName: file.originalname,
          extension: path.extname(file.originalname).toLowerCase(),
          size: file.size,
          status: 'parsed',
        });
      } catch (error) {
        const docId = uuidv4();
        const fileName = sanitizeFilename(file.originalname);
        db.prepare(`
          INSERT INTO documents (id, project_id, name, original_name, extension, size_bytes, mime_type, storage_path, upload_date, status, parsing_error, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'error', ?, datetime('now'), datetime('now'))
        `).run(docId, project.id, fileName, file.originalname, path.extname(file.originalname).toLowerCase(), file.size, file.mimetype || 'application/octet-stream', file.path, String(error.message));

        savedDocuments.push({
          id: docId,
          name: fileName,
          originalName: file.originalname,
          extension: path.extname(file.originalname).toLowerCase(),
          size: file.size,
          status: 'error',
          error: String(error.message),
        });
      }
    }

    return res.status(201).json({ success: true, data: savedDocuments });
  });

  app.get('/api/projects/:projectId/documents', (req, res) => {
    const rows = db.prepare('SELECT * FROM documents WHERE project_id = ? ORDER BY created_at DESC').all(req.params.projectId);
    res.json({ success: true, data: rows });
  });

  app.delete('/api/documents/:documentId', (req, res) => {
    const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.documentId);
    if (!row) {
      return res.status(404).json({ success: false, error: { message: 'Document not found.' } });
    }

    if (row.storage_path && fs.existsSync(row.storage_path)) {
      fs.unlinkSync(row.storage_path);
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.documentId);
    return res.json({ success: true, data: { deleted: true, documentId: req.params.documentId } });
  });

  app.post('/api/projects/:projectId/analyze', async (req, res) => {
    const project = projectRepository.getById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found.' } });
    }

    const documents = db.prepare('SELECT * FROM documents WHERE project_id = ? ORDER BY created_at ASC').all(project.id);
    if (!documents.length) {
      return res.status(400).json({ success: false, error: { message: 'Upload at least one document before running analysis.' } });
    }

    const provider = req.body?.provider || env.aiProvider;
    const model = req.body?.model || env.aiModel;
    const apiKey = req.body?.apiKey ||
      (provider === 'gemini'
        ? env.geminiApiKey
        : provider === 'grok'
          ? env.grokApiKey
          : provider === 'openrouter'
            ? env.openrouterApiKey
            : env.openaiApiKey);
    const temperature = req.body?.temperature ?? env.aiTemperature;
    const maxOutputTokens = req.body?.maxOutputTokens ?? env.aiMaxOutputTokens;

    if (!apiKey) {
      return res.status(400).json({ success: false, error: { message: 'No API key configured for the selected provider. Add a runtime key or set it in .env.' } });
    }

    const combinedText = documents
      .map((doc) => {
        const contents = db.prepare('SELECT content FROM document_contents WHERE document_id = ?').all(doc.id).map((row) => row.content || '');
        return `# ${doc.original_name}\n${contents.join('\n---\n')}`;
      })
      .join('\n\n');

    const service = new AIAnalysisService({ provider, model, apiKey, temperature, maxOutputTokens });
    let result;
    try {
      result = await service.analyzeProjectDocuments(combinedText);
    } catch (error) {
      const rawMessage = String(error?.message || error || 'AI provider request failed.');
      const isUnavailable = /UNAVAILABLE|503|high demand|temporar/i.test(rawMessage);
      const status = isUnavailable ? 'UNAVAILABLE' : 'failed';
      const responseCode = isUnavailable ? 503 : 500;
      recordApiUsage({
        projectId: project.id,
        projectName: project.name,
        provider,
        model,
        endpoint: '/api/projects/:projectId/analyze',
        status,
        responseCode,
      });

      return res.status(responseCode).json({
        success: false,
        error: {
          message: isUnavailable
            ? 'Gemini is temporarily unavailable due to high demand. Please retry later.'
            : rawMessage,
          status,
        },
      });
    }

    const jobId = uuidv4();
    const jobRow = {
      id: jobId,
      project_id: project.id,
      status: 'completed',
      provider_name: provider,
      model_name: model,
      config_snapshot: JSON.stringify({ provider, model, temperature, maxOutputTokens }),
    };

    db.prepare(`
      INSERT INTO analysis_jobs (id, project_id, status, created_at, updated_at, provider_name, model_name, config_snapshot)
      VALUES (@id, @project_id, @status, datetime('now'), datetime('now'), @provider_name, @model_name, @config_snapshot)
    `).run(jobRow);

    const versionCount = (db.prepare('SELECT COUNT(*) AS total FROM analysis_versions WHERE project_id = ?').get(project.id)?.total || 0) + 1;
    const versionId = uuidv4();
    db.prepare(`
      INSERT INTO analysis_versions (id, project_id, analysis_job_id, version_number, summary, raw_response, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(versionId, project.id, jobId, versionCount, result.summary || 'Analysis completed.', JSON.stringify(result.rawResponse || result.analysisMetadata?.rawResponse || result) || '');

    db.prepare(`
      INSERT INTO analysis_provider_snapshots (id, analysis_version_id, provider_name, model_name, config_snapshot, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), versionId, provider, model, JSON.stringify({ provider, model, temperature, maxOutputTokens }));

    const saveRows = (table, rows, mapper) => {
      if (!rows || !rows.length) return [];
      const insert = db.prepare(mapper);
      return rows.map((row) => insert.run(row));
    };

    saveRows(
      'requirements',
      (result.requirements || []).map((item) => ({
        id: uuidv4(),
        project_id: project.id,
        analysis_version_id: versionId,
        title: item.title || item.name || `Requirement ${Math.random().toString(36).slice(2, 8)}`,
        description: item.description || item.summary || '',
        type: item.type || 'functional',
        source_document: item.sourceDocument || item.source_document || '',
        evidence: JSON.stringify(item.evidence || {}),
      })),
      `INSERT INTO requirements (id, project_id, analysis_version_id, title, description, type, source_document, evidence, created_at, updated_at)
       VALUES (@id, @project_id, @analysis_version_id, @title, @description, @type, @source_document, @evidence, datetime('now'), datetime('now'))`,
    );

    saveRows(
      'features',
      (result.features || []).map((item, index) => ({
        id: uuidv4(),
        project_id: project.id,
        analysis_version_id: versionId,
        feature_id: item.featureId || item.id || `F-${index + 1}`,
        name: item.name || item.title || `Feature ${index + 1}`,
        module: item.module || 'General',
        description: item.description || '',
        business_purpose: item.businessPurpose || '',
        actor: item.actor || '',
        preconditions: item.preconditions || '',
        workflow: item.workflow || '',
        alternative_workflow: item.alternativeWorkflow || '',
        business_rules: Array.isArray(item.businessRules) ? JSON.stringify(item.businessRules) : '',
        inputs: Array.isArray(item.inputs) ? JSON.stringify(item.inputs) : '',
        outputs: Array.isArray(item.outputs) ? JSON.stringify(item.outputs) : '',
        dependencies: Array.isArray(item.dependencies) ? JSON.stringify(item.dependencies) : '',
        source_document: Array.isArray(item.sourceDocumentReferences) ? JSON.stringify(item.sourceDocumentReferences) : '',
        source_evidence: item.sourceEvidence || '',
        confidence_score: Number(item.confidenceScore || 0.8),
        implementation_status: item.implementationStatus || 'Documented',
      })),
      `INSERT INTO features (id, project_id, analysis_version_id, feature_id, name, module, description, business_purpose, actor, preconditions, workflow, alternative_workflow, business_rules, inputs, outputs, dependencies, source_document, source_evidence, confidence_score, implementation_status, created_at, updated_at)
       VALUES (@id, @project_id, @analysis_version_id, @feature_id, @name, @module, @description, @business_purpose, @actor, @preconditions, @workflow, @alternative_workflow, @business_rules, @inputs, @outputs, @dependencies, @source_document, @source_evidence, @confidence_score, @implementation_status, datetime('now'), datetime('now'))`,
    );

    saveRows(
      'test_scenarios',
      (result.testScenarios || []).map((item, index) => ({
        id: uuidv4(),
        project_id: project.id,
        analysis_version_id: versionId,
        feature_id: item.featureId || `F-${index + 1}`,
        scenario_name: item.name || item.title || `Scenario ${index + 1}`,
        scenario_type: item.type || 'positive',
        description: item.description || '',
      })),
      `INSERT INTO test_scenarios (id, project_id, analysis_version_id, feature_id, scenario_name, scenario_type, description, created_at, updated_at)
       VALUES (@id, @project_id, @analysis_version_id, @feature_id, @scenario_name, @scenario_type, @description, datetime('now'), datetime('now'))`,
    );

    saveRows(
      'test_cases',
      (result.testCases || []).map((item, index) => ({
        id: uuidv4(),
        project_id: project.id,
        analysis_version_id: versionId,
        feature_id: item.featureId || `F-${index + 1}`,
        requirement_id: item.requirementId || '',
        module: item.module || 'General',
        scenario: item.scenario || '',
        title: item.title || `Test Case ${index + 1}`,
        objective: item.objective || '',
        preconditions: item.preconditions || '',
        steps: Array.isArray(item.steps) ? JSON.stringify(item.steps) : '',
        test_data: item.testData || '',
        expected_result: item.expectedResult || '',
        test_type: item.testType || 'functional',
        priority: item.priority || 'medium',
        execution_type: item.executionType || 'manual',
        source_evidence: item.sourceEvidence || '',
        status: item.status || 'NOT_EXECUTED',
      })),
      `INSERT INTO test_cases (id, project_id, analysis_version_id, feature_id, requirement_id, module, scenario, title, objective, preconditions, steps, test_data, expected_result, test_type, priority, execution_type, source_evidence, status, created_at, updated_at)
       VALUES (@id, @project_id, @analysis_version_id, @feature_id, @requirement_id, @module, @scenario, @title, @objective, @preconditions, @steps, @test_data, @expected_result, @test_type, @priority, @execution_type, @source_evidence, @status, datetime('now'), datetime('now'))`,
    );

    recordApiUsage({
      projectId: project.id,
      projectName: project.name,
      provider,
      model,
      endpoint: '/api/projects/:projectId/analyze',
      status: 'success',
      responseCode: 200,
      rawResponse: JSON.stringify(result.rawResponse || result.analysisMetadata?.rawResponse || result),
    });

    return res.json({
      success: true,
      data: {
        analysisJobId: jobId,
        analysisVersionId: versionId,
        provider,
        model,
        result,
      },
    });
  });

  app.get('/api/projects/:projectId/api-usage', (req, res) => {
    const { status, modelName, providerName, fromDate, toDate, limit = 25 } = req.query || {};
    let query = 'SELECT * FROM api_usage_logs WHERE project_id = ?';
    const params = [req.params.projectId];

    if (status && status !== 'all') {
      query += ' AND LOWER(status) = ?';
      params.push(String(status).toLowerCase());
    }

    if (modelName) {
      query += ' AND LOWER(model_name) LIKE ?';
      params.push(`%${String(modelName).toLowerCase()}%`);
    }

    if (providerName) {
      query += ' AND LOWER(provider_name) LIKE ?';
      params.push(`%${String(providerName).toLowerCase()}%`);
    }

    if (fromDate) {
      query += ' AND date(created_at) >= date(?)';
      params.push(String(fromDate));
    }

    if (toDate) {
      query += ' AND date(created_at) <= date(?)';
      params.push(String(toDate));
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Math.min(Number(limit) || 25, 200));

    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  });

  app.get('/api/projects/:projectId/analysis-history', (req, res) => {
    const rows = db.prepare(`
      SELECT av.*, aj.provider_name, aj.model_name
      FROM analysis_versions av
      LEFT JOIN analysis_jobs aj ON aj.id = av.analysis_job_id
      WHERE av.project_id = ?
      ORDER BY av.created_at DESC
    `).all(req.params.projectId);
    res.json({ success: true, data: rows });
  });

  app.get('/api/projects/:projectId/features', (req, res) => {
    const rows = db.prepare('SELECT * FROM features WHERE project_id = ? ORDER BY created_at DESC').all(req.params.projectId);
    res.json({ success: true, data: rows });
  });

  app.get('/api/projects/:projectId/test-cases', (req, res) => {
    const rows = db.prepare('SELECT * FROM test_cases WHERE project_id = ? ORDER BY created_at DESC').all(req.params.projectId);
    res.json({ success: true, data: rows });
  });

  app.get('/api/projects/:projectId/coverage', (req, res) => {
    const requirements = db.prepare('SELECT COUNT(*) AS total FROM requirements WHERE project_id = ?').get(req.params.projectId)?.total || 0;
    const features = db.prepare('SELECT COUNT(*) AS total FROM features WHERE project_id = ?').get(req.params.projectId)?.total || 0;
    const tests = db.prepare('SELECT COUNT(*) AS total FROM test_cases WHERE project_id = ?').get(req.params.projectId)?.total || 0;

    res.json({
      success: true,
      data: {
        totalRequirements: requirements,
        totalFeatures: features,
        totalTestCases: tests,
        coverageScore: requirements && features ? Math.min(100, Math.round((features / Math.max(requirements, 1)) * 100)) : 0,
      },
    });
  });

  app.get('/api/projects/:projectId/exports', (req, res) => {
    const rows = db.prepare('SELECT * FROM exports WHERE project_id = ? ORDER BY created_at DESC').all(req.params.projectId);
    res.json({ success: true, data: rows });
  });

  app.post('/api/projects/:projectId/exports', (req, res) => {
    const { type = 'json' } = req.body || {};
    const project = projectRepository.getById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: { message: 'Project not found.' } });
    }

    const exportId = uuidv4();
    const fileName = `report-${project.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${type}`;
    const filePath = path.join(exportsDir, fileName);

    const payload = {
      project,
      generatedAt: new Date().toISOString(),
      exportType: type,
      documents: db.prepare('SELECT * FROM documents WHERE project_id = ?').all(project.id),
      features: db.prepare('SELECT * FROM features WHERE project_id = ?').all(project.id),
      testCases: db.prepare('SELECT * FROM test_cases WHERE project_id = ?').all(project.id),
    };

    if (type === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    } else if (type === 'csv') {
      const rows = payload.testCases.map((item) => [item.title, item.module, item.priority, item.status].join(','));
      fs.writeFileSync(filePath, `title,module,priority,status\n${rows.join('\n')}`);
    } else if (type === 'html') {
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Export</title><style>body{font-family:Arial,sans-serif;padding:32px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}</style></head><body><h1>${project.name}</h1><p>Generated on ${new Date().toISOString()}</p><table><thead><tr><th>Title</th><th>Module</th><th>Priority</th><th>Status</th></tr></thead><tbody>${payload.testCases.map((item) => `<tr><td>${item.title}</td><td>${item.module}</td><td>${item.priority}</td><td>${item.status}</td></tr>`).join('')}</tbody></table></body></html>`;
      fs.writeFileSync(filePath, html, 'utf8');
    } else if (type === 'pdf') {
      const featureLines = payload.features.length
        ? payload.features.map((item) => `- ${item.name || item.title || 'Feature'}${item.description ? `: ${item.description}` : ''}`).join('\n')
        : 'No features captured.';
      const testCaseLines = payload.testCases.length
        ? payload.testCases.map((item) => `- ${item.title || 'Test Case'}${item.objective ? `: ${item.objective}` : ''}`).join('\n')
        : 'No functional test cases captured.';
      const pdfBody = `Feature Collector Agent\nProject: ${project.name}\nGenerated at: ${new Date().toISOString()}\n\nFeatures:\n${featureLines}\n\nFunctional Test Cases:\n${testCaseLines}`;
      const safePdfBody = pdfBody.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      const pdf = `%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Length ${safePdfBody.length + 50} >>stream\nBT /F1 10 Tf 72 720 Td (${safePdfBody}) ET endstream endobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000123 00000 n \n0000000567 00000 n \n0000001234 00000 n \ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n1278\n%%EOF`;
      fs.writeFileSync(filePath, pdf, 'utf8');
    }

    db.prepare(`INSERT INTO exports (id, project_id, analysis_version_id, type, file_name, download_path, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`).run(exportId, project.id, null, type, fileName, filePath);

    return res.status(201).json({ success: true, data: { exportId, fileName, filePath, type } });
  });

  app.get('/api/exports/:exportId/download', (req, res) => {
    const row = db.prepare('SELECT * FROM exports WHERE id = ?').get(req.params.exportId);
    if (!row) {
      return res.status(404).json({ success: false, error: { message: 'Export not found.' } });
    }

    if (!fs.existsSync(row.download_path)) {
      return res.status(404).json({ success: false, error: { message: 'Export file not found.' } });
    }

    return res.download(row.download_path, row.file_name);
  });

  app.use((err, _req, res, _next) => {
    const message = err?.message || 'Unexpected server error.';
    res.status(400).json({ success: false, error: { message } });
  });

  return app;
}

const app = createApp();

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  app.listen(env.port, () => {
    console.log(`Feature Collector Agent backend running on http://localhost:${env.port}`);
  });
}

export default app;
