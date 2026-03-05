# FLUX Backend - Architecture and API Reference

## What's Built

### Backend Stack
- **Framework**: FastAPI (Python)
- **Database**: JSON file-based (`data/flux_data.json`)
- **AI**: Claude API ready (requires API key)
- **Server**: `http://localhost:8000`

### API Endpoints

#### Chat and Journal
- `POST /api/chat/process` - Process user input with AI
- `GET /api/chat/messages` - Get all messages
- `DELETE /api/chat/clear` - Clear all data

#### Words
- `POST /api/words` - Create or update a word
- `GET /api/words` - Get all words
- `DELETE /api/words/{word_id}` - Delete a word

#### Library (Books and Quotes)
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

#### Health`r`n- `GET /api/health` - Backend status`r`n- `GET /` - Root health check`r`n`r`n#### Analytics`r`n- `POST /api/analytics/event` - Track an event and forward to Google Sheets webhook`r`n- `GET /api/analytics/events` - Read stored analytics events

## Next Steps

### 1. Add your Anthropic API key
Edit `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-v-your-actual-key-here`r`nGOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/your-web-app-id/exec
```

### 2. Connect frontend to backend
Update the frontend to call `/api/chat/process` instead of local mock logic.

### 3. Sync data flow
- Frontend sends: `POST /api/chat/process { text: "user input" }`
- Backend processes with Claude AI
- Returns: `{ id, role, text, intent, card_data, time }`
- Save words/books/workouts through related endpoints

### 4. Learn the stack
- **API layer**: FastAPI routes
- **Data persistence**: `data/flux_data.json`
- **AI integration**: `backend/ai_service.py`
- **Request flow**: schema and response shape

## Current Status

- Frontend: `https://manireddy69-vscode.github.io/flux-tracker/`
- Backend: running on `http://localhost:8000`
- Database: JSON file at `data/flux_data.json`
- AI: configured, waiting for API key

## Live Links

- **Frontend**: https://manireddy69-vscode.github.io/flux-tracker/
- **Portfolio (About Me)**: https://manireddy69-vscode.github.io/about-me/

`about-me` auto-deploys via GitHub Actions, so that portfolio link updates automatically on each push to `main`.

## Project Structure

```txt
d:\projects\
+-- src/                     # React frontend
+-- backend/                 # Python FastAPI backend
¦   +-- main.py              # API endpoints
¦   +-- ai_service.py        # Claude integration
¦   +-- db.py                # JSON file database
¦   +-- requirements.txt
+-- data/
¦   +-- flux_data.json       # Persistent data
¦   +-- backups/             # Optional backups
+-- .github/workflows/       # Deployment workflows
```

## How They Connect

```txt
Browser (frontend)
  -> HTTP requests
FastAPI backend
  -> JSON/file I/O
flux_data.json
  -> Optional AI calls
Claude API
```