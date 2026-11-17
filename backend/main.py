import io
import os
import time
from collections import defaultdict, deque
from typing import Optional
import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import portfolio
from auth import create_token, current_user, verify_password_or_dummy
from database import Base, engine, get_db
from models import Loan, Organization, User
from predictor import LABELS, score_frame
from schemas import BorrowerInput, LoanOut, LoginRequest, PredictionResult, TokenResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CredLensAI API", version="1.0.0")
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

FEATURES = list(LABELS.keys())


@app.get("/health")
def health():
    return {"status": "ok"}


_fails: dict = defaultdict(deque)   # (ip, email) -> timestamps of recent failed logins
MAX_FAILS, WINDOW = 5, 300          # 5 failures per 5 minutes


@app.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    key = (request.client.host if request.client else "?", body.email.lower())
    q = _fails[key]
    now = time.monotonic()
    while q and now - q[0] > WINDOW:
        q.popleft()
    if len(q) >= MAX_FAILS:
        raise HTTPException(429, "Too many failed attempts. Try again in a few minutes.")
    user = db.query(User).filter(User.email == body.email.lower()).first()
    # always runs a bcrypt check so unknown emails take as long as known ones
    if not verify_password_or_dummy(body.password, user.password_hash if user else None):
        q.append(now)
        raise HTTPException(401, "Incorrect email or password")
    q.clear()
    org = db.get(Organization, user.org_id)
    return TokenResponse(access_token=create_token(user.id), full_name=user.full_name,
                         org_name=org.name if org else "")


def _save_loan(db: Session, org_id: int, data: dict, result: dict) -> Loan:
    loan = Loan(org_id=org_id, default_probability=result["default_probability"],
                risk_band=result["risk_band"], decision=result["decision"],
                explanation=result["factors"], **data)
    db.add(loan)
    return loan


@app.post("/predict", response_model=PredictionResult)
def predict(body: BorrowerInput, save: bool = False, user: User = Depends(current_user),
            db: Session = Depends(get_db)):
    data = body.model_dump()
    result = score_frame(pd.DataFrame([data]))[0]
    if save:
        _save_loan(db, user.org_id, data, result)
        db.commit()
    return result


MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_ROWS = 5000


@app.post("/portfolio/upload")
def upload(file: UploadFile = File(...), user: User = Depends(current_user),
           db: Session = Depends(get_db)):
    # plain `def`: FastAPI runs it in a threadpool, so scoring doesn't block other requests
    raw = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "File too large (max 5 MB)")
    try:
        df = pd.read_csv(io.BytesIO(raw), nrows=MAX_ROWS + 1)
    except Exception:
        raise HTTPException(400, "Could not read CSV file")
    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise HTTPException(400, f"Missing columns: {', '.join(missing)}")
    if len(df) > MAX_ROWS:
        raise HTTPException(400, f"Maximum {MAX_ROWS} rows per upload")

    # validate every row with the same rules as /predict; bad rows are skipped and reported
    nums = df[FEATURES].apply(pd.to_numeric, errors="coerce").replace([np.inf, -np.inf], np.nan)
    names = df["borrower_name"].fillna("").astype(str) if "borrower_name" in df.columns else pd.Series([""] * len(df))
    dates = pd.to_datetime(df["created_at"], errors="coerce") if "created_at" in df.columns else None
    valid, errors = [], []
    for i in range(len(df)):
        try:
            item = BorrowerInput(borrower_name=names.iloc[i], **nums.iloc[i].to_dict()).model_dump()
        except Exception as e:
            if len(errors) < 20:
                details = e.errors() if hasattr(e, "errors") else []
                first = details[0] if details else {}
                field = ".".join(str(x) for x in first.get("loc", ())) or "row"
                errors.append({"row": i + 2, "error": f"{field}: {first.get('msg', 'invalid value')}"})
            continue
        if dates is not None and pd.notna(dates.iloc[i]):
            item["created_at"] = dates.iloc[i].to_pydatetime().replace(tzinfo=None)
        valid.append(item)
    skipped = len(df) - len(valid)
    if not valid:
        raise HTTPException(400, "No valid rows found. First problem: "
                            + (f"row {errors[0]['row']} {errors[0]['error']}" if errors else "empty file"))

    results = score_frame(pd.DataFrame(valid)[FEATURES])
    for item, result in zip(valid, results):
        _save_loan(db, user.org_id, item, result)
    db.commit()
    return {"imported": len(results), "skipped": skipped, "errors": errors}


@app.get("/portfolio/summary")
def get_summary(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return portfolio.summary(db, user.org_id)


@app.get("/portfolio/alerts")
def get_alerts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return portfolio.alerts(db, user.org_id)


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@app.get("/portfolio/loans", response_model=list[LoanOut])
def list_loans(risk: Optional[str] = None, q: Optional[str] = None,
               limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0),
               user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Loan).filter(Loan.org_id == user.org_id)
    if risk:
        query = query.filter(Loan.risk_band == risk.capitalize())
    if q:
        query = query.filter(Loan.borrower_name.ilike(f"%{_escape_like(q)}%", escape="\\"))
    return query.order_by(Loan.default_probability.desc()).offset(offset).limit(limit).all()


@app.get("/portfolio/loans/{loan_id}", response_model=LoanOut)
def get_loan(loan_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.org_id == user.org_id).first()
    if not loan:
        raise HTTPException(404, "Loan not found")
    return loan
