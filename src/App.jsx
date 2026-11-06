import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-velocity/dist/leaflet-velocity.css";
import "leaflet-velocity/dist/leaflet-velocity.js";
import "./App.css";

const CENTER = [-2, 118];
const ESRI_IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const EOX_SENTINEL = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg";
const ESRI_LABELS = "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const GFW_TREE_LOSS = "https://tiles.globalforestwatch.org/umd_tree_cover_loss/v1.13/dynamic/{z}/{x}/{y}.png?start_year=2001&end_year=2025&render_type=true_color&tree_cover_density_threshold=30";
const RAINVIEWER_META = "https://api.rainviewer.com/public/weather-maps.json";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const AIR_API = "https://air-quality-api.open-meteo.com/v1/air-quality";

// Optional thematic tile services. Supply XYZ tile URLs in Vercel Environment Variables.
const OPTIONAL_LAYERS = [
  { id: "forestCover", title: "Forest cover", detail: "Tutupan pohon / hutan", env: "VITE_FOREST_COVER_TILE_URL", color: "#4fc18b" },
  { id: "glad", title: "GLAD alerts", detail: "Peringatan kehilangan tutupan pohon", env: "VITE_GLAD_TILE_URL", color: "#f4b942" },
  { id: "radd", title: "RADD alerts", detail: "Radar-based forest disturbance alerts", env: "VITE_RADD_TILE_URL", color: "#e87955" },
  { id: "palm", title: "Oil palm map", detail: "Klasifikasi kebun sawit aktual", env: "VITE_OIL_PALM_TILE_URL", color: "#9cce62" },
  { id: "concessions", title: "Palm concessions", detail: "Batas izin / konsesi, bukan bukti tanaman", env: "VITE_PALM_CONCESSION_TILE_URL", color: "#c7a3ef" },
  { id: "peat", title: "Peatland", detail: "Peta ekosistem gambut", env: "VITE_PEATLAND_TILE_URL", color: "#b58a67" },
  { id: "mangrove", title: "Mangroves", detail: "Peta ekosistem mangrove", env: "VITE_MANGROVE_TILE_URL", color: "#46b7b1" },
  { id: "protected", title: "Protected areas", detail: "Kawasan konservasi", env: "VITE_PROTECTED_AREAS_TILE_URL", color: "#8ca5e8" },
];
const OPTIONAL_URLS = Object.fromEntries(OPTIONAL_LAYERS.map((x) => [x.id, import.meta.env[x.env] || ""]));

const Icon = ({ name, size = 17 }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    menu: <><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>, search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    locate: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></>,
    flame: <path d="M12 22c4 0 7-2.8 7-6.7 0-3.1-1.8-5.3-4.6-8.3-.1 2.2-1.1 3.4-2.2 4.2C12 7.4 10.6 4.7 8 2 8.2 6 5 9.1 5 14.8 5 19 7.8 22 12 22Z"/>,
    tree: <><path d="M12 22v-5"/><path d="m12 2 5 7h-3l4 5H6l4-5H7l5-7Z"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    wind: <><path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h7"/></>,
    chart: <><path d="M3 3v18h18"/><path d="M8 17v-4m5 4V6m5 11V9"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    satellite: <><path d="m4 4 5 5m6 6 5 5M8 3l4 4m5 5 4 4M3 8l4-4m10 13 4-4"/><rect x="8" y="8" width="8" height="8" rx="2"/></>,
    rain: <><path d="M20 16.2A4.8 4.8 0 0 0 18 7h-1.2A6 6 0 1 0 5 14"/><path d="m8 16-1 3m6-3-1 3m6-3-1 3"/></>,
    sprout: <><path d="M12 21v-9"/><path d="M12 12C5 12 4 7 4 4c5 0 8 2 8 8Zm0 2c0-5 3-8 8-8 0 4-1 8-8 8Z"/></>,
  };
  return <svg {...common}>{paths[name] || paths.layers}</svg>;
};

