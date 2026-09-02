import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { logger } from "../logging/logger.js";
import { listLeads, getLeadById, updateLeadStatus, getLeadStats } from "../db/repositories/leadsRepo.js";
import { listCategories, setCategoryEnabled, upsertCategory, deleteCategory } from "../db/repositories/categoriesRepo.js";
import { listLocations, setLocationEnabled, addLocation, deleteLocation } from "../db/repositories/locationsRepo.js";
import { listSources } from "../db/repositories/sourcesRepo.js";
import { listSearchRuns } from "../db/repositories/searchRunsRepo.js";
import { getSettings, updateSettings } from "../db/repositories/settingsRepo.js";
import { triggerSearchNow, isSearchRunning } from "../scheduler/scheduler.js";
import { activeAiClientName } from "../ai/index.js";
import { isTelegramConfigured } from "../notify/telegram.js";
import type { LeadStatus } from "../core/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

const LEAD_STATUSES: LeadStatus[] = ["NEW", "REVIEWED", "HOT", "WARM", "SOLD", "CONTACTED", "DISCARDED", "DUPLICATE"];

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function send(res: http.ServerResponse, code: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(json);
}

function authOk(req: http.IncomingMessage): boolean {
  if (!env.appPassword) return true;
  return req.headers["x-app-password"] === env.appPassword;
}

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export function startHttpServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      logger.error("ERROR", "Unhandled HTTP error", { error: String((err as Error)?.message || err) });
      send(res, 500, { error: "Internal error" });
    }
  });

  server.listen(env.port, () => {
    logger.info("SEARCH_STARTED", `AI Lead Hunter dashboard running on http://localhost:${env.port}`);
  });

  return server;
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const u = new URL(req.url || "/", "http://localhost");
  const p = u.pathname;
  const method = req.method || "GET";

  // ── Unauthenticated ────────────────────────────────────────────────────
  if (p === "/api/health" && method === "GET") {
    return send(res, 200, {
      ok: true,
      aiClient: activeAiClientName(),
      telegramConfigured: isTelegramConfigured(),
      dryRun: env.dryRun,
      searching: isSearchRunning(),
      protected: Boolean(env.appPassword),
    });
  }

  if (p.startsWith("/api/")) {
    if (!authOk(req)) return send(res, 401, { error: "Fel lösenord" });
    return handleApi(p, method, req, res, u);
  }

  return serveStatic(p, res);
}

async function handleApi(p: string, method: string, req: http.IncomingMessage, res: http.ServerResponse, u: URL): Promise<void> {
  // ── Leads ────────────────────────────────────────────────────────────
  if (p === "/api/leads" && method === "GET") {
    const status = u.searchParams.get("status") as LeadStatus | null;
    const category = u.searchParams.get("category");
    const location = u.searchParams.get("location");
    const minScore = u.searchParams.get("minScore");
    const limit = u.searchParams.get("limit");
    const offset = u.searchParams.get("offset");
    return send(
      res,
      200,
      listLeads({
        status: status || undefined,
        category: category || undefined,
        location: location || undefined,
        minScore: minScore ? Number(minScore) : undefined,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      })
    );
  }

  const leadMatch = p.match(/^\/api\/leads\/([^/]+)(\/status)?$/);
  if (leadMatch && method === "GET" && !leadMatch[2]) {
    const lead = getLeadById(leadMatch[1]);
    if (!lead) return send(res, 404, { error: "Lead hittades inte" });
    return send(res, 200, lead);
  }
  if (leadMatch && method === "POST" && leadMatch[2] === "/status") {
    const body = await readJsonBody(req);
    const status = body.status as LeadStatus;
    if (!LEAD_STATUSES.includes(status)) return send(res, 400, { error: "Ogiltig status" });
    const updated = updateLeadStatus(leadMatch[1], status);
    if (!updated) return send(res, 404, { error: "Lead hittades inte" });
    return send(res, 200, updated);
  }

  // ── Stats ────────────────────────────────────────────────────────────
  if (p === "/api/stats" && method === "GET") {
    return send(res, 200, getLeadStats());
  }

  // ── Settings ─────────────────────────────────────────────────────────
  if (p === "/api/settings" && method === "GET") return send(res, 200, getSettings());
  if (p === "/api/settings" && method === "PUT") {
    const body = await readJsonBody(req);
    return send(res, 200, updateSettings(body));
  }

  // ── Categories ───────────────────────────────────────────────────────
  if (p === "/api/categories" && method === "GET") return send(res, 200, listCategories());
  if (p === "/api/categories" && method === "POST") {
    const body = await readJsonBody(req);
    if (!body.id || !body.name) return send(res, 400, { error: "id och name krävs" });
    upsertCategory({
      id: String(body.id),
      name: String(body.name),
      enabled: body.enabled !== false,
      keywords: Array.isArray(body.keywords) ? (body.keywords as string[]) : [],
      buyerTypes: Array.isArray(body.buyerTypes) ? (body.buyerTypes as string[]) : [],
    });
    return send(res, 200, { ok: true });
  }
  const catMatch = p.match(/^\/api\/categories\/([^/]+)$/);
  if (catMatch && method === "PUT") {
    const body = await readJsonBody(req);
    setCategoryEnabled(catMatch[1], Boolean(body.enabled));
    return send(res, 200, { ok: true });
  }
  if (catMatch && method === "DELETE") {
    deleteCategory(catMatch[1]);
    return send(res, 200, { ok: true });
  }

  // ── Locations ────────────────────────────────────────────────────────
  if (p === "/api/locations" && method === "GET") return send(res, 200, listLocations());
  if (p === "/api/locations" && method === "POST") {
    const body = await readJsonBody(req);
    if (!body.id || !body.name) return send(res, 400, { error: "id och name krävs" });
    addLocation({
      id: String(body.id),
      name: String(body.name),
      type: (body.type as any) || "city",
      enabled: body.enabled !== false,
    });
    return send(res, 200, { ok: true });
  }
  const locMatch = p.match(/^\/api\/locations\/([^/]+)$/);
  if (locMatch && method === "PUT") {
    const body = await readJsonBody(req);
    setLocationEnabled(locMatch[1], Boolean(body.enabled));
    return send(res, 200, { ok: true });
  }
  if (locMatch && method === "DELETE") {
    deleteLocation(locMatch[1]);
    return send(res, 200, { ok: true });
  }

  // ── Sources ──────────────────────────────────────────────────────────
  if (p === "/api/sources" && method === "GET") return send(res, 200, listSources());

  // ── Search runs ──────────────────────────────────────────────────────
  if (p === "/api/search-runs" && method === "GET") return send(res, 200, listSearchRuns());
  if (p === "/api/search-runs/trigger" && method === "POST") {
    if (isSearchRunning()) return send(res, 409, { error: "En sökning körs redan" });
    triggerSearchNow()
      .then((result) => logger.info("SEARCH_FINISHED", "Manual search run finished", result as any))
      .catch((err) => logger.error("ERROR", "Manual search run failed", { error: String((err as Error)?.message || err) }));
    return send(res, 202, { ok: true, message: "Sökning startad" });
  }

  return send(res, 404, { error: "Not found" });
}

function serveStatic(pathname: string, res: http.ServerResponse): void {
  const rel = pathname === "/" ? "/index.html" : pathname;
  const full = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream" });
    res.end(data);
  });
}
