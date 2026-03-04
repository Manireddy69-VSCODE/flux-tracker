import { createStore } from "./core/store.js";
import { initRouter } from "./core/router.js";

import { initExercise } from "./features/exercise.js";
import { initLibrary } from "./features/reading/library.js";
import { initConnections } from "./features/connections.js";
import { initAssistant } from "./features/assistant.js";
import { initInsights } from "./features/insights.js";
import { initSettings } from "./features/settings.js";

const store = createStore();

const insights = initInsights({ state: store.state });
const save = () => {
  store.save();
  insights.renderInsights();
};

const exercise = initExercise({ state: store.state, save });
const library = initLibrary({ state: store.state, save });
const connections = initConnections({
  state: store.state,
  save,
  bookTitle: library.bookTitle,
});
const assistant = initAssistant({
  state: store.state,
  save,
  library,
  exercise,
});

function renderAll() {
  exercise.renderExercise();
  library.renderBooks();
  library.renderBookNotes();
  library.renderQuotes();
  connections.renderConnections();
  assistant.renderAssistant();
  assistant.renderWords();
  insights.renderInsights();
}

initSettings({ store, library, renderAll });
const router = initRouter({ renderAll });

// initial
library.upsertBookOptions();
renderAll();

// default route
router.setRoute((location.hash || "#exercise").slice(1));

