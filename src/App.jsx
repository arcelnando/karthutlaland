import { useEffect, useState, useMemo, useRef, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-velocity/dist/leaflet-velocity.css";
import "leaflet-velocity/dist/leaflet-velocity.js";
import "./App.css";

// --- SVG Icons ---
const IconTarget = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" /></svg>);
const IconThermo = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" /><path d="M12 9v6" /></svg>);
const IconClock = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></svg>);
const IconClose = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>);
const IconSearch = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
const IconWind = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg>);
const IconAir = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>);
const IconMenu = ({ size = 20 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>);
const IconRadar = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>);
const IconChart = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/></svg>);
const IconSmoke = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 14a4 4 0 1 1 7-2.6A4 4 0 0 1 18 14v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3Z"/><path d="M9 18v3M15 18v3"/></svg>);
const IconLocate = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>);
const IconMoon = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>);
const IconTree = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22v-5"/><path d="M9 7l3-5 3 5"/><path d="M10 12l2-5 2 5"/><path d="M7 17a5 5 0 0 1 0-10h.5"/><path d="M17 17a5 5 0 0 0 0-10h-.5"/></svg>);
const IconInfo = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>);
const IconTelegram = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 3.5 2.5 10.5l5.5 2 1.5 6 3-4 5 4 4-15z"/><path d="M8 12.5 18 7"/></svg>);

// --- CUSTOM SVG MARKER ---
const createFireIcon = (confidence) => {
  let color = "#ef4444"; 
  if (confidence === "low" || confidence === "l") color = "#22c55e";
  else if (confidence === "nominal" || confidence === "n") color = "#eab308";

  const svgHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1.2 3.2 3.6 4.8 3.6 8.2A3.6 3.6 0 0 1 12 13.8a3.6 3.6 0 0 1-3.6-3.6C8.4 6.8 10.8 5.2 12 2Z" /><path d="M12 13.8c-2.4 1.4-3.6 3.4-3.6 5.6A3.6 3.6 0 0 0 12 23a3.6 3.6 0 0 0 3.6-3.6c0-2.2-1.2-4.2-3.6-5.6Z" /></svg>`;
  return L.divIcon({ html: svgHtml, className: "custom-fire-icon", iconSize: [20, 20], iconAnchor: [10, 10] });
};

// --- WINDY LAYER ---
const WindyLayer = forwardRef((props, ref) => {
  const map = useMap();
  useEffect(() => {
    let velocityLayer;
    fetch("https://onaci.github.io/leaflet-velocity/wind-global.json")
      .then((res) => res.json())
      .then((data) => {
        velocityLayer = L.velocityLayer({
          displayValues: false, data: data, maxVelocity: 10, velocityScale: 0.005,
          colorScale: ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"], opacity: 0.8,
        });
        map.addLayer(velocityLayer);
      }).catch((err) => console.error(err));
    return () => { if (velocityLayer) map.removeLayer(velocityLayer); };
  }, [map]);
  return null;
});

function ZoomControl() {
  const map = useMap();
  return (
    <div className="zoom">
      <button onClick={() => map.zoomIn()}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></button>
      <span className="zoom-sep" />
      <button onClick={() => map.zoomOut()}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 12h14" /></svg></button>
    </div>
  );
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom || 9, { duration: 1.5 }); }, [center, zoom, map]);
  return null;
}

function MapCenterTracker({ onChange }) {
  const map = useMap();
  useEffect(() => {
    const handleMove = () => { const c = map.getCenter(); onChange([c.lat, c.lng]); };
    map.on('moveend', handleMove);
    return () => map.off('moveend', handleMove);
  }, [map, onChange]);
  return null;
}

const TrendChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const width = 260; const height = 60; const barWidth = width / data.length - 4;

  return (
    <div className="trend-chart">
      <div className="chart-header"><IconChart size={14} /> Tren 7 Hari</div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const barHeight = (d.count / maxVal) * height;
          const x = i * (width / data.length) + 2;
          const y = height - barHeight;
          return <rect key={i} x={x} y={y} width={barWidth} height={barHeight} fill="var(--accent)" rx="2" />;
        })}
      </svg>
      <div className="chart-labels">{data.map((d, i) => <span key={i}>{d.label}</span>)}</div>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="earth-warp"><div className="earth-sphere"></div></div>
    <p>Memetakan Anomali...</p>
  </div>
);

