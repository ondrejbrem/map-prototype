// Generic helpers shared across modules (zoom math, parsing, clamping).
import { config } from "./config.js";

export function detailRank(level) {
  const breaks = config.zoomBreaks || {};
  const keys = Object.keys(breaks).sort((a, b) => (breaks[a] || 0) - (breaks[b] || 0));
  const idx = keys.indexOf(level);
  if (idx >= 0) return idx;
  return keys.length ? keys.length - 1 : 2;
}

export function currentDetail(zoom) {
  const breaks = config.zoomBreaks || {};
  const entries = Object.entries(breaks).sort((a, b) => a[1] - b[1]);
  for (const [name, val] of entries) {
    if (zoom <= val) return name;
  }
  return entries.length ? entries[entries.length - 1][0] : "detail";
}

export function extractLevels(value = "", order) {
  const normalized = value.replace(/\s+/g, "").replace(/\u2013/g, "-");
  const parts = normalized.split("-");
  if (parts.length === 2) {
    const start = order.indexOf(parts[0]);
    const end = order.indexOf(parts[1]);
    if (start >= 0 && end >= start) return order.slice(start, end + 1);
  }
  const matches = normalized.match(/[A-C][1-2]/g);
  return matches || [];
}

export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}
