import os
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User

SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    # Hosted environments (Render sets RENDER, or set ENV=production) must configure a real key
    if os.getenv("RENDER") or os.getenv("ENV", "").lower() == "production":
        raise RuntimeError("SECRET_KEY environment variable is required in production")
    SECRET_KEY = "dev-secret-change-me"   # local development only
ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=False)


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


_DUMMY_HASH = bcrypt.hashpw(b"dummy", bcrypt.gensalt()).decode()


def verify_password_or_dummy(pw: str, hashed: str | None) -> bool:
    """Same bcrypt cost whether or not the user exists."""
    ok = bcrypt.checkpw(pw.encode(), (hashed or _DUMMY_HASH).encode())
    return ok and hashed is not None


def create_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=12)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer),
                 db: Session = Depends(get_db)) -> User:
    if creds is None:
        raise HTTPException(401, "Not authenticated")
    try:
        data = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.get(User, int(data["sub"]))
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    if not user:
        raise HTTPException(401, "User not found")
    return user
