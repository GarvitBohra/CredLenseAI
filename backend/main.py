import io
import os
from typing import Optional
import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import portfolio
from auth import create_token, current_user, verify_password
from database import Base, engine, get_db
from models import Loan, Organization, User
from predictor import LABELS, score_frame
from schemas import BorrowerInput, LoanOut, LoginRequest, PredictionResult, TokenResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CredLensAI API", version="1.0.0")
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

FEATURES = list(LABELS.keys())


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
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


@app.post("/portfolio/upload")
async def upload(file: UploadFile = File(...), user: User = Depends(current_user),
                 db: Session = Depends(get_db)):
    try:
        df = pd.read_csv(io.BytesIO(await file.read()))
    except Exception:
        raise HTTPException(400, "Could not read CSV file")
    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise HTTPException(400, f"Missing columns: {', '.join(missing)}")
    if len(df) > 5000:
        raise HTTPException(400, "Maximum 5000 rows per upload")
    df = df.dropna(subset=FEATURES).reset_index(drop=True)
    if df.empty:
        raise HTTPException(400, "No valid rows found")
    results = score_frame(df)
    names = df["borrower_name"].fillna("").astype(str) if "borrower_name" in df.columns else [""] * len(df)
    for i, result in enumerate(results):
        row = {f: df.loc[i, f].item() for f in FEATURES}
        row["age"] = int(row["age"])
        row["past_delinquencies"] = int(row["past_delinquencies"])
        _save_loan(db, user.org_id, {"borrower_name": names[i], **row}, result)
    db.commit()
    return {"imported": len(results)}


@app.get("/portfolio/summary")
def get_summary(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return portfolio.summary(db, user.org_id)


@app.get("/portfolio/alerts")
def get_alerts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return portfolio.alerts(db, user.org_id)


@app.get("/portfolio/loans", response_model=list[LoanOut])
def list_loans(risk: Optional[str] = None, q: Optional[str] = None, limit: int = 100, offset: int = 0,
               user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = db.query(Loan).filter(Loan.org_id == user.org_id)
    if risk:
        query = query.filter(Loan.risk_band == risk.capitalize())
    if q:
        query = query.filter(Loan.borrower_name.ilike(f"%{q}%"))
    return query.order_by(Loan.default_probability.desc()).offset(offset).limit(min(limit, 500)).all()


@app.get("/portfolio/loans/{loan_id}", response_model=LoanOut)
def get_loan(loan_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.org_id == user.org_id).first()
    if not loan:
        raise HTTPException(404, "Loan not found")
    return loan
