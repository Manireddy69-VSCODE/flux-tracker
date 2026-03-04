export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseTags(raw) {
  return String(raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toast(msg) {
  const el = document.querySelector("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-visible");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("is-visible"), 1800);
}

export function fmtDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.valueOf())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function includesQuery(...fields) {
  const hay = fields
    .filter((x) => x !== null && x !== undefined)
    .map((x) => String(x).toLowerCase())
    .join(" ");
  return (q) => hay.includes(String(q || "").trim().toLowerCase());
}

export function timeHHMM() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function workoutLabel(type) {
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

export function bookStatusPill(status) {
  if (status === "done") return { label: "DONE", cls: "ok" };
  if (status === "reading") return { label: "READING", cls: "info" };
  return { label: "TO READ", cls: "warn" };
}

