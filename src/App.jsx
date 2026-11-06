import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// --- SVG Icons ---
const IconFlame = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1.2 3.2 3.6 4.8 3.6 8.2A3.6 3.6 0 0 1 12 13.8a3.6 3.6 0 0 1-3.6-3.6C8.4 6.8 10.8 5.2 12 2Z" /><path d="M12 13.8c-2.4 1.4-3.6 3.4-3.6 5.6A3.6 3.6 0 0 0 12 23a3.6 3.6 0 0 0 3.6-3.6c0-2.2-1.2-4.2-3.6-5.6Z" /></svg>
);
const IconTarget = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" /></svg>
);
const IconThermo = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" /><path d="M12 9v6" /></svg>
);
const IconClock = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></svg>
);
const IconClose = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
const IconSearch = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);

// --- Zoom Control ---
function ZoomControl() {
  const map = useMap();
  return (
    <div className="zoom">
      <button onClick={() => map.zoomIn()} aria-label="Zoom in"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></button>
      <span className="zoom-sep" />
      <button onClick={() => map.zoomOut()} aria-label="Zoom out"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 12h14" /></svg></button>
    </div>
  );
}

// --- Helper buat mindahin kamera peta dari luar MapContainer ---
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 9, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

function App() {
  const [fires, setFires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  
  // State buat pencarian
  const [search, setSearch] = useState("");
  const [mapCenter, setMapCenter] = useState(null);
  const [searching, setSearching] = useState(false);

  const cartoKey = import.meta.env.VITE_CARTO_KEY;

  useEffect(() => {
    fetch("/api/fires")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal ambil data API");
        return res.text();
      })
      .then((csv) => {
        const lines = csv.trim().split("\n");
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length < 10) continue;
          const lat = parseFloat(cols[0]);
          const lon = parseFloat(cols[1]);
          if (!isNaN(lat) && !isNaN(lon)) {
            data.push({ lat, lon, brightness: cols[2], date: cols[5], time: cols[6], confidence: cols[9] });
          }
        }
        setFires(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Fungsi pencarian lokasi
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      // Pakai OpenStreetMap Nominatim (gratis)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      } else {
        alert("Lokasi tidak ditemukan");
      }
    } catch (err) {
      alert("Gagal mencari lokasi");
    } finally {
      setSearching(false);
    }
  };

  const stats = useMemo(() => {
    if (!fires.length) return null;
    const avg = fires.reduce((s, f) => s + (parseFloat(f.brightness) || 0), 0) / fires.length;
    return { avg: avg.toFixed(1) };
  }, [fires]);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <IconFlame size={20} />
          <span>Karthutlaland</span>
        </div>
        <div className="meta">
          {error ? (
            <span className="error-txt">{error}</span>
          ) : loading ? (
            <span className="muted">Memuat…</span>
          ) : (
            <>
              <span className="dot" />
              <span>{fires.length} titik</span>
            </>
          )}
        </div>
      </header>

      <div className="search-container">
        <form onSubmit={handleSearch} className="search-box">
          <IconSearch />
          <input
            type="text"
            placeholder="Cari kota atau pulau... (misal: Palangkaraya)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searching && <span className="loader">...</span>}
        </form>
      </div>

      <MapContainer center={[-2, 118]} zoom={5} className="map" zoomControl={false} attributionControl={false}>
        <TileLayer url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`} />
        
        <MapController center={mapCenter} />

        {fires.map((fire, i) => (
          <CircleMarker
            key={i}
            center={[fire.lat, fire.lon]}
            radius={selected === i ? 6 : 3.5}
            eventHandlers={{ click: () => setSelected(i) }}
            pathOptions={{
              color: selected === i ? "#ff6a3d" : "#ff3b30",
              fillColor: selected === i ? "#ff6a3d" : "#ff3b30",
              fillOpacity: selected === i ? 0.9 : 0.65,
              weight: selected === i ? 2 : 0,
            }}
          />
        ))}
        <ZoomControl />
      </MapContainer>

      {selected !== null && fires[selected] && (
        <aside className="panel">
          <div className="panel-head">
            <span className="panel-title"><IconFlame size={14} /> Hotspot</span>
            <button className="close" onClick={() => setSelected(null)}><IconClose /></button>
          </div>
          <div className="row">
            <IconTarget /><span className="label">Koordinat</span>
            <span className="value">{fires[selected].lat.toFixed(3)}, {fires[selected].lon.toFixed(3)}</span>
          </div>
          <div className="row">
            <IconThermo /><span className="label">Suhu</span>
            <span className="value">{fires[selected].brightness} K</span>
          </div>
          <div className="row">
            <IconClock /><span className="label">Waktu</span>
            <span className="value">
              {fires[selected].date} · {String(fires[selected].time).padStart(4, "0").slice(0, 2)}:{String(fires[selected].time).padStart(4, "0").slice(2)}
            </span>
          </div>
        </aside>
      )}

      {stats && !selected && (
        <footer className="foot">
          <span className="muted">Rata-rata suhu</span>
          <span>{stats.avg} K</span>
        </footer>
      )}
    </div>
  );
}

export default App;
