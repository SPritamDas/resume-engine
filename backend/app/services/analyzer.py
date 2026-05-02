import re
from typing import List, Dict

WEAK_VERBS = {"worked", "helped", "assisted", "did", "made", "was", "were", "had", "has", "got"}
STRONG_VERBS = {"built", "developed", "designed", "implemented", "led", "created", "engineered", "optimized", "architected", "delivered", "achieved", "spearheaded", "revamped"}

def extract_bullets(text: str) -> List[str]:
    lines = text.split("\n")
    bullets = []
    for line in lines:
        line = line.strip()
        if line and (line.startswith(("•", "-", "*", "▸", "›")) or re.match(r"^\d+\.", line)):
            bullets.append(line.lstrip("•-*▸› ").strip())
    return bullets

def has_quantification(text: str) -> bool:
    return bool(re.search(r'\d+%?|\$\d+|₹\d+|percent|times|x\s*\d|fold|hours|days|users|customers', text, re.IGNORECASE))

def check_sections(text: str) -> Dict[str, bool]:
    t = text.lower()
    return {
        "skills": any(k in t for k in ["skills", "technologies", "tools", "tech stack"]),
        "experience": "experience" in t or "employment" in t,
        "education": "education" in t or "academic" in t,
        "projects": "projects" in t or "project" in t,
        "summary": any(k in t for k in ["summary", "objective", "profile", "about"]),
    }

def analyze_resume(text: str) -> Dict:
    bullets = extract_bullets(text)
    sections = check_sections(text)
    problems = []
    suggestions = []
    score = 100

    missing = [k for k, v in sections.items() if not v]
    if missing:
        problems.append(f"Missing sections: {', '.join(missing)}")
        score -= len(missing) * 8

    weak_bullets = []
    unquantified = []

    for b in bullets:
        words = b.lower().split()
        if any(w in WEAK_VERBS for w in words[:3]):
            weak_bullets.append(b)
        if not has_quantification(b):
            unquantified.append(b)

    if weak_bullets:
        problems.append(f"{len(weak_bullets)} weak bullet(s) using passive verbs")
        suggestions.append("Start bullets with strong verbs: Built, Developed, Led, Engineered, Optimized")
        score -= min(len(weak_bullets) * 5, 25)

    if unquantified:
        problems.append(f"{len(unquantified)} bullet(s) lack measurable impact")
        suggestions.append("Add metrics: % improvement, $ saved, time reduced, users impacted")
        score -= min(len(unquantified) * 5, 25)

    if len(bullets) < 3 and sections.get("experience"):
        problems.append("Too few bullet points under experience")
        score -= 10

    wc = len(text.split())
    if wc < 150:
        problems.append("Resume content is too short")
        score -= 10
    elif wc > 1000:
        problems.append("Resume is very long; consider condensing to 1 page")
        score -= 5

    score = max(0, min(100, score))

    return {
        "score": score,
        "problems": problems[:5],
        "suggestions": suggestions[:5],
        "weak_bullets": weak_bullets[:5],
        "unquantified": unquantified[:5],
        "total_bullets": len(bullets),
        "sections": sections,
    }
