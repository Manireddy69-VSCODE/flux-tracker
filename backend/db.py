"""
Simple JSON-file based data persistence
"""
import json
import os
from typing import Dict, List, Any
from datetime import datetime

DB_PATH = "d:\\projects\\data\\flux_data.json"

# Ensure data directory exists
os.makedirs("d:\\projects\\data", exist_ok=True)


def load_data() -> Dict[str, Any]:
    """Load all data from JSON file"""
    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, "r") as f:
                return json.load(f)
        except:
            return get_blank_data()
    return get_blank_data()


def save_data(data: Dict[str, Any]) -> None:
    """Save all data to JSON file"""
    try:
        with open(DB_PATH, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving data: {e}")


def get_blank_data() -> Dict[str, Any]:
    """Get blank data structure"""
    return {
        "messages": [],
        "words": [],
        "quotes": [],
        "books": [],
        "workouts": []
    }


# Global data store (loaded at startup)
_data = load_data()


def get_all_data() -> Dict[str, Any]:
    """Get all data"""
    return _data


def update_data(new_data: Dict[str, Any]) -> None:
    """Update data and save to file"""
    global _data
    _data = new_data
    save_data(new_data)


def add_message(msg: Dict[str, Any]) -> None:
    """Add a message"""
    _data["messages"].append(msg)
    save_data(_data)


def add_word(word: Dict[str, Any]) -> None:
    """Add or update a word"""
    # Check if word exists
    for i, w in enumerate(_data["words"]):
        if w["word"].lower() == word["word"].lower():
            _data["words"][i] = word
            save_data(_data)
            return
    _data["words"].append(word)
    save_data(_data)


def add_quote(quote: Dict[str, Any]) -> None:
    """Add a quote"""
    _data["quotes"].append(quote)
    save_data(_data)


def add_book(book: Dict[str, Any]) -> None:
    """Add a book"""
    _data["books"].append(book)
    save_data(_data)


def add_workout(workout: Dict[str, Any]) -> None:
    """Add a workout"""
    _data["workouts"].append(workout)
    save_data(_data)


def delete_word(word_id: str) -> None:
    """Delete a word by ID"""
    _data["words"] = [w for w in _data["words"] if w["id"] != word_id]
    save_data(_data)


def delete_quote(quote_id: str) -> None:
    """Delete a quote by ID"""
    _data["quotes"] = [q for q in _data["quotes"] if q["id"] != quote_id]
    save_data(_data)


def delete_book(book_id: str) -> None:
    """Delete a book by ID"""
    _data["books"] = [b for b in _data["books"] if b["id"] != book_id]
    save_data(_data)


def delete_workout(workout_id: str) -> None:
    """Delete a workout by ID"""
    _data["workouts"] = [w for w in _data["workouts"] if w["id"] != workout_id]
    save_data(_data)


def clear_all() -> None:
    """Clear all data"""
    global _data
    _data = get_blank_data()
    save_data(_data)
