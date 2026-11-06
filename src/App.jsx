import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// --- SVG Icons (Custom & Unique) ---
const IconLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1.2 3.2 3.6 4.8 3.6 8.2A3.6 3.6 0 0 1 12 13.8a3.6 3.6 0 0 1-3.6-3.6C8.4 6.8 10.8 5.2 12 2Z" /><path d="M12 13.8c-2.4 1.4-3.6 3.4-3.6 5.6A3.6 3.6 0 0 0 12 23a3.6 3.6 0 0 0 3.6-3.6c0-2.2-1.2-4.2-3.6-5.6Z" /><path d="M12 17v3" strokeDasharray="2 2" /></svg>
);
const IconTarget = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" /></svg>);
const IconThermo = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" /><path d="M12 9v6" /></svg>);
const IconClock = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></svg>);
const IconClose = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>);
const IconSearch = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
const IconArrowRight = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>);

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
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [mapCenter, setMapCenter] = useState(null);
  const [searching, setSearching] = useState(false);
  
  const searchInputRef = useRef(null);
  const cartoKey = import.meta.env.VITE_CARTO_KEY;

  useEffect(() => {
    // BYPASS CACHE TOTAL: pakai timestamp dan header no-cache
    const timestamp = new Date().getTime();
    fetch(`/api/fires?t=${timestamp}`, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const text = await res.text();
        if (text.includes('{"error"')) {
           throw new Error(JSON.parse(text).error);
        }
        return text;
      })
      .then((csv) => {
        const cleanCsv = csv.replace(/\r/g, "").trim();
        const lines = cleanCsv.split("\n");
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim());
          // Pastiin barisnya bukan kosong dan punya cukup kolom
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
      .catch((err) => { 
        setError("Gagal konek API"); 
        setLoading(false); 
      });
  }, []);

  useEffect(() => { if (showSearch && searchInputRef.current) searchInputRef.current.focus(); }, [showSearch]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        setShowSearch(false);
        setSearch("");
      } else { alert("Lokasi tidak ditemukan"); }
    } catch (err) { alert("Gagal mencari lokasi"); } 
    finally { setSearching(false); }
  };

  const stats = useMemo(() => {
    if (!fires.length) return null;
    const avg = fires.reduce((s, f) => s + (parseFloat(f.brightness) || 0), 0) / fires.length;
    return { avg: avg.toFixed(1) };
  }, [fires]);

  if (!isStarted) {
    return (
      <div className="landing">
        <div className="landing-content">
          <div className="landing-icon"><IconLogo size={48} /></div>
          <h1>Karthutlaland</h1>
          <p>Pemantauan titik panas (hotspot) deforestasi dan kebakaran hutan Indonesia secara near-real-time berbasis data satelit NASA FIRMS.</p>
          <button className="start-btn" onClick={() => setIsStarted(true)}>Mulai Pantau <IconArrowRight /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand" onClick={() => setIsStarted(false)} style={{cursor: 'pointer'}}><IconLogo size={20} /><span>Karthutlaland</span></div>
        <div className={`search-wrapper ${showSearch ? "active" : ""}`}>
          {!showSearch ? (
            <button className="icon-btn" onClick={() => setShowSearch(true)}><IconSearch size={18} /></button>
          ) : (
            <form onSubmit={handleSearch} className="search-form">
              <input ref={searchInputRef} type="text" placeholder="Cari wilayah..." value={search} onChange={(e) => setSearch(e.target.value)} />
              {searching ? <span className="loader">...</span> : <button type="button" className="icon-btn close-search" onClick={() => setShowSearch(false)}><IconClose size={14} /></button>}
            </form>
          )}
        </div>
      </header>

      {!showSearch && (
        <div className="status-bar">
          {error ? <span className="error-txt" style={{color: '#ff3b30'}}>{error}</span> : loading ? <span className="muted">Memuat satelit...</span> : (
            <><span className="dot" /><span>{fires.length} Titik Aktif</span></>
          )}
        </div>
      )}

      <MapContainer center={[-2, 118]} zoom={5} className="map" zoomControl={false} attributionControl={false}>
        <TileLayer url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`} />
        <MapController center={mapCenter} />
        {fires.map((fire, i) => (
          <CircleMarker key={i} center={[fire.lat, fire.lon]} radius={selected === i ? 6 : 3.5} eventHandlers={{ click: () => setSelected(i) }}
            pathOptions={{ color: selected === i ? "#ff6a3d" : "#ff3b30", fillColor: selected === i ? "#ff6a3d" : "#ff3b30", fillOpacity: selected === i ? 0.9 : 0.7, weight: selected === i ? 2 : 0 }}
          />
        ))}
        <ZoomControl />
      </MapContainer>

      {selected !== null && fires[selected] && (
        <aside className="panel">
          <div className="panel-head"><span className="panel-title"><IconLogo size={14} /> Titik Panas</span><button className="close" onClick={() => setSelected(null)}><IconClose size={14} /></button></div>
          <div className="row"><IconTarget /><span className="label">Koordinat</span><span className="value">{fires[selected].lat.toFixed(3)}, {fires[selected].lon.toFixed(3)}</span></div>
          <div className="row"><IconThermo /><span className="label">Suhu</span><span className="value">{fires[selected].brightness} K</span></div>
          <div className="row"><IconClock /><span className="label">Waktu</span><span className="value">{fires[selected].date} · {String(fires[selected].time).padStart(4, "0").slice(0, 2)}:{String(fires[selected].time).padStart(4, "0").slice(2)}</span></div>
        </aside>
      )}
      {stats && !selected && (<footer className="foot"><span className="muted">Rata-rata suhu</span><span>{stats.avg} K</span></footer>)}
    </div>
  );
}
