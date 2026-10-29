"""Retention and cleanup jobs for old media files.

Handles automatic cleanup of:
- Audit videos: delete after 30 days
- Guest photos: delete after 24 hours
- Evidence frames: kept (attached to findings)
"""
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Capture, Finding
from ..services import storage


def _get_file_age_days(file_path: str) -> float:
    """Get age of file in days."""
    full_path = storage.abs_path(file_path)
    if not full_path.exists():
        return 0
    mtime = full_path.stat().st_mtime
    return (time.time() - mtime) / (24 * 3600)


def cleanup_guest_photos(db: Session, max_age_days: float = 1.0) -> int:
    """Delete guest photos older than max_age_days.
    
    Returns number of files deleted.
    """
    deleted = 0
    captures = db.query(Capture).filter(Capture.kind == "guest_photo").all()
    
    for capture in captures:
        if capture.media_path and _get_file_age_days(capture.media_path) > max_age_days:
            try:
                full_path = storage.abs_path(capture.media_path)
                if full_path.exists():
                    full_path.unlink()
                    deleted += 1
            except Exception:
                pass
            # Remove capture record
            db.delete(capture)
    
    db.commit()
    return deleted


def cleanup_audit_videos(db: Session, max_age_days: float = 30.0) -> int:
    """Delete audit videos older than max_age_days.
    
    Evidence frames attached to findings are kept.
    Returns number of files deleted.
    """
    deleted = 0
    captures = db.query(Capture).filter(Capture.kind == "audit_video").all()
    
    for capture in captures:
        if capture.media_path and _get_file_age_days(capture.media_path) > max_age_days:
            try:
                full_path = storage.abs_path(capture.media_path)
                if full_path.exists():
                    full_path.unlink()
                    deleted += 1
            except Exception:
                pass
            # Remove capture record (frames may still be referenced by findings)
            db.delete(capture)
    
    db.commit()
    return deleted


def cleanup_audit_frames(db: Session, max_age_days: float = 30.0) -> int:
    """Delete audit frames older than max_age_days, except those referenced by findings.
    
    Returns number of files deleted.
    """
    # Get evidence frame paths from findings
    findings = db.query(Finding).all()
    evidence_paths = set()
    for f in findings:
        if f.evidence_frame_url:
            # Extract path from URL
            path = f.evidence_frame_url.split("/media/")[-1] if "/media/" in f.evidence_frame_url else None
            if path:
                evidence_paths.add(path)
    
    deleted = 0
    captures = db.query(Capture).filter(Capture.kind == "audit_frames").all()
    
    for capture in captures:
        if capture.frame_paths:
            new_paths = []
            for frame_path in capture.frame_paths:
                if frame_path in evidence_paths:
                    new_paths.append(frame_path)
                elif _get_file_age_days(frame_path) > max_age_days:
                    try:
                        full_path = storage.abs_path(frame_path)
                        if full_path.exists():
                            full_path.unlink()
                            deleted += 1
                    except Exception:
                        pass
                else:
                    new_paths.append(frame_path)
            capture.frame_paths = new_paths
    
    db.commit()
    return deleted


def run_retention_cleanup(db: Session) -> dict:
    """Run all retention cleanup tasks.
    
    Returns summary of cleanup results.
    """
    return {
        "guest_photos_deleted": cleanup_guest_photos(db, max_age_days=1.0),
        "audit_videos_deleted": cleanup_audit_videos(db, max_age_days=30.0),
        "audit_frames_deleted": cleanup_audit_frames(db, max_age_days=30.0),
    }
