from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.agents.resume_optimizer import build_resume_optimizer_graph
from app.models.schemas import OptimizeRequest, OptimizeResponse, PdfRequest
from app.tools.pdf_tools import build_resume_pdf


router = APIRouter(prefix="/api/analyze", tags=["analysis"])


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize_resume(payload: OptimizeRequest) -> OptimizeResponse:
    try:
        graph = build_resume_optimizer_graph()
        result = await graph.ainvoke(
            {
                "job_post_text": payload.jobPostText,
                "resume_text": payload.resumeText,
                "mode": payload.mode,
                "tone": payload.options.tone,
                "length": payload.options.length,
            }
        )
    except Exception as e:
        msg = str(e)
        if "RESOURCE_EXHAUSTED" in msg or "429" in msg or "quota" in msg.lower():
            raise HTTPException(
                status_code=503,
                detail="Gemini API quota exceeded. Please check billing/rate limits and retry.",
            )
        raise HTTPException(status_code=500, detail=msg)

    return OptimizeResponse(
        optimizedResumeText=result.get("optimized_resume_text", ""),
        extractedKeywords=result.get("extracted_keywords", []),
    )


@router.post("/pdf")
async def generate_pdf(payload: PdfRequest) -> Response:
    try:
        pdf_bytes = build_resume_pdf(title=payload.title, content=payload.content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    headers = {"Content-Disposition": f"attachment; filename=\"{payload.title}.pdf\""}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
