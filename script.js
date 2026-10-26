
"use strict";

/* ==========================================
   PLAYSPACE LIVE
   Map: Leaflet + OpenStreetMap
   Nearby places: Overpass API
   Storage: Browser localStorage
========================================== */

const $ = (selector) => document.querySelector(selector);

const STORAGE = {
  places: "pslive_places_v1",
  favorites: "pslive_favorites_v1",
  reports: "pslive_reports_v1",
  theme: "pslive_theme_v1"
};

const starterPlaces = [
  {
    id: "demo-1",
    name: "Community Green Park",
    type: "park",
    area: "Sample neighbourhood",
    description: "A green outdoor space for walking, relaxing and playing.",
    createdAt: Date.now()
  },
  {
    id: "demo-2",
    name: "Little Stars Playground",
    type: "playground",
    area: "Sample residential area",
    description: "A family-friendly demo listing for children's outdoor play.",
    createdAt: Date.now()
  },
  {
    id: "demo-3",
    name: "Neighbourhood Sports Ground",
    type: "sports",
    area: "Community area",
    description: "A sample listing for outdoor games and sports activities.",
    createdAt: Date.now()
  }
];

function loadJSON(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch (error) {
    console.warn("Could not read saved data:", error);
    return fallback;
  }
}

let places = loadJSON(STORAGE.places, starterPlaces);
let favorites = loadJSON(STORAGE.favorites, []);
let reports = loadJSON(STORAGE.reports, []);
let favoritesOnly = false;

if (!Array.isArray(places)) places = starterPlaces;
if (!Array.isArray(favorites)) favorites = [];
if (!Array.isArray(reports)) reports = [];

