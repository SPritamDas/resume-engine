from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.core.config import settings
from app.routers import auth, resume, payment

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resume Improvement Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(resume.router, prefix="/api", tags=["resume"])
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])

@app.get("/health")
def health():
    return {"status": "ok"}
