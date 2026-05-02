import difflib
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models import User, Resume, Usage
from app.services.parser import parse_resume
from app.services.analyzer import analyze_resume
from app.services.rewriter import rewrite_bullets
from app.services.pdf_generator import generate_improved_pdf
from typing import List
from fastapi.responses import StreamingResponse
import io

router = APIRouter()

def check_usage(user: User, db: Session, scan_type: str = "scan") -> bool:
    if user.is_paid and user.paid_until and user.paid_until > datetime.utcnow():
        return True
    usage = db.query(Usage).filter(Usage.user_id == user.id).first()
    if not usage:
        usage = Usage(user_id=user.id)
        db.add(usage)
        db.commit()
        db.refresh(usage)
    if scan_type == "scan" and usage.scans_used >= 3:
        return False
    if scan_type == "jd" and usage.jd_matches_used >= 1:
        return False
    return True

def increment_usage(user: User, db: Session, scan_type: str = "scan"):
    usage = db.query(Usage).filter(Usage.user_id == user.id).first()
    if not usage:
        return
    if scan_type == "scan":
        usage.scans_used += 1
    elif scan_type == "jd":
        usage.jd_matches_used += 1
    db.commit()

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not check_usage(user, db, "scan"):
        raise HTTPException(status_code=403, detail="Free scan limit reached. Upgrade to continue.")

    contents = await file.read()
    try:
        text = parse_resume(contents, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Resume similarity check (soft abuse control)
    previous = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.id.desc()).first()
    if previous:
        similarity = difflib.SequenceMatcher(None, previous.content_text, text).ratio()
        if similarity > 0.88:
            return {
                "resume_id": previous.id,
                "text_preview": text[:500],
                "message": "Similar resume detected. Reusing previous analysis."
            }

    resume = Resume(user_id=user.id, content_text=text, file_name=file.filename)
    db.add(resume)
    db.commit()
    db.refresh(resume)
    increment_usage(user, db, "scan")
    return {"resume_id": resume.id, "text_preview": text[:500]}

@router.post("/analyze/{resume_id}")
async def analyze(
    resume_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    result = analyze_resume(resume.content_text)
    resume.score = result["score"]
    db.commit()
    return result

@router.post("/rewrite")
async def rewrite(
    bullets: List[str],
    user: User = Depends(get_current_user)
):
    if not (user.is_paid and user.paid_until and user.paid_until > datetime.utcnow()):
        raise HTTPException(status_code=403, detail="Upgrade to unlock AI rewrites")
    rewritten = rewrite_bullets(bullets)
    return {"rewritten": rewritten}

@router.post("/jd-match")
async def jd_match(
    resume_id: int,
    jd_text: str = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not check_usage(user, db, "jd"):
        raise HTTPException(status_code=403, detail="Free JD match limit reached.")
    
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    jd_words = set(re.findall(r'\b[a-zA-Z+#.]+\b', jd_text.lower()))
    resume_words = set(re.findall(r'\b[a-zA-Z+#.]+\b', resume.content_text.lower()))
    jd_keywords = {w for w in jd_words if len(w) > 2 and w not in {"and", "the", "for", "with", "you", "will", "are", "our", "job", "work"}}
    
    matched = jd_keywords & resume_words
    missing = jd_keywords - resume_words
    match_pct = int((len(matched) / len(jd_keywords)) * 100) if jd_keywords else 0
    
    increment_usage(user, db, "jd")
    return {
        "match_percentage": min(100, match_pct),
        "matched_keywords": list(matched)[:20],
        "missing_keywords": list(missing)[:20]
    }

@router.post("/download/{resume_id}")
async def download_resume(
    resume_id: int,
    rewritten_bullets: List[str] | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    watermark = not (user.is_paid and user.paid_until and user.paid_until > datetime.utcnow())
    pdf_bytes = generate_improved_pdf(resume.content_text, rewritten_bullets or [], watermark)
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=nextstep_resume_{resume_id}.pdf"}
    )
