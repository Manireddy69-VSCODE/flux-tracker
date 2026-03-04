const STORAGE_KEY = "hobbies-tracker:v1";

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseTags(raw) {
  return String(raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toast(msg) {
  const el = document.querySelector("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-visible");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("is-visible"), 1800);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultState() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    assistantMessages: [],
    words: [],
    exercise: [],
    books: [],
    bookNotes: [],
    quotes: [],
    connections: [],
  };
}

function ensureStateShape(state) {
  const s = state && typeof state === "object" ? state : {};
  return {
    version: 1,
    createdAt: s.createdAt || new Date().toISOString(),
    assistantMessages: Array.isArray(s.assistantMessages) ? s.assistantMessages : Array.isArray(s.messages) ? s.messages : [],
    words: Array.isArray(s.words) ? s.words : [],
    exercise: Array.isArray(s.exercise) ? s.exercise : [],
    books: Array.isArray(s.books) ? s.books : [],
    bookNotes: Array.isArray(s.bookNotes) ? s.bookNotes : [],
    quotes: Array.isArray(s.quotes) ? s.quotes : [],
    connections: Array.isArray(s.connections) ? s.connections : [],
  };
}

const state = ensureStateShape(loadState() || defaultState());
saveState(state);

// ---------- routing ----------
const tabs = Array.from(document.querySelectorAll(".tab"));
const panels = Array.from(document.querySelectorAll(".panel"));

