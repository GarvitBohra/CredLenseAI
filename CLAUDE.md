# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CredLensAI is a credit-risk SaaS demo: it predicts loan default probability with XGBoost, explains each score with SHAP, and monitors a loan portfolio. All data is synthetic. Live: frontend on Vercel, backend on Render, Postgres on Neon (see README.md).

## Commands

Backend (run from `backend/`; imports are flat, e.g. `from auth import ...`, so always run from this directory):
```bash
pip install -r requirements.txt
python seed.py                              # creates tables + demo orgs/users/500 loans; no-op if users exist
python -m uvicorn main:app --reload         # http://localhost:8000/docs
python -m pytest tests -q                   # all tests
python -m pytest tests/test_api.py::test_org_isolation -q   # single test
```

Frontend (run from `frontend/`; plain JavaScript, no TypeScript):
```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run lint       # oxlint
```

ML (run from `ml/`; `train.py` imports `generate_data`, so the cwd matters):
```bash
python generate_data.py && python train.py   # writes loans.csv and model.joblib, prints test AUC
```

Full stack: `docker compose up --build` (db + backend + frontend; app on :5173, API on :8000). `docker compose down -v` also wipes the database volume.

## Architecture

**One backend process does everything, including ML inference.** There is no separate ML service. `ml/model.joblib` is a committed artifact (a dict `{"model", "features"}`) loaded lazily and cached in `backend/predictor.py`, which also builds a SHAP `TreeExplainer` and turns SHAP values into the top-5 "factors" shown in the UI. Retraining means re-running `ml/train.py`, committing the new `model.joblib`, and redeploying.

**Feature list is duplicated and must stay in sync** across: `ml/generate_data.py` (`FEATURES`), `backend/predictor.py` (`LABELS`), `backend/models.py` (`Loan` columns), `backend/schemas.py` (`BorrowerInput`), `backend/main.py` (CSV upload validates against `LABELS` keys), and the form in `frontend/src/pages/Assess.jsx`. Adding a feature means touching all of them and retraining.

**Scoring flow:** `/predict` and `/portfolio/upload` build a DataFrame, call `predictor.score_frame`, and persist each result as a `Loan` row, with the SHAP factors stored in its JSON `explanation` column. The dashboard and loan-detail pages read these stored results; nothing is re-scored on read. Risk bands (Low < 15%, Medium 15-35%, High >= 35%) and the alert threshold (0.35) are hard-coded in `predictor.py` and `portfolio.py`.

**Multi-tenancy:** every query in `main.py` and `portfolio.py` filters by `user.org_id`. `current_user` (in `auth.py`) is the single auth dependency (JWT bearer, 12h expiry). Keep the org filter on any new loan query; `test_org_isolation` guards this.

**Database:** `database.py` reads `DATABASE_URL` (defaults to local SQLite `credlens.db`; `postgres://` is rewritten to `postgresql://`). Tables are created by `Base.metadata.create_all` at import of `main.py`. There are no migrations, so schema changes need a manual reset or ALTER on existing databases.

**Backend container startup** (`backend/Dockerfile`, build context is the repo root, not `backend/`): runs `python seed.py` then uvicorn on `$PORT`. The image copies `ml/model.joblib` and `ml/loans.csv`, and `seed.py` reads `loans.csv` to build demo loans, so both files must stay committed.

**Frontend:** React + react-router + TanStack Query. `src/lib/api.js` is the single fetch wrapper: it reads `VITE_API_URL` (a build-time value baked in by Vite, so changing it requires a redeploy) and on any 401 clears `token` and `user` from localStorage and redirects to `/login`. `src/lib/auth.jsx` holds the session. After any mutation that adds loans, pages invalidate the `summary`, `loans` and `alerts` query keys. Dark mode is a `dark` class on `<html>` (Tailwind v4 custom variant in `src/index.css`).

## Deployment gotchas
- Render `CORS_ORIGINS` must exactly match the Vercel origin (comma-separated for several, no trailing slash, https).
- `frontend/vercel.json` rewrites all paths to `index.html` so deep links like `/loans` work.
- Render's free tier sleeps when idle and has about 512 MB RAM; XGBoost + SHAP is the likely memory pressure point.
- Backend tests set `DATABASE_URL` to a throwaway `test_credlens.db` and call `seed.seed()` themselves; the fixture disposes the engine before deleting the file (required on Windows).
- `SECRET_KEY` is mandatory when `RENDER` or `ENV=production` is set (auth.py raises at import); locally it falls back to a dev key.
- Login is rate limited in memory (5 failures / 5 min per IP+email), so it resets on restart and isn't shared across workers.
- CSV upload validates each row with `BorrowerInput`, skips bad rows and returns `skipped` + `errors`; `predictor._load` fails fast if `model.joblib` features differ from `LABELS`.
- Demo credentials `demo@credlens.ai` / `demo123` (org A) and `other@credlens.ai` / `demo123` (org B) are created by `seed.py`.
