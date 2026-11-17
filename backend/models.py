from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, JSON
from database import Base


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, default="")
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)


class Loan(Base):
    __tablename__ = "loans"
    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), index=True, nullable=False)
    borrower_name = Column(String, default="")
    age = Column(Integer)
    income = Column(Float)
    loan_amount = Column(Float)
    interest_rate = Column(Float)
    debt_to_income = Column(Float)
    credit_utilization = Column(Float)
    past_delinquencies = Column(Integer)
    credit_history_years = Column(Float)
    default_probability = Column(Float)
    risk_band = Column(String, index=True)
    decision = Column(String)
    explanation = Column(JSON)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))  # naive UTC
