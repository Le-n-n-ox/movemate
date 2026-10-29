"""Local file storage under DATA_DIR, served at /media. Swap for Supabase Storage later by
keeping these three functions' signatures."""
import uuid
from pathlib import Path

from ..config import settings


def data_root() -> Path:
    root = Path(settings.data_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def save_bytes(subdir: str, data: bytes, ext: str = "jpg") -> str:
    """Save bytes, return the relative path (store this in the DB)."""
    rel = f"{subdir}/{uuid.uuid4().hex}.{ext.lstrip('.')}"
    path = data_root() / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return rel


def read_bytes(rel: str) -> bytes:
    return (data_root() / rel).read_bytes()


def abs_path(rel: str) -> Path:
    return data_root() / rel


def url_for(rel: str | None) -> str | None:
    if not rel:
        return None
    return f"{settings.public_base_url}/media/{rel}"
