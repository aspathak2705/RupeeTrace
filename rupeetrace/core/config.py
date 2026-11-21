import os
from pathlib import Path
from pydantic import BaseModel, Field

class Settings(BaseModel):
    PROJECT_NAME: str = "RupeeTrace Backend API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = False
    
    # Path configuration
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = Path(os.environ.get("DATA_DIR", BASE_DIR / "Claude-Impact-Labs-data-2" / "data"))

settings = Settings()
