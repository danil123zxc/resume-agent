from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings


def get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        temperature=0.2,
        api_key=settings.google_api_key,
    )
