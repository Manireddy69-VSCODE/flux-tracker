"""
Main FastAPI application - FLUX AI Backend
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from backend import db
import uuid
from datetime import datetime
from backend.ai_service import process_with_ai

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="FLUX AI Backend",
    description="Full-stack AI hobby tracker",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
def uid():
    """Generate unique ID"""
    return str(uuid.uuid4())[:8]


def ts():
    """Get formatted time"""
    return datetime.now().strftime("%H:%M")


# ─── SCHEMAS ─────────────────────────────────────────────────────────────────
class ProcessInput(BaseModel):
    text: str


class WordCreate(BaseModel):
    word: str
    definition: str
    part_of_speech: Optional[str] = None
    example: Optional[str] = None


class QuoteCreate(BaseModel):
    text: str
    author: Optional[str] = None
    source: Optional[str] = None


class BookCreate(BaseModel):
    title: str
    author: Optional[str] = None
    status: str
    genre: Optional[str] = None


class WorkoutCreate(BaseModel):
    type: str
    duration: Optional[str] = None
    distance: Optional[str] = None
    notes: Optional[str] = None
    date: str


# ─── HEALTH CHECK ────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "alive",
        "message": "FLUX AI Backend is running",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health():
    """API health check"""
    data = db.get_all_data()
    return {
        "status": "ok",
        "database": "json-file",
        "messages": len(data["messages"]),
        "words": len(data["words"]),
        "books": len(data["books"]),
        "workouts": len(data["workouts"])
    }


# ─── CHAT/JOURNAL ENDPOINTS ──────────────────────────────────────────────────
@app.post("/api/chat/process")
async def process_chat(req: ProcessInput):
    """Process user input with AI"""
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty input")
    
    data = db.get_all_data()
    
    # Get last 10 messages for context
    conversation_history = [
        {"role": msg["role"], "content": msg["text"]}
        for msg in data["messages"][-10:]
    ]
    
    # Process with AI
    ai_result = await process_with_ai(text, conversation_history)
    
    # Save user message
    user_msg = {
        "id": uid(),
        "role": "user",
        "text": text,
        "intent": "USER",
        "card_data": {},
        "time": ts()
    }
    data["messages"].append(user_msg)
    
    # Save assistant message
    assistant_msg = {
        "id": uid(),
        "role": "assistant",
        "text": ai_result.get("reply", ""),
        "intent": ai_result.get("intent", "CHAT"),
        "card_data": ai_result.get("data", {}),
        "time": ts()
    }
    data["messages"].append(assistant_msg)
    
    db.update_data(data)
    
    return assistant_msg


@app.get("/api/chat/messages")
async def get_messages():
    """Get all messages"""
    data = db.get_all_data()
    return data["messages"]


@app.delete("/api/chat/clear")
async def clear_all():
    """Clear all data"""
    db.clear_all()
    return {"status": "cleared"}


# ─── WORD ENDPOINTS ──────────────────────────────────────────────────────────
@app.post("/api/words")
async def create_word(word: WordCreate):
    """Save a word"""
    data = db.get_all_data()
    
    # Check if exists
    for w in data["words"]:
        if w["word"].lower() == word.word.lower():
            w["definition"] = word.definition
            w["part_of_speech"] = word.part_of_speech
            w["example"] = word.example
            db.update_data(data)
            return w
    
    # Create new
    new_word = {
        "id": uid(),
        "word": word.word,
        "definition": word.definition,
        "part_of_speech": word.part_of_speech,
        "example": word.example
    }
    data["words"].append(new_word)
    db.update_data(data)
    return new_word


@app.get("/api/words")
async def get_words():
    """Get all words"""
    data = db.get_all_data()
    return data["words"]


@app.delete("/api/words/{word_id}")
async def delete_word(word_id: str):
    """Delete a word"""
    data = db.get_all_data()
    data["words"] = [w for w in data["words"] if w["id"] != word_id]
    db.update_data(data)
    return {"status": "deleted"}


# ─── LIBRARY ENDPOINTS (BOOKS & QUOTES) ──────────────────────────────────────
@app.post("/api/library/books")
async def create_book(book: BookCreate):
    """Save a book"""
    data = db.get_all_data()
    new_book = {
        "id": uid(),
        "title": book.title,
        "author": book.author,
        "status": book.status,
        "genre": book.genre
    }
    data["books"].append(new_book)
    db.update_data(data)
    return new_book


@app.get("/api/library/books")
async def get_books():
    """Get all books"""
    data = db.get_all_data()
    return data["books"]


@app.put("/api/library/books/{book_id}")
async def update_book(book_id: str, book: BookCreate):
    """Update a book"""
    data = db.get_all_data()
    for b in data["books"]:
        if b["id"] == book_id:
            b["title"] = book.title
            b["author"] = book.author
            b["status"] = book.status
            b["genre"] = book.genre
            db.update_data(data)
            return b
    raise HTTPException(status_code=404, detail="Book not found")


@app.delete("/api/library/books/{book_id}")
async def delete_book(book_id: str):
    """Delete a book"""
    data = db.get_all_data()
    data["books"] = [b for b in data["books"] if b["id"] != book_id]
    db.update_data(data)
    return {"status": "deleted"}


@app.post("/api/library/quotes")
async def create_quote(quote: QuoteCreate):
    """Save a quote"""
    data = db.get_all_data()
    new_quote = {
        "id": uid(),
        "text": quote.text,
        "author": quote.author,
        "source": quote.source
    }
    data["quotes"].append(new_quote)
    db.update_data(data)
    return new_quote


@app.get("/api/library/quotes")
async def get_quotes():
    """Get all quotes"""
    data = db.get_all_data()
    return data["quotes"]


@app.delete("/api/library/quotes/{quote_id}")
async def delete_quote(quote_id: str):
    """Delete a quote"""
    data = db.get_all_data()
    data["quotes"] = [q for q in data["quotes"] if q["id"] != quote_id]
    db.update_data(data)
    return {"status": "deleted"}


# ─── WORKOUT ENDPOINTS ───────────────────────────────────────────────────────
@app.post("/api/workouts")
async def create_workout(workout: WorkoutCreate):
    """Log a workout"""
    data = db.get_all_data()
    new_workout = {
        "id": uid(),
        "type": workout.type,
        "duration": workout.duration,
        "distance": workout.distance,
        "notes": workout.notes,
        "date": workout.date,
        "saved_at": datetime.now().isoformat()
    }
    data["workouts"].append(new_workout)
    db.update_data(data)
    return new_workout


@app.get("/api/workouts")
async def get_workouts():
    """Get all workouts"""
    data = db.get_all_data()
    return data["workouts"]


@app.delete("/api/workouts/{workout_id}")
async def delete_workout(workout_id: str):
    """Delete a workout"""
    data = db.get_all_data()
    data["workouts"] = [w for w in data["workouts"] if w["id"] != workout_id]
    db.update_data(data)
    return {"status": "deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True
    )
