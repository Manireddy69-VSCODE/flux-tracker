Contribution on 2026-03-04

Summary of work done today (short):

- Implemented light/dark theme support in `src/App.jsx` and removed old static styles.
- Added serverless backend support: created `api/index.py` (Mangum wrapper) and adjusted `backend` package imports.
- Cleaned up `requirements.txt` and removed problematic packages for Netlify/Vercel compatibility.
- Added `netlify.toml` and `netlify/functions/api.py` to run FastAPI as a Netlify function.
- Removed problematic `vercel.json` and pushed fixes; attempted Vercel deploys and troubleshot runtime errors.
- Created backups and exported project snapshot; committed and pushed all changes to GitHub.

Notes:
- Backend data is persisted in `data/flux_data.json`.
- Frontend is configured to call `/.netlify/functions/api` when deployed to Netlify.

Next steps:
- Verify Netlify deployment logs and add `ANTHROPIC_API_KEY` in Netlify env for real AI responses.
- Optionally create a separate portfolio repo and deploy it.

-- End of contribution note
