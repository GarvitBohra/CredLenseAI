# Build from the repo root: docker build -f backend/Dockerfile .
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir --upgrade pip
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY ml/model.joblib ml/loans.csv ml/
COPY backend backend
WORKDIR /app/backend
EXPOSE 8000
CMD ["sh", "-c", "python seed.py && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
