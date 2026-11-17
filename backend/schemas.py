from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    full_name: str = ""
    org_name: str = ""


class BorrowerInput(BaseModel):
    borrower_name: str = ""
    age: int = Field(ge=18, le=100)
    income: float = Field(gt=0)
    loan_amount: float = Field(gt=0)
    interest_rate: float = Field(ge=0, le=60)
    debt_to_income: float = Field(ge=0, le=200)
    credit_utilization: float = Field(ge=0, le=100)
    past_delinquencies: int = Field(ge=0)
    credit_history_years: float = Field(ge=0)


class Factor(BaseModel):
    feature: str
    label: str
    impact: float
    reason: str


class PredictionResult(BaseModel):
    default_probability: float
    risk_band: str
    decision: str
    factors: list[Factor]


class LoanOut(BaseModel):
    id: int
    borrower_name: str
    age: int
    income: float
    loan_amount: float
    interest_rate: float
    debt_to_income: float
    credit_utilization: float
    past_delinquencies: int
    credit_history_years: float
    default_probability: float
    risk_band: str
    decision: str
    explanation: Optional[list[Factor]] = None
    created_at: datetime

    model_config = {"from_attributes": True}
