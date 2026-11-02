from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Default data dir: project root/data (works both locally and in Docker)
_DEFAULT_DATA_DIR = str(Path(__file__).resolve().parent.parent.parent / "data")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    database_url: str = f"sqlite:///{Path(__file__).resolve().parent.parent.parent / 'movemate.db'}"
    data_dir: str = _DEFAULT_DATA_DIR
    public_base_url: str = "http://localhost:8000"
    frontend_origin: str = "http://localhost:3000"

    mock_models: bool = True
    meta_api_base: str = ""
    meta_api_key: str = ""
    meta_segment_model: str = "sam-3.1"
    meta_label_model: str = "muse-image"
    meta_reason_model: str = "muse-spark"
    vision_llm_url: str = ""
    vision_llm_key: str = ""

    frames_per_second: float = 2
    max_frames_per_room: int = 40
    max_segments_per_image: int = 20
    min_missing_confidence: float = 0.7
    min_misplaced_confidence: float = 0.6
    audit_mode: str = "normal"  # "normal" or "direct" (skip frame labeling, use evenly spread frames)


settings = Settings()
