// AI-videogenerering via Replicate (https://replicate.com) — text-till-video från valfri prompt.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "videos.json");

const {
  REPLICATE_API_TOKEN = "",
  REPLICATE_MODEL = "minimax/video-01",
  REPLICATE_POLL_MS = "8000",
} = process.env;

const REPLICATE_API = "https://api.replicate.com/v1";
const POLL_MS = Math.max(3000, Number(REPLICATE_POLL_MS) || 8000);
const TIMEOUT_MS = 20 * 60 * 1000; // 20 min — ge upp om Replicate hänger sig
const MAX_PROMPT_LEN = 1500;
const ACTIVE_STATUSES = new Set(["starting", "processing"]);

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { return []; }
}
function save(list) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2)); } catch (e) { console.error("[video] save fail", e); }
}
let videos = load();

export function isVideoConfigured() {
  return Boolean(REPLICATE_API_TOKEN);
}
export function getVideoModel() {
  return REPLICATE_MODEL;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

// Replicate-output kan vara en sträng, en array av strängar, eller ett objekt — normalisera till en URL.
function extractVideoUrl(output) {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const hit = output.find(v => typeof v === "string");
    return hit || null;
  }
  if (typeof output === "object") {
    for (const v of Object.values(output)) {
      if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
    }
  }
  return null;
}

async function replicateCreatePrediction(model, input) {
  const [owner, name] = String(model).split("/");
  if (!owner || !name) throw new Error(`Ogiltigt REPLICATE_MODEL: "${model}" (förväntar "ägare/modell")`);
  const r = await fetch(`${REPLICATE_API}/models/${owner}/${name}/predictions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ input }),
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!r.ok) {
    const msg = json?.detail || json?.error || text || `HTTP ${r.status}`;
    throw new Error(`Replicate ${r.status}: ${msg}`);
  }
  return json;
}

async function replicateGetPrediction(id) {
  const r = await fetch(`${REPLICATE_API}/predictions/${id}`, { headers: authHeaders() });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!r.ok) throw new Error(`Replicate ${r.status}: ${json?.detail || text}`);
  return json;
}

async function replicateCancelPrediction(id) {
  try {
    await fetch(`${REPLICATE_API}/predictions/${id}/cancel`, { method: "POST", headers: authHeaders() });
  } catch (e) {
    console.error("[video] cancel fail", e.message || e);
  }
}

export async function createVideoJob({ prompt, aspectRatio, duration, resolution, model }) {
  if (!isVideoConfigured()) throw new Error("AI-video är inte konfigurerad. Sätt miljövariabeln REPLICATE_API_TOKEN.");
  prompt = String(prompt || "").trim();
  if (!prompt) throw new Error("Prompt kravs");
  if (prompt.length > MAX_PROMPT_LEN) throw new Error(`Prompten ar for lang (max ${MAX_PROMPT_LEN} tecken)`);

  const useModel = String(model || REPLICATE_MODEL).trim();
  const input = { prompt };
  if (aspectRatio) input.aspect_ratio = aspectRatio;
  if (duration) input.duration = Number(duration) || duration;
  if (resolution) input.resolution = resolution;

  const pred = await replicateCreatePrediction(useModel, input);

  const job = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    predictionId: pred.id,
    model: useModel,
    prompt,
    input,
    status: pred.status || "starting",
    videoUrl: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  videos.unshift(job);
  save(videos);
  return job;
}

export function listVideoJobs() {
  return videos;
}

export async function deleteVideoJob(id) {
  const job = videos.find(j => j.id === id);
  if (!job) return false;
  if (ACTIVE_STATUSES.has(job.status) && job.predictionId) {
    await replicateCancelPrediction(job.predictionId);
  }
  videos = videos.filter(j => j.id !== id);
  save(videos);
  return true;
}

async function pollOnce() {
  const pending = videos.filter(j => ACTIVE_STATUSES.has(j.status));
  if (!pending.length) return;
  let changed = false;

  for (const job of pending) {
    const ageMs = Date.now() - new Date(job.createdAt).getTime();
    if (ageMs > TIMEOUT_MS) {
      job.status = "failed";
      job.error = "Tidsgräns nådd — videogenereringen tog för lång tid.";
      job.updatedAt = new Date().toISOString();
      changed = true;
      continue;
    }
    try {
      const pred = await replicateGetPrediction(job.predictionId);
      const newStatus = pred.status || job.status;
      if (newStatus !== job.status) changed = true;
      job.status = newStatus;
      job.updatedAt = new Date().toISOString();
      if (newStatus === "succeeded") {
        job.videoUrl = extractVideoUrl(pred.output);
        if (!job.videoUrl) { job.status = "failed"; job.error = "Ingen video-URL i svaret fran Replicate."; }
        changed = true;
      } else if (newStatus === "failed" || newStatus === "canceled") {
        job.error = pred.error ? String(pred.error) : (newStatus === "canceled" ? "Avbruten" : "Okant fel");
        changed = true;
      }
    } catch (e) {
      console.error(`[video] poll fail for ${job.id}:`, e.message || e);
    }
  }
  if (changed) save(videos);
}

let pollTimer = null;
export function startVideoPoller() {
  if (pollTimer) return;
  pollTimer = setInterval(() => pollOnce().catch(e => console.error("[video] poll error", e)), POLL_MS);
  pollOnce().catch(e => console.error("[video] poll error", e));
}
