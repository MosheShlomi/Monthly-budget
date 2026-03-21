from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "onboarding@resend.dev"
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
