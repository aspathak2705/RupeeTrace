import os
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel, Field

# Load .env before accessing environment variables
try:
    from dotenv import load_dotenv
    # Root directory resolution
    _root_dir = Path(__file__).resolve().parent.parent.parent
    _env_file = _root_dir / ".env"
    if _env_file.exists():
        load_dotenv(dotenv_path=_env_file)
    else:
        load_dotenv()
except ImportError:
    pass

def _resolve_path(raw_path: str, base_dir: Path) -> Path:
    p = Path(raw_path)
    if p.is_absolute():
        return p
    return (base_dir / p).resolve()

def _parse_cors_origins(raw: str) -> List[str]:
    if not raw:
        return ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://localhost:8000"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

class Settings(BaseModel):
    PROJECT_NAME: str = "RupeeTrace Backend API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Server configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    # CORS origins
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: _parse_cors_origins(os.getenv("CORS_ORIGINS", ""))
    )

    # Path configuration
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = Field(
        default_factory=lambda: _resolve_path(
            os.getenv("DATA_DIR", "Claude-Impact-Labs-data-2/data"),
            Path(__file__).resolve().parent.parent.parent
        )
    )
    CACHE_DIR: Path = Field(
        default_factory=lambda: _resolve_path(
            os.getenv("CACHE_DIR", "rupeetrace/data/cache"),
            Path(__file__).resolve().parent.parent.parent
        )
    )

    # Optional AI assistant integration
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY") or None

    def validate_paths(self):
        """Validates that critical dataset directory exists with actionable error."""
        if not self.DATA_DIR.exists():
            raise FileNotFoundError(
                f"RupeeTrace DATA_DIR not found at '{self.DATA_DIR}'. "
                "Ensure datasets are present or update DATA_DIR in .env."
            )

    def __repr__(self) -> str:
        # Prevent secrets from leaking in string representations
        return (
            f"Settings(PROJECT_NAME='{self.PROJECT_NAME}', "
            f"HOST='{self.HOST}', PORT={self.PORT}, DEBUG={self.DEBUG}, "
            f"DATA_DIR='{self.DATA_DIR}', ANTHROPIC_API_KEY={'***' if self.ANTHROPIC_API_KEY else None})"
        )

settings = Settings()
