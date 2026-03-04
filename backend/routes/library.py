"""
Library routes - books and quotes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import uuid

router = APIRouter(prefix="/api/library", tags=["library"])


def uid():
    return str(uuid.uuid4())[:8]


# ─── BOOKS ───────────────────────────────────────────────────────
@router.post("/books", response_model=schemas.BookResponse)
async def create_book(book: schemas.BookCreate, db: Session = Depends(get_db)):
    """Save a book"""
    db_book = models.Book(
        id=uid(),
        title=book.title,
        author=book.author,
        status=book.status,
        genre=book.genre
    )
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    
    return {
        "id": db_book.id,
        "title": db_book.title,
        "author": db_book.author,
        "status": db_book.status,
        "genre": db_book.genre
    }


@router.get("/books", response_model=list[schemas.BookResponse])
async def get_books(db: Session = Depends(get_db)):
    """Get all books"""
    books = db.query(models.Book).order_by(models.Book.created_at.desc()).all()
    return [
        {
            "id": b.id,
            "title": b.title,
            "author": b.author,
            "status": b.status,
            "genre": b.genre
        }
        for b in books
    ]


@router.put("/books/{book_id}", response_model=schemas.BookResponse)
async def update_book(book_id: str, book: schemas.BookCreate, db: Session = Depends(get_db)):
    """Update a book"""
    db_book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    db_book.title = book.title
    db_book.author = book.author
    db_book.status = book.status
    db_book.genre = book.genre
    db.commit()
    db.refresh(db_book)
    
    return {
        "id": db_book.id,
        "title": db_book.title,
        "author": db_book.author,
        "status": db_book.status,
        "genre": db_book.genre
    }


@router.delete("/books/{book_id}")
async def delete_book(book_id: str, db: Session = Depends(get_db)):
    """Delete a book"""
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(book)
    db.commit()
    return {"status": "deleted"}


# ─── QUOTES ──────────────────────────────────────────────────────
@router.post("/quotes", response_model=schemas.QuoteResponse)
async def create_quote(quote: schemas.QuoteCreate, db: Session = Depends(get_db)):
    """Save a quote"""
    db_quote = models.Quote(
        id=uid(),
        text=quote.text,
        author=quote.author,
        source=quote.source
    )
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    
    return {
        "id": db_quote.id,
        "text": db_quote.text,
        "author": db_quote.author,
        "source": db_quote.source
    }


@router.get("/quotes", response_model=list[schemas.QuoteResponse])
async def get_quotes(db: Session = Depends(get_db)):
    """Get all quotes"""
    quotes = db.query(models.Quote).order_by(models.Quote.created_at.desc()).all()
    return [
        {
            "id": q.id,
            "text": q.text,
            "author": q.author,
            "source": q.source
        }
        for q in quotes
    ]


@router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, db: Session = Depends(get_db)):
    """Delete a quote"""
    quote = db.query(models.Quote).filter(models.Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    db.delete(quote)
    db.commit()
    return {"status": "deleted"}
