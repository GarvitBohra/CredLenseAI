"""Train an XGBoost default-risk model and save it."""
from pathlib import Path
import joblib
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from generate_data import FEATURES

here = Path(__file__).parent
df = pd.read_csv(here / "loans.csv")
X_train, X_test, y_train, y_test = train_test_split(
    df[FEATURES], df["default"], test_size=0.2, random_state=42, stratify=df["default"])
model = XGBClassifier(n_estimators=150, max_depth=3, learning_rate=0.08,
                      subsample=0.9, eval_metric="auc")
model.fit(X_train, y_train)
proba = model.predict_proba(X_test)[:, 1]
auc = roc_auc_score(y_test, proba)
print(f"Test AUC: {auc:.3f}")
joblib.dump({"model": model, "features": FEATURES}, here / "model.joblib")
print("Saved ml/model.joblib")
