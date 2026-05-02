import google.generativeai as genai
from app.core.config import settings
from typing import List

genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def rewrite_bullets(bullets: List[str]) -> List[str]:
    if not bullets:
        return []

    prompt = """You are an elite resume writer. Rewrite these bullets using:
"Accomplished X by doing Y, resulting in Z"

Rules:
- Use strong action verbs
- Include realistic metrics if missing
- Keep 1-2 lines max
- Do NOT invent tools not mentioned
- Return ONLY the rewritten bullets, one per line, numbered.

Bullets:
"""
    for i, b in enumerate(bullets, 1):
        prompt += f"{i}. {b}\n"

    try:
        response = model.generate_content(prompt)
        text = response.text
        rewritten = []
        for line in text.split("\n"):
            line = line.strip()
            if line and line[0].isdigit() and "." in line:
                cleaned = line.split(".", 1)[-1].strip()
                if cleaned:
                    rewritten.append(cleaned)
        return rewritten if rewritten else bullets
    except Exception:
        return [f"Enhanced: {b}" for b in bullets]
