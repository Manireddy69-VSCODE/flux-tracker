# FLUX Backend - Architecture and API Reference

## Backend Stack
- Framework: FastAPI (Python)
- Database: Supabase Postgres (SQLAlchemy)
- AI: Claude API (optional)
- Server: http://localhost:8000

## Required Environment Variables
- DATABASE_URL
- ANTHROPIC_API_KEY (optional)
- GOOGLE_SHEETS_WEBHOOK_URL (optional)

## API Endpoints

### Chat and Journal
- POST /api/chat/process
- GET /api/chat/messages
- DELETE /api/chat/clear

### Words
- POST /api/words
- GET /api/words
- DELETE /api/words/{word_id}

### Library (Books and Quotes)
- POST /api/library/books
- GET /api/library/books
- PUT /api/library/books/{book_id}
- DELETE /api/library/books/{book_id}
- POST /api/library/quotes
- GET /api/library/quotes
- DELETE /api/library/quotes/{quote_id}

### Workouts
- POST /api/workouts
- GET /api/workouts
- DELETE /api/workouts/{workout_id}

### Analytics
- POST /api/analytics/event
- GET /api/analytics/events

### Health
- GET /api/health
- GET /

## Data Flow
Browser -> FastAPI -> Supabase Postgres

## Project Structure

```
backend/
  main.py
  ai_service.py
  database.py
  models.py
  routes/
  schemas.py
  requirements.txt
```