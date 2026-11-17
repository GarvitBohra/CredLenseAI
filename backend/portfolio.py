from collections import defaultdict
from sqlalchemy import func
from sqlalchemy.orm import Session
from models import Loan

ALERT_THRESHOLD = 0.35


def summary(db: Session, org_id: int) -> dict:
    mine = Loan.org_id == org_id
    total, exposure, prob_sum, loss = db.query(
        func.count(Loan.id), func.coalesce(func.sum(Loan.loan_amount), 0.0),
        func.coalesce(func.sum(Loan.default_probability), 0.0),
        func.coalesce(func.sum(Loan.default_probability * Loan.loan_amount), 0.0),
    ).filter(mine).one()
    bands = {"Low": 0, "Medium": 0, "High": 0}
    for band, n in db.query(Loan.risk_band, func.count(Loan.id)).filter(mine).group_by(Loan.risk_band):
        if band in bands:
            bands[band] = n
    # only two light columns are loaded for the monthly trend (not the explanation JSON)
    trend = defaultdict(lambda: [0.0, 0])
    for created, prob in db.query(Loan.created_at, Loan.default_probability).filter(mine):
        if created is not None:
            key = created.strftime("%Y-%m")
            trend[key][0] += prob
            trend[key][1] += 1
    return {
        "total_loans": total,
        "total_exposure": round(exposure, 2),
        "expected_default_rate": round(prob_sum / total, 4) if total else 0,
        "expected_loss": round(loss, 2),
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
