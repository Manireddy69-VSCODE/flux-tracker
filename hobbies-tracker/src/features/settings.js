import { ensureStateShape } from "../core/store.js";
import { todayISO, toast } from "../core/utils.js";

export function initSettings({ store, library, renderAll }) {
  const exportBtn = document.querySelector("#export-btn");
  const importInput = document.querySelector("#import-input");
  const resetBtn = document.querySelector("#reset-btn");

  exportBtn?.addEventListener("click", () => {
    const data = JSON.stringify(store.state, null, 2);
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
              id: w.id || `${Date.now()}`,
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
      store.replaceFrom(parsed);
      toast("Imported.");
      library.upsertBookOptions();
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
    store.reset();
    toast("Reset complete.");
    library.upsertBookOptions();
    renderAll();
  });
}

