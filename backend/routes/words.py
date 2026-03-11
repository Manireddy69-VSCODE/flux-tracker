"""
Word/Vocabulary routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models, schemas
import uuid

router = APIRouter(prefix="/api/words", tags=["words"])


def uid():
    return str(uuid.uuid4())[:8]


@router.post("/", response_model=schemas.WordResponse)
async def create_word(word: schemas.WordCreate, db: Session = Depends(get_db)):
    """Save a new word"""
    existing = db.query(models.Word).filter(models.Word.word == word.word).first()
    if existing:
        existing.definition = word.definition
        existing.part_of_speech = word.part_of_speech
        existing.example = word.example
        db.commit()
        db.refresh(existing)
        return {
            "id": existing.id,
            "word": existing.word,
            "definition": existing.definition,
            "part_of_speech": existing.part_of_speech,
            "example": existing.example
        }

    db_word = models.Word(
        id=uid(),
        word=word.word,
        definition=word.definition,
        part_of_speech=word.part_of_speech,
        example=word.example
    )
    db.add(db_word)
    db.commit()
    db.refresh(db_word)

    return {
        "id": db_word.id,
        "word": db_word.word,
        "definition": db_word.definition,
        "part_of_speech": db_word.part_of_speech,
        "example": db_word.example
    }


@router.get("/", response_model=list[schemas.WordResponse])
async def get_words(db: Session = Depends(get_db)):
    """Get all words"""
    words = db.query(models.Word).order_by(models.Word.created_at).all()
    return [
        {
            "id": w.id,
            "word": w.word,
            "definition": w.definition,
            "part_of_speech": w.part_of_speech,
            "example": w.example
        }
        for w in words
    ]


@router.delete("/{word_id}")
async def delete_word(word_id: str, db: Session = Depends(get_db)):
    """Delete a word"""
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    db.delete(word)
    db.commit()
    return {"status": "deleted"}
