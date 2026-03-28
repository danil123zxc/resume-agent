from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.analysis import router as analysis_router
from app.routers.jobs import router as jobs_router
from app.routers.resumes import router as resumes_router


app = FastAPI(title="JobHunt AI API")

allowed_origins = [origin.strip() for origin in settings.frontend_origin.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["http://localhost:3000"],
    allow_origin_regex=settings.frontend_origin_regex,
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)

app.include_router(analysis_router)
app.include_router(jobs_router)
app.include_router(resumes_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
