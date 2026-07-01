import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "jobs.json");
const PUBLIC = path.join(__dirname, "public");

const {
  ELKS_USER,
  ELKS_PASS,
  ELKS_FROM = "Morgon",
  APP_PASSWORD = "",
  PORT = 3000,
} = process.env;

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { return []; }
}
function saveJobs(j) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(j, null, 2)); } catch (e) { console.error("save fail", e); }
}
let jobs = load();

async function sendSms(to, message, from = ELKS_FROM) {
  if (!ELKS_USER || !ELKS_PASS) throw new Error("ELKS_USER/ELKS_PASS saknas");
  const auth = Buffer.from(`${ELKS_USER}:${ELKS_PASS}`).toString("base64");
  const body = new URLSearchParams({ from, to, message }).toString();
  const r = await fetch("https://api.46elks.com/a1/sms", {
    method: "POST",
    headers: { Authorization: "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!r.ok) throw new Error(`46elks ${r.status}: ${text}`);
  return json;
}

function nextFireFrom(job, afterMs) {
  let t = new Date(job.fireAt).getTime();
  if (job.repeat === "none") return t;
  const d = new Date(t); let guard = 0;
  while (d.getTime() <= afterMs && guard < 2000) {
    guard++;
    if (job.repeat === "daily") d.setDate(d.getDate() + 1);
    else if (job.repeat === "weekly") d.setDate(d.getDate() + 7);
    else if (job.repeat === "weekdays") { do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); }
    else break;
  }
  if (job.repeat === "weekdays") { while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); }
  return d.getTime();
}
async function tick() {
  const now = Date.now(); let changed = false;
  for (const job of jobs) {
    if (job.status === "cancelled" || job.status === "done") continue;
    const fireMs = new Date(job.fireAt).getTime();
    if (now >= fireMs && now - fireMs < 5 * 60e3) {
      try {
        const res = await sendSms(job.to, job.message, job.from || ELKS_FROM);
        (job.sentLog ||= []).push({ at: new Date().toISOString(), ok: true, id: res.id, status: res.status });
        console.log(`[SENT] ${job.to} -> ${res.id}`);
      } catch (e) {
        (job.sentLog ||= []).push({ at: new Date().toISOString(), ok: false, error: String(e.message || e) });
        console.error(`[FAIL] ${job.to}: ${e.message}`);
      }
      if (job.repeat && job.repeat !== "none") {
        job.fireAt = new Date(nextFireFrom(job, now + 60e3)).toISOString();
        job.status = "scheduled";
      } else job.status = "done";
      changed = true;
    }
  }
  if (changed) saveJobs(jobs);
}
setInterval(() => tick().catch(console.error), 20e3);
tick().catch(console.error);

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}
function authOK(req) {
  if (!APP_PASSWORD) return true;
  return (req.headers["x-app-password"] || "") === APP_PASSWORD;
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = ""; req.on("data", c => (d += c)); req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } });
  });
}
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const p = u.pathname;

  if (p === "/api/health") {
    return send(res, 200, {
      ok: true,
      configured: Boolean(ELKS_USER && ELKS_PASS),
      from: ELKS_FROM,
      protected: Boolean(APP_PASSWORD),
      jobs: jobs.filter(j => j.status === "scheduled").length,
    });
  }
  if (p === "/api/jobs"
