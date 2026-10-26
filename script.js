"use strict";

// ------------------------------------------------------------------
// PLAYSPACE LIVE SCRIPT
// ------------------------------------------------------------------

// Utility to select elements
const $ = (sel) => document.querySelector(sel);

// Storage keys
const STORAGE = {
  places:   "pslive_places_v1",
  favorites:"pslive_favorites_v1",
  reports:  "pslive_reports_v1",
  theme:    "pslive_theme_v1"
};

// Starter demo places (sample data)
let places = JSON.parse(localStorage.getItem(STORAGE.places) || "null");
if (!Array.isArray(places)) {
  places = [
    { id: "demo-1", name: "Community Green Park",   type: "park",      area: "Sample neighbourhood", description: "A green outdoor space for walking, relaxing and playing.",  createdAt: Date.now() },
    { id: "demo-2", name: "Little Stars Playground", type: "playground",area: "Sample residential area", description: "A family-friendly demo listing for children's outdoor play.", createdAt: Date.now() },
    { id: "demo-3", name: "Neighbourhood Sports Ground", type: "sports", area: "Community area", description: "A sample listing for outdoor games and sports activities.",     createdAt: Date.now() }
  ];
}
let favorites = JSON.parse(localStorage.getItem(STORAGE.favorites) || "[]");
let reports   = JSON.parse(localStorage.getItem(STORAGE.reports)   || "[]");
let favoritesOnly = false;

// Save to localStorage
function saveData() {
  localStorage.setItem(STORAGE.places, JSON.stringify(places));
  localStorage.setItem(STORAGE.favorites, JSON.stringify(favorites));
  localStorage.setItem(STORAGE.reports, JSON.stringify(reports));
}

// Escape text for safe HTML
function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])
  );
}

// Get place by ID
function getPlace(id) {
  return places.find(p => p.id === id);
}

// Get most recent report for a place
function getLatestReport(placeId) {
  const rep = reports.filter(r => r.placeId === placeId)
                     .sort((a,b) => b.timestamp - a.timestamp)[0];
  return rep || null;
}

// Format status label from report
function statusInfo(placeId) {
  const rep = getLatestReport(placeId);
  if (!rep) {
    return { status: "unknown", label: "No recent report" };
  }
  // If older than 24h, mark unknown
  const age = Date.now() - rep.timestamp;
  if (age > 24*3600*1000) {
    return { status: "unknown", label: "Report is over 24h old" };
  }
  const labels = { free:"Reported free", busy:"Reported busy", closed:"Reported closed" };
  return { status: rep.status, label: labels[rep.status] };
}

// Map type to emoji and label
function typeEmoji(type) {
  return ({ park:"🌳", playground:"🛝", sports:"⚽" }[type] || "🌿");
}
function typeLabel(type) {
  return ({ park:"Park", playground:"Playground", sports:"Sports area" }[type] || "Play space");
}

