"""
Pydantic schemas for API request/response validation
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any


class MessageCreate(BaseModel):
    text: str


class MessageResponse(BaseModel):
    id: str
    role: str
    text: str
    intent: str
    card_data: Dict[str, Any] = {}
    time: str

    class Config:
        from_attributes = True


class WordCreate(BaseModel):
    word: str
    definition: str
    part_of_speech: Optional[str] = None
    example: Optional[str] = None


class WordResponse(BaseModel):
    id: str
    word: str
    definition: str
    part_of_speech: Optional[str]
    example: Optional[str]

    class Config:
        from_attributes = True


class QuoteCreate(BaseModel):
    text: str
    author: Optional[str] = None
    source: Optional[str] = None


class QuoteResponse(BaseModel):
    id: str
    text: str
    author: Optional[str]
    source: Optional[str]

    class Config:
        from_attributes = True


class BookCreate(BaseModel):
    title: str
    author: Optional[str] = None
    status: str  # want, reading, finished
    genre: Optional[str] = None


class BookResponse(BaseModel):
    id: str
    title: str
    author: Optional[str]
    status: str
    genre: Optional[str]

    class Config:
        from_attributes = True


class WorkoutCreate(BaseModel):
    type: str
    duration: Optional[str] = None
    distance: Optional[str] = None
    notes: Optional[str] = None
    date: str


class WorkoutResponse(BaseModel):
    id: str
    type: str
    duration: Optional[str]
    distance: Optional[str]
    notes: Optional[str]
    date: str
    saved_at: str

    class Config:
        from_attributes = True


class ProcessInput(BaseModel):
    text: str


class AIResponse(BaseModel):
    id: str
    role: str
    text: str
    intent: str
    card_data: Dict[str, Any] = {}
    time: str


class AnalyticsEventCreate(BaseModel):
    event: str
    user_email: Optional[str] = None
    session_id: Optional[str] = None
    page: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
