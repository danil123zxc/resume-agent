from typing import TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from app.services.llm import get_llm


class ResumeState(TypedDict, total=False):
    job_post_text: str
    resume_text: str
    mode: str
    tone: str
    length: str
    optimized_resume_text: str
    extracted_keywords: list[str]


async def _extract_keywords(state: ResumeState) -> ResumeState:
    llm = get_llm()
    prompt = (
        "Extract 15-25 ATS-friendly resume keywords from this job posting. "
        "Return ONLY a comma-separated list of keywords, no extra text.\n\n"
        f"JOB POSTING:\n{state['job_post_text']}"
    )
    msg = await llm.ainvoke([HumanMessage(content=prompt)])
    raw = (msg.content or "").strip()
    keywords = [k.strip() for k in raw.split(",") if k.strip()]
    return {"extracted_keywords": keywords[:30]}


async def _rewrite_resume(state: ResumeState) -> ResumeState:
    llm = get_llm()

    mode = state.get("mode", "optimize")
    tone = state.get("tone", "balanced")
    length = state.get("length", "1page")
    resume_text = state.get("resume_text", "").strip()

    system = (
        "You are an expert resume writer. "
        "You must not invent employers, degrees, dates, certifications, titles, or metrics. "
        "If information is missing, keep it generic or leave placeholders like [Add metric]. "
        "Output must be plain text, ATS-friendly, with clear section headings."
    )

    if mode == "generate" or not resume_text:
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
        source = resume_text

    human = (
        f"{instruction}\n\n"
        f"JOB POSTING:\n{state['job_post_text']}\n\n"
        f"SOURCE RESUME:\n{source}\n"
    )

    msg = await llm.ainvoke([SystemMessage(content=system), HumanMessage(content=human)])
    optimized = (msg.content or "").strip()
    return {"optimized_resume_text": optimized}


def build_resume_optimizer_graph():
    graph = StateGraph(ResumeState)
    graph.add_node("extract_keywords", _extract_keywords)
    graph.add_node("rewrite_resume", _rewrite_resume)

    graph.set_entry_point("extract_keywords")
    graph.add_edge("extract_keywords", "rewrite_resume")
    graph.add_edge("rewrite_resume", END)
    return graph.compile()

