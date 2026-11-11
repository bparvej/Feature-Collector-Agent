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

### AI and exports
- GET /api/ai/providers
- POST /api/ai/test-connection
- POST /api/projects/:projectId/exports
- GET /api/projects/:projectId/exports
- GET /api/exports/:exportId/download

## Example: create project

curl -X POST http://localhost:4000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Portal","description":"Customer portal documentation"}'

## Example: upload documents

curl -X POST http://localhost:4000/api/projects/<projectId>/documents \
  -F 'documents=@README.md'
