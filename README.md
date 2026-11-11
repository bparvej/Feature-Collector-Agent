# Feature Collector Agent — Agent 1

Feature Collector Agent is a full-stack QA analysis platform for processing project documentation, extracting structured features and requirements, generating functional test cases, and storing evidence-backed analysis in SQLite.

## Highlights

- React + Vite frontend with a polished SaaS dashboard
- Express.js REST API with SQLite persistence
- Multi-document upload and parsing for Markdown, PDF, DOCX, XLSX, CSV, TXT, and HTML
- AI provider abstraction for Gemini, Grok, and OpenAI-ready integration
- Traceable feature inventory and test case generation
- JSON, CSV, PDF, and HTML exports
- Analysis history and versioning

## Quick start

1. Install dependencies:
   npm install
2. Configure local environment:
   cp .env.example .env
3. Add your Gemini API key if you want AI analysis.
4. Start the app:
   npm run dev
5. Open http://localhost:5173

## Scripts

- npm run setup
- npm run dev
- npm run build
- npm run test
- npm run lint

## Supported formats

- .md, .markdown
- .pdf
- .docx
- .xlsx, .xls
- .csv
- .txt
- .html

## Documentation index

- [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md)
- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)
- [docs/FEATURE_SPECIFICATION.md](docs/FEATURE_SPECIFICATION.md)
- [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)
- [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
- [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md)
- [docs/AI_PROVIDER_INTEGRATION.md](docs/AI_PROVIDER_INTEGRATION.md)
- [docs/DOCUMENT_PROCESSING.md](docs/DOCUMENT_PROCESSING.md)
- [docs/EXPORT_FORMATS.md](docs/EXPORT_FORMATS.md)
- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/INSTALLATION_GUIDE.md](docs/INSTALLATION_GUIDE.md)
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md)
- [docs/CHANGELOG.md](docs/CHANGELOG.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)

## Notes

This project intentionally excludes Agent 2 browser automation, Playwright execution, API execution, and live application testing. The system is designed for future Agent 2 compatibility by storing feature and test case metadata with traceability and stable IDs.
