# JobHunt AI

Full-stack app:
- `frontend/`: Next.js
- `backend/`: FastAPI + LangChain/LangGraph (Gemini)

## Deploy

### Frontend (Vercel)

1. Import this repo in Vercel.
2. Root directory: `frontend`
3. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_BASE_URL` (your backend URL)

Vercel detects Next.js from `frontend/package.json`.

### Backend (Render)

This repo includes a Render Blueprint: `render.yaml`.

1. In Render: New → Blueprint.
2. Select this repo.
3. Render will create the `jobhunt-ai-backend` service from `backend/`.
4. Set the required env vars in Render (values are intentionally not committed):
   - `GOOGLE_API_KEY`
   - `SUPABASE_ANON_KEY`
   - `FRONTEND_ORIGIN` (your Vercel domain)

Optional:
- `GEMINI_MODEL` (defaults to `gemini-2.5-pro`)

## Local dev

Frontend:

```bash
cd frontend
npm ci
npm run dev -- --port 3000
```

Backend:

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
