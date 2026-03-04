import { escapeHtml } from "../core/utils.js";

export function initInsights({ state }) {
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

  return { renderInsights };
}

