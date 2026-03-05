Contribution on 2026-03-04

Summary of work done today (short):

- Implemented light/dark theme support in `src/App.jsx` and removed old static styles.
- Added serverless backend support: created `api/index.py` (Mangum wrapper) and adjusted `backend` package imports.
- Cleaned up `requirements.txt` and removed problematic packages for static deployment compatibility.
- Added static deployment workflow for Git-based hosting.
- Removed old platform-specific deploy configs and cleaned the deployment flow.
- Created backups and exported project snapshot; committed and pushed all changes to GitHub.

Notes:
- Backend data is persisted in `data/flux_data.json`.
- Frontend now uses `/api` by default or `VITE_API_BASE` when configured.

Next steps:
- Verify GitHub Pages deployment and configure backend API endpoint with `VITE_API_BASE`.
- Optionally create a separate portfolio repo and deploy it.

-- End of contribution note
