# FLUX Backend - Architecture & API Reference

## ✅ What's Built

### Backend Stack
- **Framework**: FastAPI (Python)
- **Database**: JSON file-based (at `data/flux_data.json`)
- **AI**: Claude API ready (just needs API key)
- **Server**: Running on `http://localhost:8000`

### API Endpoints

#### Chat/Journal
- `POST /api/chat/process` - Process user input with AI
- `GET /api/chat/messages` - Get all messages
- `DELETE /api/chat/clear` - Clear all data

#### Words (Vocabulary)
- `POST /api/words` - Create/update a word
- `GET /api/words` - Get all words
- `DELETE /api/words/{word_id}` - Delete a word

#### Library (Books & Quotes)
- `POST /api/library/books` - Add a book
- `GET /api/library/books` - Get all books
- `PUT /api/library/books/{book_id}` - Update a book
- `DELETE /api/library/books/{book_id}` - Delete a book
- `POST /api/library/quotes` - Add a quote
- `GET /api/library/quotes` - Get all quotes
- `DELETE /api/library/quotes/{quote_id}` - Delete a quote

#### Workouts
- `POST /api/workouts` - Log a workout
- `GET /api/workouts` - Get all workouts
- `DELETE /api/workouts/{workout_id}` - Delete a workout

#### Health
- `GET /api/health` - Backend status
- `GET /` - Root health check

## 📋 Next Steps

### 1. Add Your Anthropic API Key
Edit `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-v-your-actual-key-here
```

### 2. Connect Frontend to Backend
Update `src/App.jsx` to call `/api/chat/process` instead of the local mock AI.

### 3. Sync Data Flow
- Frontend sends: `POST /api/chat/process { text: "user input" }`
- Backend processes with Claude AI
- Returns: `{ id, role, text, intent, card_data, time }`
- Save corresponding words/books/workouts via other endpoints

### 4. Learn the Stack
- **API Layer**: See how FastAPI routes work
- **Data Persistence**: JSON file storage in `data/flux_data.json`
- **AI Integration**: See `ai_service.py` for Claude integration
- **Request/Response**: Understand request flow and JSON structure

## 🚀 Current Status

```
Frontend ✅  (React/Vite running on 5173)
Backend  ✅  (FastAPI running on 8000)
Database ✅  (JSON file at data/flux_data.json)
AI       ⏳ (Configured, waiting for API key)
```

## 📁 Project Structure

```
d:\projects\
├── src/                    # React frontend
│   ├── App.jsx
│   └── main.jsx
├── backend/               # Python FastAPI backend
│   ├── main.py           # All API endpoints
│   ├── ai_service.py     # Claude integration
│   ├── db.py             # JSON file database
│   └── requirements.txt
├── data/
│   ├── flux_data.json    # Persistent data file
│   └── backups/          # Auto-backups folder
└── [frontend config files]
```

## 🔗 How They Connect

```
Browser (localhost:5173)
    ↓ HTTP Requests
FastAPI Backend (localhost:8000)
    ↓ JSON/File I/O
    flux_data.json
    ↓ API Calls
Claude AI (Anthropic)
    ↓ Responses
Frontend (updated UI)
```

---

**You now have a REAL full-stack AI project!** 🎉

Next: Update `.env` with your API key and modify the frontend to use the backend endpoints.
