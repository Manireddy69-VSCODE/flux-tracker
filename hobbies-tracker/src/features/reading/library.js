import {
  uid,
  todayISO,
  parseTags,
  toast,
  includesQuery,
  escapeHtml,
  fmtDate,
  bookStatusPill,
} from "../../core/utils.js";

export function initLibrary({ state, save }) {
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

  function findBook(bookId) {
    return state.books.find((b) => b.id === bookId) || null;
  }

  function bookTitle(bookId) {
    const b = findBook(bookId);
    return b ? b.title : "(deleted book)";
  }

  function upsertBookOptions() {
    const opts = state.books
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.title)}</option>`)
      .join("");

    const placeholder = `<option value="" disabled ${state.books.length ? "" : "selected"}>Select a book…</option>`;

    if (quoteBookSelect) quoteBookSelect.innerHTML = placeholder + opts;
    if (bookNoteBookSelect) bookNoteBookSelect.innerHTML = placeholder + opts;

    if (quoteFilterBook) quoteFilterBook.innerHTML = `<option value="all">All books</option>` + opts;
    if (bookNoteFilterBook) bookNoteFilterBook.innerHTML = `<option value="all">All books</option>` + opts;

    const connFrom = document.querySelector("#conn-from");
    const connTo = document.querySelector("#conn-to");
    if (connFrom) connFrom.innerHTML = placeholder + opts;
    if (connTo) connTo.innerHTML = placeholder + opts;
  }

  function updateBook(id, patch) {
    const idx = state.books.findIndex((b) => b.id === id);
    if (idx === -1) return;
    state.books[idx] = { ...state.books[idx], ...patch, updatedAt: new Date().toISOString() };
    save();
    upsertBookOptions();
    renderBooks();
  }

  function deleteBook(id) {
    state.books = state.books.filter((b) => b.id !== id);
    state.bookNotes = state.bookNotes.filter((n) => n.bookId !== id);
    state.quotes = state.quotes.filter((q) => q.bookId !== id);
    state.connections = state.connections.filter((c) => c.fromBookId !== id && c.toBookId !== id);
    save();
    toast("Book deleted (and related notes/quotes/connections).");
    upsertBookOptions();
    renderBooks();
    renderBookNotes();
    renderQuotes();
  }

  function ensureBookByTitle({ title, author = "", status = "to-read" }) {
    const t = String(title || "").trim();
    if (!t) return null;
    const existing = state.books.find((x) => x.title.toLowerCase() === t.toLowerCase());
    if (existing) {
      if (author && !existing.author) existing.author = author;
      if (status) existing.status = status;
      existing.updatedAt = new Date().toISOString();
      save();
      upsertBookOptions();
      return existing;
    }
    const b = {
      id: uid(),
      title: t,
      author: String(author || "").trim(),
      status: status || "to-read",
      tags: [],
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.books.unshift(b);
    save();
    upsertBookOptions();
    return b;
  }

  function addQuote({ bookId, text, location = "", tags = [], reflection = "" }) {
    if (!bookId || !String(text || "").trim()) return;
    state.quotes.unshift({
      id: uid(),
      bookId,
      text: String(text).trim(),
      location: String(location || "").trim(),
      tags: Array.isArray(tags) ? tags : [],
      reflection: String(reflection || "").trim(),
      createdAt: new Date().toISOString(),
    });
    save();
    renderQuotes();
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
        const tags = (b.tags || [])
          .slice(0, 6)
          .map((t) => `<span class="pill">${escapeHtml(t)}</span>`)
          .join("");
        return `
        <div class="item">
          <div class="item__main">
            <div class="item__title">${escapeHtml(b.title)}${
              b.author ? ` <span class="muted" style="font-weight:600">— ${escapeHtml(b.author)}</span>` : ""
            }</div>
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

  function deleteBookNote(id) {
    state.bookNotes = state.bookNotes.filter((n) => n.id !== id);
    save();
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

  function deleteQuote(id) {
    state.quotes = state.quotes.filter((q) => q.id !== id);
    save();
    toast("Quote deleted.");
    renderQuotes();
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
        const tags = (x.tags || [])
          .slice(0, 6)
          .map((t) => `<span class="pill">${escapeHtml(t)}</span>`)
          .join("");
        return `
        <div class="item">
          <div class="item__main">
            <div class="item__title">${escapeHtml(bookTitle(x.bookId))}</div>
            <div class="item__meta">
              ${x.location ? `<span class="pill">${escapeHtml(x.location)}</span>` : ""}
              ${tags}
              <span class="pill">${escapeHtml(fmtDate(x.createdAt))}</span>
            </div>
            <div style="margin-top:10px; line-height:1.45">
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
      save();
      bookForm.reset();
      toast("Book saved.");
      upsertBookOptions();
      renderBooks();
      renderQuotes();
    });
  }

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
      save();
      bookNoteForm.reset();
      if (bookNoteDate) bookNoteDate.value = todayISO();
      toast("Note saved.");
      renderBookNotes();
    });
  }

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

      addQuote({ bookId, text, location, tags, reflection });
      toast("Quote saved.");
      quoteForm.reset();
    });
  }

  bookSearch?.addEventListener("input", renderBooks);
  bookStatus?.addEventListener("change", renderBooks);
  bookNoteSearch?.addEventListener("input", renderBookNotes);
  bookNoteFilterBook?.addEventListener("change", renderBookNotes);
  quoteSearch?.addEventListener("input", renderQuotes);
  quoteFilterBook?.addEventListener("change", renderQuotes);

  return {
    upsertBookOptions,
    findBook,
    bookTitle,
    ensureBookByTitle,
    addQuote,
    renderBooks,
    renderBookNotes,
    renderQuotes,
    deleteBook,
  };
}

