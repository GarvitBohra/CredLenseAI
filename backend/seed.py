"""Create demo organizations/users and ~500 scored loans. Safe to re-run."""
import random
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd

from auth import hash_password
from database import Base, SessionLocal, engine
from models import Loan, Organization, User
from predictor import score_frame

FIRST = ["Aarav", "Priya", "Rohan", "Sneha", "Vikram", "Anita", "Karan", "Meera", "Arjun", "Divya",
         "Rahul", "Neha", "Amit", "Pooja", "Sanjay", "Isha", "Manoj", "Kavya", "Nikhil", "Tara"]
LAST = ["Sharma", "Patel", "Singh", "Gupta", "Mehta", "Reddy", "Iyer", "Nair", "Joshi", "Bose"]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if db.query(User).first():
        print("Already seeded.")
        return
    org1, org2 = Organization(name="Northwind Finance"), Organization(name="Acme Lending")
    db.add_all([org1, org2])
    db.flush()
    db.add_all([
        User(email="demo@credlens.ai", password_hash=hash_password("demo123"),
             full_name="Demo Analyst", org_id=org1.id),
        User(email="other@credlens.ai", password_hash=hash_password("demo123"),
             full_name="Other Analyst", org_id=org2.id),
    ])
    data = pd.read_csv(Path(__file__).parent.parent / "ml" / "loans.csv")
    rng = random.Random(7)
    for org, n in ((org1, 500), (org2, 60)):
        sample = data.sample(n, random_state=org.id).reset_index(drop=True)
        results = score_frame(sample)
        for i, res in enumerate(results):
            row = sample.loc[i]
            db.add(Loan(
                org_id=org.id, borrower_name=f"{rng.choice(FIRST)} {rng.choice(LAST)}",
                age=int(row["age"]), income=float(row["income"]), loan_amount=float(row["loan_amount"]),
                interest_rate=float(row["interest_rate"]), debt_to_income=float(row["debt_to_income"]),
                credit_utilization=float(row["credit_utilization"]),
                past_delinquencies=int(row["past_delinquencies"]),
                credit_history_years=float(row["credit_history_years"]),
                default_probability=res["default_probability"], risk_band=res["risk_band"],
                decision=res["decision"], explanation=res["factors"],
                created_at=datetime.utcnow() - timedelta(days=rng.randint(0, 180))))
    db.commit()
    print("Seeded demo data. Login: demo@credlens.ai / demo123")


if __name__ == "__main__":
    seed()
