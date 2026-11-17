import io
import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///./test_credlens.db"
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient

import seed
from main import app

BORROWER = {"borrower_name": "Test User", "age": 35, "income": 60000, "loan_amount": 20000,
            "interest_rate": 12, "debt_to_income": 40, "credit_utilization": 70,
            "past_delinquencies": 2, "credit_history_years": 5}


@pytest.fixture(scope="module")
def client():
    seed.seed()
    with TestClient(app) as c:
        yield c
    from database import engine
    engine.dispose()
    Path("test_credlens.db").unlink(missing_ok=True)


def login(client, email="demo@credlens.ai"):
    r = client.post("/auth/login", json={"email": email, "password": "demo123"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_login_required(client):
    assert client.get("/portfolio/summary").status_code == 401
    assert client.post("/predict", json=BORROWER).status_code == 401


def test_bad_login(client):
    r = client.post("/auth/login", json={"email": "demo@credlens.ai", "password": "wrong"})
    assert r.status_code == 401


def test_predict_returns_probability_and_five_factors(client):
    r = client.post("/predict", json=BORROWER, headers=login(client))
    assert r.status_code == 200
    body = r.json()
    assert 0 <= body["default_probability"] <= 1
    assert body["risk_band"] in ("Low", "Medium", "High")
    assert len(body["factors"]) == 5


def test_upload_count_matches_and_updates_summary(client):
    h = login(client)
    before = client.get("/portfolio/summary", headers=h).json()["total_loans"]
    csv = "age,income,loan_amount,interest_rate,debt_to_income,credit_utilization,past_delinquencies,credit_history_years\n"
    csv += "30,50000,10000,10,30,40,0,6\n45,90000,30000,14,50,80,3,12\n"
    r = client.post("/portfolio/upload", files={"file": ("l.csv", io.BytesIO(csv.encode()), "text/csv")}, headers=h)
    assert r.json()["imported"] == 2
    assert client.get("/portfolio/summary", headers=h).json()["total_loans"] == before + 2


def test_upload_rejects_missing_columns(client):
    r = client.post("/portfolio/upload", files={"file": ("l.csv", io.BytesIO(b"age\n30\n"), "text/csv")},
                    headers=login(client))
    assert r.status_code == 400


def test_org_isolation(client):
    h1, h2 = login(client), login(client, "other@credlens.ai")
    loan_id = client.get("/portfolio/loans?limit=1", headers=h1).json()[0]["id"]
    assert client.get(f"/portfolio/loans/{loan_id}", headers=h1).status_code == 200
    assert client.get(f"/portfolio/loans/{loan_id}", headers=h2).status_code == 404
