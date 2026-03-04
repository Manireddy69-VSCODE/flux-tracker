import { uid, toast, includesQuery, escapeHtml, fmtDate } from "../core/utils.js";

export function initConnections({ state, save, bookTitle }) {
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

  function deleteConnection(id) {
    state.connections = state.connections.filter((c) => c.id !== id);
    save();
    toast("Connection deleted.");
    renderConnections();
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
            <div class="item__title">${escapeHtml(bookTitle(c.fromBookId))} <span class="muted" style="font-weight:700">→</span> ${escapeHtml(
              bookTitle(c.toBookId)
            )}</div>
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
      save();
      connectionForm.reset();
      toast("Connection saved.");
      renderConnections();
    });
  }

  connSearch?.addEventListener("input", renderConnections);

  return { renderConnections };
}

