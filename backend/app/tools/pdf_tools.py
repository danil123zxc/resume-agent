import os
from functools import lru_cache
from io import BytesIO
from pathlib import Path

from fpdf import FPDF


@lru_cache(maxsize=1)
def _resolve_unicode_font_path() -> str | None:
    env_path = os.getenv("RESUME_PDF_FONT_PATH", "").strip()
    candidates = [
        env_path,
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJKkr-Regular.otf",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    return None


def _set_pdf_font(pdf: FPDF, *, size: int, emphasize: bool = False) -> bool:
    unicode_font_path = _resolve_unicode_font_path()
    if unicode_font_path:
        try:
            pdf.add_font("ResumeUnicode", fname=unicode_font_path)
        except Exception:
            pass
        try:
            pdf.set_font("ResumeUnicode", size=size)
            return True
        except Exception:
            pass
    pdf.set_font("Helvetica", style="B" if emphasize else "", size=size)
    return False


def _to_latin_fallback(text: str) -> str:
    return text.encode("latin-1", "replace").decode("latin-1")


def _usable_width(pdf: FPDF) -> float:
    return float(getattr(pdf, "epw", pdf.w - pdf.l_margin - pdf.r_margin))


def _write_line(pdf: FPDF, *, line_height: int, text: str) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(w=_usable_width(pdf), h=line_height, txt=text, new_x="LMARGIN", new_y="NEXT")


def build_resume_pdf(*, title: str, content: str) -> bytes:
    pdf = FPDF(unit="pt", format="Letter")
    pdf.set_auto_page_break(auto=True, margin=48)
    pdf.add_page()

    supports_unicode = _set_pdf_font(pdf, size=16, emphasize=True)
    title_text = title.strip() or "Resume"
    _write_line(pdf, line_height=22, text=title_text if supports_unicode else _to_latin_fallback(title_text))
    pdf.ln(10)

    supports_unicode = _set_pdf_font(pdf, size=11)
    for line in content.splitlines():
        txt = line.rstrip("\n")
        if not txt.strip():
            pdf.ln(8)
            continue
        _write_line(pdf, line_height=16, text=txt if supports_unicode else _to_latin_fallback(txt))

    buffer = BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()
