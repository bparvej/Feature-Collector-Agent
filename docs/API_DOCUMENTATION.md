# API Documentation

## Base URL

http://localhost:4000

## Endpoints

### Projects
- POST /api/projects
- GET /api/projects
- GET /api/projects/:projectId
- PUT /api/projects/:projectId

### Documents
- POST /api/projects/:projectId/documents
- GET /api/projects/:projectId/documents
- DELETE /api/documents/:documentId

### Analysis
- POST /api/projects/:projectId/analyze
- GET /api/projects/:projectId/analysis-history
- GET /api/projects/:projectId/features
- GET /api/projects/:projectId/test-cases
- GET /api/projects/:projectId/coverage
- GET /api/projects/:projectId/api-usage

### AI and exports
- GET /api/ai/providers
- POST /api/ai/test-connection
- POST /api/projects/:projectId/exports
- GET /api/projects/:projectId/exports
- GET /api/exports/:exportId/download

## API usage monitoring

The API usage monitor stores successful and failed provider requests per project so users can review model usage and rate-limit events.

### Filters

GET /api/projects/:projectId/api-usage?status=UNAVAILABLE&modelName=gemini-3.8-flash&fromDate=2026-11-01&toDate=2026-11-12&limit=50

Supported filters:
- status: all | success | failed | UNAVAILABLE
- modelName: free-text match against the model name
- providerName: free-text match against provider name
- fromDate: YYYY-MM-DD
- toDate: YYYY-MM-DD
- limit: maximum number of rows returned (max 200)

### UNAVAILABLE handling

Transient provider outages and quota spikes are logged with status values such as UNAVAILABLE. This is especially relevant for Gemini responses like 503 high-demand errors. The app surfaces those as retryable warnings instead of a generic failure.

## Example: create project

curl -X POST http://localhost:4000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Portal","description":"Customer portal documentation"}'

## Example: upload documents

curl -X POST http://localhost:4000/api/projects/<projectId>/documents \
  -F 'documents=@README.md'
