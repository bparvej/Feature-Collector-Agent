# Document Processing

## Supported formats

- .md
- .markdown
- .pdf
- .docx
- .xlsx
- .xls
- .csv
- .txt
- .html

## Parser behavior

The backend parses each file into a plain-text representation and stores the normalized result in SQLite. Unsupported formats fail fast with a clear user-facing message.

## Corrupted and unreadable files

Malformed, encrypted, or unreadable files are recorded with an error status and a parsing_error message; they are not silently ignored.

## Legacy DOC files

DOC files are not supported directly in Agent 1. Users should convert DOC to DOCX before upload.
