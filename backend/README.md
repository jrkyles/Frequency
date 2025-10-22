# Frequency Backend (Python)

This folder contains an optional Python backend (FastAPI) that can replace Supabase Edge Functions for select endpoints.

## Endpoints
- POST /auth/spotify/start — returns Spotify OAuth URL
- POST /playlist-transfer — placeholder transfer response
- POST /playlist-transfer/sync-linked — placeholder sync response
- POST /sync — placeholder manual sync start

## Run locally
```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend configuration
Set VITE_API_BASE in the frontend env to route calls to this backend:
```sh
# in a .env.local at repo root
VITE_API_BASE=http://localhost:8000
```

Remove or unset VITE_API_BASE to fall back to Supabase Edge Functions.
