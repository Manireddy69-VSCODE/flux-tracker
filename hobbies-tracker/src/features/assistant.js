import {
  uid,
  toast,
  escapeHtml,
  includesQuery,
  timeHHMM,
  workoutLabel,
} from "../core/utils.js";

export function initAssistant({ state, save, library, exercise }) {
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
    save();
  }

  function setLastExtraction(obj) {
    if (!aiLast) return;
    aiLast.innerHTML = `<pre style="margin:0; white-space:pre-wrap; font-family: var(--mono); color: rgba(255,255,255,.75)">${escapeHtml(
      JSON.stringify(obj, null, 2)
    )}</pre>`;
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
    save();
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
        save();
        toast("Word deleted.");
        renderWords();
      });
    });
  }

  wordSearch?.addEventListener("input", renderWords);

  function detectWordLookup(text) {
    const t = text.trim();
    const m1 = t.match(/what does\s+([a-zA-Z'-]{2,})\s+mean\??$/i);
    const m2 = t.match(/^define\s+([a-zA-Z'-]{2,})\??$/i);
    const m3 = t.match(/^meaning of\s+([a-zA-Z'-]{2,})\??$/i);
    const m4 = t.match(/^([a-zA-Z'-]{2,})\??$/i);
    const word =
      (m1?.[1] || m2?.[1] || m3?.[1] || (t.split(/\s+/).length === 1 ? m4?.[1] : null)) || null;
    if (!word) return null;
    if (word.length > 32) return null;
    return word;
  }

  async function lookupDictionary(word) {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );
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
      /(gym|workout|lift|weights)/.test(t)
        ? "gym"
        : /(ran|run|running)\b/.test(t)
          ? "run"
          : /(walk|walked|walking)\b/.test(t)
            ? "walk"
            : /(cycle|cycling|bike)\b/.test(t)
              ? "cycling"
              : /(yoga)\b/.test(t)
                ? "yoga"
                : null;

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

    return { type, duration, distance, notes: text.trim() };
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
      const parts = tail
        .split(/·|\||,|—/)
        .map((x) => x.trim())
        .filter(Boolean);
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
    const m =
      t.match(/\b(i'?m|im|i am)\s+(reading|re-reading|started)\s+(.+)$/i) ||
      t.match(/\b(just\s+finished|finished|completed)\s+(.+)$/i) ||
      t.match(/\b(want\s+to\s+read|to\s+read)\s+(.+)$/i);
    if (!m) return null;

    const status = /want\s+to\s+read|to\s+read/i.test(m[0])
      ? "to-read"
      : /finished|completed/i.test(m[0])
        ? "done"
        : "reading";

    const titleRaw = (m[3] || m[2] || "").trim();
    const by = titleRaw.match(/^(.+?)\s+by\s+(.+)$/i);
    const title = (by ? by[1] : titleRaw).replace(/[.?!]+$/g, "").trim();
    const author = by ? by[2].replace(/[.?!]+$/g, "").trim() : "";
    if (!title) return null;
    return { title, author, status };
  }

  async function processAssistantInput(raw) {
    const text = String(raw || "").trim();
    if (!text) return;

    addAssistantMessage("user", text, "CHAT", null);

    const word = detectWordLookup(text);
    const quote = detectQuote(text);
    const workout = detectWorkout(text);
    const book = detectBook(text);

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
      return;
    }

    if (quote) {
      let bookId = null;
      if (quote.book) {
        const b = library.ensureBookByTitle({
          title: quote.book,
          author: quote.author || "",
          status: "to-read",
        });
        bookId = b?.id || null;
      } else if (state.books[0]?.id) {
        bookId = state.books[0].id;
      }

      if (bookId) {
        library.addQuote({ bookId, text: quote.text });
        library.upsertBookOptions();
      }

      addAssistantMessage("assistant", "Saved that quote to your library.", "QUOTE", quote);
      setLastExtraction({ intent: "QUOTE", data: quote });
      renderAssistant();
      return;
    }

    if (workout) {
      exercise.addWorkoutFromAssistant(workout);
      addAssistantMessage("assistant", "Logged your workout.", "WORKOUT", workout);
      setLastExtraction({ intent: "WORKOUT", data: workout });
      renderAssistant();
      return;
    }

    if (book) {
      library.ensureBookByTitle(book);
      library.upsertBookOptions();
      addAssistantMessage("assistant", "Saved that book to your library.", "BOOK", book);
      setLastExtraction({ intent: "BOOK", data: book });
      renderAssistant();
      return;
    }

    addAssistantMessage(
      "assistant",
      "Got it. If you paste a quote, log a workout, or ask “what does X mean?”, I’ll auto-save it.",
      "CHAT",
      {}
    );
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
    save();
    toast("Chat cleared.");
    renderAssistant();
  });

  aiSuggestions?.querySelectorAll("[data-suggest]")?.forEach((btn) => {
    btn.addEventListener("click", async () => {
      await processAssistantInput(btn.dataset.suggest || "");
    });
  });

  return { renderAssistant, renderWords };
}

