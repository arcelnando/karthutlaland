import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AttributionControl, MapContainer, ScaleControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-velocity/dist/leaflet-velocity.css";
import "./App.css";
import Icon from "./components/Icon";
import Sidebar, { StatusDot } from "./components/Sidebar";
import { HotspotCard, PointCard } from "./components/Cards";
import { AboutPanel, DataPanel } from "./components/InfoPanels";
import {
  HotspotLayer, MapController, MapEvents, PointMarker,
  RainRadarLayer, SourceTileLayer, StatusBar, WindLayer,
  ZoomControl, ApiVectorLayer, MapBoundsTracker
} from "./components/MapParts";
import { BASEMAPS, CENTER, GFW_LOSS, LABELS, MAP_MAX_ZOOM, MAP_MIN_ZOOM, OPTIONAL_LAYERS } from "./config/mapConfig";
import { CONF_RANK, MIN_CONF_RANK, dailyCounts, latestAcquisition, parseCsv } from "./lib/firms";
import { fmtUtc } from "./lib/format";
import { fetchPointEnvironment } from "./lib/weather";

const BASEMAP_IDS = Object.keys(BASEMAPS);
const isMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 759px)").matches;

// Tambahin radd & peat di state awal
const INITIAL_LAYERS = { hotspots: true, loss: false, rain: false, wind: false, radd: false, peat: false, ...Object.fromEntries(OPTIONAL_LAYERS.map((x) => [x.id, false])) };
const INITIAL_OPACITY = { loss: 0.8, rain: 0.65, ...Object.fromEntries(OPTIONAL_LAYERS.map((x) => [x.id, 0.75])) };

