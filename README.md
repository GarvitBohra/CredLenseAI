# CredLensAI

AI-powered credit risk platform for lenders: predict loan default probability, see **why** (SHAP explanations), and monitor your portfolio. Built entirely with free, open-source tools and synthetic data.

**Stack:** Python · XGBoost · SHAP · FastAPI · SQLAlchemy · PostgreSQL/SQLite · React · Vite · Tailwind · Recharts · Docker

## Quick start (Docker)

```bash
docker compose up --build
```
- App: http://localhost:5173
- API docs: http://localhost:8000/docs
- Demo login: `demo@credlens.ai` / `demo123` (a second org, `other@credlens.ai`, has separate data)

## Run locally without Docker

```bash
# 1. ML (already committed, only needed to retrain)
cd ml && python generate_data.py && python train.py

# 2. Backend (SQLite by default)
cd backend
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload          # http://localhost:8000/docs

# 3. Frontend
cd frontend
npm install
npm run dev                         # http://localhost:5173
```

Tests: `cd backend && python -m pytest tests`

## Features
1. **Risk assessment** – borrower form → default probability, risk band (Low / Medium / High), suggestion (Approve / Review / Reject).
2. **Explainable AI** – top-5 SHAP factors with plain-English reasons.
3. **Portfolio monitoring** – CSV batch scoring, KPI dashboard, risk trend, risk distribution, high-risk table and alerts.

CSV columns: `borrower_name` (optional), `age, income, loan_amount, interest_rate, debt_to_income, credit_utilization, past_delinquencies, credit_history_years`. Use the template on the Upload page.

## Free deployment
1. Push to GitHub.
2. Database: create a free Postgres on [Neon](https://neon.tech) or [Supabase](https://supabase.com); copy its connection string.
3. Backend: Render free web service, Docker runtime, Dockerfile path `backend/Dockerfile`, context = repo root. Env vars: `DATABASE_URL`, `SECRET_KEY` (random string), `CORS_ORIGINS` (your frontend URL).
4. Frontend: Vercel/Netlify, root `frontend`, build `npm run build`, output `dist`, env `VITE_API_URL` = Render URL.

Note: the free Render service sleeps when idle, so the first request can take ~30 seconds.

## Notes
- Data is synthetic, so this is a demo, not a production credit model. Never use it for real lending decisions without proper validation and regulatory review.
- Risk bands: Low < 15%, Medium 15–35%, High ≥ 35%.
