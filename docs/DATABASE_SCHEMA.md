# Database Schema

## Core tables

### projects
| Field | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| name | TEXT | project display name |
| description | TEXT | optional summary |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### documents
| Field | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| project_id | TEXT | FK to projects |
| name | TEXT | sanitized filename |
| original_name | TEXT | original file name |
| extension | TEXT | file extension |
| size_bytes | INTEGER | upload size |
| mime_type | TEXT | MIME type |
| storage_path | TEXT | location on disk |
| status | TEXT | uploaded/parsed/error |
| parsing_error | TEXT | parse failure cause |

### document_contents
| Field | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| document_id | TEXT | FK to documents |
| content | TEXT | normalized extracted content |
| metadata | TEXT | parser metadata JSON |

### analysis_jobs
| Field | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| project_id | TEXT | FK |
| status | TEXT | queued/running/completed |
| provider_name | TEXT | AI provider |
| model_name | TEXT | model used |
| config_snapshot | TEXT | serialized config |

### analysis_versions
| Field | Type | Notes |
| --- | --- | --- |
| id | TEXT | primary key |
| project_id | TEXT | FK |
| analysis_job_id | TEXT | FK |
| version_number | INTEGER | sequence number |
| summary | TEXT | high-level summary |

### requirements, features, business_rules, test_scenarios, test_cases
These tables store the generated analysis outputs and relate back to the project and version context.

### evidence_references
Captures document references with evidence excerpt and confidence type.

### feature_testcase_links
Maps features to test cases for traceability.

### analysis_provider_snapshots
Stores provider/model runtime snapshot without secrets.

### exports
Stores generated export metadata and file paths.

### application_settings
Stores key/value runtime settings.
