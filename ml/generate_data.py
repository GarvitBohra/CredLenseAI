"""Generate a synthetic, realistic loan dataset with default labels."""
import numpy as np
import pandas as pd
from pathlib import Path

FEATURES = ["age", "income", "loan_amount", "interest_rate", "debt_to_income",
            "credit_utilization", "past_delinquencies", "credit_history_years"]


def generate(n=8000, seed=42):
    rng = np.random.default_rng(seed)
    age = rng.integers(21, 66, n)
    income = np.clip(rng.lognormal(10.9, 0.5, n), 15000, 400000).round(-2)
    loan_amount = np.clip(income * rng.uniform(0.1, 1.2, n), 2000, 150000).round(-2)
    credit_history_years = np.clip((age - 18) * rng.uniform(0.1, 0.8, n), 0, 40).round(1)
    credit_utilization = np.clip(rng.beta(2, 3, n) * 100, 0, 100).round(1)
    debt_to_income = np.clip(rng.normal(30, 12, n), 3, 80).round(1)
    past_delinquencies = rng.poisson(0.6, n)
    interest_rate = np.clip(6 + credit_utilization * 0.05 + past_delinquencies * 1.5
                            + rng.normal(0, 1.5, n), 5, 30).round(2)
    logit = (-5.6 + 0.035 * debt_to_income + 0.03 * credit_utilization
             + 0.55 * past_delinquencies + 0.08 * interest_rate
             - 0.00000 * income - 0.06 * credit_history_years
             + 1.2 * (loan_amount / income) - 0.01 * (age - 40))
    p = 1 / (1 + np.exp(-logit))
    default = (rng.random(n) < p).astype(int)
    return pd.DataFrame(dict(age=age, income=income, loan_amount=loan_amount,
                             interest_rate=interest_rate, debt_to_income=debt_to_income,
                             credit_utilization=credit_utilization,
                             past_delinquencies=past_delinquencies,
                             credit_history_years=credit_history_years, default=default))


if __name__ == "__main__":
    out = Path(__file__).parent / "loans.csv"
    df = generate()
    df.to_csv(out, index=False)
    print(f"Wrote {len(df)} rows to {out}; default rate = {df['default'].mean():.1%}")
