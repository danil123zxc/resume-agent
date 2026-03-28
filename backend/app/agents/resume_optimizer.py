from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage

from app.services.llm import get_llm


async def _run_text_agent(*, system_prompt: str, prompt: str) -> str:
    agent = create_agent(model=get_llm(), tools=[], system_prompt=system_prompt)
    result = await agent.ainvoke({"messages": [HumanMessage(content=prompt)]})
    messages = result.get("messages", [])
    ai_messages = [msg for msg in messages if isinstance(msg, AIMessage)]
    if not ai_messages:
        return ""
    content = ai_messages[-1].content
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        text_parts = [part.get("text", "") for part in content if isinstance(part, dict)]
        return "\n".join(p for p in text_parts if p).strip()
    return str(content).strip()


async def extract_keywords(job_post_text: str) -> list[str]:
    llm = get_llm()
    prompt = (
        "Extract 15-25 ATS-friendly resume keywords from this job posting. "
        "Return ONLY a comma-separated list of keywords, no extra text.\n\n"
        f"JOB POSTING:\n{job_post_text}"
    )
    msg = await llm.ainvoke([HumanMessage(content=prompt)])
    raw = (msg.content or "").strip()
    keywords = [k.strip() for k in raw.split(",") if k.strip()]
    return keywords[:30]


async def rewrite_resume_with_agent(
    *, job_post_text: str, resume_text: str, mode: str, tone: str, length: str
) -> str:
    current_resume_text = resume_text.strip()

    system = (
        "You are an expert resume writer. "
        "You must not invent employers, degrees, dates, certifications, titles, or metrics. "
        "If information is missing, keep it generic or leave placeholders like [Add metric]. "
        "Output must be plain text, ATS-friendly, with clear section headings."
    )

    if mode == "generate" or not current_resume_text:
        instruction = (
            "Create a new resume from scratch tailored to the job posting. "
            "Use this structure: SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION. "
            "Keep it concise for the requested length. "
            f"Tone: {tone}. Target length: {length}."
        )
        source = "(No existing resume provided.)"
    else:
        instruction = (
            "Rewrite and optimize the provided resume to match the job posting. "
            "Preserve truthful information and improve wording and relevance. "
            "Improve bullet points using action verbs and quantified impact placeholders when needed. "
            f"Tone: {tone}. Target length: {length}."
        )
        source = current_resume_text

    prompt = (
        f"{instruction}\n\n"
        f"JOB POSTING:\n{job_post_text}\n\n"
        f"SOURCE RESUME:\n{source}\n"
    )

    return await _run_text_agent(system_prompt=system, prompt=prompt)
