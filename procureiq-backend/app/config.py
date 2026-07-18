"""Application settings — driven by environment variables via Pydantic Settings."""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    # ── Application ──────────────────────────────────────────────────────────
    APP_NAME: str = "ProcureIQ"
    ENVIRONMENT: str = "development"  # development | staging | production
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # Set to False in production to hide /docs and /redoc
    SHOW_API_DOCS: bool = True

    # ── Email / SMTP ──────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""              # e.g. notifications@procureiq.ai
    SMTP_PASSWORD: str = ""          # App password / SMTP credential
    SMTP_FROM: str = "ProcureIQ <notifications@procureiq.ai>"
    SMTP_ENABLED: bool = False       # Set True once SMTP creds are configured
    # Frontend base URL — used to construct password-reset links
    FRONTEND_URL: str = "http://localhost:3000"
    # Password-reset tokens expire after this many minutes
    RESET_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://procureiq:procureiq@localhost:5432/procureiq"

    # ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Storage (provider-agnostic) ───────────────────────────────────────────
    # STORAGE_PROVIDER: local | s3 | ibm_cos
    # - local:   files saved to STORAGE_LOCAL_PATH on disk (default for dev)
    # - s3:      AWS S3 / MinIO / any S3-compatible store
    # - ibm_cos: IBM Cloud Object Storage (S3-compatible, separate endpoint)
    STORAGE_PROVIDER: str = "local"          # override in production
    STORAGE_LOCAL_PATH: str = "/tmp/procureiq-uploads"
    STORAGE_BUCKET: str = "procureiq-documents"
    STORAGE_ENDPOINT_URL: str = ""           # e.g. http://minio:9000 or IBM COS endpoint
    STORAGE_ACCESS_KEY: str = ""
    STORAGE_SECRET_KEY: str = ""
    STORAGE_REGION: str = "us-south"         # IBM COS default; use us-east-1 for AWS
    STORAGE_PRESIGN_EXPIRY: int = 3600       # seconds

    # ── Legacy MinIO vars (backwards-compat, maps to STORAGE_* at runtime) ───
    MINIO_ENDPOINT: str = ""
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET: str = ""

    # ── IBM watsonx ───────────────────────────────────────────────────────────
    WATSONX_API_KEY: str = ""
    WATSONX_PROJECT_ID: str = ""
    WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"
    WATSONX_MODEL_ID: str = "ibm/granite-13b-chat-v2"

    # ── Ollama (local fallback) ───────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_ENABLED: bool = False   # set True only when Ollama + a model are installed

    # ── Derived helpers (not env vars) ───────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def api_docs_enabled(self) -> bool:
        """Docs are shown in development; hidden in production unless SHOW_API_DOCS=true."""
        if self.ENVIRONMENT.lower() == "development":
            return True
        return self.SHOW_API_DOCS

    @property
    def watsonx_configured(self) -> bool:
        """True only when a real (non-placeholder) API key and project ID are set."""
        placeholders = {"", "your_ibm_cloud_api_key", "your_watsonx_project_id",
                        "<your-api-key>", "CHANGE_ME", "todo"}
        key = self.WATSONX_API_KEY.strip()
        pid = self.WATSONX_PROJECT_ID.strip()
        return bool(key) and key not in placeholders and bool(pid) and pid not in placeholders

    @property
    def ollama_configured(self) -> bool:
        """True only when OLLAMA_ENABLED=true is explicitly set."""
        return self.OLLAMA_ENABLED

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Celery ───────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ── Base currency ─────────────────────────────────────────────────────────
    BASE_CURRENCY: str = "USD"


settings = Settings()
