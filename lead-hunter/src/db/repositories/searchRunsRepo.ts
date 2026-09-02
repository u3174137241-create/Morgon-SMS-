import { getDb } from "../db.js";
import type { SearchRun } from "../../core/types.js";

interface SearchRunRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  categories: string;
  locations: string;
  queries_executed: number;
  candidates_found: number;
  leads_accepted: number;
  duplicates: number;
  rejected: number;
  errors: number;
  status: SearchRun["status"];
  notes: string | null;
}

function toRun(row: SearchRunRow): SearchRun {
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    categories: JSON.parse(row.categories || "[]"),
    locations: JSON.parse(row.locations || "[]"),
    queriesExecuted: row.queries_executed,
    candidatesFound: row.candidates_found,
    leadsAccepted: row.leads_accepted,
    duplicates: row.duplicates,
    rejected: row.rejected,
    errors: row.errors,
    status: row.status,
    notes: row.notes,
  };
}

export function createSearchRun(id: string, categories: string[], locations: string[]): void {
  getDb()
    .prepare(
      `INSERT INTO search_runs (id, started_at, categories, locations, status) VALUES (?, ?, ?, ?, 'RUNNING')`
    )
    .run(id, new Date().toISOString(), JSON.stringify(categories), JSON.stringify(locations));
}

export function finishSearchRun(
  id: string,
  stats: Pick<SearchRun, "queriesExecuted" | "candidatesFound" | "leadsAccepted" | "duplicates" | "rejected" | "errors">,
  status: SearchRun["status"],
  notes?: string
): void {
  getDb()
    .prepare(
      `UPDATE search_runs SET finished_at = @finishedAt, queries_executed = @queriesExecuted,
       candidates_found = @candidatesFound, leads_accepted = @leadsAccepted, duplicates = @duplicates,
       rejected = @rejected, errors = @errors, status = @status, notes = @notes WHERE id = @id`
    )
    .run({
      id,
      finishedAt: new Date().toISOString(),
      status,
      notes: notes ?? null,
      ...stats,
    });
}

export function listSearchRuns(limit = 25): SearchRun[] {
  const rows = getDb().prepare("SELECT * FROM search_runs ORDER BY started_at DESC LIMIT ?").all(limit) as SearchRunRow[];
  return rows.map(toRun);
}
