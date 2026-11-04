"""Turn a video into keyframes with ffmpeg (installed in the backend image)."""
import subprocess
import tempfile
from pathlib import Path

from ..config import settings
from . import storage


def video_duration_seconds(video_bytes: bytes, ext: str = "mp4") -> float | None:
    with tempfile.TemporaryDirectory() as d:
        src = Path(d) / f"in.{ext}"
        src.write_bytes(video_bytes)
        try:
            proc = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)], capture_output=True, text=True, timeout=20)
            return float(proc.stdout.strip()) if proc.returncode == 0 and proc.stdout.strip() else None
        except Exception:
            return None


def extract_frames(video_bytes: bytes, fps: float | None = None, max_frames: int | None = None, ext: str = "mp4") -> list[str]:
    """Return relative paths of saved JPEG frames."""
    fps = fps or settings.frames_per_second
    max_frames = max_frames or settings.max_frames_per_room
    with tempfile.TemporaryDirectory() as d:
        src = Path(d) / f"in.{ext}"
        src.write_bytes(video_bytes)
        out_pattern = str(Path(d) / "f_%04d.jpg")
        cmd = ["ffmpeg", "-loglevel", "error", "-i", str(src), "-vf", f"fps={fps},scale='min(1280,iw)':-2",
               "-frames:v", str(max_frames), "-q:v", "3", out_pattern]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        except subprocess.TimeoutExpired:
            raise RuntimeError("We could not process that video")
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {proc.stderr[:300]}")
        files = sorted(Path(d).glob("f_*.jpg"))
        return [storage.save_bytes("frames", f.read_bytes()) for f in files]
