# System Architecture

## Overview

The application is split into a React frontend and an Express backend with a shared SQLite data layer. The backend stores projects, documents, analysis versions, features, requirements, test cases, exports, and evidence metadata.

## Key components

- Frontend: dashboard, project management, document upload UI, AI configuration, exports
- Backend: REST API, validation, migrations, document processing, AI provider orchestration
- Database: SQLite with relational tables and migration scripts
- Storage: local uploads and report exports directories
- AI layer: provider-independent adapters for Gemini, Grok, and OpenAI-compatible APIs

## Lifecycle

1. Project creation
2. Document upload and validation
3. Parsing and normalization
4. AI analysis configuration selection
5. Structured analysis generation
6. Validation and persistence
7. Export and review

## Future compatibility

Agent 2 can consume project IDs, analysis IDs, feature IDs, and test case IDs from the persisted dataset without requiring a browser automation implementation in Agent 1.
