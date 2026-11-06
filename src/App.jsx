import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// --- SVG icons (inline, unik, tanpa library) ---
const IconFlame = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2c1.2 3.2 3.6 4.8 3.6 8.2A3.6 3.6 0 0 1 12 13.8a3.6 3.6 0 0 1-3.6-3.6C8.4 6.8 10.8 5.2 12 2Z" />
    <path d="M12 13.8c-2.4 1.4-3.6 3.4-3.6 5.6A3.6 3.6 0 0 0 12 23a3.6 3.6 0 0 0 3.6-3.6c0-2.2-1.2-4.2-3.6-5.6Z" />
  </svg>
);

const IconTarget = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
  </svg>
);

const IconThermo = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" />
    <path d="M12 9v6" />
  </svg>
);

const IconClock = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 2.5" />
  </svg>
);

const IconClose = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// --- Kontrol zoom custom (SVG, bukan bawaan Leaflet) ---
function ZoomControl() {
  const map = useMap();
  return (
    <div className="zoom">
      <button onClick={() => map.zoomIn()} aria-label="Zoom in">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <span className="zoom-sep" />
      <button onClick={() => map.zoomOut()} aria-label="Zoom out">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

function App() {
  const [fires, setFires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch("/api/fires")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal ambil data");
        return res.text();
      })
      .then((csv) => {
        const lines = csv.trim().split("\n");
        if (lines.length < 2) {
          setFires([]);
          setLoading(false);
          return;
        }
        const headers = lines[0].split(",");
        const idx = (name) => headers.indexOf(name);
        const latI = idx("latitude");
        const lonI = idx("longitude");
        const brightI = idx("bright_ti4");
        const dateI = idx("acq_date");
        const timeI = idx("acq_time");
        const confI = idx("confidence");

        const data = lines
          .slice(1)
          .map((line) => {
            const c = line.split(",");
            return {
              lat: parseFloat(c[latI]),
              lon: parseFloat(c[lonI]),
              brightness: parseFloat(c[brightI]),
              date: c[dateI],
              time: c[timeI],
              confidence: c[confI],
            };
          })
          .filter((f) => !isNaN(f.lat) && !isNaN(f.lon));

        setFires(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const stats = useMemo(() => {
    if (!fires.length) return null;
    const avg = fires.reduce((s, f) => s + (f.brightness || 0), 0) / fires.length;
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
            <span className="muted">API belum aktif</span>
          ) : loading ? (
            <span className="muted">Memuat…</span>
          ) : (
            <>
              <span className="dot" />
              <span>{fires.length} titik</span>
              <span className="sep">·</span>
              <span className="muted">VIIRS · 24 jam</span>
            </>
          )}
        </div>
      </header>

      <MapContainer
        center={[-2, 118]}
        zoom={5}
        className="map"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

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
            <span className="panel-title">
              <IconFlame size={14} /> Hotspot
            </span>
            <button className="close" onClick={() => setSelected(null)} aria-label="Tutup">
              <IconClose />
            </button>
          </div>

          <div className="row">
            <IconTarget />
            <span className="label">Koordinat</span>
            <span className="value">
              {fires[selected].lat.toFixed(3)}, {fires[selected].lon.toFixed(3)}
            </span>
          </div>

          <div className="row">
            <IconThermo />
            <span className="label">Suhu</span>
            <span className="value">
              {fires[selected].brightness ? `${fires[selected].brightness} K` : "—"}
            </span>
          </div>

          <div className="row">
            <IconClock />
            <span className="label">Waktu</span>
            <span className="value">
              {fires[selected].date}
              {fires[selected].time ? ` · ${String(fires[selected].time).padStart(4, "0").slice(0, 2)}:${String(fires[selected].time).padStart(4, "0").slice(2)}` : ""}
            </span>
          </div>

          {fires[selected].confidence && (
            <div className="row">
              <span className="pill">{fires[selected].confidence}</span>
              <span className="label">Kepercayaan</span>
            </div>
          )}
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
