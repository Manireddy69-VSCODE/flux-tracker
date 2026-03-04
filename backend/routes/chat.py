"""
Chat/Journal routes - main conversational endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from ai_service import process_with_ai
from datetime import datetime, timezone
import json
import uuid

router = APIRouter(prefix="/api/chat", tags=["chat"])


def uid():
    """Generate unique ID"""
    return str(uuid.uuid4())[:8]


def ts():
    """Get formatted current time"""
    return datetime.now().strftime("%H:%M")


@router.post("/process", response_model=schemas.AIResponse)
async def process_input(req: schemas.ProcessInput, db: Session = Depends(get_db)):
    """
    Main endpoint: process user input, call AI, save message, return response
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty input")
    
    # Get previous messages for context (last 10)
    previous_messages = (
        db.query(models.Message)
        .order_by(models.Message.created_at.desc())
        .limit(10)
        .all()
    )
    
    # Build conversation history
    conversation_history = []
    for msg in reversed(previous_messages):  # reverse to get chronological order
        conversation_history.append({
            "role": msg.role,
            "content": msg.text
        })
    
    # Process with AI
    ai_result = await process_with_ai(text, conversation_history)
    
    # Save user message
    user_msg = models.Message(
        id=uid(),
        role="user",
        text=text,
        intent="USER",
        card_data="{}",
        time=ts()
    )
    db.add(user_msg)
    db.commit()
    
    # Save assistant message
    assistant_msg = models.Message(
        id=uid(),
        role="assistant",
        text=ai_result.get("reply", ""),
        intent=ai_result.get("intent", "CHAT"),
        card_data=json.dumps(ai_result.get("data", {})),
        time=ts()
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    
    return {
        "id": assistant_msg.id,
        "roll": assistant_msg.role,
        "text": assistant_msg.text,
        "intent": assistant_msg.intent,
        "card_data": json.loads(assistant_msg.card_data),
        "time": assistant_msg.time
    }


@router.get("/messages", response_model=list[schemas.MessageResponse])
async def get_messages(db: Session = Depends(get_db)):
    """Get all chat messages"""
    messages = db.query(models.Message).order_by(models.Message.created_at).all()
    result = []
    for msg in messages:
        result.append({
            "id": msg.id,
            "role": msg.role,
            "text": msg.text,
            "intent": msg.intent,
            "card_data": json.loads(msg.card_data),
            "time": msg.time
        })
    return result


@router.delete("/clear")
async def clear_all(db: Session = Depends(get_db)):
    """Clear all data - use with caution!"""
    db.query(models.Message).delete()
    db.query(models.Word).delete()
    db.query(models.Quote).delete()
    db.query(models.Book).delete()
    db.query(models.Workout).delete()
    db.commit()
    return {"status": "cleared"}
