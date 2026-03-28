# JobHunt AI Backend

## Setup
1. Copy `.env.example` to `.env` and fill in values.
2. Run the API.

## Run
```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints
- `GET /health`
- `POST /api/analyze/optimize`
- `POST /api/jobs/extract`
- `GET|POST|DELETE /api/jobs`
- `POST /api/resumes/parse`
- `GET|POST|DELETE /api/resumes`
- `GET /api/resumes/{id}/pdf`

