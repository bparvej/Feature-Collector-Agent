# Security

- API keys remain inside the backend runtime environment.
- Secrets are never written to SQLite.
- Uploaded files are treated as untrusted input.
- Files are sanitized and stored under a controlled local directory.
- Path traversal is prevented by sanitizing file names.
- CORS is configured for the frontend origin only.
- Input validation and error handling guard API endpoints.

## Prompt injection protections

Uploaded document content is not allowed to override provider configuration or system instructions.
