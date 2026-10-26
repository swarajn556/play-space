
const demoSpaces = [
  {
    id: 1, name: "Greenfield Community Ground",
    area: "CIDCO", type: "Ground",
    status: "Available now", slot: "Today, 4:30–6:30 PM",
    note: "Demo listing for football, cricket and group games.",
    emoji: "⚽", owner: "Community"
  },
  {
    id: 2, name: "Sunrise Society Park",
    area: "N-4, CIDCO", type: "Park",
    status: "Available later", slot: "Today, 6–7 PM",
    note: "Example park listing. Confirm permission before visiting.",
    emoji: "🌳", owner: "Community"
  },
  {
    id: 3, name: "Neighbourhood Basketball Court",
    area: "Garkheda", type: "Court",
    status: "Available now", slot: "Today, 3–5 PM",
    note: "Example court listing for the hackathon demo.",
    emoji: "🏀", owner: "Community"
  },
  {
    id: 4, name: "Riverside Open Play Area",
    area: "Satara Parisar", type: "Open area",
    status: "Available later", slot: "Tomorrow, 5–6 PM",
    note: "A sample open-area listing.",
    emoji: "🛝", owner: "Community"
  },
  {
    id: 5, name: "Community Sports Ground",
    area: "Osmanpura", type: "Ground",
    status: "Available now", slot: "Sunday, 8–10 AM",
    note: "Sample data only; access has not been verified.",
    emoji: "🏟️", owner: "Community"
  },
  {
    id: 6, name: "Mini Basketball Court",
    area: "Waluj", type: "Court",
    status: "Available later", slot: "Tomorrow, 7–8 AM",
    note: "Demonstration listing.",
    emoji: "🏀", owner: "Community"
  }
];

const STORAGE_KEY = "playspace-live-v1";
const $ = selector => document.querySelector(selector);
const grid = $("#spaceGrid");
const dialog = $("#spaceDialog");
const form = $("#spaceForm");
const message = $("#message");

let spaces;

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  spaces = saved ? JSON.parse(saved) : demoSpaces;
  if (!Array.isArray(spaces)) spaces = demoSpaces;
} catch {
  spaces = demoSpaces;
}

function escapeHTML(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value).replace(/[&<>"']/g, char => entities[char]);
}

function saveSpaces() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spaces));
    return true;
  } catch {
    showMessage("Browser storage unavailable. Changes may not persist.");
    return false;
  }
}

let messageTimer;

function showMessage(text) {
  message.textContent = text;
  message.classList.add("show");
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    message.classList.remove("show");
  }, 3000);
}

function renderSpaces() {
  const query = $("#search").value.trim().toLowerCase();
  const type = $("#typeFilter").value;
  const status = $("#statusFilter").value;

  const results = spaces.filter(space => {
    const matchesSearch =
      `${space.name} ${space.area}`.toLowerCase().includes(query);

    const matchesType = type === "all" || space.type === type;
    const matchesStatus = status === "all" || space.status === status;

    return matchesSearch && matchesType && matchesStatus;
  });

  $("#totalCount").textContent = spaces.length;
  $("#availableCount").textContent =
    spaces.filter(s => s.status === "Available now").length;

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="empty">
        <h3>No matching spaces found</h3>
        <p>Try another search or share a space with your community.</p>
      </div>`;
    return;
  }

  grid.innerHTML = results.map(space => `
    <article class="card">
      <div class="card-top">
        <span class="emoji">${escapeHTML(space.emoji || "📍")}</span>
        <span class="status ${
          space.status === "Available now" ? "now" : "later"
        }">${escapeHTML(space.status)}</span>
      </div>
      <h3>${escapeHTML(space.name)}</h3>
      <p class="area">📍 ${escapeHTML(space.area)} · ${
        escapeHTML(space.type)
      }</p>
      <p class="slot">◷ ${escapeHTML(space.slot)}</p>
      <p class="note">${escapeHTML(space.note || "")}</p>
      <div class="card-bottom">
        <span>By ${escapeHTML(space.owner || "Community")}</span>
        <button type="button" data-share="${space.id}">Share ↗</button>
      </div>
    </article>
  `).join("");
}

$("#search").addEventListener("input", renderSpaces);
$("#typeFilter").addEventListener("change", renderSpaces);
$("#statusFilter").addEventListener("change", renderSpaces);

$("#addBtn").addEventListener("click", () => dialog.showModal());
$("#closeBtn").addEventListener("click", () => dialog.close());

form.addEventListener("submit", event => {
  event.preventDefault();

  const data = new FormData(form);
  const name = data.get("name").trim();
  const area = data.get("area").trim();
  const type = data.get("type");

  if (!name || !area || !data.get("slot").trim()) {
    showMessage("Please complete all required fields.");
    return;
  }

  const space = {
    id: Date.now(),
    name,
    area,
    type,
    status: data.get("status"),
    slot: data.get("slot").trim(),
    note: data.get("note").trim() || "Shared by a community member.",
    emoji: {
      Ground: "⚽",
      Park: "🌳",
      Court: "🏀",
      "Open area": "🛝"
    }[type],
    owner: "You"
  };

  spaces.unshift(space);
  saveSpaces();
  renderSpaces();
  form.reset();
  dialog.close();
  showMessage("Space added to this browser!");
});

grid.addEventListener("click", async event => {
  const button = event.target.closest("[data-share]");
  if (!button) return;

  const space = spaces.find(
    item => String(item.id) === button.dataset.share
  );
  if (!space) return;

  const text = `${space.name} — ${space.area}\n` +
    `${space.status}: ${space.slot}\n${space.note}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: space.name, text });
    } catch (error) {
      if (error.name !== "AbortError") {
        showMessage("Could not share this listing.");
      }
    }
  } else if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      showMessage("Listing details copied!");
    } catch {
      showMessage(text);
    }
  } else {
    showMessage(text);
  }
});

$("#notifyBtn").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showMessage("Notifications are not supported by this browser.");
    return;
  }

  if (Notification.permission === "denied") {
    showMessage("Allow notifications in your browser settings.");
    return;
  }

  if (Notification.permission === "granted") {
    showMessage("Browser notification permission is already enabled.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      new Notification("PlaySpace Live", {
        body: "Notifications are enabled for this demo."
      });
      showMessage("Notification permission enabled!");
    } else {
      showMessage("Notification permission was not granted.");
    }
  } catch {
    showMessage("Could not request notification permission.");
  }
});

renderSpaces();
