import { safeNumber, toast, includesQuery, escapeHtml, fmtDate, workoutLabel, todayISO } from "../core/utils.js";

export function initExercise({ state, save }) {
  const exerciseForm = document.querySelector("#exercise-form");
  const exerciseList = document.querySelector("#exercise-list");
  const exerciseSearch = document.querySelector("#exercise-search");
  const exerciseFilter = document.querySelector("#exercise-filter");

  function deleteWorkout(id) {
    state.exercise = state.exercise.filter((x) => x.id !== id);
    save();
    toast("Workout deleted.");
    renderExercise();
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

  if (exerciseForm) {
    const dateInput = exerciseForm.querySelector('input[name="date"]');
    if (dateInput) dateInput.value = todayISO();

    exerciseForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(exerciseForm);
      const type = String(fd.get("type") || "other");
      const date = String(fd.get("date") || todayISO());
      const minutes = safeNumber(fd.get("minutes"));
      const distanceKm = safeNumber(fd.get("distanceKm"));
      const notes = String(fd.get("notes") || "").trim();

      state.exercise.unshift({
        id: crypto.randomUUID?.() || String(Date.now()),
        type,
        date,
        minutes,
        distanceKm,
        notes,
        createdAt: new Date().toISOString(),
      });
      save();
      exerciseForm.reset();
      if (dateInput) dateInput.value = todayISO();
      toast("Workout saved.");
      renderExercise();
    });
  }

  exerciseSearch?.addEventListener("input", renderExercise);
  exerciseFilter?.addEventListener("change", renderExercise);

  function addWorkoutFromAssistant({ type, duration, distance, notes }) {
    state.exercise.unshift({
      id: crypto.randomUUID?.() || String(Date.now()),
      type: type || "other",
      date: todayISO(),
      minutes: duration ?? null,
      distanceKm: distance ?? null,
      notes: notes || "",
      createdAt: new Date().toISOString(),
    });
    save();
    renderExercise();
  }

  return { renderExercise, addWorkoutFromAssistant };
}

