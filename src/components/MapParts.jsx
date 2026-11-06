import { memo, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet-velocity/dist/leaflet-velocity.js";
import Icon, { FLAME_SVG } from "./Icon";
import { MAP_MAX_ZOOM, MAP_MIN_ZOOM, RAIN } from "../config/mapConfig";
import { fetchWindData } from "../lib/weather";

export function SourceTileLayer({ src, ...props }) {
  return <TileLayer url={src.url} maxNativeZoom={src.maxNativeZoom} maxZoom={MAP_MAX_ZOOM} attribution={src.attribution} {...props} />;
}

function useShieldFromMap(ref) {
  useEffect(() => {
    if (!ref.current) return;
    L.DomEvent.disableClickPropagation(ref.current);
    L.DomEvent.disableScrollPropagation(ref.current);
  }, [ref]);
}

export function MapController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.center, Math.min(target.zoom || 9, MAP_MAX_ZOOM), { duration: 1 });
  }, [target, map]);
  return null;
}

export function MapEvents({ onPick, centerRef }) {
  const map = useMapEvents({
    click: (e) => { const p = e.latlng.wrap(); onPick(p.lat, p.lng); },
    moveend: () => { const c = map.getCenter(); centerRef.current = [c.lat, c.lng]; },
  });
  useEffect(() => { const c = map.getCenter(); centerRef.current = [c.lat, c.lng]; }, [map, centerRef]);
  return null;
}

// Tracker BBOX untuk layer API (RADD/Peat)
export function MapBoundsTracker({ onChange }) {
  const map = useMap();
  useEffect(() => {
    const updateBounds = () => {
      const zoom = map.getZoom();
      if (zoom < 7) { onChange(null); return; } // Jangan fetch kalau zoom out terlalu jauh
      
      const b = map.getBounds();
      const bboxStr = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
        .map(n => n.toFixed(2))
        .join(",");
      onChange(bboxStr);
    };
    map.on("moveend", updateBounds);
    updateBounds();
    return () => map.off("moveend", updateBounds);
  }, [map, onChange]);
  return null;
}

export function ZoomControl() {
  const map = useMap();
  const ref = useRef(null);
  const [zoom, setZoom] = useState(map.getZoom());
  useShieldFromMap(ref);
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  return (
    <div className="map-zoom-control" ref={ref}>
      <button aria-label="Perbesar peta" disabled={zoom >= MAP_MAX_ZOOM} onClick={() => map.zoomIn()}><Icon name="plus" /></button>
      <button aria-label="Perkecil peta" disabled={zoom <= MAP_MIN_ZOOM} onClick={() => map.zoomOut()}><Icon name="minus" /></button>
    </div>
  );
}

export function StatusBar({ info }) {
  const map = useMap();
  const ref = useRef(null);
  const [zoom, setZoom] = useState(map.getZoom());
  const [center, setCenter] = useState(map.getCenter());
  const [cursor, setCursor] = useState(null);
  useShieldFromMap(ref);
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setCenter(map.getCenter()),
    mousemove: (e) => setCursor(e.latlng.wrap()),
    mouseout: () => setCursor(null),
  });
  const p = cursor || center;
  return (
    <div className="statusbar" ref={ref}>
      <span className="sb-item sb-mono" title={cursor ? "Koordinat kursor" : "Koordinat tengah peta"}>
        <i className="sb-key">{cursor ? "KURSOR" : "TENGAH"}</i>{p.lat.toFixed(5)}, {p.lng.toFixed(5)}
      </span>
      <span className="sb-item sb-mono"><i className="sb-key">ZOOM</i>{zoom}</span>
      <span className="sb-item sb-grow">
        <i className="sb-key">HOTSPOT</i>
        {info.loading ? "memuat…" : info.error ? "gagal dimuat" : `${info.count.toLocaleString("id-ID")} titik · ${info.high.toLocaleString("id-ID")} high`}
      </span>
      <span className="sb-item sb-extra"><i className="sb-key">DATA</i>{info.latest}</span>
    </div>
  );
}

const makeFireIcon = (level) => L.divIcon({ html: `<span class="hs-pin hs-${level}">${FLAME_SVG}</span>`, className: "hs-icon", iconSize: [24, 24], iconAnchor: [12, 12] });
const FIRE_ICONS = { high: makeFireIcon("high"), nominal: makeFireIcon("nominal"), low: makeFireIcon("low"), unknown: makeFireIcon("unknown") };

