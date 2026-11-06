import Icon from "./Icon";
import { fmtUtc, fmtWib } from "../lib/format";
import { hhmm } from "../lib/firms";

const Field = ({ label, children }) => <div><small>{label}</small><b>{children}</b></div>;

export function HotspotCard({ fire, onClose, onWeather }) {
  const sensor = [fire.satellite, fire.instrument].filter(Boolean).join(" · ");
  return (
    <section className="detail-card" aria-label="Detail hotspot">
      <div className="detail-heading">
        <div><span className="detail-kicker">NASA FIRMS{sensor ? ` · ${sensor}` : ""}</span><h3>Detail hotspot</h3></div>
        <button aria-label="Tutup detail" onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="detail-grid">
        <Field label="KOORDINAT">{fire.lat.toFixed(4)}, {fire.lon.toFixed(4)}</Field>
        <Field label="CONFIDENCE"><span className={`conf conf-${fire.confidence}`}>{fire.confidence.toUpperCase()}</span>{fire.rawConfidence ? ` (${fire.rawConfidence})` : ""}</Field>
        <Field label="BRIGHTNESS">{fire.brightness ? `${fire.brightness} K` : "—"}</Field>
        <Field label="FIRE RADIATIVE POWER">{fire.frp ? `${fire.frp} MW` : "—"}</Field>
        <Field label="DETEKSI (UTC)">{Number.isFinite(fire.ts) ? fmtUtc(fire.ts) : `${fire.date} ${hhmm(fire.time)}`}</Field>
        <Field label="DETEKSI (WIB)">{Number.isFinite(fire.ts) ? fmtWib(fire.ts) : "—"}</Field>
        <Field label="SIANG / MALAM">{fire.daynight === "N" ? "Malam" : fire.daynight === "D" ? "Siang" : "—"}</Field>
      </div>
      <p className="note">Hotspot adalah anomali termal yang terdeteksi satelit. Ini belum merupakan kebakaran terkonfirmasi; verifikasi memerlukan sumber lain.</p>
      <button className="detail-action" onClick={onWeather}>Cuaca & kualitas udara di titik ini <Icon name="arrow" size={15} /></button>
    </section>
  );
}

export function PointCard({ point, env, onClose, onRetry }) {
  const d = env.data;
  return (
    <section className="detail-card weather-detail" aria-label="Lokasi terpilih">
      <div className="detail-heading">
        <div><span className="detail-kicker">LOKASI TERPILIH · OPEN-METEO (MODEL)</span><h3>Kondisi lingkungan</h3></div>
        <button aria-label="Tutup detail" onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="detail-grid one-row"><Field label="KOORDINAT">{point.lat.toFixed(4)}, {point.lon.toFixed(4)}</Field></div>
      {env.status === "loading" && <p className="note">Memuat data model cuaca…</p>}
      {env.status === "error" && <div className="inline-error">Data cuaca tidak berhasil dimuat untuk titik ini. <button onClick={onRetry}>Coba lagi</button></div>}
      {d && <>
        <div className="weather-current"><strong>{d.weather}</strong><span>{d.temp ?? "—"}°C</span></div>
        <div className="detail-grid">
          <Field label="KELEMBAPAN">{d.humidity ?? "—"}%</Field>
          <Field label="HUJAN SAAT INI">{d.rain ?? 0} mm</Field>
          <Field label="PRESIPITASI">{d.precipitation ?? 0} mm</Field>
          <Field label="ANGIN (10 M)">{d.speed ?? "—"} km/j · {d.direction ?? "—"}°</Field>
          <Field label="PM2.5 (ESTIMASI MODEL)">{d.pm25 == null ? "—" : `${d.pm25} μg/m³`} · {d.airLabel}</Field>
        </div>
        <div className="forecast-heading">PROBABILITAS HUJAN & PRESIPITASI, 6 JAM BERIKUTNYA</div>
        <div className="forecast-strip">{d.hourly.map((h) => <div className="forecast-hour" key={h.time}><small>{h.time}</small><b>{h.probability}%</b><span>{h.rain.toFixed(1)} mm</span></div>)}</div>
        <p className="note">Waktu data: {d.sourceTime || "—"} ({d.timezone || "waktu lokal"}). Prakiraan model, bukan pengukuran stasiun di titik tersebut. Kategori PM2.5 memakai ambang US EPA, bukan ISPU.</p>
      </>}
    </section>
  );
}

