import Icon from "./Icon";
import { StatusDot } from "./Sidebar";
import { DATA_MODULES, MODULE_GROUPS } from "../config/mapConfig";
import { fmtUtc, fmtWib } from "../lib/format";

function Modal({ title, kicker, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="modal-head"><div><span className="detail-kicker">{kicker}</span><h2>{title}</h2></div><button aria-label="Tutup" onClick={onClose}><Icon name="close" /></button></header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

const List = ({ items }) => <ul className="plain-list">{items.map((t) => <li key={t}>{t}</li>)}</ul>;

export function AboutPanel({ onClose }) {
  return (
    <Modal title="KARTHUTLALAND" kicker="ABOUT" onClose={onClose}>
      <section><h3>About the Platform</h3>
        <p>Karthutlaland adalah platform pemantauan lingkungan berbasis data geospasial yang berfokus pada pemantauan kebakaran hutan dan lahan, kondisi tutupan hutan, perubahan lingkungan, ekosistem, serta kondisi cuaca di Indonesia.</p>
        <p>Karthutlaland bukan lembaga pemerintah maupun lembaga penegak hukum. Informasi pada peta tidak dimaksudkan sebagai dasar penindakan hukum.</p>
      </section>
      <section><h3>Mission</h3>
        <p>Membantu pengguna memahami kondisi lingkungan melalui integrasi informasi geospasial dan data pengamatan.</p>
      </section>
      <section><h3>Monitoring Capabilities</h3>
        <List items={[
          "Fire intelligence: hotspot NASA FIRMS dengan filter periode, confidence, dan waktu deteksi.",
          "Forest monitoring: tree cover loss, serta layer tutupan hutan, GLAD, dan RADD bila sumber tile dikonfigurasi.",
          "Land cover monitoring: konsesi dan peta sawit bila sumber tile dikonfigurasi.",
          "Ecosystem monitoring: gambut, mangrove, dan kawasan lindung bila sumber tile dikonfigurasi.",
          "Weather intelligence: radar hujan, medan angin model, serta cuaca, prakiraan, dan PM2.5 per koordinat.",
          "Environmental analysis: perbandingan visual antar layer dengan pengaturan opasitas.",
        ]} />
      </section>
      <section><h3>Data Sources</h3>
        <List items={[
          "NASA FIRMS (hotspot).",
          "Global Forest Watch / University of Maryland (tree cover loss).",
          "Esri World Imagery dan label Esri (basemap).",
          "EOX Sentinel-2 cloudless 2024 (basemap).",
          "RainViewer (radar hujan).",
          "Open-Meteo Forecast dan Air Quality API (cuaca, angin, PM2.5).",
          "OpenStreetMap Nominatim (pencarian wilayah).",
          "Layer tematik lain: sumber tile yang dikonfigurasi pada environment variable.",
        ]} />
        <p className="note">Rincian sumber, timestamp, resolusi, dan keterbatasan tiap modul ada pada panel Sumber & status data.</p>
      </section>
      <section><h3>Data Limitations</h3>
        <List items={[
          "Hotspot adalah anomali termal, bukan kebakaran terkonfirmasi.",
          "Tree cover loss bukan sama dengan deforestasi dan bukan bukti pembalakan liar.",
          "Konsesi menunjukkan izin, bukan bukti adanya tanaman. Aplikasi tidak mendeteksi sawit secara otomatis.",
          "Cuaca, prakiraan, angin, dan PM2.5 adalah estimasi model, bukan pengukuran langsung di titik tersebut.",
          "Radar hujan tidak mencakup semua wilayah; area kosong tidak berarti tidak hujan.",
          "Citra satelit, peringatan, konsesi, dan klasifikasi lahan memiliki resolusi dan tanggal berbeda.",
        ]} />
      </section>
    </Modal>
  );
}

const STATE_LABEL = { off: "Nonaktif", ok: "Tersedia", loading: "Memuat", error: "Error", unconfigured: "Not configured" };

export function DataPanel({ onClose, status }) {
  return (
    <Modal title="Sumber & status data" kicker="DATA TRANSPARENCY" onClose={onClose}>
      <p className="note">Status dan timestamp di bawah dibaca dari kondisi aplikasi saat ini. Layer yang belum memiliki sumber ditandai Not configured dan tidak ditampilkan di peta.</p>
      {MODULE_GROUPS.map((g) => (
        <section key={g.id}>
          <h3>{g.title}</h3>
          {DATA_MODULES.filter((m) => m.group === g.id).map((m) => {
            const s = status[m.id] || { state: "off" };
            return (
              <article className="module-card" key={m.id}>
                <div className="module-title"><b>{m.name}</b><span className="module-state"><StatusDot state={s.state} />{s.label || STATE_LABEL[s.state]}</span></div>
                <dl>
                  <dt>Sumber</dt><dd>{m.source}</dd>
                  <dt>Timestamp</dt><dd>{Number.isFinite(s.timestamp) ? `${fmtUtc(s.timestamp)} · ${fmtWib(s.timestamp)}` : s.note || "Belum ada data dimuat"}</dd>
                  <dt>Pembaruan</dt><dd>{m.cadence}</dd>
                  <dt>Resolusi</dt><dd>{m.resolution}</dd>
                  <dt>Keterbatasan</dt><dd>{m.limits}</dd>
                </dl>
              </article>
            );
          })}
        </section>
      ))}
    </Modal>
  );
}
