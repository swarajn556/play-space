
const demoSpaces = [
  {id:1,name:"Greenfield Community Ground",area:"CIDCO",type:"Ground",status:"Available now",slot:"Today, 4:30–6:30 PM",note:"A demo space for football, cricket and group games.",emoji:"⚽",owner:"Community"},
  {id:2,name:"Sunrise Society Park",area:"N-4, CIDCO",type:"Park",status:"Available later",slot:"Today, 6–7 PM",note:"A sample green space for outdoor play.",emoji:"🌳",owner:"Community"},
  {id:3,name:"Neighbourhood Basketball Court",area:"Garkheda",type:"Court",status:"Available now",slot:"Today, 3–5 PM",note:"A sample court for a quick game with friends.",emoji:"🏀",owner:"Community"},
  {id:4,name:"Riverside Open Play Area",area:"Satara Parisar",type:"Open area",status:"Available later",slot:"Tomorrow, 5–6 PM",note:"Example open area for running and simple games.",emoji:"🛝",owner:"Community"},
  {id:5,name:"Community Sports Ground",area:"Osmanpura",type:"Ground",status:"Available now",slot:"Sunday, 8–10 AM",note:"Sample listing. Confirm access before visiting.",emoji:"🏟️",owner:"Community"},
  {id:6,name:"Mini Basketball Court",area:"Waluj",type:"Court",status:"Available later",slot:"Tomorrow, 7–8 AM",note:"A demonstration listing for the prototype.",emoji:"🏀",owner:"Community"}
];

const STORAGE = "playspace-live-v2";
const FAV_STORAGE = "playspace-live-favourites-v2";
const THEME_STORAGE = "playspace-live-theme-v1";
const $ = selector => document.querySelector(selector);

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

let spaces = readJSON(STORAGE, demoSpaces);
if (!Array.isArray(spaces)) spaces = demoSpaces;

let favourites = readJSON(FAV_STORAGE, []);
if (!Array.isArray(favourites)) favourites = [];

let category = "all";
let messageTimer;

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast("Browser storage is unavailable. Changes may not persist.");
    return false;
  }
}

