"""
Lightweight security helpers.

This project currently runs without real user authentication.
To prevent accidental/hostile destructive actions in production, we protect
dangerous endpoints with a single admin key stored in env.
"""

import os
from fastapi import Header, HTTPException


def require_admin_key(x_flux_admin_key: str | None = Header(default=None)) -> None:
    """
    Require `X-Flux-Admin-Key` header to match `FLUX_ADMIN_KEY` env var.

    If `FLUX_ADMIN_KEY` is not set, the endpoint is disabled (safer default).
    """
    expected = os.getenv("FLUX_ADMIN_KEY", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="Admin operations are disabled")

    provided = (x_flux_admin_key or "").strip()
    if provided != expected:
        raise HTTPException(status_code=401, detail="Invalid admin key")

