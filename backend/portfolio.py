from collections import defaultdict
from sqlalchemy.orm import Session
from models import Loan

ALERT_THRESHOLD = 0.35


def summary(db: Session, org_id: int) -> dict:
    loans = db.query(Loan).filter(Loan.org_id == org_id).all()
    total = len(loans)
    exposure = sum(l.loan_amount for l in loans)
    bands = {"Low": 0, "Medium": 0, "High": 0}
    trend = defaultdict(lambda: [0.0, 0])
    expected_loss = 0.0
    for l in loans:
        bands[l.risk_band] += 1
        expected_loss += l.default_probability * l.loan_amount
        key = l.created_at.strftime("%Y-%m")
        trend[key][0] += l.default_probability
        trend[key][1] += 1
    return {
        "total_loans": total,
        "total_exposure": round(exposure, 2),
        "expected_default_rate": round(sum(l.default_probability for l in loans) / total, 4) if total else 0,
        "expected_loss": round(expected_loss, 2),
        "high_risk_count": bands["High"],
        "risk_bands": [{"band": k, "count": v} for k, v in bands.items()],
        "trend": [{"month": k, "avg_risk": round(v[0] / v[1], 4)} for k, v in sorted(trend.items())],
    }


def alerts(db: Session, org_id: int, limit: int = 10) -> list[dict]:
    rows = (db.query(Loan).filter(Loan.org_id == org_id, Loan.default_probability >= ALERT_THRESHOLD)
            .order_by(Loan.default_probability.desc()).limit(limit).all())
    return [{"loan_id": l.id, "borrower_name": l.borrower_name,
             "default_probability": l.default_probability,
             "message": f"{l.borrower_name or 'Loan #' + str(l.id)} is above the risk threshold"}
            for l in rows]
