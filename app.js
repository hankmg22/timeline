const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_DAY_PX = 76;
const SNAP_GRID = 12;
const STORAGE_KEY = "timeline-studio-projects-v1";
const VERSION = 2;

const defaultCategorySeeds = [
  ["cat-milestone", "Milestone", "#c99448"],
  ["cat-personal", "Personal", "#6fa69a"],
  ["cat-work", "Work", "#859dc5"],
  ["cat-travel", "Travel", "#b47c62"],
  ["cat-family", "Family", "#9d8ac7"],
  ["cat-health", "Health", "#b85e51"],
];

const els = {
  viewport: document.getElementById("viewport"),
  svg: document.getElementById("timelineSvg"),
  cardLayer: document.getElementById("cardLayer"),
  miniMap: document.getElementById("miniMap"),
  miniMapEvents: document.getElementById("miniMapEvents"),
  miniMapWindow: document.getElementById("miniMapWindow"),
  projectSelect: document.getElementById("projectSelect"),
  projectMeta: document.getElementById("projectMeta"),
  hoverDate: document.getElementById("hoverDate"),
  zoomLabel: document.getElementById("zoomLabel"),
  importInput: document.getElementById("importInput"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  clearSearch: document.getElementById("clearSearchBtn"),
  categoryList: document.getElementById("categoryList"),
  addCategory: document.getElementById("addCategoryBtn"),
  buttons: {
    newProject: document.getElementById("newProjectBtn"),
    renameProject: document.getElementById("renameProjectBtn"),
    duplicateProject: document.getElementById("duplicateProjectBtn"),
    deleteProject: document.getElementById("deleteProjectBtn"),
    addToday: document.getElementById("addTodayBtn"),
    resetView: document.getElementById("resetViewBtn"),
    focus: document.getElementById("focusBtn"),
    collapseAll: document.getElementById("collapseAllBtn"),
    pastToggle: document.getElementById("pastToggleBtn"),
    gridToggle: document.getElementById("gridToggleBtn"),
    import: document.getElementById("importBtn"),
    export: document.getElementById("exportBtn"),
  },
  eventModal: document.getElementById("eventModal"),
  eventForm: document.getElementById("eventForm"),
  eventModalTitle: document.getElementById("eventModalTitle"),
  eventTitle: document.getElementById("eventTitle"),
  eventDate: document.getElementById("eventDate"),
  eventCategory: document.getElementById("eventCategory"),
  eventWidth: document.getElementById("eventWidth"),
  eventHeight: document.getElementById("eventHeight"),
  eventBody: document.getElementById("eventBody"),
  boldBtn: document.getElementById("boldBtn"),
  italicBtn: document.getElementById("italicBtn"),
  fontSize: document.getElementById("fontSize"),
  textAlign: document.getElementById("textAlign"),
  textColor: document.getElementById("textColor"),
  lockDateInput: document.getElementById("lockDateInput"),
  collapsedInput: document.getElementById("collapsedInput"),
  imageInput: document.getElementById("imageInput"),
  imagePreview: document.getElementById("imagePreview"),
  removeImage: document.getElementById("removeImageBtn"),
  deleteEvent: document.getElementById("deleteEventBtn"),
  projectModal: document.getElementById("projectModal"),
  projectForm: document.getElementById("projectForm"),
  projectModalTitle: document.getElementById("projectModalTitle"),
  projectNameInput: document.getElementById("projectNameInput"),
  categoryModal: document.getElementById("categoryModal"),
  categoryForm: document.getElementById("categoryForm"),
  categoryModalTitle: document.getElementById("categoryModalTitle"),
  categoryNameInput: document.getElementById("categoryNameInput"),
  categoryColorInput: document.getElementById("categoryColorInput"),
  deleteCategory: document.getElementById("deleteCategoryBtn"),
};

const state = {
  projects: [],
  activeProjectId: null,
  view: { x: 164, y: null, scale: 1 },
  interaction: null,
  selectedEventId: null,
  focusMode: false,
  activeCategoryId: "all",
  searchQuery: "",
  editingEventId: null,
  eventModalIsNew: false,
  modalImageData: "",
  projectMode: "new",
  editingCategoryId: null,
  miniMapRange: { minDay: 0, maxDay: 60 },
};

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function parseISODate(value) {
  const safe = isISODate(value) ? value : todayISO();
  const [year, month, day] = safe.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatISODate(ms) {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function addDaysISO(value, days) {
  return formatISODate(parseISODate(value) + days * DAY_MS);
}

function daysBetween(startISO, endISO) {
  return Math.round((parseISODate(endISO) - parseISODate(startISO)) / DAY_MS);
}

function monthIndex(value) {
  const date = new Date(parseISODate(value));
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function isoFromMonthIndex(index) {
  const year = Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12;
  return formatISODate(Date.UTC(year, month, 1));
}

function yearFromISO(value) {
  return new Date(parseISODate(value)).getUTCFullYear();
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parseISODate(value)));
}

function formatTickDate(value, mode) {
  const date = new Date(parseISODate(value));
  if (mode === "year") return String(date.getUTCFullYear());
  if (mode === "quarter") return `Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
  if (mode === "month") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function snap(value, grid = SNAP_GRID) {
  return Math.round(value / grid) * grid;
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeFileName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "timeline";
}

function activeProject() {
  return state.projects.find((project) => project.id === state.activeProjectId) || state.projects[0];
}

function defaultCategories() {
  return defaultCategorySeeds.map(([id, name, color]) => ({ id, name, color }));
}

function defaultCategoryId(project) {
  return project.categories[0]?.id || "cat-milestone";
}

function categoryById(project, id) {
  return project.categories.find((category) => category.id === id) || project.categories[0];
}

function eventColor(project, event) {
  return categoryById(project, event.categoryId)?.color || event.color || "#c99448";
}

function eventCategoryName(project, event) {
  return categoryById(project, event.categoryId)?.name || "Event";
}

function getViewportRect() {
  return els.viewport.getBoundingClientRect();
}

function ensureView() {
  const rect = getViewportRect();
  if (state.view.y === null) {
    state.view.y = Math.round(rect.height * 0.56);
  }
}

function worldXForDate(project, date) {
  const day = daysBetween(project.originDate, date);
  return (project.settings.allowPast ? day : Math.max(0, day)) * BASE_DAY_PX;
}

function dateForWorldX(project, worldX) {
  const day = Math.round(worldX / BASE_DAY_PX);
  return addDaysISO(project.originDate, project.settings.allowPast ? day : Math.max(0, day));
}

function worldToScreenX(worldX) {
  return worldX * state.view.scale + state.view.x;
}

function worldToScreenY(worldY) {
  return worldY + state.view.y;
}

function screenToWorldX(screenX) {
  return (screenX - state.view.x) / state.view.scale;
}

function screenToWorldY(screenY) {
  return screenY - state.view.y;
}

function createEvent(project, overrides = {}) {
  const date = overrides.date || project.originDate;
  const anchorX = worldXForDate(project, date);
  const categoryId = overrides.categoryId || project.categories[project.events.length % project.categories.length]?.id || defaultCategoryId(project);
  return {
    id: uid("event"),
    title: overrides.title || "Untitled",
    date,
    body: overrides.body || "",
    categoryId,
    color: overrides.color || categoryById(project, categoryId)?.color || "#c99448",
    image: overrides.image || "",
    lockDate: Boolean(overrides.lockDate),
    collapsed: Boolean(overrides.collapsed),
    position: {
      x: Number.isFinite(overrides.x) ? overrides.x : anchorX + 44,
      y: Number.isFinite(overrides.y) ? overrides.y : -190,
    },
    size: {
      w: overrides.w || 280,
      h: overrides.h || 178,
    },
    style: {
      fontSize: overrides.fontSize || 15,
      bold: Boolean(overrides.bold),
      italic: Boolean(overrides.italic),
      align: overrides.align || "left",
      textColor: overrides.textColor || "#ebe4d6",
    },
  };
}

function createDefaultProject(name = "Shared Timeline") {
  const originDate = todayISO();
  const project = {
    schemaVersion: VERSION,
    id: uid("project"),
    name,
    originDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      allowPast: true,
      snapToGrid: true,
    },
    categories: defaultCategories(),
    events: [],
  };

  project.events.push(
    createEvent(project, {
      title: "Today",
      body: "**The line starts here.**\n\nDrag empty space to move. Roll the wheel to zoom.",
      categoryId: "cat-milestone",
      x: 44,
      y: -190,
      w: 300,
      h: 176,
      bold: true,
    }),
    createEvent(project, {
      title: "Planning window",
      date: addDaysISO(originDate, 14),
      body: "- Trips\n- Deadlines\n- Shared plans\n- Images and notes",
      categoryId: "cat-personal",
      x: BASE_DAY_PX * 14 - 108,
      y: 88,
      w: 304,
      h: 178,
    }),
    createEvent(project, {
      title: "Locked milestone",
      date: addDaysISO(originDate, 45),
      body: "Dates can be locked while cards remain movable.",
      categoryId: "cat-work",
      x: BASE_DAY_PX * 45 - 38,
      y: -230,
      w: 312,
      h: 170,
      lockDate: true,
    }),
  );

  return project;
}

function normalizeSettings(rawSettings = {}) {
  return {
    allowPast: rawSettings.allowPast !== undefined ? Boolean(rawSettings.allowPast) : true,
    snapToGrid: rawSettings.snapToGrid !== undefined ? Boolean(rawSettings.snapToGrid) : true,
  };
}

function normalizeCategories(rawCategories) {
  const fallback = defaultCategories();
  if (!Array.isArray(rawCategories) || rawCategories.length === 0) return fallback;
  const seen = new Set();
  const categories = rawCategories
    .map((category, index) => ({
      id: String(category.id || uid("cat")),
      name: String(category.name || `Category ${index + 1}`).slice(0, 40),
      color: String(category.color || fallback[index % fallback.length].color),
    }))
    .filter((category) => {
      if (seen.has(category.id)) return false;
      seen.add(category.id);
      return true;
    });
  return categories.length ? categories : fallback;
}

function normalizeEvent(project, rawEvent = {}) {
  const rawDate = isISODate(rawEvent.date) ? rawEvent.date : project.originDate;
  const date = project.settings.allowPast || parseISODate(rawDate) >= parseISODate(project.originDate)
    ? rawDate
    : project.originDate;
  const categoryFromColor = project.categories.find((category) => category.color === rawEvent.color);
  const categoryId = project.categories.some((category) => category.id === rawEvent.categoryId)
    ? rawEvent.categoryId
    : categoryFromColor?.id || defaultCategoryId(project);
  const anchorX = worldXForDate(project, date);
  const rawStyle = rawEvent.style || {};

  return {
    id: String(rawEvent.id || uid("event")),
    title: String(rawEvent.title || "Untitled").slice(0, 120),
    date,
    body: String(rawEvent.body || ""),
    categoryId,
    color: String(rawEvent.color || categoryById(project, categoryId)?.color || "#c99448"),
    image: String(rawEvent.image || ""),
    lockDate: Boolean(rawEvent.lockDate),
    collapsed: Boolean(rawEvent.collapsed),
    position: {
      x: Number.isFinite(rawEvent.position?.x) ? rawEvent.position.x : anchorX + 44,
      y: Number.isFinite(rawEvent.position?.y) ? rawEvent.position.y : -190,
    },
    size: {
      w: clamp(Number(rawEvent.size?.w) || 280, 180, 720),
      h: clamp(Number(rawEvent.size?.h) || 178, 112, 640),
    },
    style: {
      fontSize: clamp(Number(rawStyle.fontSize) || 15, 12, 28),
      bold: Boolean(rawStyle.bold),
      italic: Boolean(rawStyle.italic),
      align: ["left", "center", "right"].includes(rawStyle.align) ? rawStyle.align : "left",
      textColor: rawStyle.textColor || "#ebe4d6",
    },
  };
}

function normalizeProject(rawProject = {}) {
  const project = {
    schemaVersion: VERSION,
    id: String(rawProject.id || uid("project")),
    name: String(rawProject.name || "Imported Timeline").slice(0, 80),
    originDate: isISODate(rawProject.originDate) ? rawProject.originDate : todayISO(),
    createdAt: rawProject.createdAt || new Date().toISOString(),
    updatedAt: rawProject.updatedAt || new Date().toISOString(),
    settings: normalizeSettings(rawProject.settings),
    categories: normalizeCategories(rawProject.categories),
    events: [],
  };
  project.events = Array.isArray(rawProject.events)
    ? rawProject.events.map((event) => normalizeEvent(project, event))
    : [];
  return project;
}

function load() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const project = createDefaultProject();
    state.projects = [project];
    state.activeProjectId = project.id;
    save();
    return;
  }

  try {
    const data = JSON.parse(stored);
    const projects = Array.isArray(data.projects)
      ? data.projects.map(normalizeProject)
      : [normalizeProject(data.project || data)];
    state.projects = projects.length ? projects : [createDefaultProject()];
    state.activeProjectId = data.activeProjectId || state.projects[0].id;
  } catch {
    const project = createDefaultProject();
    state.projects = [project];
    state.activeProjectId = project.id;
  }
}

function save() {
  const project = activeProject();
  if (project) {
    project.updatedAt = new Date().toISOString();
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: VERSION,
      activeProjectId: state.activeProjectId,
      projects: state.projects,
    }),
  );
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const dateDiff = parseISODate(a.date) - parseISODate(b.date);
    return dateDiff || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}

function inlineMarkdown(value) {
  return escapeHTML(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdown(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    blocks.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
      return;
    }
    const item = trimmed.match(/^[-*]\s+(.+)$/);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      return;
    }
    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return blocks.join("") || "<p><span class=\"empty-state\">Empty event</span></p>";
}

function eventMatchesQuery(project, event, query) {
  if (!query) return true;
  const haystack = [
    event.title,
    event.body,
    event.date,
    formatShortDate(event.date),
    eventCategoryName(project, event),
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function eventMatchesFilters(project, event) {
  const categoryMatches = state.activeCategoryId === "all" || event.categoryId === state.activeCategoryId;
  return categoryMatches && eventMatchesQuery(project, event, state.searchQuery);
}

function visibleEvents(project) {
  return sortEvents(project.events.filter((event) => eventMatchesFilters(project, event)));
}

function svgNode(name, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function renderProjectControls() {
  const project = activeProject();
  els.projectSelect.innerHTML = state.projects
    .map((item) => `<option value="${item.id}">${escapeHTML(item.name)}</option>`)
    .join("");
  els.projectSelect.value = project.id;
  els.projectMeta.textContent = `${project.events.length} events / ${project.categories.length} categories`;
  els.buttons.pastToggle.classList.toggle("active", project.settings.allowPast);
  els.buttons.gridToggle.classList.toggle("active", project.settings.snapToGrid);
  els.buttons.focus.classList.toggle("active", state.focusMode);
}

function tickSpec(pxPerDay) {
  if (pxPerDay >= 78) return { unit: "day", step: 1, label: "day" };
  if (pxPerDay >= 42) return { unit: "day", step: 2, label: "day" };
  if (pxPerDay >= 18) return { unit: "week", step: 1, label: "day" };
  if (pxPerDay >= 8) return { unit: "week", step: 2, label: "day" };
  if (pxPerDay >= 2.6) return { unit: "month", step: 1, label: "month" };
  if (pxPerDay >= 0.95) return { unit: "month", step: 3, label: "quarter" };
  if (pxPerDay >= 0.3) return { unit: "year", step: 1, label: "year" };
  return { unit: "year", step: 5, label: "year" };
}

function collectTicks(project, spec, startWorld, endWorld) {
  if (spec.unit === "day" || spec.unit === "week") {
    const dayStep = spec.unit === "week" ? spec.step * 7 : spec.step;
    const rawStartDay = Math.floor(startWorld / BASE_DAY_PX / dayStep) * dayStep;
    const startDay = project.settings.allowPast ? rawStartDay : Math.max(0, rawStartDay);
    const endDay = Math.ceil(endWorld / BASE_DAY_PX);
    const ticks = [];
    for (let day = startDay; day <= endDay; day += dayStep) {
      if (day === 0) continue;
      const date = addDaysISO(project.originDate, day);
      const major = spec.unit === "week" ? day % 28 === 0 : day % 7 === 0;
      ticks.push({
        date,
        worldX: day * BASE_DAY_PX,
        major,
        label: major || dayStep > 1 ? formatTickDate(date, "day") : "",
      });
    }
    return ticks;
  }

  if (spec.unit === "month") {
    const startDate = addDaysISO(project.originDate, Math.floor(startWorld / BASE_DAY_PX) - 60);
    const endDate = addDaysISO(project.originDate, Math.ceil(endWorld / BASE_DAY_PX) + 90);
    const originMonth = monthIndex(project.originDate);
    const rawStartMonth = Math.floor(monthIndex(startDate) / spec.step) * spec.step;
    const startMonth = project.settings.allowPast ? rawStartMonth : Math.max(originMonth, rawStartMonth);
    const endMonth = monthIndex(endDate);
    const ticks = [];
    for (let index = startMonth; index <= endMonth; index += spec.step) {
      const date = isoFromMonthIndex(index);
      if (!project.settings.allowPast && parseISODate(date) <= parseISODate(project.originDate)) continue;
      if (date === project.originDate) continue;
      const month = index % 12;
      ticks.push({
        date,
        worldX: worldXForDate(project, date),
        major: spec.step === 3 ? month === 0 : month % 3 === 0,
        label: formatTickDate(date, spec.label),
      });
    }
    return ticks;
  }

  const startDate = addDaysISO(project.originDate, Math.floor(startWorld / BASE_DAY_PX) - 420);
  const endDate = addDaysISO(project.originDate, Math.ceil(endWorld / BASE_DAY_PX) + 520);
  const originYear = yearFromISO(project.originDate);
  const rawStartYear = Math.floor(yearFromISO(startDate) / spec.step) * spec.step;
  const startYear = project.settings.allowPast ? rawStartYear : Math.max(originYear, rawStartYear);
  const endYear = yearFromISO(endDate);
  const ticks = [];
  for (let year = startYear; year <= endYear; year += spec.step) {
    const date = `${year}-01-01`;
    if (!project.settings.allowPast && parseISODate(date) <= parseISODate(project.originDate)) continue;
    ticks.push({
      date,
      worldX: worldXForDate(project, date),
      major: year % 5 === 0 || spec.step > 1,
      label: String(year),
    });
  }
  return ticks;
}

function renderTimeline() {
  ensureView();
  const project = activeProject();
  const rect = getViewportRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const timelineY = worldToScreenY(0);
  const originX = worldToScreenX(0);
  const pxPerDay = BASE_DAY_PX * state.view.scale;

  els.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  els.svg.setAttribute("width", width);
  els.svg.setAttribute("height", height);
  els.svg.innerHTML = "";

  if (!project.settings.allowPast && originX > 0) {
    els.svg.appendChild(svgNode("rect", {
      x: 0,
      y: 0,
      width: originX,
      height,
      fill: "rgba(0,0,0,0.2)",
    }));
  }

  els.svg.appendChild(svgNode("rect", {
    x: 0,
    y: Math.max(0, timelineY - 38),
    width,
    height: 76,
    fill: "rgba(255,255,255,0.016)",
  }));

  els.svg.appendChild(svgNode("line", {
    x1: project.settings.allowPast ? 0 : Math.max(originX, 0),
    y1: timelineY,
    x2: width,
    y2: timelineY,
    stroke: "#c9c1b1",
    "stroke-opacity": "0.58",
    "stroke-width": "1.6",
  }));

  renderTicks(project, width, timelineY, pxPerDay);
  renderConnectors(project, width, timelineY);
  renderAnchors(project, timelineY);
  renderOrigin(originX, timelineY);

  els.zoomLabel.textContent = `${Math.round(state.view.scale * 100)}%`;
}

function renderTicks(project, width, timelineY, pxPerDay) {
  const spec = tickSpec(pxPerDay);
  const startWorld = screenToWorldX(-160);
  const endWorld = screenToWorldX(width + 240);
  const group = svgNode("g");
  collectTicks(project, spec, startWorld, endWorld).forEach((tick) => {
    const x = worldToScreenX(tick.worldX);
    const tickHeight = tick.major ? 42 : 22;
    group.appendChild(svgNode("line", {
      x1: x,
      y1: timelineY - tickHeight / 2,
      x2: x,
      y2: timelineY + tickHeight / 2,
      stroke: "#c9c1b1",
      "stroke-opacity": tick.major ? "0.52" : "0.28",
      "stroke-width": tick.major ? "1" : "0.75",
    }));
    if (tick.label) {
      const text = svgNode("text", {
        x: x + 7,
        y: timelineY + tickHeight / 2 + 17,
        fill: "#9a9384",
        "font-size": "10",
        "font-family": "ui-monospace, Consolas, monospace",
      });
      text.textContent = tick.label;
      group.appendChild(text);
    }
  });
  els.svg.appendChild(group);
}

function renderOrigin(originX, timelineY) {
  const origin = svgNode("g");
  origin.appendChild(svgNode("line", {
    x1: originX,
    y1: timelineY - 54,
    x2: originX,
    y2: timelineY + 54,
    stroke: "#c99448",
    "stroke-opacity": "0.68",
    "stroke-width": "1",
  }));
  origin.appendChild(svgNode("circle", {
    cx: originX,
    cy: timelineY,
    r: 5,
    fill: "#c99448",
    stroke: "#0b0b09",
    "stroke-width": "2",
  }));
  const label = svgNode("text", {
    x: originX + 10,
    y: timelineY - 17,
    fill: "#ebe4d6",
    "font-size": "11",
    "font-weight": "800",
    "font-family": "ui-monospace, Consolas, monospace",
  });
  label.textContent = "TODAY";
  origin.appendChild(label);
  els.svg.appendChild(origin);
}

function visualHeight(event) {
  return event.collapsed ? 64 : event.size.h;
}

function eventScreenRect(event) {
  const left = worldToScreenX(event.position.x);
  const top = worldToScreenY(event.position.y);
  return {
    id: event.id,
    left,
    top,
    right: left + event.size.w,
    bottom: top + visualHeight(event),
    width: event.size.w,
    height: visualHeight(event),
  };
}

function segmentHitsCard(x1, x2, y, rects, skipId) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  return rects.some((rect) => {
    if (rect.id === skipId) return false;
    const padded = {
      left: rect.left - 12,
      right: rect.right + 12,
      top: rect.top - 12,
      bottom: rect.bottom + 12,
    };
    return y >= padded.top && y <= padded.bottom && maxX >= padded.left && minX <= padded.right;
  });
}

function connectorPath(anchorX, anchorY, rect, rects, eventId) {
  const insideY = anchorY >= rect.top && anchorY <= rect.bottom;
  if (insideY) {
    const targetLeft = anchorX < rect.left;
    const targetX = targetLeft ? rect.left : rect.right;
    const targetY = clamp(anchorY, rect.top + 16, rect.bottom - 16);
    const midX = targetLeft ? rect.left - 26 : rect.right + 26;
    return `M ${anchorX} ${anchorY} L ${midX} ${anchorY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
  }

  const targetY = anchorY < rect.top ? rect.top : rect.bottom;
  const targetX = clamp(anchorX, rect.left + 18, rect.right - 18);
  const direction = targetY < anchorY ? 1 : -1;
  const baseMidY = targetY + direction * Math.min(46, Math.max(22, Math.abs(anchorY - targetY) / 2));
  let midY = baseMidY;

  for (let index = 0; index < 10; index += 1) {
    const offset = Math.ceil(index / 2) * 28 * (index % 2 === 0 ? 1 : -1);
    const candidate = baseMidY + offset;
    if (!segmentHitsCard(anchorX, targetX, candidate, rects, eventId)) {
      midY = candidate;
      break;
    }
  }

  return `M ${anchorX} ${anchorY} L ${anchorX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
}

function renderConnectors(project, width, timelineY) {
  const events = visibleEvents(project);
  const rects = events.map(eventScreenRect);
  const group = svgNode("g");
  events.forEach((event) => {
    const anchorX = worldToScreenX(worldXForDate(project, event.date));
    if (anchorX < -500 || anchorX > width + 500) return;
    const rect = rects.find((item) => item.id === event.id);
    if (!rect) return;
    const dim = state.focusMode && state.selectedEventId && state.selectedEventId !== event.id;
    group.appendChild(svgNode("path", {
      d: connectorPath(anchorX, timelineY, rect, rects, event.id),
      fill: "none",
      stroke: eventColor(project, event),
      "stroke-opacity": dim ? "0.18" : "0.66",
      "stroke-width": "1.5",
      "stroke-linejoin": "miter",
    }));
  });
  els.svg.appendChild(group);
}

function renderAnchors(project, timelineY) {
  const group = svgNode("g");
  visibleEvents(project).forEach((event) => {
    const x = worldToScreenX(worldXForDate(project, event.date));
    const dim = state.focusMode && state.selectedEventId && state.selectedEventId !== event.id;
    group.appendChild(svgNode("circle", {
      cx: x,
      cy: timelineY,
      r: 4,
      fill: eventColor(project, event),
      opacity: dim ? "0.28" : "1",
      stroke: "#0b0b09",
      "stroke-width": "2",
    }));
  });
  els.svg.appendChild(group);
}

function renderCards() {
  const project = activeProject();
  els.cardLayer.innerHTML = "";

  visibleEvents(project).forEach((event) => {
    const card = document.createElement("article");
    const rect = eventScreenRect(event);
    const color = eventColor(project, event);
    const dim = state.focusMode && state.selectedEventId && state.selectedEventId !== event.id;
    card.className = [
      "event-card",
      state.selectedEventId === event.id ? "selected" : "",
      event.collapsed ? "collapsed" : "",
      dim ? "dimmed" : "",
    ].filter(Boolean).join(" ");
    card.dataset.id = event.id;
    card.style.setProperty("--event-color", color);
    card.style.setProperty("--body-color", event.style.textColor);
    card.style.width = `${event.size.w}px`;
    card.style.height = `${visualHeight(event)}px`;
    card.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
    card.innerHTML = `
      <header class="card-top">
        <span class="card-dot"></span>
        <div class="card-title-block">
          <h3 class="card-title">${escapeHTML(event.title)}</h3>
          <time class="card-date">${formatShortDate(event.date)}${event.lockDate ? " LOCK" : ""}</time>
          <span class="card-category">${escapeHTML(eventCategoryName(project, event))}</span>
        </div>
        <div class="card-action-row">
          <button class="card-action${event.collapsed ? " active" : ""}" data-action="collapse" title="Collapse event" aria-label="Collapse event">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12h8" /><path d="M5 6h14v12H5z" /></svg>
          </button>
          <button class="card-action" data-action="edit" title="Edit event" aria-label="Edit event">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16.5 4.5 3 3L8 19H5v-3L16.5 4.5Z" /><path d="m14 7 3 3" /></svg>
          </button>
        </div>
      </header>
      <div class="card-body" style="font-size:${event.style.fontSize}px;font-weight:${event.style.bold ? 700 : 400};font-style:${event.style.italic ? "italic" : "normal"};text-align:${event.style.align}">
        ${event.image ? `<img class="card-image" src="${event.image}" alt="" />` : ""}
        ${renderMarkdown(event.body)}
      </div>
      <div class="resize-handle" data-action="resize" aria-hidden="true"></div>
    `;
    els.cardLayer.appendChild(card);
  });
}

function getTimelineRange(project) {
  const rect = getViewportRect();
  const visibleStart = Math.floor(screenToWorldX(0) / BASE_DAY_PX);
  const visibleEnd = Math.ceil(screenToWorldX(rect.width) / BASE_DAY_PX);
  const eventDays = project.events.map((event) => daysBetween(project.originDate, event.date));
  const minEventDay = eventDays.length ? Math.min(...eventDays) : 0;
  const maxEventDay = eventDays.length ? Math.max(...eventDays) : 60;
  let minDay = Math.min(0, minEventDay, visibleStart) - 14;
  let maxDay = Math.max(60, maxEventDay, visibleEnd) + 14;
  if (!project.settings.allowPast) minDay = 0;
  if (maxDay - minDay < 30) maxDay = minDay + 30;
  return { minDay, maxDay };
}

function renderMiniMap() {
  const project = activeProject();
  const range = getTimelineRange(project);
  state.miniMapRange = range;
  const rect = els.miniMap.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const span = range.maxDay - range.minDay;
  const visibleStart = screenToWorldX(0) / BASE_DAY_PX;
  const visibleEnd = screenToWorldX(getViewportRect().width) / BASE_DAY_PX;

  els.miniMapEvents.innerHTML = "";
  sortEvents(project.events).forEach((event) => {
    const marker = document.createElement("span");
    marker.className = "minimap-marker";
    marker.style.setProperty("--event-color", eventColor(project, event));
    marker.style.left = `${((daysBetween(project.originDate, event.date) - range.minDay) / span) * 100}%`;
    els.miniMapEvents.appendChild(marker);
  });

  const left = clamp(((visibleStart - range.minDay) / span) * width, 0, width);
  const right = clamp(((visibleEnd - range.minDay) / span) * width, 0, width);
  els.miniMapWindow.style.left = `${left}px`;
  els.miniMapWindow.style.width = `${Math.max(12, right - left)}px`;
}

function renderSearchResults() {
  const project = activeProject();
  const query = state.searchQuery.trim();
  const matches = query
    ? sortEvents(project.events.filter((event) => eventMatchesQuery(project, event, query))).slice(0, 10)
    : sortEvents(project.events).slice(0, 6);

  if (!matches.length) {
    els.searchResults.innerHTML = `<div class="empty-state">No matches</div>`;
    return;
  }

  els.searchResults.innerHTML = matches.map((event) => `
    <button class="result-button" data-id="${event.id}" type="button">
      <span class="result-title">${escapeHTML(event.title)}</span>
      <span class="result-meta">${formatShortDate(event.date)} / ${escapeHTML(eventCategoryName(project, event))}</span>
    </button>
  `).join("");
}

function renderCategories() {
  const project = activeProject();
  const countFor = (id) => id === "all"
    ? project.events.length
    : project.events.filter((event) => event.categoryId === id).length;
  const allButton = `
    <button class="category-button${state.activeCategoryId === "all" ? " active" : ""}" data-id="all" type="button">
      <span class="chip" style="--category-color:#ebe4d6"></span>
      <span class="category-name">All Events</span>
      <span class="category-count">${countFor("all")}</span>
      <span></span>
    </button>
  `;
  const categoryButtons = project.categories.map((category) => `
    <button class="category-button${state.activeCategoryId === category.id ? " active" : ""}" data-id="${category.id}" type="button">
      <span class="chip" style="--category-color:${category.color}"></span>
      <span class="category-name">${escapeHTML(category.name)}</span>
      <span class="category-count">${countFor(category.id)}</span>
      <span class="category-edit" data-action="edit-category">Edit</span>
    </button>
  `).join("");
  els.categoryList.innerHTML = allButton + categoryButtons;
}

function render() {
  ensureView();
  renderProjectControls();
  renderTimeline();
  renderCards();
  renderMiniMap();
  renderSearchResults();
  renderCategories();
}

function resetView() {
  const rect = getViewportRect();
  state.view.x = Math.round(rect.width * 0.18);
  state.view.y = Math.round(rect.height * 0.56);
  state.view.scale = 1;
  render();
}

function jumpToEvent(eventId) {
  const project = activeProject();
  const event = project.events.find((item) => item.id === eventId);
  if (!event) return;
  const rect = getViewportRect();
  state.selectedEventId = event.id;
  state.view.x = Math.round(rect.width * 0.42 - worldXForDate(project, event.date) * state.view.scale);
  state.view.y = Math.round(rect.height * 0.52 - event.position.y);
  render();
}

function addEventAtScreen(clientX, clientY, openEditor = true) {
  const project = activeProject();
  const rect = getViewportRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;
  const worldX = screenToWorldX(screenX);
  const date = dateForWorldX(project, worldX);
  const anchorX = worldXForDate(project, date);
  const event = createEvent(project, {
    date,
    x: anchorX + 44,
    y: clamp(screenToWorldY(screenY) - 180, -520, 360),
    categoryId: state.activeCategoryId === "all" ? defaultCategoryId(project) : state.activeCategoryId,
  });
  project.events.push(event);
  state.selectedEventId = event.id;
  save();
  render();
  if (openEditor) openEventModal(event.id, true);
}

function findEvent(id) {
  return activeProject().events.find((event) => event.id === id);
}

function populateEventCategorySelect(event) {
  const project = activeProject();
  els.eventCategory.innerHTML = project.categories.map((category) => (
    `<option value="${category.id}">${escapeHTML(category.name)}</option>`
  )).join("");
  els.eventCategory.value = event.categoryId || defaultCategoryId(project);
}

function updateDateLockState() {
  els.eventDate.disabled = els.lockDateInput.checked;
}

function openEventModal(eventId, isNew = false) {
  const event = findEvent(eventId);
  if (!event) return;
  state.editingEventId = eventId;
  state.eventModalIsNew = isNew;
  state.modalImageData = event.image || "";

  const project = activeProject();
  els.eventModalTitle.textContent = isNew ? "New event" : "Edit event";
  els.eventTitle.value = event.title;
  els.eventDate.value = event.date;
  els.eventDate.min = project.settings.allowPast ? "" : project.originDate;
  els.eventWidth.value = event.size.w;
  els.eventHeight.value = event.size.h;
  els.eventBody.value = event.body;
  els.fontSize.value = event.style.fontSize;
  els.boldBtn.classList.toggle("active", event.style.bold);
  els.italicBtn.classList.toggle("active", event.style.italic);
  els.textAlign.value = event.style.align;
  els.textColor.value = event.style.textColor;
  els.lockDateInput.checked = event.lockDate;
  els.collapsedInput.checked = event.collapsed;
  populateEventCategorySelect(event);
  updateDateLockState();
  renderImagePreview();
  els.eventModal.hidden = false;
  els.eventTitle.focus();
  els.eventTitle.select();
}

function closeEventModal(cancelled = false) {
  if (cancelled && state.eventModalIsNew && state.editingEventId) {
    const project = activeProject();
    project.events = project.events.filter((event) => event.id !== state.editingEventId);
    state.selectedEventId = null;
    save();
    render();
  }
  state.editingEventId = null;
  state.eventModalIsNew = false;
  state.modalImageData = "";
  els.eventModal.hidden = true;
  els.imageInput.value = "";
}

function renderImagePreview() {
  if (state.modalImageData) {
    els.imagePreview.src = state.modalImageData;
    els.imagePreview.hidden = false;
  } else {
    els.imagePreview.removeAttribute("src");
    els.imagePreview.hidden = true;
  }
}

function saveEventFromModal(event) {
  event.preventDefault();
  const edited = findEvent(state.editingEventId);
  if (!edited) return;
  const project = activeProject();
  const nextDate = els.eventDate.value || project.originDate;

  edited.title = els.eventTitle.value.trim() || "Untitled";
  edited.date = project.settings.allowPast ? nextDate : addDaysISO(project.originDate, Math.max(0, daysBetween(project.originDate, nextDate)));
  edited.categoryId = els.eventCategory.value || defaultCategoryId(project);
  edited.color = eventColor(project, edited);
  edited.body = els.eventBody.value;
  edited.image = state.modalImageData;
  edited.lockDate = els.lockDateInput.checked;
  edited.collapsed = els.collapsedInput.checked;
  edited.size.w = clamp(Number(els.eventWidth.value) || edited.size.w, 180, 720);
  edited.size.h = clamp(Number(els.eventHeight.value) || edited.size.h, 112, 640);
  edited.style.fontSize = clamp(Number(els.fontSize.value) || 15, 12, 28);
  edited.style.bold = els.boldBtn.classList.contains("active");
  edited.style.italic = els.italicBtn.classList.contains("active");
  edited.style.align = els.textAlign.value;
  edited.style.textColor = els.textColor.value || "#ebe4d6";

  state.selectedEventId = edited.id;
  state.eventModalIsNew = false;
  save();
  render();
  closeEventModal(false);
}

function deleteEditingEvent() {
  const id = state.editingEventId;
  if (!id) return;
  const project = activeProject();
  project.events = project.events.filter((event) => event.id !== id);
  state.selectedEventId = null;
  save();
  render();
  closeEventModal(false);
}

function openProjectModal(mode) {
  const project = activeProject();
  state.projectMode = mode;
  els.projectModalTitle.textContent = mode === "new" ? "New project" : "Rename project";
  els.projectNameInput.value = mode === "new" ? "" : project.name;
  els.projectModal.hidden = false;
  els.projectNameInput.focus();
  els.projectNameInput.select();
}

function closeProjectModal() {
  els.projectModal.hidden = true;
}

function saveProjectFromModal(event) {
  event.preventDefault();
  const name = els.projectNameInput.value.trim();
  if (!name) return;

  if (state.projectMode === "new") {
    const project = createDefaultProject(name);
    project.events = [];
    state.projects.push(project);
    state.activeProjectId = project.id;
    state.activeCategoryId = "all";
    state.selectedEventId = null;
  } else {
    activeProject().name = name;
  }

  save();
  render();
  closeProjectModal();
}

function duplicateProject() {
  const project = activeProject();
  const clone = normalizeProject(JSON.parse(JSON.stringify(project)));
  clone.id = uid("project");
  clone.name = `${project.name} copy`;
  clone.createdAt = new Date().toISOString();
  clone.updatedAt = clone.createdAt;
  clone.events = clone.events.map((event) => ({ ...event, id: uid("event") }));
  state.projects.push(clone);
  state.activeProjectId = clone.id;
  state.activeCategoryId = "all";
  state.selectedEventId = null;
  save();
  render();
}

function deleteProject() {
  if (state.projects.length === 1) {
    const replacement = createDefaultProject("Shared Timeline");
    replacement.events = [];
    state.projects = [replacement];
    state.activeProjectId = replacement.id;
    state.activeCategoryId = "all";
    state.selectedEventId = null;
    save();
    resetView();
    return;
  }

  const project = activeProject();
  if (!window.confirm(`Delete "${project.name}"?`)) return;
  state.projects = state.projects.filter((item) => item.id !== project.id);
  state.activeProjectId = state.projects[0].id;
  state.activeCategoryId = "all";
  state.selectedEventId = null;
  save();
  resetView();
}

function openCategoryModal(id = null) {
  const project = activeProject();
  const category = id ? categoryById(project, id) : null;
  state.editingCategoryId = category?.id || null;
  els.categoryModalTitle.textContent = category ? "Edit category" : "New category";
  els.categoryNameInput.value = category?.name || "";
  els.categoryColorInput.value = category?.color || "#c99448";
  els.deleteCategory.hidden = !category || project.categories.length <= 1;
  els.categoryModal.hidden = false;
  els.categoryNameInput.focus();
  els.categoryNameInput.select();
}

function closeCategoryModal() {
  state.editingCategoryId = null;
  els.categoryModal.hidden = true;
}

function saveCategoryFromModal(event) {
  event.preventDefault();
  const project = activeProject();
  const name = els.categoryNameInput.value.trim();
  if (!name) return;

  if (state.editingCategoryId) {
    const category = categoryById(project, state.editingCategoryId);
    category.name = name;
    category.color = els.categoryColorInput.value;
  } else {
    const category = {
      id: uid("cat"),
      name,
      color: els.categoryColorInput.value,
    };
    project.categories.push(category);
    state.activeCategoryId = category.id;
  }

  save();
  render();
  closeCategoryModal();
}

function deleteCategory() {
  const project = activeProject();
  const id = state.editingCategoryId;
  if (!id || project.categories.length <= 1) return;
  const replacement = project.categories.find((category) => category.id !== id);
  project.events.forEach((event) => {
    if (event.categoryId === id) event.categoryId = replacement.id;
  });
  project.categories = project.categories.filter((category) => category.id !== id);
  if (state.activeCategoryId === id) state.activeCategoryId = "all";
  save();
  render();
  closeCategoryModal();
}

function stableEventForExport(project, event) {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    categoryId: event.categoryId,
    lockDate: event.lockDate,
    collapsed: event.collapsed,
    body: event.body,
    image: event.image,
    position: {
      x: Number(event.position.x.toFixed(2)),
      y: Number(event.position.y.toFixed(2)),
    },
    size: {
      w: event.size.w,
      h: event.size.h,
    },
    style: {
      fontSize: event.style.fontSize,
      bold: event.style.bold,
      italic: event.style.italic,
      align: event.style.align,
      textColor: event.style.textColor,
    },
  };
}

function stableProjectForExport(project) {
  return {
    timelineStudio: VERSION,
    project: {
      id: project.id,
      name: project.name,
      originDate: project.originDate,
      settings: {
        allowPast: project.settings.allowPast,
        snapToGrid: project.settings.snapToGrid,
      },
      categories: [...project.categories]
        .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
        .map((category) => ({
          id: category.id,
          name: category.name,
          color: category.color,
        })),
      events: sortEvents(project.events).map((event) => stableEventForExport(project, event)),
    },
  };
}

function exportProject() {
  const project = activeProject();
  const blob = new Blob([JSON.stringify(stableProjectForExport(project), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(project.name)}.timeline.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importProjectFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const rawProjects = Array.isArray(parsed.projects)
        ? parsed.projects
        : [parsed.project || parsed];
      const imported = rawProjects.map(normalizeProject);
      const existingIds = new Set(state.projects.map((project) => project.id));
      imported.forEach((project) => {
        if (existingIds.has(project.id)) project.id = uid("project");
        project.name = `${project.name} imported`;
      });
      state.projects.push(...imported);
      state.activeProjectId = imported[0].id;
      state.activeCategoryId = "all";
      state.selectedEventId = null;
      save();
      resetView();
    } catch {
      window.alert("That JSON file could not be imported.");
    } finally {
      els.importInput.value = "";
    }
  });
  reader.readAsText(file);
}

function startPan(event) {
  state.interaction = {
    type: "pan",
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    viewX: state.view.x,
    viewY: state.view.y,
    moved: false,
  };
  els.viewport.classList.add("panning");
  els.viewport.setPointerCapture(event.pointerId);
}

function startCardDrag(event, card, id) {
  const timelineEvent = findEvent(id);
  if (!timelineEvent) return;
  state.selectedEventId = id;
  state.interaction = {
    type: "drag-card",
    pointerId: event.pointerId,
    id,
    startX: event.clientX,
    startY: event.clientY,
    originalX: timelineEvent.position.x,
    originalY: timelineEvent.position.y,
    moved: false,
  };
  card.setPointerCapture(event.pointerId);
  render();
}

function startCardResize(event, card, id) {
  const timelineEvent = findEvent(id);
  if (!timelineEvent || timelineEvent.collapsed) return;
  state.selectedEventId = id;
  state.interaction = {
    type: "resize-card",
    pointerId: event.pointerId,
    id,
    startX: event.clientX,
    startY: event.clientY,
    originalW: timelineEvent.size.w,
    originalH: timelineEvent.size.h,
  };
  card.setPointerCapture(event.pointerId);
  render();
}

function applyCardPosition(timelineEvent, rawX, rawY) {
  const project = activeProject();
  if (!project.settings.snapToGrid) {
    timelineEvent.position.x = rawX;
    timelineEvent.position.y = rawY;
    return;
  }
  timelineEvent.position.x = screenToWorldX(snap(worldToScreenX(rawX)));
  timelineEvent.position.y = snap(worldToScreenY(rawY)) - state.view.y;
}

function onPointerMove(event) {
  const current = state.interaction;
  if (!current) {
    const project = activeProject();
    const rect = getViewportRect();
    const worldX = screenToWorldX(event.clientX - rect.left);
    els.hoverDate.textContent = formatShortDate(dateForWorldX(project, worldX));
    return;
  }

  if (current.type === "pan") {
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    current.moved = current.moved || Math.abs(dx) > 3 || Math.abs(dy) > 3;
    state.view.x = current.viewX + dx;
    state.view.y = current.viewY + dy;
    renderTimeline();
    renderCards();
    renderMiniMap();
    return;
  }

  if (current.type === "drag-card") {
    const timelineEvent = findEvent(current.id);
    if (!timelineEvent) return;
    const dx = (event.clientX - current.startX) / state.view.scale;
    const dy = event.clientY - current.startY;
    current.moved = current.moved || Math.abs(event.clientX - current.startX) > 3 || Math.abs(event.clientY - current.startY) > 3;
    applyCardPosition(timelineEvent, current.originalX + dx, current.originalY + dy);
    renderTimeline();
    renderCards();
    renderMiniMap();
    return;
  }

  if (current.type === "resize-card") {
    const timelineEvent = findEvent(current.id);
    if (!timelineEvent) return;
    timelineEvent.size.w = clamp(current.originalW + event.clientX - current.startX, 180, 720);
    timelineEvent.size.h = clamp(current.originalH + event.clientY - current.startY, 112, 640);
    renderTimeline();
    renderCards();
    renderMiniMap();
    return;
  }

  if (current.type === "minimap") {
    moveViewFromMiniMap(event.clientX);
  }
}

function onPointerUp() {
  const current = state.interaction;
  if (!current) return;

  if (current.type === "pan") {
    els.viewport.classList.remove("panning");
    if (!current.moved) {
      state.selectedEventId = null;
      render();
    }
  }

  if (current.type === "drag-card" || current.type === "resize-card") {
    save();
    if (current.type === "drag-card" && !current.moved) openEventModal(current.id, false);
  }

  if (current.type === "minimap") save();
  state.interaction = null;
}

function onWheel(event) {
  event.preventDefault();
  const rect = getViewportRect();
  const screenX = event.clientX - rect.left;
  const horizontalGesture = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.2;

  if (horizontalGesture || event.shiftKey) {
    state.view.x -= event.deltaX || event.deltaY;
  } else {
    const beforeX = screenToWorldX(screenX);
    const factor = Math.exp(-event.deltaY * 0.0015);
    state.view.scale = clamp(state.view.scale * factor, 0.08, 3.2);
    state.view.x = screenX - beforeX * state.view.scale;
  }

  renderTimeline();
  renderCards();
  renderMiniMap();
}

function moveViewFromMiniMap(clientX) {
  const rect = els.miniMap.getBoundingClientRect();
  const project = activeProject();
  const t = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  const day = state.miniMapRange.minDay + t * (state.miniMapRange.maxDay - state.miniMapRange.minDay);
  const viewportWidth = getViewportRect().width;
  state.view.x = Math.round(viewportWidth / 2 - day * BASE_DAY_PX * state.view.scale);
  renderTimeline();
  renderCards();
  renderMiniMap();
}

function toggleCollapseAll() {
  const project = activeProject();
  const shouldCollapse = project.events.some((event) => !event.collapsed);
  project.events.forEach((event) => {
    event.collapsed = shouldCollapse;
  });
  save();
  render();
}

function toggleFocus() {
  if (!state.selectedEventId) {
    const first = visibleEvents(activeProject())[0];
    if (first) state.selectedEventId = first.id;
  }
  state.focusMode = !state.focusMode;
  render();
}

function togglePastDates() {
  const project = activeProject();
  project.settings.allowPast = !project.settings.allowPast;
  if (!project.settings.allowPast) {
    project.events.forEach((event) => {
      if (parseISODate(event.date) < parseISODate(project.originDate)) event.date = project.originDate;
    });
  }
  save();
  render();
}

function toggleGrid() {
  const project = activeProject();
  project.settings.snapToGrid = !project.settings.snapToGrid;
  save();
  render();
}

function isTypingTarget(target) {
  return target.closest("input, textarea, select, [contenteditable='true']");
}

function onKeyDown(event) {
  if (event.code === "Escape") {
    if (!els.eventModal.hidden) closeEventModal(true);
    if (!els.projectModal.hidden) closeProjectModal();
    if (!els.categoryModal.hidden) closeCategoryModal();
  }
  if (event.code === "KeyF" && !isTypingTarget(event.target)) {
    event.preventDefault();
    toggleFocus();
  }
}

function wireEvents() {
  els.projectSelect.addEventListener("change", () => {
    state.activeProjectId = els.projectSelect.value;
    state.activeCategoryId = "all";
    state.selectedEventId = null;
    state.focusMode = false;
    save();
    resetView();
  });

  els.buttons.newProject.addEventListener("click", () => openProjectModal("new"));
  els.buttons.renameProject.addEventListener("click", () => openProjectModal("rename"));
  els.buttons.duplicateProject.addEventListener("click", duplicateProject);
  els.buttons.deleteProject.addEventListener("click", deleteProject);
  els.buttons.addToday.addEventListener("click", () => {
    const rect = getViewportRect();
    addEventAtScreen(rect.left + worldToScreenX(0), rect.top + worldToScreenY(0) - 24);
  });
  els.buttons.resetView.addEventListener("click", resetView);
  els.buttons.focus.addEventListener("click", toggleFocus);
  els.buttons.collapseAll.addEventListener("click", toggleCollapseAll);
  els.buttons.pastToggle.addEventListener("click", togglePastDates);
  els.buttons.gridToggle.addEventListener("click", toggleGrid);
  els.buttons.export.addEventListener("click", exportProject);
  els.buttons.import.addEventListener("click", () => els.importInput.click());

  els.importInput.addEventListener("change", () => {
    const [file] = els.importInput.files;
    if (file) importProjectFile(file);
  });

  els.viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".event-card, .minimap")) return;
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    startPan(event);
  });
  els.viewport.addEventListener("dblclick", (event) => {
    if (event.target.closest(".event-card, .minimap")) return;
    addEventAtScreen(event.clientX, event.clientY);
  });
  els.viewport.addEventListener("wheel", onWheel, { passive: false });
  els.viewport.addEventListener("pointermove", onPointerMove);
  els.viewport.addEventListener("pointerup", onPointerUp);
  els.viewport.addEventListener("pointercancel", onPointerUp);

  els.miniMap.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.interaction = { type: "minimap", pointerId: event.pointerId };
    els.miniMap.setPointerCapture(event.pointerId);
    moveViewFromMiniMap(event.clientX);
  });

  els.cardLayer.addEventListener("pointerdown", (event) => {
    const card = event.target.closest(".event-card");
    if (!card) return;
    const id = card.dataset.id;
    if (event.target.closest("[data-action='resize']")) {
      event.preventDefault();
      startCardResize(event, card, id);
      return;
    }
    if (event.target.closest("[data-action='edit']")) {
      event.preventDefault();
      state.selectedEventId = id;
      render();
      openEventModal(id, false);
      return;
    }
    if (event.target.closest("[data-action='collapse']")) {
      event.preventDefault();
      const timelineEvent = findEvent(id);
      if (timelineEvent) {
        timelineEvent.collapsed = !timelineEvent.collapsed;
        state.selectedEventId = id;
        save();
        render();
      }
      return;
    }
    event.preventDefault();
    startCardDrag(event, card, id);
  });

  els.searchInput.addEventListener("input", () => {
    state.searchQuery = els.searchInput.value.trim();
    render();
  });
  els.clearSearch.addEventListener("click", () => {
    els.searchInput.value = "";
    state.searchQuery = "";
    render();
  });
  els.searchResults.addEventListener("click", (event) => {
    const button = event.target.closest(".result-button");
    if (button) jumpToEvent(button.dataset.id);
  });
  els.categoryList.addEventListener("click", (event) => {
    const button = event.target.closest(".category-button");
    if (!button) return;
    const id = button.dataset.id;
    if (event.target.closest("[data-action='edit-category']")) {
      openCategoryModal(id);
      return;
    }
    state.activeCategoryId = id;
    render();
  });
  els.addCategory.addEventListener("click", () => openCategoryModal());

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", () => {
    ensureView();
    render();
  });

  els.eventForm.addEventListener("submit", saveEventFromModal);
  document.querySelectorAll("[data-close-event]").forEach((button) => {
    button.addEventListener("click", () => closeEventModal(true));
  });
  els.boldBtn.addEventListener("click", () => els.boldBtn.classList.toggle("active"));
  els.italicBtn.addEventListener("click", () => els.italicBtn.classList.toggle("active"));
  els.lockDateInput.addEventListener("change", updateDateLockState);
  els.imageInput.addEventListener("change", () => {
    const [file] = els.imageInput.files;
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      state.modalImageData = String(reader.result);
      renderImagePreview();
    });
    reader.readAsDataURL(file);
  });
  els.removeImage.addEventListener("click", () => {
    state.modalImageData = "";
    els.imageInput.value = "";
    renderImagePreview();
  });
  els.deleteEvent.addEventListener("click", deleteEditingEvent);

  els.projectForm.addEventListener("submit", saveProjectFromModal);
  document.querySelectorAll("[data-close-project]").forEach((button) => {
    button.addEventListener("click", closeProjectModal);
  });

  els.categoryForm.addEventListener("submit", saveCategoryFromModal);
  els.deleteCategory.addEventListener("click", deleteCategory);
  document.querySelectorAll("[data-close-category]").forEach((button) => {
    button.addEventListener("click", closeCategoryModal);
  });
}

function init() {
  load();
  ensureView();
  wireEvents();
  render();
}

init();
