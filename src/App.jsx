import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "./App.css";

// --- SVG Icons (Minimalis) ---
const IconTarget = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" /></svg>);
const IconThermo = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" /><path d="M12 9v6" /></svg>);
const IconClock = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></svg>);
const IconClose = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>);
const IconSearch = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
const IconArrowRight = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>);

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

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 9, { duration: 1.5 }); }, [center, map]);
  return null;
}

export default function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [fires, setFires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [mapCenter, setMapCenter] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const searchInputRef = useRef(null);
  const cartoKey = import.meta.env.VITE_CARTO_KEY;

  useEffect(() => {
    const timestamp = new Date().getTime();
    fetch(`/api/hotspots?t=${timestamp}`)
      .then((res) => res.text())
      .then((csv) => {
        const lines = csv.replace(/\r/g, "").trim().split("\n");
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim());
          if (cols.length >= 10 && cols[0] !== "" && cols[0] !== "latitude") {
            const lat = parseFloat(cols[0]);
            const lon = parseFloat(cols[1]);
            if (!isNaN(lat) && !isNaN(lon)) {
              data.push({ lat, lon, brightness: cols[2], date: cols[5], time: cols[6] });
            }
          }
        }
        setFires(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { if (isSearching && searchInputRef.current) searchInputRef.current.focus(); }, [isSearching]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setIsSearching(false);
        setSearch("");
      } else { alert("Lokasi tidak ditemukan"); }
    } catch (err) { alert("Gagal mencari lokasi"); } 
    finally { setSearchLoading(false); }
  };

  const stats = useMemo(() => {
    if (!fires.length) return null;
    const avg = fires.reduce((s, f) => s + (parseFloat(f.brightness) || 0), 0) / fires.length;
    return { avg: avg.toFixed(1) };
  }, [fires]);

  // --- LANDING PAGE ---
  if (!isStarted) {
    return (
      <div className="landing">
        <div className="landing-content">
          <h1>Karthutlaland</h1>
          <p>Sistem pemantauan titik panas dan deforestasi hutan Indonesia berbasis data satelit NASA FIRMS. Pantau pergerakan anomali suhu secara near-real-time.</p>
          <button className="start-btn" onClick={() => setIsStarted(true)}>
            Mulai Pantau <IconArrowRight />
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN MAP APP ---
  return (
    <div className="app">
      {/* HEADER: Judul Kiri, Search Kanan (atau menggantikan) */}
      <header className="header">
        {!isSearching ? (
          <>
            <h1 className="brand" onClick={() => setIsStarted(false)}>Karthutlaland</h1>
            <button className="icon-btn" onClick={() => setIsSearching(true)}>
              <IconSearch />
            </button>
          </>
        ) : (
          <form onSubmit={handleSearch} className="search-form">
            <IconSearch size={16} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Cari wilayah (misal: Palangkaraya)..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            {searchLoading ? <span className="loader">...</span> : (
              <button type="button" className="icon-btn-close" onClick={() => setIsSearching(false)}>
                <IconClose size={14} />
              </button>
            )}
          </form>
        )}
      </header>

      {/* MAP AREA */}
      <div className="map-container">
        <MapContainer center={[-2, 118]} zoom={5} className="map" zoomControl={false} attributionControl={false}>
          <TileLayer url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`} />
          <MapController center={mapCenter} />
          
          <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
            {fires.map((fire, i) => (
              <Marker key={i} position={[fire.lat, fire.lon]} eventHandlers={{ click: () => setSelected(i) }} />
            ))}
          </MarkerClusterGroup>
          
          <ZoomControl />
        </MapContainer>

        {/* PANEL INFO (Melayang di atas footer jika titik diklik) */}
        {selected !== null && fires[selected] && (
          <aside className="panel">
            <div className="panel-head">
              <span className="panel-title">Detail Titik Panas</span>
              <button className="close" onClick={() => setSelected(null)}><IconClose size={16} /></button>
            </div>
            <div className="row"><IconTarget /><span className="label">Koordinat</span><span className="value">{fires[selected].lat.toFixed(3)}, {fires[selected].lon.toFixed(3)}</span></div>
            <div className="row"><IconThermo /><span className="label">Suhu</span><span className="value">{fires[selected].brightness} K</span></div>
            <div className="row"><IconClock /><span className="label">Waktu</span><span className="value">{fires[selected].date} · {String(fires[selected].time).padStart(4, "0").slice(0, 2)}:{String(fires[selected].time).padStart(4, "0").slice(2)}</span></div>
          </aside>
        )}
      </div>

      {/* FOOTER: Status Titik Api & Suhu */}
      <footer className="footer">
        <div className="status">
          {loading ? <span className="muted">Memuat data satelit...</span> : (
            <><span className="dot" /><span>{fires.length.toLocaleString('id-ID')} Titik Aktif</span></>
          )}
        </div>
        {stats && !selected && (
          <div className="stat-suhu">
            <span className="muted">Rata-rata</span>
            <span>{stats.avg} K</span>
          </div>
        )}
      </footer>
    </div>
  );
}
