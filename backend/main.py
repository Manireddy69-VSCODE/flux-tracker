"""
Main FastAPI application - FLUX AI Backend (Supabase Postgres)
"""
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from typing import Dict, Any
import os
import json
from datetime import datetime
from urllib import request as urllib_request
from urllib.error import URLError, HTTPError

from backend.database import init_db, get_db
from backend import models, schemas
from backend.routes import chat, words, library, workouts

load_dotenv()

app = FastAPI(
    title="FLUX AI Backend",
    description="Full-stack AI hobby tracker",
    version="1.0.0"
)

raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
if raw_origins:
    allow_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
else:
    # Safe-ish defaults for local dev. Set CORS_ALLOW_ORIGINS in production.
    allow_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

allow_credentials = "*" not in allow_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


def forward_to_google_sheets(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Forward event payload to Google Apps Script webhook.
    Set GOOGLE_SHEETS_WEBHOOK_URL in env to enable.
    """
    webhook_url = os.getenv("GOOGLE_SHEETS_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return {"forwarded": False, "reason": "missing_webhook_url"}

    body = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        webhook_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib_request.urlopen(req, timeout=8) as res:
            status_code = getattr(res, "status", 200)
            return {"forwarded": 200 <= status_code < 300, "status_code": status_code}
    except HTTPError as e:
        return {"forwarded": False, "status_code": e.code, "reason": "http_error"}
    except URLError:
        return {"forwarded": False, "reason": "url_error"}


@app.get("/")
async def root():
    return {"status": "alive", "message": "FLUX AI Backend is running", "version": "1.0.0"}


@app.get("/api/health")
async def health(db: Session = Depends(get_db)):
    return {
        "status": "ok",
        "database": "postgres",
        "messages": db.query(models.Message).count(),
        "words": db.query(models.Word).count(),
        "books": db.query(models.Book).count(),
        "workouts": db.query(models.Workout).count(),
    }


@app.post("/api/analytics/event")
async def track_event(event: schemas.AnalyticsEventCreate, request: Request, db: Session = Depends(get_db)):
    if not event.event.strip():
        raise HTTPException(status_code=400, detail="Event name is required")

    event_row = models.AnalyticsEvent(
        id=str(__import__("uuid").uuid4()),
        event=event.event.strip(),
        user_email=event.user_email,
        session_id=event.session_id,
        page=event.page,
        meta=json.dumps(event.meta or {}, ensure_ascii=True),
        time=datetime.now().strftime("%H:%M"),
        timestamp=datetime.now().isoformat(),
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    db.add(event_row)
    db.commit()
    db.refresh(event_row)

    sheet_payload = {
        "time": event_row.timestamp,
        "event": event_row.event,
        "user_email": event_row.user_email or "",
        "session_id": event_row.session_id or "",
        "page": event_row.page or "",
        "meta": event_row.meta or "{}",
        "user_agent": event_row.user_agent or "",
    }
    forward_status = forward_to_google_sheets(sheet_payload)

    return {"status": "ok", "saved": True, "sheets": forward_status}


@app.get("/api/analytics/events")
async def get_analytics_events(db: Session = Depends(get_db)):
    rows = db.query(models.AnalyticsEvent).order_by(models.AnalyticsEvent.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "event": r.event,
            "user_email": r.user_email,
            "session_id": r.session_id,
            "page": r.page,
            "meta": json.loads(r.meta or "{}"),
            "time": r.time,
            "timestamp": r.timestamp,
            "user_agent": r.user_agent,
            "ip": r.ip,
        }
        for r in rows
    ]


app.include_router(chat.router)
app.include_router(words.router)
app.include_router(library.router)
app.include_router(workouts.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
