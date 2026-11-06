import { AIR_API, WEATHER_API, WIND_GRID } from "../config/mapConfig";

export const weatherText = (code) => {
  if (code === 0) return "Cerah"; if ([1, 2, 3].includes(code)) return "Berawan";
  if ([45, 48].includes(code)) return "Berkabut"; if ([51, 53, 55, 56, 57].includes(code)) return "Gerimis";
  if ([61, 63, 65, 66, 67].includes(code)) return "Hujan"; if ([71, 73, 75, 77].includes(code)) return "Salju";
  if ([80, 81, 82].includes(code)) return "Hujan deras"; if ([85, 86].includes(code)) return "Hujan salju";
  if ([95, 96, 99].includes(code)) return "Badai petir"; return "Tidak diketahui";
};

// Ambang US EPA (bukan ISPU Indonesia); dicantumkan pada UI.
export const pm25Label = (pm) => (pm == null ? "Tidak tersedia" : pm <= 12 ? "Baik" : pm <= 35.4 ? "Sedang" : pm <= 55.4 ? "Tidak sehat" : "Sangat tidak sehat");

// Mengambil `count` jam prakiraan mulai dari jam setelah waktu data saat ini.
// (Versi lama mengambil 6 entri pertama = 00:00-05:00 hari itu, bukan jam berikutnya.)
export function nextHours(hourly, currentTime, count = 6) {
  const times = hourly?.time || [];
  let start = currentTime ? times.findIndex((t) => t >= currentTime) : 0;
  if (start < 0) start = 0;
  return times.slice(start, start + count).map((time, k) => {
    const i = start + k;
    return { time: time.slice(11, 16), rain: Number(hourly?.precipitation?.[i] || 0), probability: Number(hourly?.precipitation_probability?.[i] || 0) };
  });
}

export async function fetchPointEnvironment(lat, lon, signal) {
  const params = `latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,wind_speed_10m,wind_direction_10m&hourly=precipitation_probability,precipitation&forecast_days=2&timezone=auto`;
  const [wr, air] = await Promise.all([
    fetch(`${WEATHER_API}?${params}`, { signal }),
    fetch(`${AIR_API}?latitude=${lat}&longitude=${lon}&current=pm2_5`, { signal }).then((r) => (r.ok ? r.json() : null)).catch((e) => { if (e.name === "AbortError") throw e; return null; }),
  ]);
  if (!wr.ok) throw new Error(`Weather API ${wr.status}`);
  const w = await wr.json();
  const c = w.current || {};
  const pm = air?.current?.pm2_5 ?? null;
  return {
    lat: Number(lat).toFixed(4), lon: Number(lon).toFixed(4),
    temp: c.temperature_2m, humidity: c.relative_humidity_2m, precipitation: c.precipitation, rain: c.rain,
    weather: weatherText(c.weather_code), speed: c.wind_speed_10m, direction: c.wind_direction_10m,
    pm25: pm, airLabel: pm25Label(pm), airTime: air?.current?.time || "",
    hourly: nextHours(w.hourly, c.time, 6), sourceTime: c.time, timezone: w.timezone,
  };
}

// --- Wind field (format leaflet-velocity) dari titik model Open-Meteo ---

export function windGridPoints(g = WIND_GRID) {
  const nx = Math.round((g.lonMax - g.lonMin) / g.step) + 1;
  const ny = Math.round((g.latMax - g.latMin) / g.step) + 1;
  const lats = [], lons = [];
  for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) { lats.push(g.latMax - r * g.step); lons.push(g.lonMin + c * g.step); }
  return { nx, ny, lats, lons };
}

// speed (m/s) dan arah ASAL angin (derajat) -> komponen u (ke timur) dan v (ke utara).
export function windComponents(speed, dir) {
  if (speed == null || dir == null) return { u: null, v: null };
  const rad = (dir * Math.PI) / 180;
  return { u: -speed * Math.sin(rad), v: -speed * Math.cos(rad) };
}

export function buildWindData(points, refTime, g = WIND_GRID) {
  const { nx, ny } = windGridPoints(g);
  if (points.length !== nx * ny) throw new Error("Jumlah titik angin tidak sesuai grid");
  const header = { parameterCategory: 2, lo1: g.lonMin, la1: g.latMax, lo2: g.lonMax, la2: g.latMin, dx: g.step, dy: g.step, nx, ny, refTime };
  const comps = points.map((p) => windComponents(p?.speed, p?.dir));
  return [
    { header: { ...header, parameterNumber: 2, parameterNumberName: "Eastward wind", parameterUnit: "m.s-1" }, data: comps.map((c) => c.u) },
    { header: { ...header, parameterNumber: 3, parameterNumberName: "Northward wind", parameterUnit: "m.s-1" }, data: comps.map((c) => c.v) },
  ];
}

let windCache = null;
export async function fetchWindData(signal) {
  if (windCache && Date.now() - windCache.fetchedAt < WIND_GRID.cacheMs) return windCache;
  const { lats, lons } = windGridPoints();
  const url = `${WEATHER_API}?latitude=${lats.join(",")}&longitude=${lons.join(",")}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=GMT`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Wind API ${res.status}`);
  const json = await res.json();
  const list = Array.isArray(json) ? json : [json];
  const points = list.map((r) => ({ speed: r?.current?.wind_speed_10m ?? null, dir: r?.current?.wind_direction_10m ?? null }));
  const times = list.map((r) => r?.current?.time).filter(Boolean).sort();
  const refTime = times.length ? `${times[times.length - 1]}:00Z` : new Date().toISOString();
  const timestamp = Date.parse(refTime);
  windCache = { data: buildWindData(points, refTime), timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(), fetchedAt: Date.now() };
  return windCache;
}