function Legend({ layers, open, onToggle }) {
  const active = OPTIONAL_LAYERS.filter((x) => x.url && layers[x.id]);
  return (
    <div className="map-legend">
      <button className="legend-toggle" onClick={onToggle} aria-expanded={open}><Icon name="list" size={15} />LEGENDA</button>
      {open && (
        <div className="legend-body">
          {layers.hotspots && <>
            <div className="legend-row"><i className="swatch round hs-high" />Hotspot confidence high</div>
            <div className="legend-row"><i className="swatch round hs-nominal" />Hotspot confidence nominal</div>
            <div className="legend-row"><i className="swatch round hs-low" />Hotspot confidence low</div>
          </>}
          {layers.loss && <div className="legend-row"><i className="swatch" style={{ background: GFW_LOSS.color }} />Tree cover loss (2001-2025)</div>}
          {active.map((x) => <div className="legend-row" key={x.id}><i className="swatch" style={{ background: x.color }} />{x.title}</div>)}
          {layers.radd && <div className="legend-row"><i className="swatch" style={{ background: "#e3703a" }} />RADD Alerts</div>}
          {layers.peat && <div className="legend-row"><i className="swatch" style={{ background: "#a1785a" }} />Peatland</div>}
          {layers.rain && <div className="legend-row">Radar: intensitas naik sesuai skema warna RainViewer</div>}
          {layers.wind && <div className="legend-row">Partikel angin: lebih terang = lebih kencang (model)</div>}
          <div className="legend-note">Layer tematik lain tampil bila sumber tile dikonfigurasi. Lihat Sumber & status data.</div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(() => !isMobile());
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const [days, setDays] = useState("1");
  const [minConf, setMinConf] = useState("all");
  const [nightOnly, setNightOnly] = useState(false);
  const [baseMap, setBaseMap] = useState("esri");
  const [showLabels, setShowLabels] = useState(true);
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [opacity, setOpacityState] = useState(INITIAL_OPACITY);
  const [layerStatus, setLayerStatus] = useState({});

  const [fires, setFires] = useState([]);
  const [fireState, setFireState] = useState({ status: "idle", error: "", fetchedAt: null });
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState(null);
  const [point, setPoint] = useState(null);
  const [env, setEnv] = useState({ status: "idle" });
  const [view, setView] = useState(null);
  
  // State buat nyimpen string bbox (buat API proxy)
  const [bbox, setBbox] = useState(null);

  const centerRef = useRef(CENTER);
  const searchRef = useRef(null);
  const envAbort = useRef(null);

  const toggleLayer = useCallback((id) => setLayers((v) => ({ ...v, [id]: !v[id] })), []);
  const setOpacity = useCallback((id, value) => setOpacityState((v) => ({ ...v, [id]: value })), []);
  const reportStatus = useCallback((id, status) => setLayerStatus((v) => ({ ...v, [id]: status })), []);
  const flyTo = useCallback((center, zoom) => setView({ center, zoom, n: Date.now() }), []);

  useEffect(() => {
    if (!started) return undefined;
    const controller = new AbortController();
    setFireState((s) => ({ ...s, status: "loading", error: "" }));
    fetch(`/api/hotspots?days=${days}&t=${Date.now()}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`Hotspot API ${r.status}`); return r.text(); })
      .then((csv) => { setFires(parseCsv(csv)); setFireState({ status: "ok", error: "", fetchedAt: Date.now() }); })
      .catch((e) => { if (e.name !== "AbortError") { console.error(e); setFireState((s) => ({ ...s, status: "error", error: "Data hotspot belum berhasil dimuat." })); } });
    return () => controller.abort();
  }, [days, started, refreshKey]);

  const filteredFires = useMemo(() => {
    const rank = MIN_CONF_RANK[minConf];
    return fires.filter((f) => CONF_RANK[f.confidence] >= rank && (!nightOnly || f.daynight === "N"));
  }, [fires, minConf, nightOnly]);
  const highCount = useMemo(() => filteredFires.filter((f) => f.confidence === "high").length, [filteredFires]);
  const daily = useMemo(() => dailyCounts(filteredFires), [filteredFires]);
  const latestMs = useMemo(() => latestAcquisition(fires), [fires]);

  const loading = fireState.status === "loading";
  const fireInfo = useMemo(() => ({ loading, error: fireState.status === "error" ? fireState.error : "", count: filteredFires.length, high: highCount, latest: fmtUtc(latestMs) }), [loading, fireState.status, fireState.error, filteredFires.length, highCount, latestMs]);

  const closePanels = useCallback(() => { envAbort.current?.abort(); setSelected(null); setPoint(null); setEnv({ status: "idle" }); }, []);
  const selectFire = useCallback((f) => { envAbort.current?.abort(); setPoint(null); setEnv({ status: "idle" }); setSelected(f); if (isMobile()) setMenuOpen(false); }, []);
  const openPoint = useCallback((lat, lon) => {
    envAbort.current?.abort();
    const controller = new AbortController();
    envAbort.current = controller;
    setSelected(null); setPoint({ lat, lon }); setEnv({ status: "loading" });
    if (isMobile()) setMenuOpen(false);
    fetchPointEnvironment(lat, lon, controller.signal)
      .then((data) => setEnv({ status: "ok", data }))
      .catch((e) => { if (e.name !== "AbortError") { console.error(e); setEnv({ status: "error" }); } });
  }, []);

  const toggleSearch = () => { setSearchOpen((v) => !v); setMenuOpen(false); window.setTimeout(() => searchRef.current?.focus(), 50); };
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearchLoading(true); setNotice("");
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`);
      if (!r.ok) throw new Error("Search failed");
      const d = await r.json();
      if (d?.length) { flyTo([Number(d[0].lat), Number(d[0].lon)], 10); setSearchOpen(false); setSearch(""); } else setNotice("Wilayah tidak ditemukan.");
    } catch { setNotice("Pencarian lokasi gagal. Coba lagi."); } finally { setSearchLoading(false); }
  };
  const handleLocate = () => {
    setMenuOpen(false);
    if (!navigator.geolocation) { setNotice("Browser tidak mendukung geolokasi."); return; }
    navigator.geolocation.getCurrentPosition((p) => { setNotice(""); flyTo([p.coords.latitude, p.coords.longitude], 11); }, () => setNotice("Lokasi tidak berhasil dideteksi. Periksa izin GPS."));
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (modal) setModal(null); else if (searchOpen) setSearchOpen(false); else if (menuOpen) setMenuOpen(false); else closePanels();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, searchOpen, menuOpen, closePanels]);

  const moduleStatus = useMemo(() => {
    const s = {};
    BASEMAP_IDS.forEach((id) => { s[id] = baseMap === id ? { state: "ok", label: "Aktif", note: "Citra statis; lihat keterangan Pembaruan" } : { state: "off" }; });
    s.hotspots = fireState.status === "error" ? { state: "error", note: fireState.error }
      : loading ? { state: "loading" }
      : fireState.status === "ok" ? { state: "ok", timestamp: latestMs, note: fires.length ? "Tidak ada timestamp valid pada data" : "Tidak ada hotspot pada rentang ini", label: `Tersedia · diambil ${fmtUtc(fireState.fetchedAt)}` } : { state: "off" };
    s.loss = layers.loss ? { state: "ok", label: "Aktif", note: "Dataset tahunan, tanpa timestamp harian" } : { state: "off" };
    OPTIONAL_LAYERS.forEach((x) => { s[x.id] = !x.url ? { state: "unconfigured", note: `Set ${x.env} untuk mengaktifkan` } : layers[x.id] ? { state: "ok", label: "Aktif", note: "Timestamp mengikuti penyedia data" } : { state: "off", note: "Dikonfigurasi, belum diaktifkan" }; });
    s.radd = { state: layers.radd ? "ok" : "off", note: "Data vektor via API" };
    s.peat = { state: layers.peat ? "ok" : "off", note: "Data vektor via API" };
    s.rain = layerStatus.rain || { state: "off" };
    s.wind = layerStatus.wind || { state: "off" };
    s.point = env.status === "ok" ? { state: "ok", note: `Data model ${env.data.sourceTime || "—"} (${env.data.timezone || "waktu lokal"})`, label: "Tersedia" } : env.status === "loading" ? { state: "loading" } : env.status === "error" ? { state: "error" } : { state: "off", note: "Klik peta untuk memilih koordinat" };
    return s;
  }, [baseMap, fireState, loading, latestMs, fires.length, layers, layerStatus, env]);

  const activeOptional = OPTIONAL_LAYERS.filter((x) => x.url && layers[x.id]);
  const basemap = BASEMAPS[baseMap];
  const hotspotChip = fireState.status === "error" ? "error" : loading ? "loading" : "ok";

  return (
    <main className={`app-shell${started ? " is-started" : ""}`}>
      <header className={`topbar${searchOpen ? " search-open" : ""}`}>
        <button className="brand" onClick={() => setModal("about")} aria-label="About Karthutlaland" tabIndex={started ? 0 : -1}>
          <span className="brand-symbol"><Icon name="tree" size={17} /></span>
          <span className="brand-text"><b>KARTHUTLALAND</b><small>ENVIRONMENTAL INTELLIGENCE</small></span>
        </button>
        {searchOpen && (
          <form className="search-form" onSubmit={handleSearch}>
            <Icon name="search" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kabupaten, kota, atau wilayah" aria-label="Cari wilayah" />
            {searchLoading && <span className="search-wait">Mencari…</span>}
          </form>
        )}
        {started && (
          <div className="top-actions">
            <span className="chip" title="Status data hotspot"><StatusDot state={hotspotChip} />{days} HARI</span>
            <button className="icon-button" aria-label="Cari wilayah" aria-pressed={searchOpen} onClick={toggleSearch}><Icon name={searchOpen ? "close" : "search"} /></button>
            <button className="icon-button" aria-label="Lokasi saya" onClick={handleLocate}><Icon name="locate" /></button>
            <button className="icon-button" aria-label="Sumber dan status data" onClick={() => setModal("data")}><Icon name="database" /></button>
            <button className="icon-button" aria-label="Layer dan kontrol" aria-expanded={menuOpen} aria-pressed={menuOpen} onClick={() => setMenuOpen((v) => !v)}><Icon name={menuOpen ? "close" : "layers"} /></button>
          </div>
        )}
      </header>

      <div className={`map-area${menuOpen ? " sidebar-open" : ""}`}>
        <MapContainer center={CENTER} zoom={5} minZoom={MAP_MIN_ZOOM} maxZoom={MAP_MAX_ZOOM} className="map" zoomControl={false} attributionControl={false} preferCanvas bounceAtZoomLimits={false}>
          
          <SourceTileLayer key={baseMap} src={basemap} />
          {showLabels && <SourceTileLayer src={LABELS} opacity={0.8} zIndex={300} />}
          {started && layers.loss && <SourceTileLayer src={GFW_LOSS} opacity={opacity.loss} zIndex={410} />}
          {started && activeOptional.map((x) => <SourceTileLayer key={x.id} src={{ url: x.url, maxNativeZoom: x.maxNativeZoom, attribution: `${x.title}: sumber tile terkonfigurasi` }} opacity={opacity[x.id]} zIndex={420} />)}
          
          {/* RADD & Peatland API Layer */}
          {started && <MapBoundsTracker onChange={setBbox} />}
          {started && layers.radd && <ApiVectorLayer type="radd" enabled={true} bbox={bbox} color="#e3703a" />}
          {started && layers.peat && <ApiVectorLayer type="peat" enabled={true} bbox={bbox} color="#a1785a" />}

          {started && <RainRadarLayer enabled={layers.rain} opacity={opacity.rain} onStatus={reportStatus} />}
          {started && <WindLayer enabled={layers.wind} onStatus={reportStatus} />}
          {started && layers.hotspots && <HotspotLayer fires={filteredFires} onSelect={selectFire} />}
          
          <MapController target={view} />
          <MapEvents onPick={openPoint} centerRef={centerRef} />
          <PointMarker point={point} />
          
          <AttributionControl position="bottomright" prefix={false} />
          <ScaleControl position="bottomleft" imperial={false} />
          {started && <ZoomControl />}
          {started && <StatusBar info={fireInfo} />}
        </MapContainer>

        {started && <>
          {menuOpen && (
            <Sidebar
              onClose={() => setMenuOpen(false)} onOpenData={() => { setModal("data"); if (isMobile()) setMenuOpen(false); }} onOpenAbout={() => { setModal("about"); if (isMobile()) setMenuOpen(false); }}
              onCheckCenter={() => openPoint(centerRef.current[0], centerRef.current[1])}
              baseMap={baseMap} setBaseMap={setBaseMap} showLabels={showLabels} setShowLabels={setShowLabels}
              days={days} setDays={setDays} minConf={minConf} setMinConf={setMinConf} nightOnly={nightOnly} setNightOnly={setNightOnly}
              layers={layers} toggleLayer={toggleLayer} opacity={opacity} setOpacity={setOpacity} layerStatus={layerStatus}
              fire={fireInfo} daily={daily}
            />
          )}
          <Legend layers={layers} open={legendOpen} onToggle={() => setLegendOpen((v) => !v)} />
          {(fireState.status === "error" || notice) && (
            <div className="notice" role="status">
              <Icon name="alert" size={15} />
              <span>{fireState.status === "error" ? fireState.error : notice}</span>
              {fireState.status === "error" && <button onClick={() => setRefreshKey((v) => v + 1)}>Coba lagi</button>}
              {notice && <button aria-label="Tutup pesan" onClick={() => setNotice("")}><Icon name="close" size={14} /></button>}
            </div>
          )}
          {selected && <HotspotCard fire={selected} onClose={closePanels} onWeather={() => openPoint(selected.lat, selected.lon)} />}
          {point && <PointCard point={point} env={env} onClose={closePanels} onRetry={() => openPoint(point.lat, point.lon)} />}
        </>}
      </div>

      {modal === "about" && <AboutPanel onClose={() => setModal(null)} />}
      {modal === "data" && <DataPanel onClose={() => setModal(null)} status={moduleStatus} />}

      {!started && (
        <section className="landing-screen">
          <div className="landing-top"><span className="brand-lockup"><span className="brand-symbol"><Icon name="tree" size={18} /></span>KARTHUTLALAND</span><span className="landing-tag">ENVIRONMENTAL INTELLIGENCE · INDONESIA</span></div>
          <div className="landing-content">
            <div className="eyebrow">EARTH OBSERVATION · GEOSPATIAL MONITORING</div>
            <h1>Melihat perubahan.<br /><em>Memahami dampaknya.</em></h1>
            <p className="landing-description">Pemantauan hutan, kebakaran, perkebunan, cuaca, dan perubahan ekosistem berbasis data pengamatan bumi dan model.</p>
            <div className="landing-actions">
              <button className="start-button" onClick={() => setStarted(true)}><span>BUKA PETA MONITORING</span><Icon name="arrow" size={18} /></button>
              <button className="ghost-button" onClick={() => setModal("about")}><Icon name="info" size={16} />About</button>
            </div>
          </div>
          <div className="landing-bottom"><span>FOREST · FIRE · PALM · ECOSYSTEM · WEATHER</span><span>Bukan lembaga resmi pemerintah</span></div>
        </section>
      )}
    </main>
  );
}
