// Parsing CSV NASA FIRMS (VIIRS) dari endpoint /api/hotspots.

export const CONF_RANK = { unknown: 0, low: 1, nominal: 2, high: 3 };
export const MIN_CONF_RANK = { all: 0, nominal: 2, high: 3 };

// VIIRS: l / n / h. MODIS: angka 0-100 (low 0-29, nominal 30-79, high 80-100 menurut dokumentasi FIRMS).
export function normalizeConfidence(raw) {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "h" || v === "high") return "high";
  if (v === "n" || v === "nominal") return "nominal";
  if (v === "l" || v === "low") return "low";
  if (v !== "" && Number.isFinite(Number(v))) {
    const n = Number(v);
    return n >= 80 ? "high" : n >= 30 ? "nominal" : "low";
  }
  return "unknown";
}

export function acquisitionMs(date, time) {
  if (!date) return NaN;
  const t = String(time ?? "").padStart(4, "0");
  return Date.parse(`${date}T${t.slice(0, 2)}:${t.slice(2, 4)}:00Z`);
}

export function parseCsv(csv) {
  const text = String(csv || "").replace(/\r/g, "").trim();
  if (!text) return [];
  // Halaman error / JSON bukan CSV; jangan diam-diam dianggap "0 hotspot".
  if (text[0] === "<" || text[0] === "{") throw new Error("Respons hotspot bukan CSV");
  const lines = text.split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((x) => x.trim().toLowerCase());
  const idx = (name, fallback) => { const i = headers.indexOf(name); return i >= 0 ? i : fallback; };
  const latI = idx("latitude", 0), lonI = idx("longitude", 1), brightI = idx("bright_ti4", 2), dateI = idx("acq_date", 5), timeI = idx("acq_time", 6);
  const confI = idx("confidence", 9), frpI = idx("frp", 11), dayI = idx("daynight", 13), satI = idx("satellite", -1), instI = idx("instrument", -1);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",").map((x) => x.trim());
    const lat = Number(c[latI]), lon = Number(c[lonI]);
    if (c[latI] === "" || c[lonI] === "" || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const date = c[dateI] || "", time = c[timeI] || "";
    out.push({
      id: `${lat}-${lon}-${date}-${time}-${i}`, lat, lon,
      brightness: Number(c[brightI]) || 0, frp: Number(c[frpI]) || 0,
      date: date || "—", time: time || "—", ts: acquisitionMs(date, time),
      confidence: normalizeConfidence(c[confI]), rawConfidence: c[confI] || "",
      daynight: c[dayI] || "—", satellite: satI >= 0 ? c[satI] || "" : "", instrument: instI >= 0 ? c[instI] || "" : "",
    });
  }
  return out;
}

export function latestAcquisition(fires) {
  let max = NaN;
  for (const f of fires) if (Number.isFinite(f.ts) && !(f.ts <= max)) max = f.ts;
  return max;
}

export function dailyCounts(fires, n = 7) {
  const counts = {};
  for (const f of fires) if (f.date !== "—") counts[f.date] = (counts[f.date] || 0) + 1;
  return Object.keys(counts).sort().slice(-n).map((date) => ({ date, label: date.slice(5), count: counts[date] }));
}

export function hhmm(time) {
  const t = String(time ?? "").padStart(4, "0");
  return /^\d{4}$/.test(t) ? `${t.slice(0, 2)}:${t.slice(2)}` : "—";
}
