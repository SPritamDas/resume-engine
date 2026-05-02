import fitz
from docx import Document
from io import BytesIO

def parse_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "".join(page.get_text() for page in doc)

def parse_docx(file_bytes: bytes) -> str:
    doc = Document(BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

def parse_resume(file_bytes: bytes, filename: str) -> str:
    fn = filename.lower()
    if fn.endswith(".pdf"):
        return parse_pdf(file_bytes)
    if fn.endswith(".docx"):
        return parse_docx(file_bytes)
    raise ValueError("Only PDF and DOCX files are supported")
