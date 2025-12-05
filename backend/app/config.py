from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/question_bank"
    
    # File storage
    file_storage_path: str = "./uploads"
    
    # Ollama / LLM
    ollama_base_url: str = "http://localhost:11434"
    llm_model_name: str = "gemma3:12b"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()