export default function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [fires, setFires] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [smokeDirection, setSmokeDirection] = useState(null);
  const [envInfo, setEnvInfo] = useState(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [currentCenter, setCurrentCenter] = useState([-2, 118]);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [mapCenter, setMapCenter] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [days, setDays] = useState("1");
  
  const [highConfOnly, setHighConfOnly] = useState(false);
  const [showSmokeLayer, setShowSmokeLayer] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [showForest, setShowForest] = useState(false);
  const [mapZoom, setMapZoom] = useState(5);

  // State Modal Info
  const [showInfoModal, setShowInfoModal] = useState(false);

  const searchInputRef = useRef(null);
  const cartoKey = import.meta.env.VITE_CARTO_KEY;

  const handleStart = () => {
    setIsLoadingMap(true);
    setTimeout(() => { setIsStarted(true); setIsLoadingMap(false); }, 2500);
  };

  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setMapCenter([pos.coords.latitude, pos.coords.longitude]); setMapZoom(12); },
        () => alert("Gagal mendeteksi lokasi. Pastikan GPS aktif.")
      );
    }
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!isStarted) return;
    fetch("https://firms.modaps.eosdis.nasa.gov/api/area/csv/" + import.meta.env.VITE_FIRMS_MAP_KEY + "/VIIRS_NOAA21_NRT/95,-11,141,6/7")
      .then(res => res.text())
      .then(csv => {
         const lines = csv.trim().split('\n');
         const counts = {};
         for (let i=1; i<lines.length; i++) {
             const date = lines[i].split(',')[5];
             counts[date] = (counts[date] || 0) + 1;
         }
         const last7 = Object.keys(counts).sort().slice(-7).map(date => ({ label: date.slice(5), count: counts[date] }));
         setChartData(last7);
      }).catch(console.error);
  }, [isStarted]);

  const fetchEnvironment = async (lat, lng) => {
    setEnvLoading(true); setEnvInfo(null); setSelected(null); setSmokeDirection(null); setMenuOpen(false);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5`)
      ]);
      const wData = await wRes.json(); const aData = await aRes.json();
      const getW = (c) => c===0?"Cerah":c<=3?"Berawan":c<=48?"Berkabut":c<=67?"Hujan":"Badai";
      const getA = (p) => p<=12?{l:"Baik",c:"#22c55e"}:p<=35.4?{l:"Sedang",c:"#eab308"}:p<=55.4?{l:"Tidak Sehat",c:"#f97316"}:{l:"Berbahaya",c:"#ef4444"};
      const pm = aData.current?.pm2_5 || 0; const aq = getA(pm);

      setEnvInfo({
        lat: lat.toFixed(3), lng: lng.toFixed(3),
        speed: wData.current.wind_speed_10m, direction: wData.current.wind_direction_10m,
        temp: wData.current.temperature_2m, weather: getW(wData.current.weather_code),
        pm25: pm, aqiLabel: aq.l, aqiColor: aq.c
      });
    } catch (err) { alert("Gagal memuat data cuaca."); } 
    finally { setEnvLoading(false); }
  };

  const handleFireClick = async (fire) => {
    setEnvInfo(null); setSelected(fire);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${fire.lat}&longitude=${fire.lon}&current=wind_direction_10m`);
      const data = await res.json();
      const windDir = data.current.wind_direction_10m;

      const distance = 0.45; // ~50km
      const rad = (windDir * Math.PI) / 180;
      const newLat = fire.lat + (distance * Math.cos(rad));
      const newLon = fire.lon + (distance * Math.sin(rad));

      setSmokeDirection([[fire.lat, fire.lon], [newLat, newLon]]);
    } catch (err) { console.error("Gagal ngitung asap", err); }
  };

  useEffect(() => {
    if (!isStarted) return;
    setLoading(true);
    const ts = new Date().getTime();
    fetch(`/api/hotspots?days=${days}&t=${ts}`)
      .then((res) => res.text())
      .then((csv) => {
        const lines = csv.replace(/\r/g, "").trim().split("\n");
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim());
          if (cols.length >= 14 && cols[0] !== "latitude") {
            const lat = parseFloat(cols[0]);
            const lon = parseFloat(cols[1]);
            const conf = cols[9] ? cols[9].toLowerCase() : "nominal";
            const daynight = cols[13]; 
            if (!isNaN(lat) && !isNaN(lon)) {
              data.push({ lat, lon, brightness: cols[2], date: cols[5], time: cols[6], confidence: conf, daynight });
            }
          }
        }
        setFires(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days, isStarted]);

  useEffect(() => { if (isSearching && searchInputRef.current) searchInputRef.current.focus(); }, [isSearching]);

  const handleSearch = async (e) => {
    e.preventDefault(); if (!search.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setMapZoom(9);
        setIsSearching(false); setSearch("");
      } else { alert("Lokasi tidak ditemukan"); }
    } catch (err) { alert("Gagal mencari lokasi"); } finally { setSearchLoading(false); }
  };

  const filteredFires = useMemo(() => {
    let result = fires;
    if (highConfOnly) result = result.filter(f => f.confidence === "high" || f.confidence === "h");
    if (nightMode) result = result.filter(f => f.daynight === "N");
    return result;
  }, [fires, highConfOnly, nightMode]);

  const stats = useMemo(() => {
    if (!filteredFires.length) return null;
    const avg = filteredFires.reduce((s, f) => s + (parseFloat(f.brightness) || 0), 0) / filteredFires.length;
    return { avg: avg.toFixed(1) };
  }, [filteredFires]);

  return (
    <div className="app">
      <MapContainer center={[-2, 118]} zoom={5} className="map" zoomControl={false} attributionControl={false}>
        <TileLayer url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`} />
        
        {showForest && isStarted && (
          <TileLayer url="https://tiles.globalforestwatch.org/wri_trees_in_mosaic_landscapes/v20220922/default/{z}/{x}/{y}.png" opacity={0.4} />
        )}

        {showSmokeLayer && isStarted && (
          <TileLayer url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2023-10-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg" opacity={0.5} />
        )}

        <MapController center={mapCenter} zoom={mapZoom} />
        <MapCenterTracker onChange={setCurrentCenter} />
        
        {isStarted && <WindyLayer />}
        
        {isStarted && (
          <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
            {filteredFires.map((fire, i) => (
              <Marker 
                key={i} 
                position={[fire.lat, fire.lon]} 
                icon={createFireIcon(fire.confidence)} 
                eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); handleFireClick(fire); } }} 
              />
            ))}
          </MarkerClusterGroup>
        )}

        {smokeDirection && (
          <Polyline positions={smokeDirection} pathOptions={{ color: '#ef4444', dashArray: '5, 10', weight: 2, opacity: 0.8 }} />
        )}
        
        {isStarted && <ZoomControl />}
      </MapContainer>

      {isLoadingMap && <LoadingScreen />}

      {!isStarted && !isLoadingMap && (
        <div className="landing-overlay">
          <div className="earth-bg">
             <div className="earth-sphere"></div>
          </div>
          <div className="landing-content">
            <h1>Karthutlaland</h1>
            <p>Sistem pemantauan anomali api, deforestasi, cuaca, dan kualitas udara Indonesia berbasis satelit.</p>
            <button className="start-btn" onClick={handleStart}>Mulai Pantau <IconSearch /></button>
          </div>
        </div>
      )}

      {isStarted && !isLoadingMap && (
        <>
          <div className="floating-header">
            <h1 className="brand" onClick={() => setIsStarted(false)}>Karthutlaland</h1>
            {!isSearching && (
              <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <IconClose /> : <IconMenu />}
              </button>
            )}
          </div>

          {isSearching && (
            <div className="floating-search">
              <form onSubmit={handleSearch} className="search-form">
                <IconSearch size={16} />
                <input ref={searchInputRef} type="text" placeholder="Cari wilayah..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {searchLoading ? <span className="loader">...</span> : <button type="button" className="close-btn" onClick={() => setIsSearching(false)}><IconClose size={14} /></button>}
              </form>
            </div>
          )}

          {menuOpen && !isSearching && (
            <div className="dropdown-menu">
              <button className="menu-item" onClick={() => { setIsSearching(true); setMenuOpen(false); }}>
                <IconSearch size={16} /> Cari Wilayah
              </button>
              <button className="menu-item" onClick={handleLocate}>
                <IconLocate size={16} /> Lokasi Saya
              </button>
              <button className="menu-item" onClick={() => fetchEnvironment(currentCenter[0], currentCenter[1])}>
                <IconRadar size={16} /> Cek Lingkungan {envLoading && "..."}
              </button>
              
              <div className="menu-divider"></div>
              
              <button className="menu-item" onClick={() => setHighConfOnly(!highConfOnly)}>
                <IconChart size={16} /> {highConfOnly ? "Tampilkan Semua Api" : "Filter Api Serius"}
              </button>
              <button className="menu-item" onClick={() => setNightMode(!nightMode)}>
                <IconMoon size={16} /> {nightMode ? "Matikan Mode Malam" : "Api Malam Hari"}
              </button>
              <button className="menu-item" onClick={() => setShowForest(!showForest)}>
                <IconTree size={16} /> {showForest ? "Sembunyikan Hutan" : "Lihat Area Hutan"}
              </button>
              <button className="menu-item" onClick={() => setShowSmokeLayer(!showSmokeLayer)}>
                <IconSmoke size={16} /> {showSmokeLayer ? "Sembunyikan Asap" : "Lihat Citra Asap"}
              </button>
              
              <div className="menu-divider"></div>
              
              <div className="menu-label"><IconClock size={14} /> Mundurin Data</div>
              <div className="time-filter-dropdown">
                {["1", "2", "3", "5"].map((d) => (
                  <button key={d} className={`time-btn ${days === d ? "active" : ""}`} onClick={() => { setDays(d); setMenuOpen(false); }}>{d}H</button>
                ))}
              </div>

              <div className="menu-divider"></div>

              <button className="menu-item" onClick={() => { setShowInfoModal(true); setMenuOpen(false); }}>
                <IconInfo size={16} /> Tentang Project
              </button>
              <a href="https://t.me/antidogma14" target="_blank" rel="noreferrer" className="menu-item" style={{textDecoration:'none'}}>
                <IconTelegram size={16} /> Hubungi Developer
              </a>
            </div>
          )}

          {/* Modal Info */}
          {showInfoModal && (
            <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="panel-head">
                  <span className="panel-title">Tentang Project</span>
                  <button className="close" onClick={() => setShowInfoModal(false)}><IconClose size={16} /></button>
                </div>
                <p className="modal-text">
                  Ini adalah project iseng yang dikembangkan oleh <strong>solo developer</strong> untuk memantau anomali api dan deforestasi di Indonesia secara near-real-time. Data diambil dari NASA FIRMS dan Open-Meteo.
                </p>
                <a href="https://t.me/antidogma14" target="_blank" rel="noreferrer" className="telegram-btn">
                  <IconTelegram size={18} /> Hubungi di Telegram (@antidogma14)
                </a>
              </div>
            </div>
          )}

          {!selected && !envInfo && (
            <div className="map-legend">
              <div className="legend-item"><span className="legend-dot" style={{background:"#22c55e"}}></span> Low</div>
              <div className="legend-item"><span className="legend-dot" style={{background:"#eab308"}}></span> Nominal</div>
              <div className="legend-item"><span className="legend-dot" style={{background:"#ef4444"}}></span> High</div>
            </div>
          )}

          {!selected && !envInfo && (
            <div className="floating-footer">
              {loading ? <span className="muted">Memuat data...</span> : filteredFires.length === 0 ? (
                <span className="muted">Tidak ada anomali api</span>
              ) : (
                <><span className="dot" /><span>{filteredFires.length.toLocaleString('id-ID')} Titik</span>{stats && <span className="divider">|</span>}{stats && <span className="suhu">{stats.avg} K</span>}</>
              )}
            </div>
          )}

          {envInfo && (
            <div className="floating-panel">
              <div className="panel-head">
                <span className="panel-title">Info Lingkungan</span>
                <button className="close" onClick={() => setEnvInfo(null)}><IconClose size={16} /></button>
              </div>
              <div className="row"><IconThermo /><span className="label">Cuaca</span><span className="value">{envInfo.temp}°C · {envInfo.weather}</span></div>
              <div className="row"><IconAir /><span className="label">PM2.5</span><span className="value" style={{ color: envInfo.aqiColor }}>{envInfo.pm25} μg/m³ ({envInfo.aqiLabel})</span></div>
              <div className="row"><IconWind /><span className="label">Angin</span><span className="value">{envInfo.speed} km/j · {envInfo.direction}°</span></div>
            </div>
          )}

          {selected && (
            <div className="floating-panel">
              <div className="panel-head">
                <span className="panel-title">Detail Anomali Api</span>
                <button className="close" onClick={() => { setSelected(null); setSmokeDirection(null); }}><IconClose size={16} /></button>
              </div>
              <div className="row"><IconTarget /><span className="label">Koordinat</span><span className="value">{selected.lat.toFixed(3)}, {selected.lon.toFixed(3)}</span></div>
              <div className="row"><IconThermo /><span className="label">Suhu</span><span className="value">{selected.brightness} K</span></div>
              <div className="row"><IconClock /><span className="label">Waktu</span><span className="value">{selected.date} · {String(selected.time).padStart(4, "0").slice(0, 2)}:{String(selected.time).padStart(4, "0").slice(2)}</span></div>
              <div className="row"><IconChart /><span className="label">Keyakinan</span><span className="value" style={{textTransform:'capitalize'}}>{selected.confidence}</span></div>
              <div className="row"><IconWind /><span className="label">Sebaran Asap</span><span className="value">Ke arah garis putus-putus</span></div>
            </div>
          )}

          {!selected && !envInfo && chartData.length > 0 && (
            <div className="floating-panel" style={{ bottom: '70px' }}>
               <TrendChart data={chartData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
