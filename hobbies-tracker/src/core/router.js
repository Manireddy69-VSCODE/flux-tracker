export function initRouter({ renderAll }) {
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

  return { setRoute };
}

