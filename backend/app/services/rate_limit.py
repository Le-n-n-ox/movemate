"""Rate limiting for public endpoints.

In-memory rate limiter with per-IP tracking.
For production, replace with Redis or database-backed limiter.
"""
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict

from fastapi import HTTPException, Request


@dataclass
class RateLimitEntry:
    count: int
    window_start: float


class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 3600):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._entries: Dict[str, RateLimitEntry] = defaultdict(lambda: RateLimitEntry(0, time.time()))
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request."""
        # Check X-Forwarded-For header (for proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        # Fall back to client host
        if request.client:
            return request.client.host
        return "unknown"
    
    def _cleanup_old_entries(self):
        """Remove entries older than the window."""
        now = time.time()
        expired = [ip for ip, entry in self._entries.items() 
                   if now - entry.window_start > self.window_seconds]
        for ip in expired:
            del self._entries[ip]
    
    def check(self, request: Request) -> None:
        """Check if request is allowed. Raises HTTPException 429 if rate limited."""
        self._cleanup_old_entries()
        
        client_ip = self._get_client_ip(request)
        entry = self._entries[client_ip]
        now = time.time()
        
        # Reset window if expired
        if now - entry.window_start > self.window_seconds:
            entry.count = 0
            entry.window_start = now
        
        if entry.count >= self.max_requests:
            retry_after = int(self.window_seconds - (now - entry.window_start))
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)}
            )
        
        entry.count += 1


# Global rate limiter for guest endpoint: 10 requests per hour per IP
guest_rate_limiter = RateLimiter(max_requests=10, window_seconds=3600)
