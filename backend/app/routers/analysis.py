import base64

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.agents.resume_optimizer import build_resume_optimizer_graph
from app.models.schemas import OptimizeRequest, OptimizeResponse, PdfRequest
from app.tools.pdf_tools import build_resume_pdf


router = APIRouter(prefix="/api/analyze", tags=["analysis"])


def _matches_any(message: str, patterns: tuple[str, ...]) -> bool:
    return any(pattern in message for pattern in patterns)


def _is_ai_config_error(message: str) -> bool:
    return _matches_any(
        message,
        (
            "api key required",
            "google_api_key",
            "gemini_api_key",
            "invalid api key",
            "permission denied",
            "unauthorized",
            "model not found",
            "404 models/",
        ),
    )


def _is_ai_quota_error(message: str) -> bool:
    return _matches_any(
        message,
        (
            "resource_exhausted",
            "quota",
            "rate limit",
            "too many requests",
            "429",
        ),
    )


def _is_ai_transient_error(message: str) -> bool:
    return _matches_any(
        message,
        (
            "service unavailable",
            "temporarily unavailable",
            "deadline exceeded",
            "timed out",
            "timeout",
            "connection reset",
            "internal error",
            "upstream",
            "overloaded",
        ),
    )


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
        msg = str(e).strip()
        normalized = msg.lower()
        if _is_ai_config_error(normalized):
            raise HTTPException(
                status_code=503,
                detail="AI service is not configured. Set GOOGLE_API_KEY (or GEMINI_API_KEY) on the backend.",
            )
        if _is_ai_quota_error(normalized):
            raise HTTPException(
                status_code=503,
                detail="Gemini API quota exceeded. Please check billing/rate limits and retry.",
            )
        if _is_ai_transient_error(normalized):
            raise HTTPException(
                status_code=503,
                detail="AI provider is temporarily unavailable. Please retry shortly.",
            )
        raise HTTPException(status_code=500, detail="Failed to optimize resume due to an internal server error.")

    return OptimizeResponse(
        optimizedResumeText=result.get("optimized_resume_text", ""),
        extractedKeywords=result.get("extracted_keywords", []),
        pdfBase64=base64.b64encode(
            build_resume_pdf(title="Optimized Resume", content=result.get("optimized_resume_text", ""))
        ).decode("utf-8"),
        pdfFilename="optimized_resume.pdf",
    )


@router.post("/pdf")
async def generate_pdf(payload: PdfRequest) -> Response:
    try:
        pdf_bytes = build_resume_pdf(title=payload.title, content=payload.content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    headers = {"Content-Disposition": f"attachment; filename=\"{payload.title}.pdf\""}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