function makeFireIcon(level = "nominal") {
  const color = level === "high" ? "#ff5148" : level === "low" ? "#35c982" : "#f3bd36";
  return L.divIcon({
    html: `<div class="hotspot-pin"><span class="hotspot-pulse" style="--hotspot:${color}"></span><span class="hotspot-core" style="--hotspot:${color}">🔥</span></div>`,
    className: "hotspot-div-icon", iconSize: [34, 34], iconAnchor: [17, 17],
  });
}
const FIRE_ICONS = { high: makeFireIcon("high"), nominal: makeFireIcon("nominal"), low: makeFireIcon("low") };

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom || 9, { duration: 1.1 }); }, [center, zoom, map]);
  return null;
}
function MapCenterTracker({ onChange }) {
  const map = useMap();
  useEffect(() => {
    const update = () => { const c = map.getCenter(); onChange([c.lat, c.lng]); };
    map.on("moveend", update); update();
    return () => map.off("moveend", update);
  }, [map, onChange]);
  return null;
}
function ZoomControl() {
  const map = useMap();
  return <div className="map-zoom-control"><button aria-label="Perbesar peta" onClick={() => map.zoomIn()}>+</button><span/><button aria-label="Perkecil peta" onClick={() => map.zoomOut()}>−</button></div>;
}
function WindyLayer() {
  const map = useMap();
  useEffect(() => {
    let layer; let cancelled = false;
    fetch("https://onaci.github.io/leaflet-velocity/wind-global.json").then((r) => { if (!r.ok) throw new Error("Wind unavailable"); return r.json(); }).then((data) => {
      if (cancelled || !L.velocityLayer) return;
      layer = L.velocityLayer({ displayValues: false, data, maxVelocity: 10, velocityScale: 0.005, colorScale: ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"], opacity: 0.55 });
      layer.addTo(map);
    }).catch((e) => console.warn("Wind layer:", e));
    return () => { cancelled = true; if (layer && map.hasLayer(layer)) map.removeLayer(layer); };
  }, [map]);
  return null;
}
function RainRadarLayer({ enabled }) {
  const [tile, setTile] = useState("");
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(RAINVIEWER_META, { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error("Radar metadata unavailable"); return r.json(); }).then((data) => {
      const frames = data?.radar?.past || [];
      const frame = frames[frames.length - 1];
      if (!frame?.path || !data?.host) throw new Error("Frame radar tidak tersedia");
      setTile(`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`);
    }).catch((e) => { if (e.name !== "AbortError") console.warn("RainViewer radar:", e); });
    return () => controller.abort();
  }, [enabled]);
  if (!enabled || !tile) return null;
  return <TileLayer url={tile} opacity={0.62} zIndex={450} attribution='Radar © <a href="https://www.rainviewer.com/">RainViewer</a>' />;
}
function LoadingScreen() {
  const [step, setStep] = useState(0);
  const steps = ["Menghubungkan citra satelit", "Menyiapkan layer geospasial", "Mengambil data hotspot", "Menyusun tampilan peta"];
  useEffect(() => { const id = setInterval(() => setStep((v) => Math.min(v + 1, steps.length - 1)), 480); return () => clearInterval(id); }, []);
  return <div className="loading-screen"><div className="loading-mark"><Icon name="satellite" size={27}/><span/></div><div className="loading-title">KARTHUTLALAND</div><p>{steps[step]}<i className="loading-dots">...</i></p><div className="loading-track"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }}/></div><small>ENVIRONMENTAL INTELLIGENCE · INDONESIA</small></div>;
}
function parseCsv(csv) {
  const lines = csv.replace(/\r/g, "").trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((x) => x.trim().toLowerCase());
  const idx = (name, fallback) => { const i = headers.indexOf(name); return i >= 0 ? i : fallback; };
  const latI = idx("latitude", 0), lonI = idx("longitude", 1), brightI = idx("bright_ti4", 2), dateI = idx("acq_date", 5), timeI = idx("acq_time", 6), confI = idx("confidence", 9), frpI = idx("frp", 11), dayI = idx("daynight", 13);
  return lines.slice(1).map((line, i) => {
    const c = line.split(",").map((x) => x.trim()); const lat = Number(c[latI]), lon = Number(c[lonI]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const raw = String(c[confI] || "nominal").toLowerCase();
    const confidence = raw === "h" || raw === "high" ? "high" : raw === "l" || raw === "low" ? "low" : "nominal";
    return { id: `${lat}-${lon}-${c[dateI]}-${c[timeI]}-${i}`, lat, lon, brightness: Number(c[brightI]) || 0, frp: Number(c[frpI]) || 0, date: c[dateI] || "—", time: c[timeI] || "—", confidence, daynight: c[dayI] || "—" };
  }).filter(Boolean);
}
const weatherText = (code) => {
  if (code === 0) return "Cerah"; if ([1, 2, 3].includes(code)) return "Berawan";
  if ([45, 48].includes(code)) return "Berkabut"; if ([51, 53, 55, 56, 57].includes(code)) return "Gerimis";
  if ([61, 63, 65, 66, 67].includes(code)) return "Hujan"; if ([71, 73, 75, 77].includes(code)) return "Salju";
  if ([80, 81, 82].includes(code)) return "Hujan deras"; if ([85, 86].includes(code)) return "Hujan salju";
  if ([95, 96, 99].includes(code)) return "Badai petir"; return "Tidak diketahui";
};

export default function App() {
  const [started, setStarted] = useState(false); const [booting, setBooting] = useState(false);
  const [fires, setFires] = useState([]); const [loading, setLoading] = useState(false); const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState(null); const [envInfo, setEnvInfo] = useState(null); const [envLoading, setEnvLoading] = useState(false);
  const [currentCenter, setCurrentCenter] = useState(CENTER); const [mapCenter, setMapCenter] = useState(null); const [mapZoom, setMapZoom] = useState(5);
  const [menuOpen, setMenuOpen] = useState(false); const [searchOpen, setSearchOpen] = useState(false); const [search, setSearch] = useState(""); const [searchLoading, setSearchLoading] = useState(false);
  const [days, setDays] = useState("1"); const [refreshKey, setRefreshKey] = useState(0); const [highConfOnly, setHighConfOnly] = useState(false); const [nightOnly, setNightOnly] = useState(false);
  const [baseMap, setBaseMap] = useState("esri"); const [layers, setLayers] = useState({ loss: false, rain: false, wind: false });
  const [weatherError, setWeatherError] = useState("");
  const searchRef = useRef(null);
  const toggleLayer = (id) => setLayers((v) => ({ ...v, [id]: !v[id] }));
  const configuredOptional = useMemo(() => OPTIONAL_LAYERS.filter((x) => OPTIONAL_URLS[x.id]), []);

  const startMonitoring = () => { setBooting(true); window.setTimeout(() => { setStarted(true); setBooting(false); }, 1250); };
  useEffect(() => {
    if (!started) return; const controller = new AbortController(); setLoading(true); setLoadError("");
    fetch(`/api/hotspots?days=${days}&t=${Date.now()}`, { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error(`Hotspot API ${r.status}`); return r.text(); }).then((csv) => setFires(parseCsv(csv))).catch((e) => { if (e.name !== "AbortError") { console.error(e); setLoadError("Data hotspot belum berhasil dimuat."); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, started, refreshKey]);

  const filteredFires = useMemo(() => fires.filter((f) => (!highConfOnly || f.confidence === "high") && (!nightOnly || f.daynight === "N")), [fires, highConfOnly, nightOnly]);
  const confidenceCounts = useMemo(() => ({ high: filteredFires.filter((f) => f.confidence === "high").length, nominal: filteredFires.filter((f) => f.confidence === "nominal").length, low: filteredFires.filter((f) => f.confidence === "low").length }), [filteredFires]);
  const chartData = useMemo(() => { const counts = {}; fires.forEach((f) => { counts[f.date] = (counts[f.date] || 0) + 1; }); return Object.keys(counts).sort().slice(-7).map((date) => ({ label: date.slice(5), count: counts[date] })); }, [fires]);

  const fetchEnvironment = useCallback(async (lat, lon) => {
    setEnvLoading(true); setEnvInfo(null); setWeatherError(""); setSelected(null); setMenuOpen(false);
    try {
      const params = `latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,wind_speed_10m,wind_direction_10m&hourly=precipitation_probability,precipitation,rain,weather_code&forecast_days=2&timezone=auto`;
      const [wr, ar] = await Promise.all([fetch(`${WEATHER_API}?${params}`), fetch(`${AIR_API}?latitude=${lat}&longitude=${lon}&current=pm2_5`)]);
      if (!wr.ok) throw new Error(`Weather API ${wr.status}`); const w = await wr.json(); const a = ar.ok ? await ar.json() : null;
      const current = w.current || {}; const pm = a?.current?.pm2_5 ?? null;
      const hourly = (w.hourly?.time || []).slice(0, 6).map((time, i) => ({ time: new Date(time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }), rain: Number(w.hourly?.precipitation?.[i] || 0), probability: Number(w.hourly?.precipitation_probability?.[i] || 0), code: w.hourly?.weather_code?.[i] }));
      setEnvInfo({ lat: lat.toFixed(3), lon: lon.toFixed(3), temp: current.temperature_2m, humidity: current.relative_humidity_2m, precipitation: current.precipitation, rain: current.rain, showers: current.showers, weather: weatherText(current.weather_code), speed: current.wind_speed_10m, direction: current.wind_direction_10m, pm25: pm, airLabel: pm == null ? "Tidak tersedia" : pm <= 12 ? "Baik" : pm <= 35.4 ? "Sedang" : pm <= 55.4 ? "Tidak sehat" : "Sangat tidak sehat", hourly, sourceTime: current.time, timezone: w.timezone });
    } catch (e) { console.error(e); setWeatherError("Data cuaca tidak berhasil dimuat untuk titik ini."); }
    finally { setEnvLoading(false); }
  }, []);
  const handleFireClick = async (fire) => { setEnvInfo(null); setSelected(fire); setMenuOpen(false); };
  const closePanels = () => { setSelected(null); setEnvInfo(null); setWeatherError(""); };
  const handleLocate = () => {
    if (!navigator.geolocation) return window.alert("Browser tidak mendukung geolokasi.");
    navigator.geolocation.getCurrentPosition((p) => { setMapCenter([p.coords.latitude, p.coords.longitude]); setMapZoom(11); }, () => window.alert("Lokasi tidak berhasil dideteksi. Periksa izin GPS.")); setMenuOpen(false);
  };
  const handleSearch = async (e) => {
    e.preventDefault(); if (!search.trim()) return; setSearchLoading(true);
    try { const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`); if (!r.ok) throw new Error("Search failed"); const d = await r.json(); if (d?.length) { setMapCenter([Number(d[0].lat), Number(d[0].lon)]); setMapZoom(10); setSearchOpen(false); setSearch(""); } else window.alert("Wilayah tidak ditemukan."); }
    catch { window.alert("Pencarian lokasi gagal. Coba lagi."); } finally { setSearchLoading(false); }
  };
  const toggleSearch = () => { setSearchOpen(true); setMenuOpen(false); window.setTimeout(() => searchRef.current?.focus(), 50); };
  const enabledConfigured = configuredOptional.filter((x) => layers[x.id]);

  return <main className="app-shell">
    <MapContainer center={CENTER} zoom={5} minZoom={3} maxZoom={18} className="map" zoomControl={false} attributionControl preferCanvas>
      <TileLayer key={baseMap} url={baseMap === "sentinel" ? EOX_SENTINEL : ESRI_IMAGERY} attribution={baseMap === "sentinel" ? "Contains modified Copernicus Sentinel data 2024 · EOX" : "Tiles © Esri — Sources: Esri, Maxar, Earthstar Geographics"} maxZoom={baseMap === "sentinel" ? 14 : 19}/>
      <TileLayer url={ESRI_LABELS} attribution="Labels & boundaries © Esri" opacity={0.8} maxZoom={19}/>
      {started && layers.loss && <TileLayer url={GFW_TREE_LOSS} opacity={0.78} zIndex={410} attribution='Tree cover loss © <a href="https://www.globalforestwatch.org/">Global Forest Watch</a> / University of Maryland'/>}
      {started && enabledConfigured.map((layer) => <TileLayer key={layer.id} url={OPTIONAL_URLS[layer.id]} opacity={0.72} zIndex={420} attribution={`${layer.title} · configured external dataset`}/>)}
      {started && layers.wind && <WindyLayer/>}
      {started && <RainRadarLayer enabled={layers.rain} />}
      <MapController center={mapCenter} zoom={mapZoom}/><MapCenterTracker onChange={setCurrentCenter}/>
      {started && <MarkerClusterGroup chunkedLoading maxClusterRadius={42} spiderfyOnMaxZoom showCoverageOnHover={false}>{filteredFires.map((f) => <Marker key={f.id} position={[f.lat, f.lon]} icon={FIRE_ICONS[f.confidence] || FIRE_ICONS.nominal} eventHandlers={{ click: () => handleFireClick(f) }}/>)}</MarkerClusterGroup>}
      {started && <ZoomControl/>}
    </MapContainer>
    {booting && <LoadingScreen/>}
    {!started && !booting && <section className="landing-screen"><div className="landing-topline"><div className="brand-lockup"><span className="brand-symbol"><Icon name="tree" size={19}/></span>KARTHUTLALAND</div><span className="system-status"><i/> ENVIRONMENTAL INTELLIGENCE</span></div><div className="landing-content"><div className="eyebrow"><span/> INDONESIA · EARTH OBSERVATION</div><h1>Melihat perubahan.<br/><em>Memahami dampaknya.</em></h1><p className="landing-description">Pemantauan hutan, kebakaran, perkebunan, cuaca, dan perubahan ekosistem berbasis data pengamatan bumi.</p><button className="start-button" onClick={startMonitoring}><span>BUKA PETA MONITORING</span><Icon name="arrow" size={18}/></button><div className="landing-meta"><span><i className="status-dot"/> SISTEM SIAP</span><span>FOREST · FIRE · PALM · WEATHER</span></div></div><div className="landing-bottom"><span>OBSERVASI BUMI INDONESIA</span><span>ENVIRONMENTAL INTELLIGENCE</span></div><div className="landing-shade"/></section>}
    {started && <>
      <header className="map-topbar"><div className="map-brand"><span className="brand-symbol"><Icon name="tree" size={17}/></span><span><b>KARTHUTLALAND</b><small>ENVIRONMENTAL INTELLIGENCE</small></span></div><div className="top-actions"><button className="icon-button" aria-label="Cari wilayah" onClick={toggleSearch}><Icon name="search"/></button><button className="icon-button" aria-label="Lokasi saya" onClick={handleLocate}><Icon name="locate"/></button><button className="icon-button" aria-label="Menu layer" onClick={() => setMenuOpen((v) => !v)}><Icon name={menuOpen ? "close" : "menu"}/></button></div></header>
      {searchOpen && <form className="search-panel" onSubmit={handleSearch}><Icon name="search"/><input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kabupaten, kota, atau wilayah..."/>{searchLoading ? <span className="search-wait">...</span> : <button type="button" onClick={() => setSearchOpen(false)}><Icon name="close" size={15}/></button>}</form>}
      {menuOpen && <aside className="control-panel"><div className="control-heading"><span>ENVIRONMENTAL LAYERS</span><button onClick={() => setMenuOpen(false)}><Icon name="close" size={15}/></button></div><button className="control-item" onClick={toggleSearch}><Icon name="search"/>Cari wilayah</button><button className="control-item" onClick={handleLocate}><Icon name="locate"/>Lokasi saya</button><button className="control-item" onClick={() => fetchEnvironment(currentCenter[0], currentCenter[1])}><Icon name="rain"/>Cek cuaca di tengah peta {envLoading ? "…" : ""}</button>
        <div className="control-separator"/><div className="control-label"><Icon name="layers" size={14}/> BASEMAP</div><div className="period-options basemap-options"><button className={baseMap === "esri" ? "active" : ""} onClick={() => setBaseMap("esri")}>Satellite</button><button className={baseMap === "sentinel" ? "active" : ""} onClick={() => setBaseMap("sentinel")}>Sentinel-2</button></div>
        <div className="control-label"><Icon name="flame" size={14}/> FIRE INTELLIGENCE</div><label className="switch-row"><span><b>NASA FIRMS hotspots</b><small>{loading ? "Memuat data…" : `${filteredFires.length.toLocaleString("id-ID")} titik pada filter aktif`}</small></span><input type="checkbox" checked readOnly/></label><label className="switch-row"><span><b>Confidence tinggi saja</b><small>Saring confidence high</small></span><input type="checkbox" checked={highConfOnly} onChange={(e) => setHighConfOnly(e.target.checked)}/></label><label className="switch-row"><span><b>Deteksi malam</b><small>Acquisition malam hari</small></span><input type="checkbox" checked={nightOnly} onChange={(e) => setNightOnly(e.target.checked)}/></label>
        <div className="control-label"><Icon name="tree" size={14}/> FOREST & DEFORESTATION</div><label className="switch-row"><span><b>Tree cover loss</b><small>UMD / Global Forest Watch · 2001–2025</small></span><input type="checkbox" checked={layers.loss} onChange={() => toggleLayer("loss")}/></label>
        {OPTIONAL_LAYERS.slice(0, 3).map((x) => <label className={`switch-row ${!OPTIONAL_URLS[x.id] ? "is-disabled" : ""}`} key={x.id}><span><b>{x.title}</b><small>{OPTIONAL_URLS[x.id] ? x.detail : `Belum dikonfigurasi: ${x.env}`}</small></span><input type="checkbox" disabled={!OPTIONAL_URLS[x.id]} checked={!!layers[x.id]} onChange={() => toggleLayer(x.id)}/></label>)}
        <div className="control-label"><Icon name="sprout" size={14}/> PALM WATCH</div>{OPTIONAL_LAYERS.slice(3, 5).map((x) => <label className={`switch-row ${!OPTIONAL_URLS[x.id] ? "is-disabled" : ""}`} key={x.id}><span><b>{x.title}</b><small>{OPTIONAL_URLS[x.id] ? x.detail : `Belum dikonfigurasi: ${x.env}`}</small></span><input type="checkbox" disabled={!OPTIONAL_URLS[x.id]} checked={!!layers[x.id]} onChange={() => toggleLayer(x.id)}/></label>)}
        <div className="control-label"><Icon name="tree" size={14}/> ECOSYSTEM MONITORING</div>{OPTIONAL_LAYERS.slice(5).map((x) => <label className={`switch-row ${!OPTIONAL_URLS[x.id] ? "is-disabled" : ""}`} key={x.id}><span><b>{x.title}</b><small>{OPTIONAL_URLS[x.id] ? x.detail : `Belum dikonfigurasi: ${x.env}`}</small></span><input type="checkbox" disabled={!OPTIONAL_URLS[x.id]} checked={!!layers[x.id]} onChange={() => toggleLayer(x.id)}/></label>)}
        <div className="control-label"><Icon name="rain" size={14}/> WEATHER INTELLIGENCE</div><label className="switch-row"><span><b>Rain radar</b><small>RainViewer · frame radar terbaru</small></span><input type="checkbox" checked={layers.rain} onChange={() => toggleLayer("rain")}/></label><label className="switch-row"><span><b>Wind field</b><small>Visualisasi arah angin</small></span><input type="checkbox" checked={layers.wind} onChange={() => toggleLayer("wind")}/></label><p className="basemap-note">Curah hujan dan prakiraan dibaca dari Open-Meteo untuk titik yang dipilih. Radar hanya tersedia pada cakupan dan frame yang disediakan RainViewer.</p>
        <div className="control-label"><Icon name="clock" size={14}/> RENTANG HOTSPOT</div><div className="period-options">{["1", "2", "3", "5", "7"].map((d) => <button key={d} className={days === d ? "active" : ""} onClick={() => setDays(d)}>{d}H</button>)}</div>
      </aside>}
      <div className="map-status"><span className="live-indicator"><i/> DATA MONITORING</span><span>INDONESIA · {days} HARI</span></div>
      {!selected && !envInfo && <div className="map-legend"><div className="legend-title">PETA LINGKUNGAN</div><div><i className="legend-dot high"/>Hotspot confidence tinggi</div><div><i className="legend-dot nominal"/>Hotspot nominal</div><div><i className="legend-square loss"/>Tree cover loss</div><div className="legend-divider"/><div className="legend-note">Layer tematik lain aktif jika sumber tile dikonfigurasi.</div></div>}
      {!selected && !envInfo && <div className="map-summary"><div className="summary-number">{loading ? "—" : filteredFires.length.toLocaleString("id-ID")}</div><div className="summary-copy"><b>HOTSPOT TERDETEKSI</b><small>{loading ? "Memuat NASA FIRMS…" : loadError || "Jumlah sesuai filter aktif"}</small></div><div className="summary-divider"/><div className="summary-mini"><b>{confidenceCounts.high.toLocaleString("id-ID")}</b><small>HIGH</small></div></div>}
      {loadError && <div className="map-error">{loadError} <button onClick={() => setRefreshKey((v) => v + 1)}>Coba lagi</button></div>}
      {selected && <section className="detail-card"><div className="detail-heading"><div><span className="detail-kicker">NASA FIRMS · VIIRS</span><h3>Detail hotspot</h3></div><button onClick={closePanels}><Icon name="close"/></button></div><div className="detail-grid"><div><small>KOORDINAT</small><b>{selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}</b></div><div><small>CONFIDENCE</small><b className={`confidence-${selected.confidence}`}>{selected.confidence.toUpperCase()}</b></div><div><small>BRIGHTNESS</small><b>{selected.brightness || "—"} K</b></div><div><small>FIRE RADIATIVE POWER</small><b>{selected.frp || "—"} MW</b></div><div><small>TANGGAL</small><b>{selected.date}</b></div><div><small>WAKTU UTC</small><b>{String(selected.time).padStart(4, "0").replace(/(\d{2})(\d{2})/, "$1:$2")}</b></div></div><button className="detail-action" onClick={() => fetchEnvironment(selected.lat, selected.lon)}>Analisis cuaca & kualitas udara <Icon name="arrow" size={15}/></button></section>}
      {envInfo && <section className="detail-card weather-detail"><div className="detail-heading"><div><span className="detail-kicker">OPEN-METEO · MODEL CUACA</span><h3>Kondisi lingkungan</h3></div><button onClick={closePanels}><Icon name="close"/></button></div><div className="weather-current"><strong>{envInfo.weather}</strong><span>{envInfo.temp ?? "—"}°C</span></div><div className="detail-grid"><div><small>KOORDINAT</small><b>{envInfo.lat}, {envInfo.lon}</b></div><div><small>KELEMBAPAN</small><b>{envInfo.humidity ?? "—"}%</b></div><div><small>HUJAN SAAT INI</small><b>{envInfo.rain ?? 0} mm</b></div><div><small>PRESIPITASI</small><b>{envInfo.precipitation ?? 0} mm</b></div><div><small>ANGIN</small><b>{envInfo.speed ?? "—"} km/j · {envInfo.direction ?? "—"}°</b></div><div><small>PM2.5</small><b>{envInfo.pm25 == null ? "—" : `${envInfo.pm25} μg/m³`} · {envInfo.airLabel}</b></div></div><div className="forecast-heading">PRAKIRAAN 6 JAM BERIKUTNYA</div><div className="forecast-strip">{envInfo.hourly.map((h) => <div className="forecast-hour" key={h.time}><small>{h.time}</small><b>{h.probability}%</b><span>{h.rain.toFixed(1)} mm</span></div>)}</div><p className="basemap-note">Waktu data: {envInfo.sourceTime || "—"} · {envInfo.timezone || "waktu lokal"}. Prakiraan model, bukan pengukuran stasiun di titik tersebut.</p></section>}
      {weatherError && <div className="map-error">{weatherError}</div>}
      <div className="map-attribution-note">Citra satelit, alert, konsesi, dan klasifikasi lahan memiliki resolusi serta tanggal berbeda.</div>
    </>}
  </main>;
}