function setRoute(route) {
  for (const t of tabs) {
    const active = t.dataset.route === route;
    t.classList.toggle("is-active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  }
  for (const p of panels) p.classList.toggle("is-active", p.dataset.panel === route);
  const url = new URL(location.href);
  url.hash = route;
  history.replaceState(null, "", url);
  renderAll();
}

tabs.forEach((t) => t.addEventListener("click", () => setRoute(t.dataset.route)));
window.addEventListener("hashchange", () => setRoute((location.hash || "#exercise").slice(1)));

// ---------- helpers ----------
function fmtDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.valueOf())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

function workoutLabel(type) {
  const map = {
    gym: "Gym",
    walk: "Walk",
    run: "Run",
    cycling: "Cycling",
    yoga: "Yoga",
    other: "Other",
  };
  return map[type] || type;
}

function bookStatusPill(status) {
  if (status === "done") return { label: "DONE", cls: "ok" };
  if (status === "reading") return { label: "READING", cls: "info" };
  return { label: "TO READ", cls: "warn" };
}

function findBook(bookId) {
  return state.books.find((b) => b.id === bookId) || null;
}

function bookTitle(bookId) {
  const b = findBook(bookId);
  return b ? b.title : "(deleted book)";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function includesQuery(...fields) {
  const hay = fields
    .filter((x) => x !== null && x !== undefined)
    .map((x) => String(x).toLowerCase())
    .join(" ");
  return (q) => hay.includes(String(q || "").trim().toLowerCase());
}

function timeHHMM() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- exercise ----------
const exerciseForm = document.querySelector("#exercise-form");
const exerciseList = document.querySelector("#exercise-list");
const exerciseSearch = document.querySelector("#exercise-search");
const exerciseFilter = document.querySelector("#exercise-filter");

if (exerciseForm) {
  exerciseForm.querySelector('input[name="date"]').value = todayISO();
  exerciseForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(exerciseForm);
    const type = String(fd.get("type") || "other");
    const date = String(fd.get("date") || todayISO());
    const minutes = safeNumber(fd.get("minutes"));
    const distanceKm = safeNumber(fd.get("distanceKm"));
    const notes = String(fd.get("notes") || "").trim();

    state.exercise.unshift({
      id: uid(),
      type,
      date,
      minutes,
      distanceKm,
      notes,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    exerciseForm.reset();
    exerciseForm.querySelector('input[name="date"]').value = todayISO();
    toast("Workout saved.");
    renderExercise();
    renderInsights();
  });
}

function deleteWorkout(id) {
  state.exercise = state.exercise.filter((x) => x.id !== id);
  saveState(state);
  toast("Workout deleted.");
  renderExercise();
  renderInsights();
}

function renderExercise() {
  if (!exerciseList) return;
  const q = String(exerciseSearch?.value || "");
  const typeFilter = String(exerciseFilter?.value || "all");

  const rows = state.exercise
    .filter((w) => (typeFilter === "all" ? true : w.type === typeFilter))
    .filter((w) => includesQuery(workoutLabel(w.type), w.notes, w.date)(q))
    .slice(0, 80);

  if (rows.length === 0) {
    exerciseList.innerHTML = `<div class="muted">No workouts yet. Add your first one.</div>`;
    return;
  }

  exerciseList.innerHTML = rows
    .map((w) => {
      const meta = [
        `<span class="pill">${escapeHtml(fmtDate(w.date))}</span>`,
        `<span class="pill info">${escapeHtml(workoutLabel(w.type))}</span>`,
      ];
      if (w.minutes !== null) meta.push(`<span class="pill">${escapeHtml(w.minutes)} min</span>`);
      if (w.distanceKm !== null) meta.push(`<span class="pill">${escapeHtml(w.distanceKm)} km</span>`);

      return `
        <div class="item">
          <div class="item__main">
            <div class="item__title">${escapeHtml(workoutLabel(w.type))}</div>
            <div class="item__meta">${meta.join("")}</div>
            ${w.notes ? `<div class="muted" style="margin-top:8px">${escapeHtml(w.notes)}</div>` : ""}
          </div>
          <div class="item__actions">
            <button class="icon-btn danger" data-action="delete-workout" data-id="${escapeHtml(w.id)}" title="Delete">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  exerciseList.querySelectorAll('[data-action="delete-workout"]').forEach((btn) => {
    btn.addEventListener("click", () => deleteWorkout(btn.dataset.id));
  });
}

exerciseSearch?.addEventListener("input", renderExercise);
exerciseFilter?.addEventListener("change", renderExercise);

// ---------- books + quotes ----------
const bookForm = document.querySelector("#book-form");
const bookList = document.querySelector("#book-list");
const bookSearch = document.querySelector("#book-search");
const bookStatus = document.querySelector("#book-status");

const bookNoteForm = document.querySelector("#booknote-form");
const bookNoteList = document.querySelector("#booknote-list");
const bookNoteSearch = document.querySelector("#booknote-search");
const bookNoteBookSelect = document.querySelector("#booknote-book");
const bookNoteDate = document.querySelector("#booknote-date");
const bookNoteFilterBook = document.querySelector("#booknote-filter-book");

const quoteForm = document.querySelector("#quote-form");
const quoteList = document.querySelector("#quote-list");
const quoteSearch = document.querySelector("#quote-search");
const quoteBookSelect = document.querySelector("#quote-book");
const quoteFilterBook = document.querySelector("#quote-filter-book");

function upsertBookOptions() {
  const opts = state.books
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.title)}</option>`)
    .join("");

  const placeholder = `<option value="" disabled ${state.books.length ? "" : "selected"}>Select a book…</option>`;

  if (quoteBookSelect) quoteBookSelect.innerHTML = placeholder + opts;
  if (bookNoteBookSelect) bookNoteBookSelect.innerHTML = placeholder + opts;
  if (quoteFilterBook) {
    quoteFilterBook.innerHTML =
      `<option value="all">All books</option>` + opts;
  }
  if (bookNoteFilterBook) {
    bookNoteFilterBook.innerHTML =
      `<option value="all">All books</option>` + opts;
  }

  const connFrom = document.querySelector("#conn-from");
  const connTo = document.querySelector("#conn-to");
  if (connFrom) connFrom.innerHTML = placeholder + opts;
  if (connTo) connTo.innerHTML = placeholder + opts;
}

if (bookForm) {
  bookForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(bookForm);
    const title = String(fd.get("title") || "").trim();
    if (!title) return;
    const author = String(fd.get("author") || "").trim();
    const status = String(fd.get("status") || "to-read");
    const tags = parseTags(fd.get("tags"));
    const notes = String(fd.get("notes") || "").trim();

    state.books.unshift({
      id: uid(),
      title,
      author,
      status,
      tags,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveState(state);
    bookForm.reset();
    toast("Book saved.");
    upsertBookOptions();
    renderBooks();
    renderQuotes();
    renderConnections();
    renderInsights();
  });
}

function updateBook(id, patch) {
  const idx = state.books.findIndex((b) => b.id === id);
  if (idx === -1) return;
  state.books[idx] = { ...state.books[idx], ...patch, updatedAt: new Date().toISOString() };
  saveState(state);
  upsertBookOptions();
  renderBooks();
  renderQuotes();
  renderConnections();
  renderInsights();
}

function deleteBook(id) {
  state.books = state.books.filter((b) => b.id !== id);
  state.bookNotes = state.bookNotes.filter((n) => n.bookId !== id);
  state.quotes = state.quotes.filter((q) => q.bookId !== id);
  state.connections = state.connections.filter((c) => c.fromBookId !== id && c.toBookId !== id);
  saveState(state);
  toast("Book deleted (and related notes/quotes/connections).");
  upsertBookOptions();
  renderBooks();
  renderBookNotes();
  renderQuotes();
  renderConnections();
  renderInsights();
}

function renderBooks() {
  if (!bookList) return;
  const q = String(bookSearch?.value || "");
  const statusFilter = String(bookStatus?.value || "all");

  const rows = state.books
    .filter((b) => (statusFilter === "all" ? true : b.status === statusFilter))
    .filter((b) => includesQuery(b.title, b.author, (b.tags || []).join(" "), b.notes)(q))
    .slice()
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
    .slice(0, 80);

  if (rows.length === 0) {
    bookList.innerHTML = `<div class="muted">No books yet. Add a book to start building connections.</div>`;
    return;
  }

  bookList.innerHTML = rows
    .map((b) => {
      const pill = bookStatusPill(b.status);
      const tags = (b.tags || []).slice(0, 6).map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join("");
      return `
        <div class="item">
          <div class="item__main">
            <div class="item__title">${escapeHtml(b.title)}${b.author ? ` <span class="muted" style="font-weight:600">— ${escapeHtml(b.author)}</span>` : ""}</div>
            <div class="item__meta">
              <span class="pill ${escapeHtml(pill.cls)}">${escapeHtml(pill.label)}</span>
              ${tags}
              <span class="pill">${escapeHtml(fmtDate(b.createdAt))}</span>
            </div>
            ${
              b.notes
                ? `<details style="margin-top:10px"><summary>Communication / notes</summary><p>${escapeHtml(b.notes)}</p></details>`
                : ""
            }
          </div>
          <div class="item__actions">
            <button class="icon-btn" data-action="book-toggle" data-id="${escapeHtml(b.id)}" title="Cycle status">Status</button>
            <button class="icon-btn danger" data-action="book-delete" data-id="${escapeHtml(b.id)}" title="Delete">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  bookList.querySelectorAll('[data-action="book-toggle"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const b = findBook(id);
      if (!b) return;
      const next = b.status === "to-read" ? "reading" : b.status === "reading" ? "done" : "to-read";
      updateBook(id, { status: next });
      toast("Book status updated.");
    });
  });

  bookList.querySelectorAll('[data-action="book-delete"]').forEach((btn) => {
    btn.addEventListener("click", () => deleteBook(btn.dataset.id));
  });
}

bookSearch?.addEventListener("input", renderBooks);
bookStatus?.addEventListener("change", renderBooks);

if (bookNoteDate) bookNoteDate.value = todayISO();

if (bookNoteForm) {
  bookNoteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(bookNoteForm);
    const bookId = String(fd.get("bookId") || "");
    const date = String(fd.get("date") || todayISO());
    const text = String(fd.get("text") || "").trim();
    if (!bookId || !text) return;

    state.bookNotes.unshift({
      id: uid(),
      bookId,
      date,
      text,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    bookNoteForm.reset();
    if (bookNoteDate) bookNoteDate.value = todayISO();
    toast("Note saved.");
    renderBookNotes();
  });
}

function deleteBookNote(id) {
  state.bookNotes = state.bookNotes.filter((n) => n.id !== id);
  saveState(state);
  toast("Note deleted.");
  renderBookNotes();
}

function renderBookNotes() {
  if (!bookNoteList) return;
  const q = String(bookNoteSearch?.value || "");
  const bookFilter = String(bookNoteFilterBook?.value || "all");

  const rows = state.bookNotes
    .filter((n) => (bookFilter === "all" ? true : n.bookId === bookFilter))
    .filter((n) => includesQuery(bookTitle(n.bookId), n.text, n.date)(q))
    .slice(0, 120);

  if (rows.length === 0) {
    bookNoteList.innerHTML = `<div class="muted">No communication notes yet.</div>`;
    return;
  }

  bookNoteList.innerHTML = rows
    .map((n) => {
      return `
        <div class="item">
          <div class="item__main">
            <div class="item__title">${escapeHtml(bookTitle(n.bookId))}</div>
            <div class="item__meta">
              <span class="pill">${escapeHtml(fmtDate(n.date))}</span>
              <span class="pill">${escapeHtml(fmtDate(n.createdAt))}</span>
            </div>
            <div class="muted" style="margin-top:8px; white-space:pre-wrap">${escapeHtml(n.text)}</div>
          </div>
          <div class="item__actions">
            <button class="icon-btn danger" data-action="booknote-delete" data-id="${escapeHtml(n.id)}" title="Delete">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  bookNoteList.querySelectorAll('[data-action="booknote-delete"]').forEach((btn) => {
    btn.addEventListener("click", () => deleteBookNote(btn.dataset.id));
  });
}

bookNoteSearch?.addEventListener("input", renderBookNotes);
bookNoteFilterBook?.addEventListener("change", renderBookNotes);

if (quoteForm) {
  quoteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(quoteForm);
    const bookId = String(fd.get("bookId") || "");
    const text = String(fd.get("text") || "").trim();
    if (!bookId || !text) return;
    const location = String(fd.get("location") || "").trim();
    const tags = parseTags(fd.get("tags"));
    const reflection = String(fd.get("reflection") || "").trim();

    state.quotes.unshift({
      id: uid(),
      bookId,
      text,
      location,
      tags,
      reflection,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    quoteForm.reset();
    toast("Quote saved.");
    renderQuotes();
    renderInsights();
  });
}

function deleteQuote(id) {
  state.quotes = state.quotes.filter((q) => q.id !== id);
  saveState(state);
  toast("Quote deleted.");
  renderQuotes();
  renderInsights();
}

function renderQuotes() {
  if (!quoteList) return;
  const q = String(quoteSearch?.value || "");
  const bookFilter = String(quoteFilterBook?.value || "all");

  const rows = state.quotes
    .filter((x) => (bookFilter === "all" ? true : x.bookId === bookFilter))
    .filter((x) => includesQuery(bookTitle(x.bookId), x.text, x.reflection, (x.tags || []).join(" "), x.location)(q))
    .slice(0, 120);

  if (rows.length === 0) {
    quoteList.innerHTML = `<div class="muted">No quotes yet.</div>`;
    return;
  }

  quoteList.innerHTML = rows
    .map((x) => {
      const tags = (x.tags || []).slice(0, 6).map((t) => `<span class="pill">${escapeHtml(t)}</span>`).join("");
      return `
        <div class="item">
          <div class="item__main">
            <div class="item__title">${escapeHtml(bookTitle(x.bookId))}</div>
            <div class="item__meta">
              ${x.location ? `<span class="pill">${escapeHtml(x.location)}</span>` : ""}
              ${tags}
              <span class="pill">${escapeHtml(fmtDate(x.createdAt))}</span>
            </div>
            <div style="margin-top:10px; font-family: var(--sans); line-height:1.45">
              <div style="white-space:pre-wrap">“${escapeHtml(x.text)}”</div>
              ${x.reflection ? `<div class="muted" style="margin-top:8px">— ${escapeHtml(x.reflection)}</div>` : ""}
            </div>
          </div>
          <div class="item__actions">
            <button class="icon-btn danger" data-action="quote-delete" data-id="${escapeHtml(x.id)}" title="Delete">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  quoteList.querySelectorAll('[data-action="quote-delete"]').forEach((btn) => {
    btn.addEventListener("click", () => deleteQuote(btn.dataset.id));
  });
}

quoteSearch?.addEventListener("input", renderQuotes);
quoteFilterBook?.addEventListener("change", renderQuotes);

// ---------- connections ----------
const connectionForm = document.querySelector("#connection-form");
const connList = document.querySelector("#conn-list");
const connSearch = document.querySelector("#conn-search");

function connectionLabel(c) {
  if (c.type === "custom" && c.customLabel) return c.customLabel;
  const map = {
    similar: "Similar",
    supports: "Supports",
    contradicts: "Contradicts",
    "inspired-by": "Inspired by",
    extends: "Extends",
    custom: "Custom",
  };
  return map[c.type] || c.type;
}

if (connectionForm) {
  connectionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(connectionForm);
    const fromBookId = String(fd.get("fromBookId") || "");
    const toBookId = String(fd.get("toBookId") || "");
    if (!fromBookId || !toBookId) return;
    if (fromBookId === toBookId) {
      toast("Pick two different books.");
      return;
    }
    const type = String(fd.get("type") || "similar");
    const customLabel = String(fd.get("customLabel") || "").trim();
    const note = String(fd.get("note") || "").trim();

    state.connections.unshift({
      id: uid(),
      fromBookId,
      toBookId,
      type,
      customLabel,
      note,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    connectionForm.reset();
    toast("Connection saved.");
    renderConnections();
    renderInsights();
  });
}

function deleteConnection(id) {
  state.connections = state.connections.filter((c) => c.id !== id);
  saveState(state);
  toast("Connection deleted.");
  renderConnections();
  renderInsights();
}

function renderConnections() {
  if (!connList) return;
  const q = String(connSearch?.value || "");

  const rows = state.connections
    .filter((c) => includesQuery(bookTitle(c.fromBookId), bookTitle(c.toBookId), c.note, connectionLabel(c))(q))
    .slice(0, 120);

  if (rows.length === 0) {
    connList.innerHTML = `<div class="muted">No connections yet. Add 2 books, then connect them.</div>`;
    return;
  }

  connList.innerHTML = rows
    .map((c) => {
      return `
        <div class="item">
          <div class="item__main">
            <div class="item__title">${escapeHtml(bookTitle(c.fromBookId))} <span class="muted" style="font-weight:700">→</span> ${escapeHtml(bookTitle(c.toBookId))}</div>
            <div class="item__meta">
              <span class="pill info">${escapeHtml(connectionLabel(c))}</span>
              <span class="pill">${escapeHtml(fmtDate(c.createdAt))}</span>
            </div>
            ${c.note ? `<div class="muted" style="margin-top:8px">${escapeHtml(c.note)}</div>` : ""}
          </div>
          <div class="item__actions">
            <button class="icon-btn danger" data-action="conn-delete" data-id="${escapeHtml(c.id)}" title="Delete">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  connList.querySelectorAll('[data-action="conn-delete"]').forEach((btn) => {
    btn.addEventListener("click", () => deleteConnection(btn.dataset.id));
  });
}

connSearch?.addEventListener("input", renderConnections);

// ---------- assistant (hobby-ai inspired) ----------
const aiForm = document.querySelector("#ai-form");
const aiInput = document.querySelector("#ai-input");
const aiChat = document.querySelector("#ai-chat");
const aiClear = document.querySelector("#ai-clear");
const aiLast = document.querySelector("#ai-last");
const aiSuggestions = document.querySelector("#ai-suggestions");

const wordSearch = document.querySelector("#word-search");
const wordList = document.querySelector("#word-list");

function addAssistantMessage(role, text, intent = "CHAT", cardData = null) {
  state.assistantMessages.push({
    id: uid(),
    role,
    text: String(text || ""),
    intent,
    cardData: cardData || null,
    time: timeHHMM(),
    createdAt: new Date().toISOString(),
  });
  saveState(state);
}

function renderAssistant() {
  if (!aiChat) return;
  const rows = state.assistantMessages.slice(-60);
  if (rows.length === 0) {
    aiChat.innerHTML = `<div class="muted">No messages yet. Try a suggestion above.</div>`;
    return;
  }
  aiChat.innerHTML = rows
    .map((m) => {
      const isUser = m.role === "user";
      const who = isUser ? "You" : "Assistant";
      const extra =
        !isUser && m.intent && m.intent !== "CHAT" && m.cardData
          ? renderInlineCard(m.intent, m.cardData)
          : "";
      return `
        <div class="bubble ${isUser ? "user" : "ai"}">
          <div style="white-space:pre-wrap; line-height:1.5">${escapeHtml(m.text)}</div>
          ${extra}
          <div class="bubble__meta">
            <span>${escapeHtml(who)}</span>
            <span>${escapeHtml(m.time || "")}</span>
            ${!isUser && m.intent ? `<span class="pill">${escapeHtml(m.intent)}</span>` : ""}
          </div>
        </div>
      `;
    })
    .join("");
  aiChat.scrollTop = aiChat.scrollHeight;
}

function renderInlineCard(intent, d) {
  if (intent === "WORD_LOOKUP" && d?.word) {
    return `
      <div class="inline-card">
        <div class="inline-card__title">${escapeHtml(d.word)}${d.partOfSpeech ? ` <span class="pill">${escapeHtml(d.partOfSpeech)}</span>` : ""}</div>
        ${d.definition ? `<div class="inline-card__text">${escapeHtml(d.definition)}</div>` : ""}
        ${d.example ? `<div class="inline-card__text" style="margin-top:8px">Example: ${escapeHtml(d.example)}</div>` : ""}
      </div>
    `;
  }
  if (intent === "QUOTE" && d?.text) {
    return `
      <div class="inline-card">
        <div class="inline-card__title">Saved quote</div>
        <div class="inline-card__text">“${escapeHtml(d.text)}”</div>
        <div class="inline-card__text" style="margin-top:8px">${escapeHtml([d.author, d.book].filter(Boolean).join(" · "))}</div>
      </div>
    `;
  }
  if (intent === "BOOK" && d?.title) {
    return `
      <div class="inline-card">
        <div class="inline-card__title">Saved book</div>
        <div class="inline-card__text">${escapeHtml(d.title)}${d.author ? ` — ${escapeHtml(d.author)}` : ""}</div>
        ${d.status ? `<div class="inline-card__text" style="margin-top:8px">Status: ${escapeHtml(d.status)}</div>` : ""}
      </div>
    `;
  }
  if (intent === "WORKOUT" && d?.type) {
    const chips = [];
    if (d.duration != null) chips.push(`${d.duration} min`);
    if (d.distance != null) chips.push(`${d.distance} km`);
    return `
      <div class="inline-card">
        <div class="inline-card__title">Logged workout</div>
        <div class="inline-card__text">${escapeHtml(workoutLabel(d.type))}${chips.length ? ` · ${escapeHtml(chips.join(" · "))}` : ""}</div>
        ${d.notes ? `<div class="inline-card__text" style="margin-top:8px">${escapeHtml(d.notes)}</div>` : ""}
      </div>
    `;
  }
  return "";
}

function addWord(wordObj) {
  const w = String(wordObj.word || "").trim();
  if (!w) return;
  state.words = state.words.filter((x) => String(x.word || "").toLowerCase() !== w.toLowerCase());
  state.words.unshift({
    id: uid(),
    word: w,
    definition: wordObj.definition || "",
    example: wordObj.example || "",
    partOfSpeech: wordObj.partOfSpeech || "",
    savedAt: new Date().toISOString(),
  });
  saveState(state);
}

function renderWords() {
  if (!wordList) return;
  const q = String(wordSearch?.value || "");
  const rows = state.words
    .filter((w) => includesQuery(w.word, w.definition, w.example, w.partOfSpeech)(q))
    .slice(0, 80);

  if (rows.length === 0) {
    wordList.innerHTML = `<div class="muted">No saved words yet. Try: “what does ephemeral mean?”</div>`;
    return;
  }

  wordList.innerHTML = rows
    .map((w) => {
      return `
        <div class="item">
          <div class="item__main">
            <div class="item__title">${escapeHtml(w.word)}${w.partOfSpeech ? ` <span class="pill">${escapeHtml(w.partOfSpeech)}</span>` : ""}</div>
            ${w.definition ? `<div class="muted" style="margin-top:6px">${escapeHtml(w.definition)}</div>` : ""}
            ${w.example ? `<div class="muted" style="margin-top:8px"><span class="pill">example</span> ${escapeHtml(w.example)}</div>` : ""}
          </div>
          <div class="item__actions">
            <button class="icon-btn danger" data-action="word-delete" data-id="${escapeHtml(w.id)}" title="Delete">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  wordList.querySelectorAll('[data-action="word-delete"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      state.words = state.words.filter((x) => x.id !== btn.dataset.id);
      saveState(state);
      toast("Word deleted.");
      renderWords();
      renderInsights();
    });
  });
}

wordSearch?.addEventListener("input", renderWords);

function setLastExtraction(obj) {
  if (!aiLast) return;
  aiLast.innerHTML = `<pre style="margin:0; white-space:pre-wrap; font-family: var(--mono); color: rgba(255,255,255,.75)">${escapeHtml(
    JSON.stringify(obj, null, 2)
  )}</pre>`;
}

function detectWordLookup(text) {
  const t = text.trim();
  const m1 = t.match(/what does\s+([a-zA-Z'-]{2,})\s+mean\??$/i);
  const m2 = t.match(/^define\s+([a-zA-Z'-]{2,})\??$/i);
  const m3 = t.match(/^meaning of\s+([a-zA-Z'-]{2,})\??$/i);
  const m4 = t.match(/^([a-zA-Z'-]{2,})\??$/i);
  const word = (m1?.[1] || m2?.[1] || m3?.[1] || (t.split(/\s+/).length === 1 ? m4?.[1] : null)) || null;
  if (!word) return null;
  if (word.length > 32) return null;
  return word;
}

async function lookupDictionary(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    const meaning = entry?.meanings?.[0];
    const def = meaning?.definitions?.[0];
    return {
      word: entry?.word || word,
      partOfSpeech: meaning?.partOfSpeech || "",
      definition: def?.definition || "",
      example: def?.example || "",
    };
  } catch {
    return null;
  }
}

function detectWorkout(text) {
  const t = text.toLowerCase();
  const type =
    /(gym|workout|lift|weights)/.test(t) ? "gym" :
    /(ran|run|running)\b/.test(t) ? "run" :
    /(walk|walked|walking)\b/.test(t) ? "walk" :
    /(cycle|cycling|bike)\b/.test(t) ? "cycling" :
    /(swim|swimming)\b/.test(t) ? "other" :
    /(yoga)\b/.test(t) ? "yoga" :
    /(hiit)\b/.test(t) ? "other" :
    /(climb|climbing)\b/.test(t) ? "other" :
    /(boxing)\b/.test(t) ? "other" :
    null;

  if (!type) return null;

  let distance = null;
  const km = t.match(/(\d+(?:\.\d+)?)\s*km\b/);
  const k = t.match(/\b(\d+(?:\.\d+)?)\s*k\b/); // 5k
  const mi = t.match(/(\d+(?:\.\d+)?)\s*mi\b/);
  if (km) distance = Number(km[1]);
  else if (k) distance = Number(k[1]);
  else if (mi) distance = Math.round(Number(mi[1]) * 1.60934 * 100) / 100;

  let duration = null;
  const min = t.match(/(\d+)\s*(min|mins|minutes)\b/);
  const hr = t.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  if (min) duration = Number(min[1]);
  else if (hr) duration = Math.round(Number(hr[1]) * 60);

  const notes = text.trim();
  return { type, duration, distance, notes };
}

function detectQuote(text) {
  const t = text.trim();
  const m = t.match(/["“](.+?)["”](?:\s*(?:—|-)\s*(.+))?$/);
  if (!m) return null;
  const quoteText = m[1].trim();
  if (!quoteText) return null;
  const tail = (m[2] || "").trim();
  let author = null;
  let book = null;
  if (tail) {
    // Try "Author · Book" or "Author, Book"
    const parts = tail.split(/·|\||,|—/).map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2) {
      author = parts[0];
      book = parts.slice(1).join(" ");
    } else {
      author = tail;
    }
  }
  return { text: quoteText, author, book };
}

function detectBook(text) {
  const t = text.trim();
  const m = t.match(/\b(i'?m|im|i am)\s+(reading|re-reading|started)\s+(.+)$/i)
    || t.match(/\b(just\s+finished|finished|completed)\s+(.+)$/i)
    || t.match(/\b(want\s+to\s+read|to\s+read)\s+(.+)$/i);
  if (!m) return null;

  const status =
    /want\s+to\s+read|to\s+read/i.test(m[0]) ? "to-read" :
    /finished|completed/i.test(m[0]) ? "done" :
    "reading";

  const titleRaw = (m[3] || m[2] || "").trim();
  const by = titleRaw.match(/^(.+?)\s+by\s+(.+)$/i);
  const title = (by ? by[1] : titleRaw).replace(/[.?!]+$/g, "").trim();
  const author = by ? by[2].replace(/[.?!]+$/g, "").trim() : "";
  if (!title) return null;
  return { title, author, status };
}

function saveQuoteFromAssistant(q) {
  // Map to our quote schema
  const bookId = q.book
    ? state.books.find((b) => b.title.toLowerCase() === q.book.toLowerCase())?.id || null
    : null;

  let ensuredBookId = bookId;
  if (!ensuredBookId && q.book) {
    const bid = uid();
    state.books.unshift({
      id: bid,
      title: q.book,
      author: q.author || "",
      status: "to-read",
      tags: [],
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    ensuredBookId = bid;
  }

  state.quotes.unshift({
    id: uid(),
    bookId: ensuredBookId || (state.books[0]?.id ?? ""), // best-effort; may be empty if none exist
    text: q.text,
    location: "",
    tags: [],
    reflection: "",
    createdAt: new Date().toISOString(),
  });
  saveState(state);
  upsertBookOptions();
  renderBooks();
  renderBookNotes();
  renderQuotes();
  renderConnections();
  renderInsights();
}

function saveBookFromAssistant(b) {
  const existing = state.books.find((x) => x.title.toLowerCase() === b.title.toLowerCase());
  if (existing) {
    existing.status = b.status || existing.status;
    if (b.author && !existing.author) existing.author = b.author;
    existing.updatedAt = new Date().toISOString();
  } else {
    state.books.unshift({
      id: uid(),
      title: b.title,
      author: b.author || "",
      status: b.status || "to-read",
      tags: [],
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  saveState(state);
  upsertBookOptions();
  renderBooks();
  renderBookNotes();
  renderQuotes();
  renderConnections();
  renderInsights();
}

function saveWorkoutFromAssistant(w) {
  state.exercise.unshift({
    id: uid(),
    type: w.type,
    date: todayISO(),
    minutes: w.duration ?? null,
    distanceKm: w.distance ?? null,
    notes: w.notes || "",
    createdAt: new Date().toISOString(),
  });
  saveState(state);
  renderExercise();
  renderInsights();
}

async function processAssistantInput(raw) {
  const text = String(raw || "").trim();
  if (!text) return;

  addAssistantMessage("user", text, "CHAT", null);

  const word = detectWordLookup(text);
  const workout = detectWorkout(text);
  const quote = detectQuote(text);
  const book = detectBook(text);

  // Priority: word -> quote -> workout -> book -> chat/question
  if (word) {
    const looked = await lookupDictionary(word);
    const data = looked || { word, definition: "", example: "", partOfSpeech: "" };
    addWord(data);
    const reply = looked
      ? `Saved “${data.word}”. Want a synonym too?`
      : `Saved “${word}”. (Couldn’t fetch a definition right now.)`;
    addAssistantMessage("assistant", reply, "WORD_LOOKUP", data);
    setLastExtraction({ intent: "WORD_LOOKUP", data });
    renderWords();
    renderAssistant();
    renderInsights();
    return;
  }

  if (quote) {
    saveQuoteFromAssistant(quote);
    addAssistantMessage("assistant", "Saved that quote to your library.", "QUOTE", quote);
    setLastExtraction({ intent: "QUOTE", data: quote });
    renderAssistant();
    return;
  }

  if (workout) {
    saveWorkoutFromAssistant(workout);
    addAssistantMessage("assistant", "Logged your workout.", "WORKOUT", workout);
    setLastExtraction({ intent: "WORKOUT", data: workout });
    renderAssistant();
    return;
  }

  if (book) {
    saveBookFromAssistant(book);
    addAssistantMessage("assistant", "Saved that book to your library.", "BOOK", book);
    setLastExtraction({ intent: "BOOK", data: book });
    renderAssistant();
    return;
  }

  // Fallback
  addAssistantMessage("assistant", "Got it. If you paste a quote, log a workout, or ask “what does X mean?”, I’ll auto-save it.", "CHAT", {});
  setLastExtraction({ intent: "CHAT", data: {} });
  renderAssistant();
}

aiForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(aiForm);
  const text = String(fd.get("text") || "");
  aiInput.value = "";
  await processAssistantInput(text);
});

aiInput?.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const text = aiInput.value;
    aiInput.value = "";
    await processAssistantInput(text);
  }
});

aiClear?.addEventListener("click", () => {
  const ok = confirm("Clear assistant chat history?");
  if (!ok) return;
  state.assistantMessages = [];
  saveState(state);
  toast("Chat cleared.");
  renderAssistant();
});

aiSuggestions?.querySelectorAll("[data-suggest]")?.forEach((btn) => {
  btn.addEventListener("click", async () => {
    await processAssistantInput(btn.dataset.suggest || "");
  });
});

// ---------- insights ----------
const insightsWeek = document.querySelector("#insights-week");
const insightsGraph = document.querySelector("#insights-graph");

function weekKey(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon=0
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function renderInsights() {
  if (insightsWeek) {
    const now = new Date();
    const thisWeek = weekKey(now);
    const weekWorkouts = state.exercise.filter((w) => weekKey(w.date) === thisWeek);
    const minutes = weekWorkouts.reduce((sum, w) => sum + (w.minutes || 0), 0);
    const km = weekWorkouts.reduce((sum, w) => sum + (w.distanceKm || 0), 0);

    const done = state.books.filter((b) => b.status === "done").length;
    const reading = state.books.filter((b) => b.status === "reading").length;
    const toRead = state.books.filter((b) => b.status === "to-read").length;

    insightsWeek.innerHTML = `
      <div class="kpi">
        <div class="kpi__value">${weekWorkouts.length}</div>
        <div class="kpi__label">workouts logged</div>
      </div>
      <div class="kpi">
        <div class="kpi__value">${minutes}</div>
        <div class="kpi__label">minutes (this week)</div>
      </div>
      <div class="kpi">
        <div class="kpi__value">${Math.round(km * 100) / 100}</div>
        <div class="kpi__label">km (this week)</div>
      </div>
      <div class="kpi">
        <div class="kpi__value">${state.quotes.length}</div>
        <div class="kpi__label">quotes saved</div>
      </div>
      <div class="kpi">
        <div class="kpi__value">${state.connections.length}</div>
        <div class="kpi__label">book connections</div>
      </div>
      <div class="kpi">
        <div class="kpi__value">${state.words.length}</div>
        <div class="kpi__label">words saved</div>
      </div>
      <div class="kpi">
        <div class="kpi__value">${done}/${reading}/${toRead}</div>
        <div class="kpi__label">done / reading / to read</div>
      </div>
    `;
  }

  if (insightsGraph) {
    if (state.books.length === 0) {
      insightsGraph.innerHTML = `<div class="muted">Add books to see your graph.</div>`;
      return;
    }
    const degree = new Map();
    for (const b of state.books) degree.set(b.id, 0);
    for (const c of state.connections) {
      degree.set(c.fromBookId, (degree.get(c.fromBookId) || 0) + 1);
      degree.set(c.toBookId, (degree.get(c.toBookId) || 0) + 1);
    }
    const items = state.books
      .map((b) => ({ id: b.id, title: b.title, count: degree.get(b.id) || 0 }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
      .slice(0, 8);
    const max = Math.max(1, ...items.map((x) => x.count));
    insightsGraph.innerHTML = items
      .map((x) => {
        const pct = Math.round((x.count / max) * 100);
        return `
          <div class="graph__row">
            <div class="graph__name" title="${escapeHtml(x.title)}">${escapeHtml(x.title)}</div>
            <div class="graph__bar" aria-label="Connections"><div style="width:${pct}%"></div></div>
            <div class="graph__count">${escapeHtml(x.count)}</div>
          </div>
        `;
      })
      .join("");
  }
}

// ---------- settings ----------
const exportBtn = document.querySelector("#export-btn");
const importInput = document.querySelector("#import-input");
const resetBtn = document.querySelector("#reset-btn");

exportBtn?.addEventListener("click", () => {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hobbies-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Exported.");
});

importInput?.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const incoming = JSON.parse(text);
    // Allow hobby-ai.jsx schema import (messages/words/quotes/books/workouts)
    let adapted = incoming;
    if (incoming && typeof incoming === "object" && (Array.isArray(incoming.workouts) || Array.isArray(incoming.messages))) {
      const mappedExercise = Array.isArray(incoming.workouts)
        ? incoming.workouts.map((w) => ({
            id: w.id || uid(),
            type: w.type === "cycle" ? "cycling" : w.type || "other",
            date: todayISO(),
            minutes: w.duration ?? null,
            distanceKm: w.distance ?? null,
            notes: w.notes || "",
            createdAt: w.savedAt || new Date().toISOString(),
          }))
        : [];
      adapted = {
        ...incoming,
        assistantMessages: incoming.messages || [],
        exercise: mappedExercise,
      };
    }
    const parsed = ensureStateShape(adapted);
    state.version = parsed.version;
    state.createdAt = parsed.createdAt;
    state.assistantMessages = parsed.assistantMessages;
    state.words = parsed.words;
    state.exercise = parsed.exercise;
    state.books = parsed.books;
    state.quotes = parsed.quotes;
    state.connections = parsed.connections;
    state.bookNotes = parsed.bookNotes;
    saveState(state);
    toast("Imported.");
    upsertBookOptions();
    renderAll();
  } catch {
    toast("Import failed (invalid JSON).");
  } finally {
    importInput.value = "";
  }
});

resetBtn?.addEventListener("click", () => {
  const ok = confirm("Delete all data saved in this browser?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  const fresh = defaultState();
  state.version = fresh.version;
  state.createdAt = fresh.createdAt;
  state.exercise = fresh.exercise;
  state.books = fresh.books;
  state.quotes = fresh.quotes;
  state.connections = fresh.connections;
  saveState(state);
  toast("Reset complete.");
  upsertBookOptions();
  renderAll();
});

// ---------- render all ----------
function renderAll() {
  renderExercise();
  renderBooks();
  renderBookNotes();
  renderQuotes();
  renderConnections();
  renderAssistant();
  renderWords();
  renderInsights();
}

// initial
upsertBookOptions();
renderAll();
setRoute((location.hash || "#exercise").slice(1));

