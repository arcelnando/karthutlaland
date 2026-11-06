import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// --- SVG Icons ---
const IconTarget = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" /></svg>);
const IconThermo = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" /><path d="M12 9v6" /></svg>);
const IconClock = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2.5" /></svg>);
const IconClose = ({ size = 16 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>);
const IconSearch = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
const IconArrowRight = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>);
const IconWind = ({ size = 14 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg>);

// --- CUSTOM SVG MARKER (Murni SVG Api, Tanpa Glow) ---
const createFireIcon = () => {
  const svgHtml = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2c1.2 3.2 3.6 4.8 3.6 8.2A3.6 3.6 0 0 1 12 13.8a3.6 3.6 0 0 1-3.6-3.6C8.4 6.8 10.8 5.2 12 2Z" />
      <path d="M12 13.8c-2.4 1.4-3.6 3.4-3.6 5.6A3.6 3.6 0 0 0 12 23a3.6 3.6 0 0 0 3.6-3.6c0-2.2-1.2-4.2-3.6-5.6Z" />
    </svg>
  `;
  return L.divIcon({
    html: svgHtml,
    className: "custom-fire-icon",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};
const fireIcon = createFireIcon();

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
  const [windInfo, setWindInfo] = useState(null);
  const [windLoading, setWindLoading] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [mapCenter, setMapCenter] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [days, setDays] = useState("1");
  
  const searchInputRef = useRef(null);
  const cartoKey = import.meta.env.VITE_CARTO_KEY;

  useEffect(() => {
    setLoading(true);
    const timestamp = new Date().getTime();
    fetch(`/api/hotspots?days=${days}&t=${timestamp}`)
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
  }, [days]);

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

  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    setWindLoading(true);
    setSelected(null); // Tutup panel api
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m`);
      const data = await res.json();
      setWindInfo({
        lat: lat.toFixed(3),
        lng: lng.toFixed(3),
        speed: data.current.wind_speed_10m,
        direction: data.current.wind_direction_10m,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setWindLoading(false);
    }
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
          <h1>Karthutlaland</h1>
          <p>Sistem pemantauan anomali api dan deforestasi hutan Indonesia berbasis data satelit NASA FIRMS.</p>
          <button className="start-btn" onClick={() => setIsStarted(true)}>Mulai Pantau <IconArrowRight /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <MapContainer 
        center={[-2, 118]} 
        zoom={5} 
        className="map" 
        zoomControl={false} 
        attributionControl={false}
        eventHandlers={{ click: handleMapClick }}
      >
        <TileLayer url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`} />
        <MapController center={mapCenter} />
        
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {fires.map((fire, i) => (
            <Marker 
              key={i} 
              position={[fire.lat, fire.lon]} 
              icon={fireIcon} 
              eventHandlers={{ 
                click: (e) => {
                  L.DomEvent.stopPropagation(e); // Biar ga munculin angin
                  setWindInfo(null);
                  setSelected(i);
                } 
              }} 
            />
          ))}
        </MarkerClusterGroup>
        
        <ZoomControl />
      </MapContainer>

      {/* FLOATING HEADER */}
      <div className="floating-header">
        {!isSearching ? (
          <div className="brand-wrap">
            <h1 className="brand" onClick={() => setIsStarted(false)}>Karthutlaland</h1>
            <button className="search-btn" onClick={() => setIsSearching(true)}><IconSearch /></button>
          </div>
        ) : (
          <form onSubmit={handleSearch} className="search-form">
            <IconSearch size={16} />
            <input ref={searchInputRef} type="text" placeholder="Cari wilayah..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {searchLoading ? <span className="loader">...</span> : (
              <button type="button" className="close-btn" onClick={() => setIsSearching(false)}><IconClose size={14} /></button>
            )}
          </form>
        )}
      </div>

      {/* TIME FILTER */}
      <div className="time-filter">
        {["1", "2", "3", "5"].map((d) => (
          <button key={d} className={`time-btn ${days === d ? "active" : ""}`} onClick={() => setDays(d)}>{d}H</button>
        ))}
      </div>

      {/* FLOATING FOOTER */}
      {!selected && !windInfo && (
        <div className="floating-footer">
          {loading ? <span className="muted">Memuat data...</span> : fires.length === 0 ? (
            <span className="muted">Tidak ada anomali api</span>
          ) : (
            <>
              <span className="dot" />
              <span>{fires.length.toLocaleString('id-ID')} Titik</span>
              {stats && <span className="divider">|</span>}
              {stats && <span className="suhu">{stats.avg} K</span>}
            </>
          )}
        </div>
      )}

      {/* PANEL ANGIN */}
      {windInfo && (
        <div className="floating-panel">
          <div className="panel-head">
            <span className="panel-title">Info Angin</span>
            <button className="close" onClick={() => setWindInfo(null)}><IconClose size={16} /></button>
          </div>
          <div className="row"><IconTarget /><span className="label">Koordinat</span><span className="value">{windInfo.lat}, {windInfo.lng}</span></div>
          <div className="row"><IconWind /><span className="label">Kecepatan</span><span className="value">{windInfo.speed} km/j</span></div>
          <div className="row"><IconClock /><span className="label">Arah</span><span className="value">{windInfo.direction}°</span></div>
        </div>
      )}

      {/* PANEL DETAIL API */}
      {selected !== null && fires[selected] && (
        <div className="floating-panel">
          <div className="panel-head">
            <span className="panel-title">Detail Anomali Api</span>
            <button className="close" onClick={() => setSelected(null)}><IconClose size={16} /></button>
          </div>
          <div className="row"><IconTarget /><span className="label">Koordinat</span><span className="value">{fires[selected].lat.toFixed(3)}, {fires[selected].lon.toFixed(3)}</span></div>
          <div className="row"><IconThermo /><span className="label">Suhu</span><span className="value">{fires[selected].brightness} K</span></div>
          <div className="row"><IconClock /><span className="label">Waktu</span><span className="value">{fires[selected].date} · {String(fires[selected].time).padStart(4, "0").slice(0, 2)}:{String(fires[selected].time).padStart(4, "0").slice(2)}</span></div>
        </div>
      )}
    </div>
  );
}
