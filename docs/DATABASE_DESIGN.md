# Database Design

The application stores data in SQLite to preserve project state, analysis versioning, and evidence chaining.

## Primary entities

- projects
- documents
- document_contents
- analysis_jobs
- analysis_versions
- requirements
- features
- business_rules
- test_scenarios
- test_cases
- evidence_references
- feature_testcase_links
- analysis_provider_snapshots
- exports
- application_settings

## Design principles

- Foreign keys enabled
- Timestamps for create/update events
- Versioned analysis records to avoid overwriting historical results
- Explicit links between feature, requirement, evidence, and test cases
- Transaction-based writes for related entities
