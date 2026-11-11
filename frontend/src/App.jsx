import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Download,
  Wand2,
} from 'lucide-react';
import './App.css';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Projects', icon: <FolderOpen size={16} /> },
  { label: 'Documents', icon: <FileText size={16} /> },
  { label: 'Feature Inventory', icon: <Sparkles size={16} /> },
  { label: 'Coverage & Gaps', icon: <ShieldCheck size={16} /> },
  { label: 'Reports & Exports', icon: <Download size={16} /> },
  { label: 'API Logs', icon: <Activity size={16} /> },
  { label: 'AI Configuration', icon: <Wand2 size={16} /> },
];

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [features, setFeatures] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [provider, setProvider] = useState('openrouter');
  const [model, setModel] = useState('meta-llama/llama-3.1-8b-instruct:free');
  const [apiKey, setApiKey] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('Idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [providers, setProviders] = useState([]);
  const [apiUsage, setApiUsage] = useState([]);
  const [apiUsageFilters, setApiUsageFilters] = useState({
    status: 'all',
    modelName: '',
    fromDate: '',
    toDate: '',
  });
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const stats = useMemo(
    () => ({
      totalProjects: projects.length,
      totalDocuments: documents.length,
      totalFeatures: features.length,
      totalTestCases: testCases.length,
    }),
    [projects.length, documents.length, features.length, testCases.length],
  );

  async function fetchJson(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (!response.ok || payload.success === false) {
        throw new Error(payload?.error?.message || `Request failed (${response.status || 'network'})`);
      }

      return payload.data;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Unable to reach the backend. Please start the API server and check the connection.');
      }

      throw error;
    }
  }

  const loadProjects = async () => {
    try {
      const rows = await fetchJson('/api/projects');
      setProjects(rows);
      if (!selectedProject && rows[0]) {
        setSelectedProject(rows[0]);
      }
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const loadProviderSettings = async () => {
    try {
      const rows = await fetchJson('/api/ai/providers');
      setProviders(rows);
      const preferredProvider = rows.find((item) => item.provider === 'openrouter') || rows[0];
      const preferredModel = preferredProvider?.models?.find((item) => item.includes(':free')) || preferredProvider?.models?.[0] || 'meta-llama/llama-3.1-8b-instruct:free';

      if (preferredProvider) {
        setProvider(preferredProvider.provider);
        setModel(preferredModel);
      }
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const loadProjectData = async (project) => {
    if (!project) return;
    setSelectedProject(project);
    try {
      const [documentRows, featureRows, testRows, usageRows] = await Promise.all([
        fetchJson(`/api/projects/${project.id}/documents`),
        fetchJson(`/api/projects/${project.id}/features`),
        fetchJson(`/api/projects/${project.id}/test-cases`),
        fetchJson(`/api/projects/${project.id}/api-usage`),
      ]);
      setDocuments(documentRows);
      setFeatures(featureRows);
      setTestCases(testRows);
      setApiUsage(usageRows);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const loadApiUsage = async (project, filters = apiUsageFilters) => {
    if (!project) return;
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.modelName) params.set('modelName', filters.modelName);
      if (filters.fromDate) params.set('fromDate', filters.fromDate);
      if (filters.toDate) params.set('toDate', filters.toDate);

      const rows = await fetchJson(`/api/projects/${project.id}/api-usage${params.toString() ? `?${params.toString()}` : ''}`);
      setApiUsage(rows);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  useEffect(() => {
    loadProjects();
    loadProviderSettings();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject);
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    if (selectedProject) {
      loadApiUsage(selectedProject, apiUsageFilters);
    }
  }, [selectedProject?.id, apiUsageFilters.status, apiUsageFilters.modelName, apiUsageFilters.fromDate, apiUsageFilters.toDate]);

  const handleCreateProject = async (event) => {
    event.preventDefault();
    if (!projectName.trim()) {
      setErrorMessage('Project name is required.');
      return;
    }

    try {
      const response = await fetchJson('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: projectName, description: projectDescription }),
      });
      setProjects((prev) => [response, ...prev]);
      setSelectedProject(response);
      setProjectName('');
      setProjectDescription('');
      setAnalysisStatus('Project created');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    if (!selectedProject) {
      setErrorMessage('Create or select a project before uploading documents.');
      return;
    }

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('documents', file));
      const rows = await fetch(`/api/projects/${selectedProject.id}/documents`, {
        method: 'POST',
        body: formData,
      }).then((response) => response.json());

      if (!rows.success) {
        throw new Error(rows.error?.message || 'Documents could not be uploaded.');
      }

      setDocuments((prev) => [...rows.data, ...prev]);
      setAnalysisStatus('Documents uploaded');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedProject) {
      setErrorMessage('Select a project to analyze.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisStatus('Running analysis…');
      setErrorMessage('');
      const result = await fetchJson(`/api/projects/${selectedProject.id}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          provider,
          model,
          apiKey,
          temperature: 0.2,
          maxOutputTokens: 8192,
        }),
      });
      setFeatures(result.result?.features || []);
      setTestCases(result.result?.testCases || []);
      setAnalysisStatus('Analysis complete');
      await loadApiUsage(selectedProject, apiUsageFilters);
    } catch (error) {
      setErrorMessage(error.message);
      setAnalysisStatus('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setErrorMessage('API key is required before testing the connection.');
      return;
    }

    try {
      setIsTestingConnection(true);
      setErrorMessage('');
      setAnalysisStatus('Testing connection…');
      await fetchJson('/api/ai/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          model,
          apiKey,
          projectId: selectedProject?.id || null,
          projectName: selectedProject?.name || projectName || 'Untitled Project',
        }),
      });
      setAnalysisStatus('Connection validated');
      if (selectedProject) {
        await loadApiUsage(selectedProject, apiUsageFilters);
      }
    } catch (error) {
      setErrorMessage(error.message);
      setAnalysisStatus('Connection failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleExport = async (type) => {
    if (!selectedProject) return;
    try {
      const exportData = await fetchJson(`/api/projects/${selectedProject.id}/exports`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      window.open(`/api/exports/${exportData.exportId}/download`, '_blank');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const hasSuccessfulApiLog = apiUsage.some((item) => String(item.status || '').toLowerCase() === 'success');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand-icon">
            <BrainCircuit size={18} />
          </div>
          <div>
            <p className="eyebrow">Agent 1</p>
            <h2>Feature Collector</h2>
          </div>
        </div>

        <nav className="nav-menu">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`nav-item ${activeNav === item.label ? 'active' : ''}`}
              onClick={() => setActiveNav(item.label)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Overview</p>
            <h1>QA Analysis Dashboard</h1>
          </div>
          <div className={`status-pill ${isAnalyzing ? 'running' : ''}`}>
            <Activity size={14} />
            <span>{analysisStatus}</span>
          </div>
        </header>

        {errorMessage && <div className="error-banner">{errorMessage}</div>}

        {activeNav === 'API Logs' ? (
          <section className="panel api-logs-screen">
            <div className="panel-header split-header">
              <h3>API Logs</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="panel-chip">{apiUsage.length} records</span>
                {hasSuccessfulApiLog && (
                  <button type="button" className="primary-button compact-button" onClick={() => handleExport('pdf')}>
                    <Download size={14} />
                    Download test cases
                  </button>
                )}
              </div>
            </div>

            <div className="api-filter-grid">
              <label>
                <span>Status</span>
                <select value={apiUsageFilters.status} onChange={(event) => setApiUsageFilters((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="all">All</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </label>
              <label>
                <span>Model</span>
                <input
                  type="text"
                  value={apiUsageFilters.modelName}
                  onChange={(event) => setApiUsageFilters((prev) => ({ ...prev, modelName: event.target.value }))}
                  placeholder="gemini-3.8-flash"
                />
              </label>
              <label>
                <span>From</span>
                <input type="date" value={apiUsageFilters.fromDate} onChange={(event) => setApiUsageFilters((prev) => ({ ...prev, fromDate: event.target.value }))} />
              </label>
              <label>
                <span>To</span>
                <input type="date" value={apiUsageFilters.toDate} onChange={(event) => setApiUsageFilters((prev) => ({ ...prev, toDate: event.target.value }))} />
              </label>
              <button type="button" className="secondary-button compact-button" onClick={() => setApiUsageFilters({ status: 'all', modelName: '', fromDate: '', toDate: '' })}>
                Clear filters
              </button>
            </div>

            {apiUsage.length === 0 ? (
              <p className="empty-state small">No API log records match the current filters.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Provider</th>
                      <th>Model</th>
                      <th>Status</th>
                      <th>Raw response</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiUsage.map((item) => (
                      <tr key={item.id}>
                        <td>{item.project_name || 'Untitled project'}</td>
                        <td>{item.provider_name || '—'}</td>
                        <td>{item.model_name || 'n/a'}</td>
                        <td><span className={`mini-status ${String(item.status || 'success').toLowerCase()}`}>{item.status || 'success'}</span></td>
                        <td title={item.raw_response || item.rawResponse || 'No raw response stored'}>
                          {(() => {
                            const raw = item.raw_response || item.rawResponse || '';
                            const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
                            return text ? `${text.slice(0, 180)}${text.length > 180 ? '...' : ''}` : '—';
                          })()}
                        </td>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <>
            <motion.section className="stats-grid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <StatCard title="Projects" value={stats.totalProjects} icon={<FolderOpen size={18} />} tone="navy" />
              <StatCard title="Documents" value={stats.totalDocuments} icon={<FileText size={18} />} tone="cyan" />
              <StatCard title="Features" value={stats.totalFeatures} icon={<Sparkles size={18} />} tone="green" />
              <StatCard title="Test Cases" value={stats.totalTestCases} icon={<CheckCircle2 size={18} />} tone="amber" />
            </motion.section>

            <section className="content-grid two-column">
          <div className="panel">
            <div className="panel-header">
              <h3>Create project</h3>
            </div>
            <form onSubmit={handleCreateProject} className="stack-form">
              <label>
                <span>Project name</span>
                <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Customer Portal" />
              </label>
              <label>
                <span>Description</span>
                <textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} rows={4} placeholder="Describe the project and objective." />
              </label>
              <motion.button type="submit" className="primary-button" whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Plus size={16} />
                Create project
              </motion.button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>AI configuration</h3>
            </div>
            <div className="stack-form compact">
              <label>
                <span>Provider</span>
                <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                  {providers.map((item) => (
                    <option key={item.provider} value={item.provider}>{item.provider}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Model</span>
                <select value={model} onChange={(event) => setModel(event.target.value)}>
                  {(providers.find((item) => item.provider === provider)?.models || ['meta-llama/llama-3.1-8b-instruct:free']).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>API key</span>
                <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Hidden in UI" />
              </label>
              <motion.button type="button" className="secondary-button" onClick={handleTestConnection} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} disabled={isTestingConnection}>
                <Search size={15} />
                {isTestingConnection ? 'Testing…' : 'Test connection'}
              </motion.button>
            </div>
          </div>
        </section>

        <section className="content-grid two-column">
          <div className="panel">
            <div className="panel-header">
              <h3>Project selection</h3>
            </div>
            <div className="project-list">
              {projects.length === 0 ? (
                <p className="empty-state">No projects yet.</p>
              ) : (
                projects.map((project) => (
                  <button key={project.id} type="button" className={`project-card ${selectedProject?.id === project.id ? 'selected' : ''}`} onClick={() => loadProjectData(project)}>
                    <strong>{project.name}</strong>
                    <span>{project.description || 'No description yet'}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Upload documents</h3>
            </div>
            <div className="upload-box">
              <input type="file" multiple onChange={handleFilesSelected} />
              <div className="upload-label">
                <Upload size={18} />
                <span>{selectedFiles.length ? `${selectedFiles.length} file(s) selected` : 'Drag in or browse files'}</span>
              </div>
            </div>
            <div className="document-list">
              {documents.length === 0 ? (
                <p className="empty-state">No documents uploaded.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="document-row">
                    <div>
                      <strong>{doc.originalName || doc.name}</strong>
                      <span>{doc.extension} • {(doc.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <span className={`status-badge ${doc.status}`}>{doc.status || 'uploaded'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="panel actions-panel">
          <div className="panel-header">
            <h3>Analysis</h3>
          </div>
          <div className="action-bar">
            <motion.button type="button" className="primary-button" onClick={handleAnalyze} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} disabled={isAnalyzing}>
              <BrainCircuit size={16} className={isAnalyzing ? 'spin' : ''} />
              {isAnalyzing ? 'Agent running…' : 'Run analysis'}
            </motion.button>
            <motion.button type="button" className="secondary-button" onClick={() => handleExport('json')} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
              <Download size={15} />
              Export JSON
            </motion.button>
            <motion.button type="button" className="secondary-button" onClick={() => handleExport('csv')} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
              <Download size={15} />
              Export CSV
            </motion.button>
            <motion.button type="button" className="secondary-button" onClick={() => handleExport('pdf')} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
              <Download size={15} />
              Export PDF
            </motion.button>
          </div>

          <div className="api-usage-panel">
            <div className="api-usage-header">
              <strong>API usage monitor</strong>
              <span>{apiUsage.length} records</span>
            </div>

            <div className="api-filter-grid">
              <label>
                <span>Status</span>
                <select value={apiUsageFilters.status} onChange={(event) => setApiUsageFilters((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="all">All</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </label>
              <label>
                <span>Model</span>
                <input
                  type="text"
                  value={apiUsageFilters.modelName}
                  onChange={(event) => setApiUsageFilters((prev) => ({ ...prev, modelName: event.target.value }))}
                  placeholder="gemini-3.8-flash"
                />
              </label>
              <label>
                <span>From</span>
                <input type="date" value={apiUsageFilters.fromDate} onChange={(event) => setApiUsageFilters((prev) => ({ ...prev, fromDate: event.target.value }))} />
              </label>
              <label>
                <span>To</span>
                <input type="date" value={apiUsageFilters.toDate} onChange={(event) => setApiUsageFilters((prev) => ({ ...prev, toDate: event.target.value }))} />
              </label>
              <button type="button" className="secondary-button compact-button" onClick={() => setApiUsageFilters({ status: 'all', modelName: '', fromDate: '', toDate: '' })}>
                Clear filters
              </button>
            </div>

            {apiUsage.length === 0 ? (
              <p className="empty-state small">No matching API requests yet.</p>
            ) : (
              <ul className="usage-list">
                {apiUsage.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <span>{item.project_name || 'Untitled project'}</span>
                    <span>{item.model_name || 'n/a'}</span>
                    <span className={`mini-status ${String(item.status || 'success').toLowerCase()}`}>
                      {item.status || 'success'}
                    </span>
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

            <section className="content-grid">
              <div className="panel">
                <div className="panel-header">
                  <h3>Feature inventory</h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Module</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-state">No features generated yet.</td>
                      </tr>
                    ) : (
                      features.map((feature) => (
                        <tr key={feature.id || feature.featureId || feature.name}>
                          <td>{feature.featureId || feature.id || 'F-1'}</td>
                          <td>{feature.name || feature.title || 'Untitled feature'}</td>
                          <td>{feature.module || 'General'}</td>
                          <td>{feature.confidenceScore || feature.confidence || '0.80'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Functional test cases</h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testCases.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="empty-state">No test cases generated yet.</td>
                      </tr>
                    ) : (
                      testCases.map((testCase) => (
                        <tr key={testCase.id || testCase.title}>
                          <td>{testCase.id || 'TC-1'}</td>
                          <td>{testCase.title || 'Untitled case'}</td>
                          <td>{testCase.priority || 'medium'}</td>
                          <td>{testCase.status || 'NOT_EXECUTED'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, tone }) {
  return (
    <motion.div className={`stat-card ${tone}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
      </div>
    </motion.div>
  );
}

export default App;
