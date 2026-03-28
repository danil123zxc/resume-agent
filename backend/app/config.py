from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_api_key: str
    gemini_model: str = "gemini-2.5-pro"
    supabase_url: str
    supabase_anon_key: str
    frontend_origin: str = "http://localhost:3000"
    frontend_origin_regex: str | None = None


settings = Settings()