function escapeHTML(value) {
  const chars = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  };
  return String(value).replace(/[&<>"']/g, c => chars[c]);
}

function showToast(text) {
  const toast = $("#toast");
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function updateStats() {
  $("#totalCount").textContent = spaces.length;
  $("#availableCount").textContent =
    spaces.filter(s => s.status === "Available now").length;
  $("#favouriteCount").textContent = favourites.length;
  $("#favChipCount").textContent = favourites.length;
  $("#heroCount").textContent =
    `${spaces.length} space${spaces.length === 1 ? "" : "s"} to explore`;
}

function artClass(type) {
  return ({
    Ground: "art-ground",
    Park: "art-park",
    Court: "art-court",
    "Open area": "art-open"
  })[type] || "art-ground";
}

function render() {
  updateStats();

  const query = $("#search").value.trim().toLowerCase();
  const type = $("#typeFilter").value;
  const status = $("#statusFilter").value;

  const results = spaces.filter(space => {
    const matchesSearch =
      `${space.name} ${space.area} ${space.note || ""}`
        .toLowerCase().includes(query);
    const matchesType = type === "all" || space.type === type;
    const matchesStatus = status === "all" || space.status === status;
    const matchesCategory =
      category === "all" ||
      (category === "favourites"
        ? favourites.includes(space.id)
        : space.type === category);

    return matchesSearch && matchesType &&
      matchesStatus && matchesCategory;
  });

  $("#resultsLabel").textContent =
    `Showing ${results.length} of ${spaces.length} spaces`;

  $("#noResults").hidden = results.length !== 0;
  $("#spaceGrid").hidden = results.length === 0;

  $("#spaceGrid").innerHTML = results.map(space => {
    const saved = favourites.includes(space.id);
    const availabilityClass =
      space.status === "Available now" ? "" : "later";

    return `
      <article class="space-card">
        <div class="card-art ${artClass(space.type)}">
          <div class="art-shape"></div>
          <span class="art-decoration one">✳</span>
          <span class="art-decoration two">☘</span>
          <span class="availability ${availabilityClass}">
            ${escapeHTML(space.status)}
          </span>
          <button class="favourite-btn ${saved ? "saved" : ""}"
            data-favourite="${space.id}"
            aria-label="${saved ? "Remove favourite" : "Add favourite"}"
            aria-pressed="${saved}">${saved ? "♥" : "♡"}</button>
          <span class="card-art-icon">${escapeHTML(space.emoji || "📍")}</span>
        </div>
        <div class="card-content">
          <div class="card-type">${escapeHTML(space.type)}</div>
          <h3>${escapeHTML(space.name)}</h3>
          <p class="card-area">📍 ${escapeHTML(space.area)}</p>
          <div class="card-slot">◷ ${escapeHTML(space.slot)}</div>
          <p class="card-note">${escapeHTML(space.note || "Community shared space.")}</p>
          <div class="card-bottom">
            <span>✳ ${escapeHTML(space.owner || "Community")}</span>
            <button class="share-btn" data-share="${space.id}">Share ↗</button>
          </div>
        </div>
      </article>`;
  }).join("");

  document.querySelectorAll("[data-category]").forEach(button => {
    const active = button.dataset.category === category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function toggleFavourite(id) {
  if (favourites.includes(id)) {
    favourites = favourites.filter(item => item !== id);
    showToast("Removed from your favourites.");
  } else {
    favourites.push(id);
    showToast("Saved to your favourites ♥");
  }

  save(FAV_STORAGE, favourites);
  render();
}

$("#search").addEventListener("input", render);
$("#typeFilter").addEventListener("change", render);
$("#statusFilter").addEventListener("change", render);

$("#categoryRow").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  category = button.dataset.category;
  render();
});

$("#showAllBtn").addEventListener("click", () => {
  category = "all";
  $("#search").value = "";
  $("#typeFilter").value = "all";
  $("#statusFilter").value = "all";
  render();
  $("#discover").scrollIntoView({behavior:"smooth"});
});

$("#spaceGrid").addEventListener("click", async event => {
  const favouriteButton = event.target.closest("[data-favourite]");
  if (favouriteButton) {
    toggleFavourite(Number(favouriteButton.dataset.favourite));
    return;
  }

  const shareButton = event.target.closest("[data-share]");
  if (!shareButton) return;

  const space = spaces.find(
    item => String(item.id) === shareButton.dataset.share
  );
  if (!space) return;

  const text = `${space.name} — ${space.area}\n` +
    `${space.status}: ${space.slot}\n${space.note || ""}`;

  if (navigator.share) {
    try {
      await navigator.share({title:space.name, text});
    } catch (error) {
      if (error.name !== "AbortError") showToast("Unable to share this listing.");
    }
  } else if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Listing details copied to clipboard!");
    } catch {
      showToast(text);
    }
  } else {
    showToast(text);
  }
});

const dialog = $("#spaceDialog");
const form = $("#spaceForm");

function openForm() {
  dialog.showModal();
}

$("#addBtn").addEventListener("click", openForm);
$("#bannerAddBtn").addEventListener("click", openForm);
$("#emptyAddBtn").addEventListener("click", openForm);
$("#closeBtn").addEventListener("click", () => dialog.close());

form.addEventListener("submit", event => {
  event.preventDefault();

  const data = new FormData(form);
  const name = data.get("name").trim();
  const area = data.get("area").trim();
  const slot = data.get("slot").trim();
  const type = data.get("type");

  if (!name || !area || !slot) {
    showToast("Please complete the required fields.");
    return;
  }

  if (!data.get("permission")) {
    showToast("Please confirm the listing permission.");
    return;
  }

  const space = {
    id: Date.now(),
    name,
    area,
    type,
    status: data.get("status"),
    slot,
    note: data.get("note").trim() || "Shared by a community member.",
    emoji: ({
      Ground:"⚽", Park:"🌳", Court:"🏀", "Open area":"🛝"
    })[type],
    owner: "You"
  };

  spaces.unshift(space);
  save(STORAGE, spaces);
  category = "all";
  $("#search").value = "";
  $("#typeFilter").value = "all";
  $("#statusFilter").value = "all";
  render();
  form.reset();
  dialog.close();
  showToast("Your space has been added on this device! ✳");
  $("#discover").scrollIntoView({behavior:"smooth"});
});

$("#themeBtn").addEventListener("click", () => {
  const dark = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", dark);
  $("#themeBtn").textContent = dark ? "☀️" : "🌙";

  try {
    localStorage.setItem(THEME_STORAGE, dark ? "dark" : "light");
  } catch {}
});

try {
  const savedTheme = localStorage.getItem(THEME_STORAGE);
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    $("#themeBtn").textContent = "☀️";
  }
} catch {}

$("#notifyBtn").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showToast("This browser does not support notifications.");
    return;
  }

  if (Notification.permission === "denied") {
    showToast("Allow notifications in your browser settings.");
    return;
  }

  if (Notification.permission === "granted") {
    showToast("Notification permission is already enabled.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      new Notification("PlaySpace Live", {
        body:"Notifications are enabled for this demo."
      });
      showToast("Browser notifications enabled!");
    } else {
      showToast("Notification permission was not granted.");
    }
  } catch {
    showToast("Could not request notification permission.");
  }
});

render();
