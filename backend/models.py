"""
SQLAlchemy database models
"""
from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.sql import func
from database import Base
from datetime import datetime


class Message(Base):
    """Chat message - journal entries"""
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True)
    role = Column(String)  # "user" or "assistant"
    text = Column(Text)
    intent = Column(String)  # CHAT, WORD, QUOTE, BOOK, WORKOUT, ERROR
    card_data = Column(Text)  # JSON string of card data
    time = Column(String)  # formatted time string
    created_at = Column(DateTime, server_default=func.now())


class Word(Base):
    """Vocabulary entries"""
    __tablename__ = "words"
    
    id = Column(String, primary_key=True)
    word = Column(String, unique=True, index=True)
    definition = Column(Text)
    part_of_speech = Column(String)
    example = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Quote(Base):
    """Saved quotes"""
    __tablename__ = "quotes"
    
    id = Column(String, primary_key=True)
    text = Column(Text)
    author = Column(String, nullable=True)
    source = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Book(Base):
    """Library entries"""
    __tablename__ = "books"
    
    id = Column(String, primary_key=True)
    title = Column(String)
    author = Column(String, nullable=True)
    status = Column(String)  # "want", "reading", "finished"
    genre = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Workout(Base):
    """Exercise log"""
    __tablename__ = "workouts"
    
    id = Column(String, primary_key=True)
    type = Column(String)  # gym, run, walk, cycle, swim, yoga, hiit, climb, boxing, other
    duration = Column(String, nullable=True)
    distance = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    date = Column(String)
    saved_at = Column(String)
    created_at = Column(DateTime, server_default=func.now())
