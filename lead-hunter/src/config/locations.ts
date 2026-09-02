import type { LocationConfig } from "../core/types.js";

/**
 * Default location catalogue (section 7). "Sverige" (whole country, no
 * specific place mentioned) is always included so nationwide/unspecified
 * leads are not discarded. Add/remove locations from the dashboard or DB —
 * this file only seeds the table on first run.
 */
export const DEFAULT_LOCATIONS: LocationConfig[] = [
  loc("sverige", "Sverige", "country"),
  loc("stockholm", "Stockholm", "city"),
  loc("haninge", "Haninge", "municipality"),
  loc("huddinge", "Huddinge", "municipality"),
  loc("sodertalje", "Södertälje", "municipality"),
  loc("uppsala", "Uppsala", "city"),
  loc("goteborg", "Göteborg", "city"),
  loc("malmo", "Malmö", "city"),
];

function loc(id: string, name: string, type: LocationConfig["type"]): LocationConfig {
  return { id, name, type, enabled: true };
}
