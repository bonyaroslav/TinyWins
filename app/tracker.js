const dataSources = [
  "../data/private/progress.jsonl",
  "../data/examples/progress.sample.jsonl",
];

const vectorSources = [
  "../data/private/vectors.md",
  "../data/examples/vectors.sample.md",
];

const promptSources = {
  parser: "../prompts/parse-progress.md",
};

const fallbackVectors = [
  "Core Work",
  "Learning",
  "Experiments",
];

const state = {
  artifacts: [],
  errors: [],
  vectors: fallbackVectors,
  dataSource: "",
  vectorSource: "",
  promptsLoaded: false,
};

const statusEl = document.querySelector("#status");
const issuesEl = document.querySelector("#issues");
const progressView = document.querySelector("#progressView");

loadDefaults();

async function loadDefaults() {
  try {
    const loadedVectors = await fetchFirstAvailable(vectorSources, "vector list");
    const parsedVectors = parseVectors(loadedVectors.text);
    state.vectors = parsedVectors.length ? parsedVectors : fallbackVectors;
    state.vectorSource = loadedVectors.path;
  } catch (error) {
    state.errors.push(error.message);
  }

  try {
    const parserPrompt = await fetchText(promptSources.parser);
    state.promptsLoaded = parserPrompt.includes("progress artifact parser");
  } catch (error) {
    state.errors.push(`Prompt file was not fully loaded: ${error.message}`);
  }

  try {
    const loaded = await fetchFirstAvailable(dataSources, "progress data");
    const parsed = parseJsonl(loaded.text);
    state.artifacts = parsed.artifacts;
    state.errors.push(...parsed.errors);
    state.dataSource = loaded.path;
  } catch (error) {
    state.errors.push(error.message);
  }

  render();
}

async function fetchFirstAvailable(paths, label) {
  const failures = [];

  for (const path of paths) {
    try {
      return { path, text: await fetchText(path) };
    } catch (error) {
      failures.push(`${path}: ${error.message}`);
    }
  }

  throw new Error(`No ${label} file found. Tried ${failures.join("; ")}`);
}

async function fetchText(path) {
  const response = await fetch(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

function parseVectors(text) {
  const lines = text.split(/\r?\n/);

  return lines
    .map((line) => line.match(/^\s*\d+\.\s+(.+?)\s*$/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function parseJsonl(text) {
  const artifacts = [];
  const errors = [];
  const seenIds = new Set();

  text.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    if (!trimmed) {
      return;
    }

    let item;
    try {
      item = JSON.parse(trimmed);
    } catch {
      errors.push(`Line ${lineNumber}: invalid JSON.`);
      return;
    }

    const validationError = validateArtifact(item, seenIds);
    if (validationError) {
      errors.push(`Line ${lineNumber}: ${validationError}`);
      return;
    }

    seenIds.add(item.id);
    artifacts.push({
      id: item.id,
      date: item.date,
      vector: item.vector,
      text: item.text.trim(),
      minutes: normalizeMinutes(item.minutes),
      link: normalizeLink(item.link),
    });
  });

  artifacts.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return a.id.localeCompare(b.id);
  });

  return { artifacts, errors };
}

function validateArtifact(item, seenIds) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return "expected a JSON object.";
  }

  if (!isNonEmptyString(item.id)) {
    return "missing required string field `id`.";
  }

  if (seenIds.has(item.id)) {
    return `duplicate id \`${item.id}\`.`;
  }

  if (!isValidDate(item.date)) {
    return "missing or invalid `date`; expected YYYY-MM-DD.";
  }

  if (!state.vectors.includes(item.vector)) {
    return "missing or unknown `vector`.";
  }

  if (!isNonEmptyString(item.text)) {
    return "missing required string field `text`.";
  }

  if (item.minutes !== undefined && item.minutes !== null && normalizeMinutes(item.minutes) === null) {
    return "`minutes` must be a non-negative number.";
  }

  if (item.link !== undefined && item.link !== null && normalizeLink(item.link) === null) {
    return "`link` must be a non-empty string when present.";
  }

  return "";
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value;
}

function normalizeMinutes(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
}

