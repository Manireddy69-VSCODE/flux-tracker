"""
AI/LLM integration service for Claude API
"""
import os
from anthropic import Anthropic
import json
from dotenv import load_dotenv

load_dotenv()

# Create client without proxies (to avoid compatibility issues)
try:
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
except:
    client = None


async def process_with_ai(text: str, conversation_history: list = None) -> dict:
    """
    Process user input with Claude AI and determine intent + response
    
    Args:
        text: User input text
        conversation_history: List of previous messages for context
    
    Returns:
        dict with: reply, intent, data (card data)
    """
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "PASTE_YOUR_REAL_KEY_HERE" or not client:
        return mock_ai_response(text)
    
    system_prompt = """You are a personal hobby assistant. Analyze the user's input and:

1. Determine the INTENT: CHAT, WORD, QUOTE, BOOK, or WORKOUT
2. Generate a concise, friendly reply
3. If applicable, extract structured data

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "intent": "CHAT|WORD|QUOTE|BOOK|WORKOUT",
  "reply": "Your friendly response",
  "data": {
    "word": "...",
    "definition": "...",
    "partOfSpeech": "...",
    "example": "...",
    "text": "...",
    "author": "...",
    "title": "...",
    "status": "want|reading|finished",
    "type": "gym|run|walk|cycle|swim|yoga|hiit|climb|boxing|other",
    "duration": "...",
    "distance": "..."
  }
}"""

    try:
        # Build messages with history
        messages = conversation_history or []
        messages.append({
            "role": "user",
            "content": text
        })
        
        response = client.messages.create(
            model="claude-opus-4-1-20250805",
            max_tokens=1000,
            system=system_prompt,
            messages=messages
        )
        
        response_text = response.content[0].text
        
        # Parse JSON response
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            # If JSON parsing fails, return safe response
            return {
                "intent": "CHAT",
                "reply": response_text,
                "data": {}
            }
        
        return data
        
    except Exception as e:
        print(f"AI Error: {e}")
        return mock_ai_response(text)


def mock_ai_response(text: str) -> dict:
    """Fallback mock response when API is not available"""
    
    low = text.lower()
    
    if any(w in low for w in ["word", "define", "vocab", "α"]):
        return {
            "intent": "WORD",
            "reply": "Learning mode: word saved (no real AI).",
            "data": {}
        }
    elif any(w in low for w in ["quote", "saying", "inspire"]):
        return {
            "intent": "QUOTE",
            "reply": "Learning mode: quote saved (no real AI).",
            "data": {}
        }
    elif any(w in low for w in ["read", "book", "author", "finished", "reading", "started"]):
        return {
            "intent": "BOOK",
            "reply": "Learning mode: book added to library.",
            "data": {}
        }
    elif any(w in low for w in ["workout", "gym", "run", "exercise", "yoga"]):
        return {
            "intent": "WORKOUT",
            "reply": "Learning mode: workout logged (no real AI).",
            "data": {}
        }
    
    return {
        "intent": "CHAT",
        "reply": "Learning mode is active. Set ANTHROPIC_API_KEY in .env for live AI.",
        "data": {}
    }
