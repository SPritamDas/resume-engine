from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from io import BytesIO
from typing import List

def wrap_text(c, text, max_width, font_name, font_size):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        if c.stringWidth(current + " " + word, font_name, font_size) < max_width:
            current += " " + word
        else:
            lines.append(current.strip())
            current = word
    if current:
        lines.append(current.strip())
    return lines if lines else [text]

def generate_improved_pdf(original_text: str, rewritten_bullets: List[str], watermark: bool = True) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    if watermark:
        c.saveState()
        c.setFont("Helvetica-Bold", 55)
        c.setFillColorRGB(0.85, 0.85, 0.85, 0.25)
        c.translate(width/2, height/2)
        c.rotate(45)
        c.drawCentredString(0, 0, "NEXTSTEP FREE")
        c.restoreState()

    c.setFont("Helvetica-Bold", 16)
    c.drawString(1*inch, height - 1*inch, "Improved Resume")
    c.setFont("Helvetica", 10)
    y = height - 1.4*inch

    for paragraph in original_text.split("\n"):
        if not paragraph.strip():
            y -= 10
            continue
        wrapped = wrap_text(c, paragraph.strip(), width - 2*inch, "Helvetica", 10)
        for line in wrapped:
            c.drawString(1*inch, y, line)
            y -= 14
            if y < 1.2*inch:
                c.showPage()
                c.setFont("Helvetica", 10)
                y = height - 1*inch

    if rewritten_bullets:
        y -= 20
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1*inch, y, "Suggested Strong Bullets:")
        y -= 18
        c.setFont("Helvetica", 10)
        for bullet in rewritten_bullets:
            wrapped = wrap_text(c, bullet, width - 2.2*inch, "Helvetica", 10)
            c.drawString(1.2*inch, y, "• " + wrapped[0])
            y -= 14
            for wline in wrapped[1:]:
                c.drawString(1.4*inch, y, wline)
                y -= 14
            if y < 1.2*inch:
                c.showPage()
                c.setFont("Helvetica", 10)
                y = height - 1*inch

    c.save()
    buffer.seek(0)
    return buffer.read()
