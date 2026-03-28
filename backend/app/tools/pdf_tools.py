from io import BytesIO

from fpdf import FPDF


def build_resume_pdf(*, title: str, content: str) -> bytes:
    pdf = FPDF(unit="pt", format="Letter")
    pdf.set_auto_page_break(auto=True, margin=48)
    pdf.add_page()

    pdf.set_font("Helvetica", style="B", size=16)
    pdf.multi_cell(w=0, h=22, txt=title)
    pdf.ln(10)

    pdf.set_font("Helvetica", size=11)
    for line in content.splitlines():
        txt = line.rstrip("\n")
        if not txt.strip():
            pdf.ln(8)
            continue
        pdf.multi_cell(w=0, h=16, txt=txt)

    buffer = BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()

