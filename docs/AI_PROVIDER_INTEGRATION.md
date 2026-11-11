# AI Provider Integration

## Supported providers

- Gemini
- Grok
- OpenAI-compatible model endpoints

## Provider abstraction

All providers implement the common interface declared in the AI provider service layer and are resolved through the factory pattern.

## Runtime behavior

- If no runtime override is provided, the default .env configuration is used.
- The selected provider and model are stored in the per-analysis snapshot without exposing keys.
- Invalid or missing credentials surface a clear backend error.