function normalizeLink(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function render() {
  renderIssues();
  renderStatus();
  renderWeeks();
}

function renderIssues() {
  issuesEl.replaceChildren();

  if (state.errors.length === 0) {
    issuesEl.hidden = true;
    return;
  }

  const title = document.createElement("strong");
  title.textContent = `${state.errors.length} loading or data issue${state.errors.length === 1 ? "" : "s"}`;
  const list = document.createElement("ul");

  state.errors.slice(0, 8).forEach((error) => {
    const item = document.createElement("li");
    item.textContent = error;
    list.append(item);
  });

  if (state.errors.length > 8) {
    const item = document.createElement("li");
    item.textContent = `Plus ${state.errors.length - 8} more.`;
    list.append(item);
  }

  issuesEl.append(title, list);
  issuesEl.hidden = false;
}

function renderStatus() {
  if (!state.dataSource) {
    statusEl.textContent = "No progress data loaded.";
    return;
  }

  const artifactLabel = state.artifacts.length === 1 ? "artifact" : "artifacts";
  const weekCount = groupByWeek(state.artifacts).length;
  const weekLabel = weekCount === 1 ? "week" : "weeks";
  const promptStatus = state.promptsLoaded ? "parser prompt loaded" : "parser prompt unavailable";
  const vectorStatus = state.vectorSource ? displayPath(state.vectorSource) : "fallback vectors";
  statusEl.textContent = `${displayPath(state.dataSource)}: ${state.artifacts.length} ${artifactLabel} across ${weekCount} ${weekLabel}; vectors from ${vectorStatus}; ${promptStatus}.`;
}

function renderWeeks() {
  progressView.replaceChildren();

  if (!state.dataSource) {
    renderEmpty("Could not load a local or sample progress data file.");
    return;
  }

  if (state.artifacts.length === 0) {
    renderEmpty("No valid artifacts found.");
    return;
  }

  groupByWeek(state.artifacts).forEach((week) => {
    progressView.append(createWeekSection(week));
  });
}

function groupByWeek(artifacts) {
  const byWeek = new Map();

  artifacts.forEach((artifact) => {
    const week = getWeekRange(artifact.date);

    if (!byWeek.has(week.start)) {
      byWeek.set(week.start, {
        start: week.start,
        end: week.end,
        artifacts: [],
        dates: new Map(),
      });
    }

    const group = byWeek.get(week.start);
    group.artifacts.push(artifact);

    if (!group.dates.has(artifact.date)) {
      group.dates.set(artifact.date, new Map());
    }

    const byVector = group.dates.get(artifact.date);
    if (!byVector.has(artifact.vector)) {
      byVector.set(artifact.vector, []);
    }

    byVector.get(artifact.vector).push(artifact);
  });

  return Array.from(byWeek.values()).sort((a, b) => b.start.localeCompare(a.start));
}

function createWeekSection(week) {
  const section = document.createElement("section");
  section.className = "week-section";

  const heading = document.createElement("div");
  heading.className = "week-heading";

  const title = document.createElement("h2");
  title.textContent = `Week of ${week.start}`;

  const summary = document.createElement("span");
  summary.className = "week-summary";
  summary.textContent = `${week.start} to ${week.end} | ${week.artifacts.length} ${week.artifacts.length === 1 ? "artifact" : "artifacts"}`;

  heading.append(title, summary);
  section.append(heading, createWeekTable(week));

  return section;
}

function createWeekTable(week) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const headerRow = document.createElement("tr");
  const dateHead = document.createElement("th");
  dateHead.className = "date-head";
  dateHead.textContent = "Date";
  headerRow.append(dateHead);

  state.vectors.forEach((vector) => {
    const th = document.createElement("th");
    th.textContent = vector;
    headerRow.append(th);
  });

  thead.append(headerRow);

  Array.from(week.dates.keys())
    .sort()
    .reverse()
    .forEach((date) => {
      tbody.append(createDateRow(date, week.dates.get(date)));
    });

  table.append(thead, tbody);
  return table;
}

function createDateRow(date, byVector) {
  const row = document.createElement("tr");
  const dateCell = document.createElement("td");
  dateCell.className = "date-cell";
  dateCell.textContent = date;
  row.append(dateCell);

  state.vectors.forEach((vector) => {
    const cell = document.createElement("td");
    const stack = document.createElement("div");
    stack.className = "cell-stack";
    const artifacts = byVector.get(vector) || [];

    artifacts.slice(0, 4).forEach((artifact) => {
      stack.append(createArtifactChip(artifact));
    });

    if (artifacts.length > 4) {
      const more = document.createElement("div");
      more.className = "more";
      more.textContent = `+${artifacts.length - 4} more`;
      stack.append(more);
    }

    cell.append(stack);
    row.append(cell);
  });

  return row;
}

function renderEmpty(message) {
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = message;
  progressView.append(empty);
}

function createArtifactChip(artifact) {
  const chip = artifact.link ? document.createElement("a") : document.createElement("div");
  chip.className = "artifact";

  if (artifact.link) {
    chip.href = artifact.link;
    chip.target = "_blank";
    chip.rel = "noreferrer";
  }

  const text = document.createElement("span");
  text.className = "artifact-text";
  text.textContent = artifact.text;
  text.title = artifact.text;
  chip.append(text);

  if (artifact.minutes !== null) {
    const minutes = document.createElement("span");
    minutes.className = "minutes";
    minutes.textContent = `${formatNumber(artifact.minutes)} min`;
    chip.append(minutes);
  }

  return chip;
}

function getWeekRange(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const day = date.getDay() || 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day + 1);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayPath(path) {
  return path.replace(/^\.\.\//, "");
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
