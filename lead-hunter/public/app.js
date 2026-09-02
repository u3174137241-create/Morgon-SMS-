const state = { appPassword: localStorage.getItem("app_password") || "" };

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (state.appPassword) headers["x-app-password"] = state.appPassword;
  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401) {
    const pw = prompt("Lösenord krävs för dashboarden:");
    if (pw) {
      state.appPassword = pw;
      localStorage.setItem("app_password", pw);
      return api(path, opts);
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const LEAD_STATUSES = ["NEW", "REVIEWED", "HOT", "WARM", "SOLD", "CONTACTED", "DISCARDED", "DUPLICATE"];

// ── Tabs ───────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ── Dashboard ────────────────────────────────────────────────────────────
async function loadHealth() {
  const h = await api("/api/health");
  document.getElementById("statusPill").textContent =
    `AI: ${h.aiClient} · Telegram: ${h.telegramConfigured ? "på" : "av"}${h.dryRun ? " · DRY_RUN" : ""}${h.searching ? " · söker nu…" : ""}`;
}

async function loadStats() {
  const s = await api("/api/stats");
  document.getElementById("stat-hot").textContent = s.hotLeads;
  document.getElementById("stat-warm").textContent = s.warmLeads;
  document.getElementById("stat-today").textContent = s.leadsToday;
  document.getElementById("stat-week").textContent = s.leadsThisWeek;
  document.getElementById("stat-rejected").textContent = s.rejected;
  document.getElementById("stat-duplicates").textContent = s.duplicates;
}

async function loadSearchRuns() {
  const runs = await api("/api/search-runs");
  const body = document.getElementById("searchRunsBody");
  body.innerHTML = runs
    .map(
      (r) => `<tr>
        <td>${new Date(r.startedAt).toLocaleString("sv-SE")}</td>
        <td>${r.status}</td>
        <td>${r.queriesExecuted}</td>
        <td>${r.candidatesFound}</td>
        <td>${r.leadsAccepted}</td>
        <td>${r.duplicates}</td>
        <td>${r.rejected}</td>
        <td>${r.errors}</td>
      </tr>`
    )
    .join("") || `<tr><td colspan="8" style="color:var(--muted)">Inga sökningar körda ännu.</td></tr>`;
}

async function loadSources() {
  const sources = await api("/api/sources");
  const body = document.getElementById("sourcesBody");
  body.innerHTML = sources
    .map(
      (s) => `<tr><td>${s.name}</td><td>${s.type}</td><td>${s.quality}</td><td>${s.successCount}</td><td>${s.errorCount}</td></tr>`
    )
    .join("") || `<tr><td colspan="5" style="color:var(--muted)">Inga källor har körts ännu.</td></tr>`;
}

document.getElementById("triggerBtn").addEventListener("click", async () => {
  const btn = document.getElementById("triggerBtn");
  btn.disabled = true;
  btn.textContent = "Söker…";
  try {
    await api("/api/search-runs/trigger", { method: "POST" });
    setTimeout(refreshDashboard, 3000);
  } catch (e) {
    alert("Kunde inte starta sökning: " + e.message);
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Kör sökning nu";
    }, 3000);
  }
});

function refreshDashboard() {
  loadHealth();
  loadStats();
  loadSearchRuns();
  loadSources();
}

// ── Leads ────────────────────────────────────────────────────────────────
async function populateFilterOptions() {
  const [categories, locations] = await Promise.all([api("/api/categories"), api("/api/locations")]);
  const catSel = document.getElementById("filterCategory");
  categories.forEach((c) => catSel.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`));
  const locSel = document.getElementById("filterLocation");
  locations.forEach((l) => locSel.insertAdjacentHTML("beforeend", `<option value="${l.id}">${l.name}</option>`));
  const statusSel = document.getElementById("filterStatus");
  LEAD_STATUSES.forEach((s) => statusSel.insertAdjacentHTML("beforeend", `<option value="${s}">${s}</option>`));
}

async function loadLeads() {
  const params = new URLSearchParams();
  const status = document.getElementById("filterStatus").value;
  const category = document.getElementById("filterCategory").value;
  const location = document.getElementById("filterLocation").value;
  const minScore = document.getElementById("filterMinScore").value;
  if (status) params.set("status", status);
  if (category) params.set("category", category);
  if (location) params.set("location", location);
  if (minScore) params.set("minScore", minScore);

  const leads = await api(`/api/leads?${params.toString()}`);
  const body = document.getElementById("leadsBody");
  if (leads.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="color:var(--muted)">0 leads matchar filtret. (Systemet hittar aldrig på falska leads — "0 new qualified leads" är ett giltigt resultat.)</td></tr>`;
    return;
  }
  body.innerHTML = leads
    .map(
      (l) => `<tr data-id="${l.id}">
        <td><span class="badge ${l.classification}">${l.leadScore}</span></td>
        <td>${l.category}</td>
        <td>${l.service}</td>
        <td>${l.location}</td>
        <td>${l.ageDays ?? "?"} d${l.dateConfidence === "UNCERTAIN" ? " (osäkert)" : ""}</td>
        <td>${l.source}</td>
        <td>${l.status}</td>
      </tr>`
    )
    .join("");
  body.querySelectorAll("tr[data-id]").forEach((row) => {
    row.addEventListener("click", () => openLead(row.dataset.id));
  });
}

