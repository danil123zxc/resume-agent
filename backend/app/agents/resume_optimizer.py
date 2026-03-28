from functools import lru_cache
from pathlib import Path
from typing import TypedDict

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage
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


@lru_cache(maxsize=1)
def _load_agent_skills() -> list[str]:
    skills_root = Path(__file__).resolve().parent / "skills"
    if not skills_root.exists():
        return []
    loaded_skills: list[str] = []
    for skill_file in sorted(skills_root.glob("*/SKILL.md")):
        skill_dir = skill_file.parent
        skill_text = skill_file.read_text(encoding="utf-8").strip()
        extra_chunks: list[str] = []
        for section in ("references", "assets"):
            section_dir = skill_dir / section
            if not section_dir.exists():
                continue
            for md_file in sorted(section_dir.glob("*.md")):
                md_text = md_file.read_text(encoding="utf-8").strip()
                if md_text:
                    extra_chunks.append(f"{md_file.name}\n{md_text[:4000]}")
        if extra_chunks:
            loaded_skills.append(f"{skill_text}\n\n" + "\n\n".join(extra_chunks))
        else:
            loaded_skills.append(skill_text)
    return loaded_skills


async def _run_text_agent(*, system_prompt: str, prompt: str) -> str:
    skills = _load_agent_skills()
    try:
        agent = create_agent(
            model=get_llm(),
            tools=[],
            system_prompt=system_prompt,
            skills=skills,
        )
    except TypeError:
        combined_system = system_prompt
        if skills:
            combined_system = (
                f"{system_prompt}\n\nUse these installed skills as operating guidance:\n\n"
                + "\n\n".join(skills)
            )
        agent = create_agent(model=get_llm(), tools=[], system_prompt=combined_system)
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


async def _extract_keywords(state: ResumeState) -> ResumeState:
    prompt = (
        "Extract 15-25 ATS-friendly resume keywords from this job posting. "
        "Return ONLY a comma-separated list of keywords, no extra text.\n\n"
        f"JOB POSTING:\n{state['job_post_text']}"
    )
    raw = await _run_text_agent(
        system_prompt="You extract ATS-friendly keywords from job postings.",
        prompt=prompt,
    )
    keywords = [k.strip() for k in raw.split(",") if k.strip()]
    return {"extracted_keywords": keywords[:30]}


async def _rewrite_resume(state: ResumeState) -> ResumeState:
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

    optimized = await _run_text_agent(system_prompt=system, prompt=human)
    return {"optimized_resume_text": optimized}


def build_resume_optimizer_graph():
    graph = StateGraph(ResumeState)
    graph.add_node("extract_keywords", _extract_keywords)
    graph.add_node("rewrite_resume", _rewrite_resume)

    graph.set_entry_point("extract_keywords")
    graph.add_edge("extract_keywords", "rewrite_resume")
    graph.add_edge("rewrite_resume", END)
    return graph.compile()
