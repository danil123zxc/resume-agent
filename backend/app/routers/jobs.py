from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import CreateJobPostRequest, JobExtractRequest, JobExtractResponse, JobPost
from app.services.supabase_rest import SupabaseRestError, rest_delete, rest_get, rest_post
from app.tools.scraper_tools import scrape_job_text
from app.utils.auth import UserContext, require_user


router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("/extract", response_model=JobExtractResponse)
async def extract_job(payload: JobExtractRequest) -> JobExtractResponse:
    text = await scrape_job_text(payload.url)
    return JobExtractResponse(description=text)


@router.get("", response_model=list[JobPost])
async def list_jobs(ctx: UserContext = Depends(require_user)) -> list[JobPost]:
    try:
        rows = await rest_get(
            "job_posts",
            access_token=ctx.access_token,
            params={"select": "*", "order": "updated_at.desc"},
        )
        return [JobPost(**r) for r in rows]
    except SupabaseRestError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.post("", response_model=JobPost)
async def create_job(
    payload: CreateJobPostRequest,
    ctx: UserContext = Depends(require_user),
) -> JobPost:
    body = {
        "user_id": ctx.user_id,
        "title": payload.title,
        "company": payload.company,
        "url": payload.url,
        "description": payload.description,
    }
    try:
        rows = await rest_post("job_posts", access_token=ctx.access_token, json=body)
        if not rows:
            raise HTTPException(status_code=500, detail="Failed to create job post")
        return JobPost(**rows[0])
    except SupabaseRestError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))


@router.delete("/{job_id}")
async def delete_job(job_id: str, ctx: UserContext = Depends(require_user)) -> dict[str, str]:
    try:
        await rest_delete(f"job_posts?id=eq.{job_id}", access_token=ctx.access_token)
        return {"status": "ok"}
    except SupabaseRestError as e:
        raise HTTPException(status_code=e.status_code or 500, detail=str(e))