function saveData() {
  try {
    localStorage.setItem(STORAGE.places, JSON.stringify(places));
    localStorage.setItem(STORAGE.favorites, JSON.stringify(favorites));
    localStorage.setItem(STORAGE.reports, JSON.stringify(reports));
  } catch (error) {
    console.warn("Unable to save browser data:", error);
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getPlace(id) {
  return places.find((place) => place.id === id);
}

function getLatestReport(placeId) {
  return reports
    .filter((report) => report.placeId === placeId)
    .sort((a, b) => b.timestamp - a.timestamp)[0] || null;
}

function statusInfo(placeId) {
  const report = getLatestReport(placeId);

  if (!report) {
    return { status: "unknown", label: "No recent report" };
  }

  const age = Date.now() - report.timestamp;
  const oneDay = 24 * 60 * 60 * 1000;

  if (age > oneDay) {
    return { status: "unknown", label: "Report is over 24 hours old" };
  }

  const labels = {
    free: "Reported free",
    busy: "Reported busy",
    closed: "Reported closed"
  };

  return {
    status: report.status,
    label: labels[report.status] || "No recent report"
  };
}

function typeLabel(type) {
  return ({
    park: "Park",
    playground: "Playground",
    sports: "Sports area"
  })[type] || "Play space";
}

function typeEmoji(type) {
  return ({
    park: "🌳",
    playground: "🛝",
    sports: "⚽"
  })[type] || "🌿";
}

function timeAgo(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/* ==========================================
   RENDER PLAY SPACES
========================================== */

function renderPlaces() {
  const grid = $("#placesGrid");
  const emptyMessage = $("#emptyMessage");

  const query = $("#searchInput").value.trim().toLowerCase();
  const type = $("#typeFilter").value;
  const status = $("#statusFilter").value;

  const visiblePlaces = places.filter((place) => {
    const text = `${place.name} ${place.area} ${place.description}`.toLowerCase();

    const matchesSearch = text.includes(query);
    const matchesType = type === "all" || place.type === type;
    const currentStatus = statusInfo(place.id).status;
    const matchesStatus = status === "all" || currentStatus === status;
    const matchesFavorite = !favoritesOnly || favorites.includes(place.id);

    return matchesSearch && matchesType && matchesStatus && matchesFavorite;
  });

  grid.innerHTML = visiblePlaces.map((place) => {
    const info = statusInfo(place.id);
    const favorite = favorites.includes(place.id);
    const latestReport = getLatestReport(place.id);

    const reportText = latestReport
      ? `${timeAgo(latestReport.timestamp)}${latestReport.note ? " · " + escapeHTML(latestReport.note) : ""}`
      : "Community members have not submitted a report yet.";

    return `
      <article class="place-card">
        <div class="place-top">
          <div class="place-emoji">${typeEmoji(place.type)}</div>
          <button
            class="favorite-btn ${favorite ? "active" : ""}"
            data-favorite="${escapeHTML(place.id)}"
            aria-label="${favorite ? "Remove from" : "Add to"} favourites"
            title="Toggle favourite">${favorite ? "♥" : "♡"}</button>
        </div>

        <h3>${escapeHTML(place.name)}</h3>
        <p class="place-area">📍 ${escapeHTML(place.area)} · ${typeLabel(place.type)}</p>
        <p class="place-description">${escapeHTML(place.description || "Community play space.")}</p>

        <span class="pill ${info.status}">${info.label}</span>
        <p class="place-report">${reportText}</p>

        <div class="place-actions">
          <button class="btn secondary small-btn" data-report="${escapeHTML(place.id)}">📝 Report</button>
          <button class="btn small-btn" data-show-map="${escapeHTML(place.id)}">📍 Map</button>
        </div>
      </article>
    `;
  }).join("");

  emptyMessage.hidden = visiblePlaces.length > 0;

  $("#spaceCount").textContent = places.length;
  $("#favoriteCount").textContent = favorites.length;
  $("#reportCount").textContent = reports.length;

  renderReportOptions();
}

function renderReportOptions() {
  const select = $("#reportPlace");
  const previousValue = select.value;

  select.innerHTML = places.length
    ? places.map((place) => `
        <option value="${escapeHTML(place.id)}">
          ${escapeHTML(place.name)}
        </option>
      `).join("")
    : '<option value="">Add a space first</option>';

  if (places.some((place) => place.id === previousValue)) {
    select.value = previousValue;
  }
}

function renderReports() {
  const container = $("#reportsList");

  const recentReports = [...reports]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12);

  if (!recentReports.length) {
    container.innerHTML = `
      <div class="panel">
        <p>No community reports yet. Submit the first observation!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = recentReports.map((report) => {
    const place = getPlace(report.placeId);
    if (!place) return "";

    const info = {
      free: ["free", "🟢 Reported free"],
      busy: ["busy", "🟡 Reported busy"],
      closed: ["closed", "🔴 Reported closed"]
    }[report.status] || ["unknown", "No status"];

    return `
      <article class="report-item">
        <span class="pill ${info[0]}">${info[1]}</span>
        <strong>${escapeHTML(place.name)}</strong>
        <p>${escapeHTML(report.note || "No additional note.")}</p>
        <small>${timeAgo(report.timestamp)} · Community-submitted observation</small>
      </article>
    `;
  }).join("");
}

/* ==========================================
   ADD PLAY SPACE
========================================== */

$("#addForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);

  const name = String(data.get("name") || "").trim();
  const area = String(data.get("area") || "").trim();

  if (!name || !area) {
    alert("Please enter the place name and area.");
    return;
  }

  const place = {
    id: `place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    type: String(data.get("type") || "playground"),
    area,
    description: String(data.get("description") || "").trim(),
    createdAt: Date.now()
  };

  places.unshift(place);
  saveData();
  form.reset();
  renderPlaces();
  renderReports();

  alert("Play space added to this browser!");
  $("#explore").scrollIntoView({ behavior: "smooth" });
});

/* ==========================================
   FAVOURITES AND FILTERS
========================================== */

$("#placesGrid").addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite]");
  const reportButton = event.target.closest("[data-report]");
  const mapButton = event.target.closest("[data-show-map]");

  if (favoriteButton) {
    const id = favoriteButton.dataset.favorite;

    if (favorites.includes(id)) {
      favorites = favorites.filter((item) => item !== id);
    } else {
      favorites.push(id);
    }

    saveData();
    renderPlaces();
  }

  if (reportButton) {
    $("#reportPlace").value = reportButton.dataset.report;
    $("#reports-section").scrollIntoView({ behavior: "smooth" });
  }

  if (mapButton) {
    const place = getPlace(mapButton.dataset.showMap);

    if (place) {
      $("#map-section").scrollIntoView({ behavior: "smooth" });
      if (map) {
        setTimeout(() => map.invalidateSize(), 250);
      }
      $("#locationMessage").textContent =
        `Selected: ${place.name}. Use "Find nearby parks" to search mapped places.`;
    }
  }
});

$("#searchInput").addEventListener("input", renderPlaces);
$("#typeFilter").addEventListener("change", renderPlaces);
$("#statusFilter").addEventListener("change", renderPlaces);

$("#favoritesBtn").addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;

  $("#favoritesBtn").textContent =
    favoritesOnly ? "♥ Show all spaces" : "♡ Favourites only";

  $("#favoritesBtn").classList.toggle("active", favoritesOnly);
  renderPlaces();
});

/* ==========================================
   COMMUNITY REPORTS
========================================== */