// Human-friendly "time ago"
function timeAgo(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp)/60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes===1?"":"s"} ago`;
  const hours = Math.floor(minutes/60);
  if (hours < 24) return `${hours} hour${hours===1?"":"s"} ago`;
  const days = Math.floor(hours/24);
  return `${days} day${days===1?"":"s"} ago`;
}

// ------------------------------------------------------------------
// Render Places List
// ------------------------------------------------------------------
function renderPlaces() {
  const grid = $("#placesGrid");
  const empty = $("#emptyMessage");
  const query = $("#searchInput").value.trim().toLowerCase();
  const typeF = $("#typeFilter").value;
  const statusF = $("#statusFilter").value;

  // Filter places
  const filtered = places.filter(place => {
    const text = `${place.name} ${place.area} ${place.description}`.toLowerCase();
    const matchSearch = !query || text.includes(query);
    const matchType   = (typeF==="all") || (place.type===typeF);
    const stat = statusInfo(place.id).status;
    const matchStatus = (statusF==="all") || (stat===statusF);
    const matchFav = !favoritesOnly || favorites.includes(place.id);
    return matchSearch && matchType && matchStatus && matchFav;
  });

  // Build HTML for each place
  grid.innerHTML = filtered.map(place => {
    const info = statusInfo(place.id);
    const fav = favorites.includes(place.id) ? "active" : "";
    const rep = getLatestReport(place.id);
    const note = rep && rep.note ? ` · ${escapeHTML(rep.note)}` : "";
    const time = rep ? timeAgo(rep.timestamp) : "";
    const reportText = rep
      ? `${time}${note} · Community report`
      : "No reports yet. Be the first to submit!";
    return `
      <article class="place-card">
        <div class="place-top">
          <div class="place-emoji">${typeEmoji(place.type)}</div>
          <button class="favorite-btn ${fav}" data-favorite="${place.id}" title="Toggle favourite">
            ${fav ? "♥" : "♡"}
          </button>
        </div>
        <h3>${escapeHTML(place.name)}</h3>
        <p class="place-area">📍 ${escapeHTML(place.area)} · ${typeLabel(place.type)}</p>
        <p class="place-description">${escapeHTML(place.description)}</p>
        <span class="pill ${info.status}">${info.label}</span>
        <p class="place-report"><small>${reportText}</small></p>
        <div class="place-actions">
          <button class="btn secondary small-btn" data-report="${place.id}">📝 Report</button>
          <button class="btn small-btn" data-show-map="${place.id}">📍 Map</button>
        </div>
      </article>`;
  }).join("");
  empty.hidden = filtered.length > 0;

  // Update stats
  $("#spaceCount").textContent = places.length;
  $("#favoriteCount").textContent = favorites.length;
  $("#reportCount").textContent = reports.length;

  // Update report form dropdown
  const sel = $("#reportPlace");
  const prev = sel.value;
  sel.innerHTML = places.length
    ? places.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join("")
    : '<option value="">(add a space first)</option>';
  if (places.some(p => p.id===prev)) sel.value = prev;
}

// ------------------------------------------------------------------
// Render Reports List
// ------------------------------------------------------------------
function renderReports() {
  const list = $("#reportsList");
  if (!reports.length) {
    list.innerHTML = `<div class="panel"><p>No community reports yet. Submit one above!</p></div>`;
    return;
  }
  // Show up to 10 most recent
  const recent = [...reports].sort((a,b)=>b.timestamp - a.timestamp).slice(0, 10);
  list.innerHTML = recent.map(rep => {
    const place = getPlace(rep.placeId);
    if (!place) return "";
    const info = statusInfo(rep.placeId);
    return `
      <article class="report-item">
        <span class="pill ${info.status}">${info.label}</span>
        <strong>${escapeHTML(place.name)}</strong>
        <p>${escapeHTML(rep.note || "No additional note.")}</p>
        <small>${timeAgo(rep.timestamp)} · Community-submitted</small>
      </article>`;
  }).join("");
}

// ------------------------------------------------------------------
// Event: Add a play space
// ------------------------------------------------------------------
$("#addForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = String(data.get("name")).trim();
  const area = String(data.get("area")).trim();
  if (!name || !area) {
    alert("Please enter a valid name and area.");
    return;
  }
  const place = {
    id: `place-${Date.now()}`,
    name,
    type: String(data.get("type")),
    area,
    description: String(data.get("description")).trim(),
    createdAt: Date.now()
  };
  places.unshift(place);
  saveData();
  renderPlaces();
  renderReports();
  event.currentTarget.reset();
  alert("Play space added (in this browser).");
  $("#explore").scrollIntoView({behavior: "smooth"});
});

// ------------------------------------------------------------------
// Event: Favourites, Reports, Map buttons
// ------------------------------------------------------------------
$("#placesGrid").addEventListener("click", event => {
  const favBtn = event.target.closest("[data-favorite]");
  const repBtn = event.target.closest("[data-report]");
  const mapBtn = event.target.closest("[data-show-map]");
  if (favBtn) {
    const id = favBtn.dataset.favorite;
    if (favorites.includes(id)) {
      favorites = favorites.filter(x => x !== id);
    } else {
      favorites.push(id);
    }
    saveData();
    renderPlaces();
  }
  if (repBtn) {
    $("#reportPlace").value = repBtn.dataset.report;
    $("#reports-section").scrollIntoView({behavior: "smooth"});
  }
  if (mapBtn) {
    const place = getPlace(mapBtn.dataset.showMap);
    if (place && lastLocation) {
      // Center map on user location; or we could highlight place differently
      // For now, just show message
      $("#locationMessage").textContent = `Selected: ${place.name}. Use 'Find nearby parks' to search around you.`;
      $("#map-section").scrollIntoView({behavior: "smooth"});
      setTimeout(() => map.invalidateSize(), 300);
    }
  }
});

// ------------------------------------------------------------------
// Event: Search and filters
// ------------------------------------------------------------------
$("#searchInput").addEventListener("input", renderPlaces);
$("#typeFilter").addEventListener("change", renderPlaces);
$("#statusFilter").addEventListener("change", renderPlaces);
$("#favoritesBtn").addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  $("#favoritesBtn").textContent = favoritesOnly ? "♥ Show all spaces" : "♡ Favourites only";
  $("#favoritesBtn").classList.toggle("active", favoritesOnly);
  renderPlaces();
});

// ------------------------------------------------------------------
// Event: Submit community report
// ------------------------------------------------------------------
$("#reportForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const placeId = String(data.get("placeId"));
  const status  = String(data.get("status"));
  const note    = String(data.get("note")).trim();

  if (!getPlace(placeId)) {
    $("#reportMessage").textContent = "Please add or select a play space first.";
    return;
  }
  if (!["free","busy","closed"].includes(status)) {
    $("#reportMessage").textContent = "Select a valid status.";
    return;
  }
  // Add new report
  reports.push({ placeId, status, note, timestamp: Date.now() });
  saveData();
  event.currentTarget.reset();
  $("#reportMessage").textContent = "Thanks! Your report is saved in this browser.";
  renderPlaces();
  renderReports();
});

// ------------------------------------------------------------------
// Dark Mode Toggle
// ------------------------------------------------------------------
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme==="dark");
  $("#themeBtn").textContent = theme==="dark" ? "☀️ Light mode" : "🌙 Dark mode";
  try { localStorage.setItem(STORAGE.theme, theme); } catch {}
  if (map) setTimeout(()=>map.invalidateSize(), 100); // fix for map rendering
}
let savedTheme = localStorage.getItem(STORAGE.theme) || "light";
applyTheme(savedTheme);
$("#themeBtn").addEventListener("click", () => {
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
});

// ------------------------------------------------------------------
// Leaflet Map and Overpass Nearby Search
// ------------------------------------------------------------------
let map, userMarker, nearbyLayer, searchCircle, lastLocation = null;

// Initialize map
function initializeMap() {
  const mapEl = $("#map");
  if (!mapEl || !window.L) {
    mapEl.innerHTML = "<p style='padding:20px'>Map could not load. Check your internet connection.</p>";
    return;
  }
  map = L.map("map").setView([18.5204, 73.8567], 12); // Default view (e.g. Pune coordinates)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  nearbyLayer = L.layerGroup().addTo(map);
}
initializeMap();

// Get user location (Promise)
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation not supported by your browser."));
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      err => {
        let msg = "Unable to retrieve location.";
        if (err.code===1) msg = "Location permission denied.";
        else if (err.code===2) msg = "Position unavailable.";
        else if (err.code===3) msg = "Location request timed out.";
        reject(new Error(msg));
      },
      { timeout: 15000, maximumAge: 60000 }
    );
  });
}

// Query Overpass API for nearby parks/playgrounds
async function loadNearbyPlaces(lat, lon) {
  const query = `
    [out:json][timeout:20];
    (node["leisure"="park"](around:3000,${lat},${lon});
     way["leisure"="park"](around:3000,${lat},${lon});
     node["leisure"="playground"](around:3000,${lat},${lon});
     way["leisure"="playground"](around:3000,${lat},${lon});
    );
    out center tags;
  `;
  let data = null, error = null;
  // Try multiple endpoints for reliability
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      break;
    } catch (e) {
      error = e;
    }
  }
  if (!data) throw error || new Error("Overpass API failed");
  // Clear old results
  nearbyLayer.clearLayers();
  let count = 0;
  (data.elements || []).forEach(el => {
    const lat2 = el.lat || el.center?.lat;
    const lon2 = el.lon || el.center?.lon;
    if (typeof lat2!=="number" || typeof lon2!=="number") return;
    const name = el.tags?.name || "(unnamed)";
    const marker = L.marker([lat2, lon2]).bindPopup(`<strong>${escapeHTML(name)}</strong><br>Availability not verified.`);
    marker.addTo(nearbyLayer);
    count++;
    // Also add to our places list if not already present
    const osmId = `osm-${el.type}-${el.id}`;
    if (!places.some(p => p.id===osmId)) {
      places.push({
        id: osmId,
        name: el.tags?.name || `Mapped ${el.tags?.leisure}`,
        type: el.tags?.leisure || "park",
        area: el.tags?.["addr:suburb"] || "",
        description: "Imported from OpenStreetMap; availability not guaranteed.",
        createdAt: Date.now(),
        lat: lat2,
        lon: lon2
      });
    }
  });
  saveData();
  renderPlaces();
  return count;
}

// Find Nearby button handler
async function findNearby() {
  if (mapSearchInProgress) return;
  mapSearchInProgress = true;
  $("#nearbyBtn").disabled = true;
  $("#locationBtn").disabled = true;
  $("#locationMessage").textContent = "Getting your location...";
  try {
    const loc = await getUserLocation();
    lastLocation = loc;
    map.setView([loc.lat, loc.lon], 14);
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([loc.lat, loc.lon]).addTo(map).bindPopup("<strong>Your location</strong>");
    if (searchCircle) map.removeLayer(searchCircle);
    searchCircle = L.circle([loc.lat, loc.lon], { radius:3000, color:"#16835f", fillOpacity:0.08 }).addTo(map);
    $("#locationMessage").textContent = "Searching for parks/playgrounds within 3 km...";
    const found = await loadNearbyPlaces(loc.lat, loc.lon);
    $("#locationMessage").textContent = found
      ? `Found ${found} places on the map (availability not verified).`
      : "No mapped parks/playgrounds found nearby.";
  } catch(err) {
    $("#locationMessage").textContent = err.message;
  } finally {
    mapSearchInProgress = false;
    $("#nearbyBtn").disabled = false;
    $("#locationBtn").disabled = false;
  }
}
let mapSearchInProgress = false;
$("#nearbyBtn").addEventListener("click", findNearby);
$("#locationBtn").addEventListener("click", findNearby);

// ------------------------------------------------------------------
// Chatbot (PlayBuddy) - Rule-based responses
// ------------------------------------------------------------------
function addChatMessage(text, sender) {
  const chat = $("#chatMessages");
  const bubble = document.createElement("div");
  bubble.className = `message ${sender==="user"?"user-message":"bot-message"}`;
  const label = document.createElement("strong");
  label.textContent = sender==="user" ? "You" : "PlayBuddy 🌳";
  const p = document.createElement("p");
  p.textContent = text;
  bubble.append(label, p);
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}
function getBotResponse(q) {
  const question = q.toLowerCase();
  if (/hello|hi|hey/.test(question)) {
    return "Hello! 👋 Welcome to PlaySpace Live. I can explain how to use the map, filters, forms, and reports.";
  }
  if (question.includes("nearby") || question.includes("location") || question.includes("map") || question.includes("find a park")) {
    return "Click **📍 Find nearby parks** on the map section, and allow location access. The app will then plot OSM-mapped parks/playgrounds nearby.";
  }
  if (question.includes("add") || question.includes("new place")) {
    return "Go to the **Add a play space** section, fill in the name, type, and area (description optional), and submit. This adds it to your browser's list.";
  }
  if (question.includes("report")) {
    return "In Community reports, select a place and its current status (free, busy, or closed), optionally add a note, and submit. Reports show up on the place cards.";
  }
  if (question.includes("free") || question.includes("open")) {
    return "Availability status is community-reported only. Check the pill label on each place: 🟢 Free, 🟡 Busy, 🔴 Closed (or grey ‘No recent report’). These are not real-time guarantees.";
  }
  if (question.includes("favorite") || question.includes("save") || question.includes("favourite")) {
    return "Click the heart (♡) on a place card to save it to Favorites. Use the **Favourites only** toggle to filter to saved spaces.";
  }
  if (question.includes("dark") || question.includes("theme")) {
    return "Click the Dark mode button in the top navigation to switch themes. Your preference is saved.";
  }
  return "I can help with finding parks, adding places, or submitting reports. Try: *How do I find nearby parks?* or *How do I report a space?*";
}
$("#chatForm").addEventListener("submit", event => {
  event.preventDefault();
  const input = $("#chatInput");
  const text = input.value.trim();
  if (!text) return;
  addChatMessage(text, "user");
  const reply = getBotResponse(text);
  addChatMessage(reply, "bot");
  input.value = "";
  input.focus();
});
// Quick question buttons
document.querySelectorAll("[data-question]").forEach(btn => {
  btn.addEventListener("click", () => {
    sendQuick(btn.dataset.question);
  });
});
function sendQuick(text) {
  addChatMessage(text, "user");
  addChatMessage(getBotResponse(text), "bot");
}

// ------------------------------------------------------------------
// Initialize UI
// ------------------------------------------------------------------
renderPlaces();
renderReports();