export const HotspotLayer = memo(function HotspotLayer({ fires, onSelect }) {
  return (
    <MarkerClusterGroup chunkedLoading maxClusterRadius={42} spiderfyOnMaxZoom showCoverageOnHover={false}>
      {fires.map((f) => <Marker key={f.id} position={[f.lat, f.lon]} icon={FIRE_ICONS[f.confidence] || FIRE_ICONS.unknown} eventHandlers={{ click: () => onSelect(f) }} />)}
    </MarkerClusterGroup>
  );
});

export function PointMarker({ point }) {
  if (!point) return null;
  return <CircleMarker center={[point.lat, point.lon]} radius={7} pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#000000", fillOpacity: 0.7 }} interactive={false} />;
}

export function RainRadarLayer({ enabled, opacity, onStatus }) {
  const [tile, setTile] = useState(null);
  useEffect(() => {
    if (!enabled) { setTile(null); onStatus("rain", { state: "off" }); return undefined; }
    const controller = new AbortController();
    const load = () => {
      onStatus("rain", { state: "loading" });
      fetch(RAIN.meta, { signal: controller.signal })
        .then((r) => { if (!r.ok) throw new Error(`RainViewer ${r.status}`); return r.json(); })
        .then((data) => {
          const frames = data?.radar?.past || [];
          const frame = frames[frames.length - 1];
          if (!frame?.path || !data?.host) throw new Error("Frame radar tidak tersedia");
          setTile(`${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`);
          onStatus("rain", { state: "ok", timestamp: frame.time * 1000 });
        })
        .catch((e) => { if (e.name !== "AbortError") { console.warn("RainViewer radar:", e); onStatus("rain", { state: "error", message: "Radar tidak dapat dimuat" }); } });
    };
    load();
    const id = setInterval(load, RAIN.refreshMs);
    return () => { controller.abort(); clearInterval(id); };
  }, [enabled, onStatus]);
  if (!enabled || !tile) return null;
  return <TileLayer url={tile} opacity={opacity} zIndex={450} maxNativeZoom={RAIN.maxNativeZoom} maxZoom={MAP_MAX_ZOOM} attribution={RAIN.attribution} />;
}

export function WindLayer({ enabled, onStatus }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) { onStatus("wind", { state: "off" }); return undefined; }
    let layer = null;
    const controller = new AbortController();
    onStatus("wind", { state: "loading" });
    fetchWindData(controller.signal)
      .then(({ data, timestamp }) => {
        if (controller.signal.aborted) return;
        if (!L.velocityLayer) throw new Error("leaflet-velocity tidak termuat");
        layer = L.velocityLayer({ displayValues: false, data, maxVelocity: 12, velocityScale: 0.005, colorScale: ["#6b6b6b", "#9a9a9a", "#c4c4c4", "#e6e6e6", "#ffffff"], opacity: 0.7 });
        layer.addTo(map);
        onStatus("wind", { state: "ok", timestamp });
      })
      .catch((e) => { if (e.name !== "AbortError") { console.warn("Wind layer:", e); onStatus("wind", { state: "error", message: "Data angin tidak dapat dimuat" }); } });
    return () => { controller.abort(); if (layer && map.hasLayer(layer)) map.removeLayer(layer); };
  }, [enabled, map, onStatus]);
  return null;
}

// ==========================================
// LAYER API VEKTOR (RADD & PEAT)
// ==========================================
export function ApiVectorLayer({ type, enabled, color = '#ef4444', bbox }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!enabled || !bbox) {
      setData(null);
      return undefined;
    }

    const controller = new AbortController();
    // Debounce 400ms agar tidak spam request saat peta digeser
    const timer = setTimeout(async () => {
      try {
        const url = `/api/proxy?type=${encodeURIComponent(type)}&bbox=${encodeURIComponent(bbox)}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.type === 'FeatureCollection') setData(json);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(`[ApiVectorLayer:${type}]`, err.message);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [type, enabled, bbox]);

  const style = useMemo(
    () => ({ color, weight: 1, opacity: 0.8, fillColor: color, fillOpacity: 0.35 }),
    [color]
  );

  if (!enabled || !data?.features?.length) return null;

  return (
    <GeoJSON
      key={`${type}-${bbox}`}
      data={data}
      style={style}
      pointToLayer={(_, latlng) =>
        L.circleMarker(latlng, { radius: 4, color, fillColor: color, fillOpacity: 0.7, weight: 1 })
      }
    />
  );
}
