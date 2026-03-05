# FLUX - Personal Intelligence Layer

A modern AI-powered personal tracker for words, books, quotes, and workouts.

## Live Demo

- **Frontend**: https://manireddy69-vscode.github.io/flux-tracker/
- **Portfolio (About Me)**: https://manireddy69-vscode.github.io/about-me/

`about-me` auto-deploys via GitHub Actions, so that portfolio link updates automatically on each push to `main`.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Tech Stack

- **Frontend**: React 19 + Vite
- **Backend**: FastAPI (Python)
- **Database**: JSON file storage
- **AI**: Claude API ready

## Features

- Journal - Chat with AI to log any data
- Word Vault - Define and save vocabulary
- Library - Track books and quotes
- Workouts - Log exercise sessions

## Google Sheets Tracking

You can track visitor and user events into your Google Sheet.

1. Create a Google Apps Script Web App (`doPost`) that appends rows to your Sheet.
2. Set `VITE_GOOGLE_SHEETS_WEBHOOK_URL` in frontend env.
3. Optional: set `GOOGLE_SHEETS_WEBHOOK_URL` in backend env if you also run backend forwarding.
4. Frontend sends events to `POST /api/analytics/event` first, then falls back to direct Google Sheets webhook.

Tracked events include: `page_view`, `login`, `view_change`, `message_sent`, `logout`.
