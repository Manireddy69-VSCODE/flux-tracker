export const STORAGE_KEY = "hobbies-tracker:v1";

export function defaultState() {
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

export function ensureStateShape(state) {
  const s = state && typeof state === "object" ? state : {};
  return {
    version: 1,
    createdAt: s.createdAt || new Date().toISOString(),
    assistantMessages: Array.isArray(s.assistantMessages)
      ? s.assistantMessages
      : Array.isArray(s.messages)
        ? s.messages
        : [],
    words: Array.isArray(s.words) ? s.words : [],
    exercise: Array.isArray(s.exercise) ? s.exercise : [],
    books: Array.isArray(s.books) ? s.books : [],
    bookNotes: Array.isArray(s.bookNotes) ? s.bookNotes : [],
    quotes: Array.isArray(s.quotes) ? s.quotes : [],
    connections: Array.isArray(s.connections) ? s.connections : [],
  };
}

export function loadState() {
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

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createStore() {
  const state = ensureStateShape(loadState() || defaultState());
  saveState(state);

  function save() {
    saveState(state);
  }

  function replaceFrom(nextState) {
    const next = ensureStateShape(nextState);
    state.version = next.version;
    state.createdAt = next.createdAt;
    state.assistantMessages = next.assistantMessages;
    state.words = next.words;
    state.exercise = next.exercise;
    state.books = next.books;
    state.bookNotes = next.bookNotes;
    state.quotes = next.quotes;
    state.connections = next.connections;
    save();
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    replaceFrom(defaultState());
  }

  return { state, save, replaceFrom, reset };
}

