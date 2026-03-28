from typing import Literal

from pydantic import BaseModel, Field


Tone = Literal["conservative", "balanced", "bold"]
Length = Literal["1page", "2page"]
Mode = Literal["optimize", "generate"]


class JobExtractRequest(BaseModel):
    url: str


class JobExtractResponse(BaseModel):
    title: str = ""
    company: str = ""
    description: str


class OptimizeOptions(BaseModel):
    tone: Tone = "balanced"
    length: Length = "1page"


class OptimizeRequest(BaseModel):
    jobPostText: str = Field(min_length=20)
    resumeText: str = ""
    mode: Mode = "optimize"
    options: OptimizeOptions = OptimizeOptions()


class OptimizeResponse(BaseModel):
    optimizedResumeText: str
    extractedKeywords: list[str] = []
    pdfBase64: str = ""
    pdfFilename: str = "optimized_resume.pdf"


class PdfRequest(BaseModel):
    title: str
    content: str


class CreateJobPostRequest(BaseModel):
    title: str
    company: str | None = None
    url: str | None = None
    description: str


class JobPost(BaseModel):
    id: str
    user_id: str
    title: str
    company: str | None = None
    url: str | None = None
    description: str
    created_at: str
    updated_at: str


class CreateResumeRequest(BaseModel):
    title: str
    job_post_id: str | None = None
    source_text: str
    optimized_text: str


class Resume(BaseModel):
    id: str
    user_id: str
    job_post_id: str | None = None
    title: str
    source_text: str
    optimized_text: str
    created_at: str
    updated_at: str
