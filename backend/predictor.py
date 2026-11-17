"""Load the trained model, score borrowers, and explain with SHAP."""
from functools import lru_cache
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import shap

MODEL_PATH = Path(__file__).parent.parent / "ml" / "model.joblib"

LABELS = {
    "age": "Age", "income": "Annual income", "loan_amount": "Loan amount",
    "interest_rate": "Interest rate", "debt_to_income": "Debt-to-income ratio",
    "credit_utilization": "Credit utilization", "past_delinquencies": "Past delinquencies",
    "credit_history_years": "Credit history length",
}
LOW_T, HIGH_T = 0.15, 0.35


@lru_cache(maxsize=1)
def _load():
    bundle = joblib.load(MODEL_PATH)
    return bundle["model"], bundle["features"], shap.TreeExplainer(bundle["model"])


def risk_band(p: float) -> str:
    return "Low" if p < LOW_T else "Medium" if p < HIGH_T else "High"


def decision_for(band: str) -> str:
    return {"Low": "Approve", "Medium": "Review", "High": "Reject"}[band]


def _reason(feature: str, value, impact: float) -> str:
    direction = "raises" if impact > 0 else "lowers"
    return f"{LABELS[feature]} of {value:g} {direction} default risk"


def score_frame(df: pd.DataFrame, top_n: int = 5) -> list[dict]:
    model, features, explainer = _load()
    X = df[features].astype(float)
    probs = model.predict_proba(X)[:, 1]
    shap_vals = explainer.shap_values(X)
    results = []
    for i in range(len(X)):
        order = np.argsort(-np.abs(shap_vals[i]))[:top_n]
        factors = [{"feature": features[j], "label": LABELS[features[j]],
                    "impact": round(float(shap_vals[i][j]), 4),
                    "reason": _reason(features[j], X.iloc[i][features[j]], shap_vals[i][j])}
                   for j in order]
        p = float(probs[i])
        band = risk_band(p)
        results.append({"default_probability": round(p, 4), "risk_band": band,
                        "decision": decision_for(band), "factors": factors})
    return results
