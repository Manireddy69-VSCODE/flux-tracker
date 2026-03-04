## Hobbies Tracker

A zero-install hobbies tracker to log:
- **Exercise**: gym, walk, run (duration, distance, notes)
- **Reading**: books, quotes + reflections (“communication log” notes per book)
- **Connections**: link one book to another (supports/contradicts/similar/custom)
- **Assistant**: type naturally → auto-detect (workout/book/quote/word) and save
- **Words**: save word meanings into a personal “word vault”

## Run

Open `index.html` in a browser.

For best results (recommended while building), run a tiny local server:

```bash
python -m http.server 5174
```

Then open `http://localhost:5174/hobbies-tracker/`.

Data is stored locally in your browser using `localStorage`.

## Backup

Go to **Settings**:
- **Export JSON** to download a backup file
- **Import JSON** to restore a backup

## Project structure (learning-friendly)

- `index.html`: UI layout (tabs + forms)
- `style.css`: styling
- `src/main.js`: app entrypoint (wires everything together)
- `src/core/`
  - `store.js`: localStorage state + import/reset helpers
  - `router.js`: tab routing
  - `utils.js`: small helpers used everywhere
- `src/features/`
  - `exercise.js`
  - `assistant.js` (journal + word vault)
  - `connections.js`
  - `insights.js`
  - `reading/library.js` (books + notes + quotes)

`app.js` is kept as the older single-file version (useful for diff/learning).

