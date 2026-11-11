# AI Workflow

The AI layer runs the analysis in multiple stages to reduce prompt bloat and preserve traceability.

1. Document classification
2. Requirement extraction
3. Feature collection
4. Test scenario generation
5. Test case generation
6. Coverage and gap analysis
7. Quality review

The backend validates schema conformance before persisting analysis results.

## Safety controls

- Uploaded content is treated as untrusted input.
- Prompt injection instructions inside documents are not executed as system instructions.
- The app never sends API keys as prompt content.
- Secrets remain in the backend environment only.
