from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.models.schemas import CreateResumeRequest, Resume
from app.services.supabase_rest import SupabaseRestError, rest_delete, rest_get, rest_post
from app.tools.pdf_tools import build_resume_pdf
from app.tools.resume_pdf_reader import extract_text_from_pdf
from app.utils.auth import UserContext, require_user


router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("/parse")
async def parse_resume_pdf(file: UploadFile = File(...)) -> dict[str, str]:
    data = await file.read()
    try:
        text = extract_text_from_pdf(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"resumeText": text}


@router.get("", response_model=list[Resume])
async def list_resumes(ctx: UserContext = Depends(require_user)) -> list[Resume]:
    try:
        rows = await rest_get(
            "resumes",
            access_token=ctx.access_token,
            params={"select": "*", "order": "updated_at.desc"},
        )
        return [Resume(**r) for r in rows]
    except SupabaseRestError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.post("", response_model=Resume)
async def create_resume(payload: CreateResumeRequest, ctx: UserContext = Depends(require_user)) -> Resume:
    body = {
        "user_id": ctx.user_id,
        "job_post_id": payload.job_post_id,
        "title": payload.title,
        "source_text": payload.source_text,
        "optimized_text": payload.optimized_text,
    }
    try:
        rows = await rest_post("resumes", access_token=ctx.access_token, json=body)
        if not rows:
            raise HTTPException(status_code=500, detail="Failed to create resume")
        return Resume(**rows[0])
    except SupabaseRestError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, ctx: UserContext = Depends(require_user)) -> dict[str, str]:
    try:
        await rest_delete(f"resumes?id=eq.{resume_id}", access_token=ctx.access_token)
        return {"status": "ok"}
    except SupabaseRestError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.get("/{resume_id}/pdf")
async def download_resume_pdf(resume_id: str, ctx: UserContext = Depends(require_user)) -> Response:
    try:
        rows = await rest_get(
            "resumes",
            access_token=ctx.access_token,
            params={"select": "*", "id": f"eq.{resume_id}", "limit": "1"},
        )
    except SupabaseRestError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))

    if not rows:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume = Resume(**rows[0])
    pdf_bytes = build_resume_pdf(title=resume.title, content=resume.optimized_text)
    headers = {
        "Content-Disposition": f"attachment; filename=\"{resume.title}.pdf\""
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)

