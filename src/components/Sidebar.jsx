import Icon from "./Icon";
import { BASEMAPS, GFW_LOSS, OPTIONAL_LAYERS } from "../config/mapConfig";
import { fmtUtc } from "../lib/format";

const STATE_LABEL = { off: "Nonaktif", ok: "Aktif", loading: "Memuat", error: "Error", unconfigured: "Not configured" };

export function StatusDot({ state }) {
  return <i className={`status-dot is-${state}`} aria-hidden="true" />;
}

function Section({ icon, title, children }) {
  return <section className="side-section"><h4><Icon name={icon} size={14} />{title}</h4>{children}</section>;
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" className={value === o.value ? "active" : ""} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

function LayerRow({ title, detail, status, statusText, checked, disabled, onChange, opacity, onOpacity }) {
  return (
    <div className={`layer-row${disabled ? " is-disabled" : ""}`}>
      <label className="switch-row">
        <span className="switch-text"><b>{title}</b><small>{detail}</small></span>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      </label>
      <div className="layer-status"><StatusDot state={status} />{statusText || STATE_LABEL[status]}</div>
      {checked && onOpacity && (
        <label className="opacity-row">Opasitas
          <input type="range" min="20" max="100" step="5" value={Math.round(opacity * 100)} onChange={(e) => onOpacity(Number(e.target.value) / 100)} />
          <span>{Math.round(opacity * 100)}%</span>
        </label>
      )}
    </div>
  );
}

export default function Sidebar(p) {
  const optionalRow = (x) => (
    <LayerRow key={x.id} title={x.title} detail={x.url ? x.detail : "Belum ada URL tile"} checked={!!p.layers[x.id]} disabled={!x.url}
      status={!x.url ? "unconfigured" : p.layers[x.id] ? "ok" : "off"} statusText={!x.url ? `Not configured · ${x.env}` : p.layers[x.id] ? `Aktif · zoom asli ${x.maxNativeZoom}` : "Nonaktif"}
      onChange={() => p.toggleLayer(x.id)} opacity={p.opacity[x.id]} onOpacity={(v) => p.setOpacity(x.id, v)} />
  );
  const group = (g) => OPTIONAL_LAYERS.filter((x) => x.group === g).map(optionalRow);
  const fire = p.fire;
  const rain = p.layerStatus.rain || { state: "off" };
  const wind = p.layerStatus.wind || { state: "off" };

  return (
    <aside className="sidebar" aria-label="Layer dan kontrol">
      <div className="side-head"><span>LAYER & KONTROL</span><button className="side-close" aria-label="Tutup panel" onClick={p.onClose}><Icon name="close" /></button></div>
      <div className="side-body">
        <div className="side-actions">
          <button onClick={p.onCheckCenter}><Icon name="rain" />Cuaca di tengah peta</button>
          <button onClick={p.onOpenData}><Icon name="database" />Sumber & status data</button>
          <button onClick={p.onOpenAbout}><Icon name="info" />About Karthutlaland</button>
        </div>

        <Section icon="layers" title="BASEMAP">
          <Segmented label="Basemap" value={p.baseMap} onChange={p.setBaseMap} options={Object.values(BASEMAPS).map((b) => ({ value: b.id, label: b.label }))} />
          <label className="switch-row"><span className="switch-text"><b>Label wilayah</b><small>Batas dan nama tempat (Esri)</small></span><input type="checkbox" checked={p.showLabels} onChange={(e) => p.setShowLabels(e.target.checked)} /></label>
          <p className="note">Tile asli {p.baseMap === "sentinel" ? `Sentinel-2 sampai zoom ${BASEMAPS.sentinel.maxNativeZoom}` : `Esri sampai zoom ${BASEMAPS.esri.maxNativeZoom}`}. Di atas itu citra diperbesar, bukan resolusi lebih tinggi.</p>
        </Section>

        <Section icon="flame" title="FIRE INTELLIGENCE">
          <LayerRow title="NASA FIRMS hotspot" detail={fire.loading ? "Memuat data" : `${fire.count.toLocaleString("id-ID")} titik pada filter aktif`} checked={p.layers.hotspots} onChange={() => p.toggleLayer("hotspots")}
            status={fire.error ? "error" : fire.loading ? "loading" : p.layers.hotspots ? "ok" : "off"} statusText={fire.error ? fire.error : fire.loading ? "Memuat" : p.layers.hotspots ? `Data terbaru ${fire.latest}` : "Nonaktif"} />
          <div className="field-label">Rentang waktu</div>
          <Segmented label="Rentang hotspot" value={p.days} onChange={p.setDays} options={["1", "2", "3", "5", "7"].map((d) => ({ value: d, label: `${d}H` }))} />
          <div className="field-label">Confidence minimum</div>
          <Segmented label="Filter confidence" value={p.minConf} onChange={p.setMinConf} options={[{ value: "all", label: "Semua" }, { value: "nominal", label: "Nominal+" }, { value: "high", label: "High" }]} />
          <label className="switch-row"><span className="switch-text"><b>Hanya deteksi malam</b><small>Acquisition malam hari (N)</small></span><input type="checkbox" checked={p.nightOnly} onChange={(e) => p.setNightOnly(e.target.checked)} /></label>
          {p.daily.length > 0 && (
            <div className="daily" aria-label="Jumlah hotspot per hari">
              <div className="field-label">Sebaran harian (sesuai filter)</div>
              <div className="daily-bars">{p.daily.map((d) => {
                const max = Math.max(...p.daily.map((x) => x.count));
                return <div className="daily-col" key={d.date} title={`${d.date}: ${d.count}`}><span className="daily-num">{d.count}</span><span className="daily-track"><span style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }} /></span><small>{d.label}</small></div>;
              })}</div>
            </div>
          )}
          <p className="note">Hotspot adalah anomali termal yang terdeteksi satelit, bukan kebakaran terkonfirmasi.</p>
        </Section>

        <Section icon="tree" title="FOREST & DEFORESTATION">
          <LayerRow title="Tree cover loss" detail="UMD / GFW · 2001-2025 · 30 m" checked={p.layers.loss} onChange={() => p.toggleLayer("loss")} status={p.layers.loss ? "ok" : "off"} statusText={p.layers.loss ? `Aktif · zoom asli ${GFW_LOSS.maxNativeZoom}` : "Nonaktif"} opacity={p.opacity.loss} onOpacity={(v) => p.setOpacity("loss", v)} />
          {group("forest")}
          <p className="note">Tree cover loss, deforestasi, dan pembalakan liar bukan istilah yang setara. Layer ini tidak menentukan penyebab kehilangan tutupan.</p>
        </Section>

        <Section icon="sprout" title="PALM WATCH">
          {group("palm")}
          <p className="note">Aplikasi tidak mendeteksi sawit sendiri. Analisis tumpang tindih otomatis belum tersedia; aktifkan dua layer dan atur opasitas untuk perbandingan visual.</p>
        </Section>

        <Section icon="tree" title="ECOSYSTEM MONITORING">{group("ecosystem")}</Section>

        <Section icon="rain" title="WEATHER INTELLIGENCE">
          <LayerRow title="Rain radar" detail="RainViewer · frame radar terbaru" checked={p.layers.rain} onChange={() => p.toggleLayer("rain")} status={rain.state}
            statusText={rain.state === "ok" ? `Frame ${fmtUtc(rain.timestamp)}` : rain.state === "error" ? rain.message : undefined} opacity={p.opacity.rain} onOpacity={(v) => p.setOpacity("rain", v)} />
          <LayerRow title="Wind field" detail="Model Open-Meteo · kisi 3 derajat" checked={p.layers.wind} onChange={() => p.toggleLayer("wind")} status={wind.state}
            statusText={wind.state === "ok" ? `Model ${fmtUtc(wind.timestamp)}` : wind.state === "error" ? wind.message : undefined} />
          <p className="note">Klik peta untuk cuaca, prakiraan, dan PM2.5 pada koordinat tersebut (estimasi model Open-Meteo, bukan pengukuran stasiun).</p>
        </Section>
      </div>
    </aside>
  );
}