$("#reportForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);

  const placeId = String(data.get("placeId") || "");
  const status = String(data.get("status") || "");
  const note = String(data.get("note") || "").trim();

  if (!getPlace(placeId)) {
    $("#reportMessage").textContent = "Please add or select a play space first.";
    return;
  }

  if (!["free", "busy", "closed"].includes(status)) {
    $("#reportMessage").textContent = "Please choose a valid status.";
    return;
  }

  reports.push({
    id: `report-${Date.now()}`,
    placeId,
    status,
    note,
    timestamp: Date.now()
  });

  saveData();
  form.reset();
  $("#reportMessage").textContent =
    "Thank you! Your community observation has been saved in this browser.";

  renderPlaces();
  renderReports();
});

/* ==========================================
   DARK MODE
========================================== */

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  $("#themeBtn").textContent =
    theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode";

  try {
    localStorage.setItem(STORAGE.theme, theme);
  } catch (error) {
    console.warn("Theme preference could not be saved.");
  }

  if (map) {
    setTimeout(() => map.invalidateSize(), 100);
  }
}

let savedTheme = "light";

try {
  savedTheme = localStorage.getItem(STORAGE.theme) || "light";
} catch (error) {
  // Keep light mode if storage is unavailable.
}

applyTheme(savedTheme);

$("#themeBtn").addEventListener("click", () => {
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
});

/* ==========================================
   MAP SETUP
========================================== */

let map = null;
let nearbyLayer = null;
let userMarker = null;
let searchCircle = null;
let lastLocation = null;
let mapSearchInProgress = false;

function initializeMap() {
  const mapElement = $("#map");

  if (!mapElement || !window.L) {
    mapElement.innerHTML =
      "<p style='padding:20px'>The map library could not load. Check your internet connection and refresh.</p>";
    return;
  }

  // Initial view is a sample city view. Click the location button
  // to center the map on your actual position.
  map = L.map("map").setView([18.5204, 73.8567], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  }).addTo(map);

  nearbyLayer = L.layerGroup().addTo(map);

  setTimeout(() => map.invalidateSize(), 300);
}

function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Your browser does not support location services."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      }),
      (error) => {
        let message = "Could not get your location.";

        if (error.code === 1) {
          message = "Location permission was denied. Allow location access in your browser settings.";
        } else if (error.code === 2) {
          message = "Your current location could not be determined.";
        } else if (error.code === 3) {
          message = "Location request timed out. Please try again.";
        }

        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  });
}

async function findNearbyParks() {
  if (!map) {
    $("#locationMessage").textContent =
      "The map is not ready. Check your internet connection and refresh.";
    return;
  }

  if (mapSearchInProgress) return;

  mapSearchInProgress = true;
  $("#nearbyBtn").disabled = true;
  $("#locationBtn").disabled = true;
  $("#locationMessage").textContent = "Getting your location...";

  try {
    const location = await getUserLocation();
    lastLocation = location;

    map.setView([location.lat, location.lon], 14);

    if (userMarker) map.removeLayer(userMarker);

    userMarker = L.marker([location.lat, location.lon])
      .addTo(map)
      .bindPopup("<strong>Your approximate location</strong>");

    if (searchCircle) map.removeLayer(searchCircle);

    searchCircle = L.circle([location.lat, location.lon], {
      radius: 3000,
      color: "#16835f",
      fillColor: "#16835f",
      fillOpacity: 0.08
    }).addTo(map);

    $("#locationMessage").textContent =
      "Location found. Searching OpenStreetMap for nearby parks and playgrounds...";

    await loadNearbyPlaces(location.lat, location.lon);

  } catch (error) {
    $("#locationMessage").textContent = error.message;
  } finally {
    mapSearchInProgress = false;
    $("#nearbyBtn").disabled = false;
    $("#locationBtn").disabled = false;
  }
}

async function loadNearbyPlaces(lat, lon) {
  const query = `
    [out:json][timeout:25];
    (
      nwr["leisure"="park"](around:3000,${lat},${lon});
      nwr["leisure"="playground"](around:3000,${lat},${lon});
      nwr["leisure"="pitch"](around:3000,${lat},${lon});
      nwr["leisure"="sports_centre"](around:3000,${lat},${lon});
    );
    out center tags;
  `;

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];

  let data = null;
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: "data=" + encodeURIComponent(query)
      });

      if (!response.ok) {
        throw new Error(`Map search returned HTTP ${response.status}`);
      }

      data = await response.json();
      break;

    } catch (error) {
      lastError = error;
    }
  }

  if (!data) {
    throw lastError || new Error("Nearby map search is temporarily unavailable.");
  }

  nearbyLayer.clearLayers();

  const results = data.elements || [];
  let shown = 0;

  results.forEach((place) => {
    const pLat = place.lat ?? place.center?.lat;
    const pLon = place.lon ?? place.center?.lon;

    if (typeof pLat !== "number" || typeof pLon !== "number") return;

    const tags = place.tags || {};
    const name = tags.name || "Unnamed play space";

    let category = "Play space";
    let emoji = "🌳";

    if (tags.leisure === "playground") {
      category = "Playground";
      emoji = "🛝";
    } else if (
      tags.leisure === "pitch" ||
      tags.leisure === "sports_centre"
    ) {
      category = "Sports area";
      emoji = "⚽";
    }

    const marker = L.marker([pLat, pLon]);

    marker.bindPopup(`
      <div>
        <strong>${escapeHTML(name)}</strong><br>
        ${emoji} ${category}<br>
        <small>Mapped in OpenStreetMap; availability not verified.</small>
      </div>
    `);

    marker.addTo(nearbyLayer);
    shown++;
  });

  if (shown === 0) {
    $("#locationMessage").textContent =
      "No mapped parks found within 3 km. Try again later or add a local play space yourself.";
  } else {
    $("#locationMessage").textContent =
      `Found ${shown} mapped parks, playgrounds or sports areas within approximately 3 km.`;
  }
}