document.getElementById("applyFilters").addEventListener("click", loadLeads);

async function openLead(id) {
  const l = await api(`/api/leads/${id}`);
  const body = document.getElementById("leadModalBody");
  body.innerHTML = `
    <h3>${l.service} <span class="badge ${l.classification}">${l.leadScore}/100</span></h3>
    <dl>
      <dt>Kategori</dt><dd>${l.category}</dd>
      <dt>Plats</dt><dd>${l.location}</dd>
      <dt>Status</dt><dd>${l.status}</dd>
      <dt>Ålder</dt><dd>${l.ageDays ?? "okänd"} dagar (${l.dateConfidence})</dd>
      <dt>Publicerad</dt><dd>${l.publishedAt ? new Date(l.publishedAt).toLocaleString("sv-SE") : "okänt"}</dd>
      <dt>Upptäckt</dt><dd>${new Date(l.discoveredAt).toLocaleString("sv-SE")}</dd>
      <dt>Brådska</dt><dd>${l.urgency}</dd>
      <dt>Värde</dt><dd>${l.estimatedValue}</dd>
      <dt>Köpartyp</dt><dd>${l.buyerType}</dd>
      <dt>Sammanfattning</dt><dd>${l.contentSummary}</dd>
      <dt>Varför lead</dt><dd>${l.whyThisIsALead}</dd>
      <dt>Källa</dt><dd><a href="${l.sourceUrl}" target="_blank" rel="noopener">${l.sourceTitle || l.sourceUrl}</a></dd>
    </dl>
    <div class="modal-actions">
      <a class="btn" href="${l.sourceUrl}" target="_blank" rel="noopener">OPEN SOURCE</a>
      <button class="btn" data-status="SOLD">MARK AS SOLD</button>
      <button class="btn" data-status="CONTACTED">MARK AS CONTACTED</button>
      <button class="btn" data-status="REVIEWED">MARK AS REVIEWED</button>
      <button class="btn" data-status="DISCARDED">DISCARD</button>
    </div>`;
  body.querySelectorAll("button[data-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/api/leads/${id}/status`, { method: "POST", body: JSON.stringify({ status: btn.dataset.status }) });
      closeModal();
      loadLeads();
      loadStats();
    });
  });
  document.getElementById("leadModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("leadModal").classList.add("hidden");
}
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("leadModal").addEventListener("click", (e) => {
  if (e.target.id === "leadModal") closeModal();
});

// ── Settings ─────────────────────────────────────────────────────────────
async function loadSettings() {
  const s = await api("/api/settings");
  document.getElementById("set-maxAge").value = s.maxLeadAgeDays;
  document.getElementById("set-minScore").value = s.minScoreNotify;
  document.getElementById("set-interval").value = s.searchIntervalHours;
  document.getElementById("set-intensity").value = s.searchIntensity;
  document.getElementById("set-telegram").checked = s.telegramEnabled;
}

document.getElementById("saveSettings").addEventListener("click", async () => {
  await api("/api/settings", {
    method: "PUT",
    body: JSON.stringify({
      maxLeadAgeDays: Number(document.getElementById("set-maxAge").value),
      minScoreNotify: Number(document.getElementById("set-minScore").value),
      searchIntervalHours: Number(document.getElementById("set-interval").value),
      searchIntensity: document.getElementById("set-intensity").value,
      telegramEnabled: document.getElementById("set-telegram").checked,
    }),
  });
  alert("Inställningar sparade.");
});

async function loadCategories() {
  const categories = await api("/api/categories");
  const list = document.getElementById("categoriesList");
  list.innerHTML = categories
    .map(
      (c) => `<label><input type="checkbox" data-cat="${c.id}" ${c.enabled ? "checked" : ""}/> ${c.name}</label>`
    )
    .join("");
  list.querySelectorAll("input[data-cat]").forEach((cb) => {
    cb.addEventListener("change", () => api(`/api/categories/${cb.dataset.cat}`, { method: "PUT", body: JSON.stringify({ enabled: cb.checked }) }));
  });
}

async function loadLocations() {
  const locations = await api("/api/locations");
  const list = document.getElementById("locationsList");
  list.innerHTML = locations
    .map((l) => `<label><input type="checkbox" data-loc="${l.id}" ${l.enabled ? "checked" : ""}/> ${l.name} (${l.type})</label>`)
    .join("");
  list.querySelectorAll("input[data-loc]").forEach((cb) => {
    cb.addEventListener("change", () => api(`/api/locations/${cb.dataset.loc}`, { method: "PUT", body: JSON.stringify({ enabled: cb.checked }) }));
  });
}

// ── Init ─────────────────────────────────────────────────────────────────
(async function init() {
  await populateFilterOptions();
  refreshDashboard();
  loadLeads();
  loadSettings();
  loadCategories();
  loadLocations();
  setInterval(refreshDashboard, 30000);
})();