$("#locationBtn").addEventListener("click", findNearbyParks);
$("#nearbyBtn").addEventListener("click", findNearbyParks);

/* ==========================================
   PLAYBUDDY CHATBOT
========================================== */

function addChatMessage(text, sender) {
  const messages = $("#chatMessages");
  const bubble = document.createElement("div");

  bubble.className = `message ${sender === "user" ? "user-message" : "bot-message"}`;

  const title = document.createElement("strong");
  title.textContent = sender === "user" ? "You" : "PlayBuddy 🌳";

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  bubble.append(title, paragraph);
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

function getBotResponse(question) {
  const q = question.toLowerCase();

  if (q.includes("hello") || q.includes("hi ") || q === "hi" || q.includes("hey")) {
    return "Hello! 🌳 Welcome to PlaySpace Live. I can help you explore play spaces, use the map, add a listing, or submit an availability report.";
  }

  if (q.includes("nearby") || q.includes("location") || q.includes("map") || q.includes("near me")) {
    return "To search nearby parks, open the Play Space Map and click “Find nearby parks.” Allow location access when your browser asks. The map searches OpenStreetMap data, which may not include every local place.";
  }

  if (q.includes("add") || q.includes("create") || q.includes("new place")) {
    return "To add a play space, go to “Know a good play space?” Enter the name, type, area, and an optional description, then click “Add space.” It is saved in this browser only.";
  }

  if (q.includes("report") || q.includes("availability") || q.includes("busy") || q.includes("closed")) {
    return "Go to Community Availability Reports. Select a place, choose whether it looks free, busy, or closed, add an optional note, and submit your report. Please report only what you actually observe.";
  }

  if (q.includes("free") || q.includes("open now") || q.includes("available")) {
    return "Check the latest community report on the place card. A “Reported free” status is only a community observation, not a guarantee that the space is available now. Older reports may be marked as outdated.";
  }

  if (q.includes("favourite") || q.includes("favorite") || q.includes("save")) {
    return "Tap the heart on a place card to add it to your favourites. Use “Favourites only” to see your saved places.";
  }

  if (q.includes("search") || q.includes("filter") || q.includes("find a park")) {
    return "Use the search box to search by place name or area. The dropdowns let you filter by place type and the latest community report.";
  }

  if (q.includes("dark") || q.includes("theme")) {
    return "Click the Dark mode button in the top navigation to switch themes. Your theme preference is saved in this browser.";
  }

  if (q.includes("data") || q.includes("save") || q.includes("other device") || q.includes("share")) {
    return "This demo stores listings, favourites and reports in your browser. To share data between different devices or users, the app needs a backend database and a deployed server.";
  }

  if (q.includes("api") || q.includes("key")) {
    return "The map uses Leaflet, OpenStreetMap tiles, and the public Overpass API, so no personal map API key is needed for this demo. Public services can have usage limits.";
  }

  if (q.includes("who are you") || q.includes("your name")) {
    return "I'm PlayBuddy, the PlaySpace Live demo assistant. I can explain how to use the website, but I don't have access to private accounts or verified live park conditions.";
  }

  return "I can help with nearby parks, map location, adding a space, favourites, availability reports, and website features. Try asking “How do I find nearby parks?”";
}

function sendChat(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;

  addChatMessage(cleanQuestion, "user");

  const response = getBotResponse(cleanQuestion);
  addChatMessage(response, "bot");
}

$("#chatForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const input = $("#chatInput");
  sendChat(input.value);
  input.value = "";
  input.focus();
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => {
    sendChat(button.dataset.question);
  });
});

/* ==========================================
   INITIALIZE APP
========================================== */

function startApp() {
  renderPlaces();
  renderReports();
  initializeMap();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
