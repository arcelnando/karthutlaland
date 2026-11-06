// Konfigurasi sumber data peta. Semua batas zoom ada di sini agar konsisten.
//
// Aturan zoom Leaflet:
//   maxNativeZoom = zoom tertinggi yang benar-benar disediakan provider.
//   maxZoom (layer) = zoom tertinggi yang boleh ditampilkan layer; harus >= maxZoom peta,
//   jika tidak layer akan HILANG di atas zoom tersebut (bukan di-upscale).
// Di atas maxNativeZoom, Leaflet memperbesar tile terakhir dan tidak meminta tile baru.

export const CENTER = [-2, 118];
export const MAP_MIN_ZOOM = 3;
export const MAP_MAX_ZOOM = 18;

const env = (key) => (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env[key] : "") || "";

export const BASEMAPS = {
  esri: {
    id: "esri",
    label: "Satelit",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    // Konservatif: cakupan resolusi tinggi Esri tidak merata di Indonesia. Di atas zoom ini tile
    // diperbesar, bukan diminta ke server (server dapat mengembalikan "Map data not yet available").
    maxNativeZoom: 17,
    attribution: "Esri World Imagery (Maxar, Earthstar Geographics)",
  },
  sentinel: {
    id: "sentinel",
    label: "Sentinel-2",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg",
    maxNativeZoom: 14, // EOX: tile pyramid EPSG:3857 zoom 0-14
    attribution: "Sentinel-2 cloudless 2024 by EOX (Copernicus Sentinel data)",
  },
};

export const LABELS = {
  url: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  maxNativeZoom: 15, // konservatif; belum diverifikasi terhadap metadata layanan Esri
  attribution: "Labels Esri",
};

export const GFW_LOSS = {
  url: "https://tiles.globalforestwatch.org/umd_tree_cover_loss/v1.13/dynamic/{z}/{x}/{y}.png?start_year=2001&end_year=2025&render_type=true_color&tree_cover_density_threshold=30",
  maxNativeZoom: 12, // GFW: tidak direkomendasikan di atas zoom 12
  attribution: "Tree cover loss: UMD / Global Forest Watch",
  color: "#dc6699",
};

export const RAIN = {
  meta: "https://api.rainviewer.com/public/weather-maps.json",
  maxNativeZoom: 7, // RainViewer: "Maximum zoom level is 7"
  refreshMs: 5 * 60 * 1000,
  attribution: "Radar RainViewer",
};

export const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
export const AIR_API = "https://air-quality-api.open-meteo.com/v1/air-quality";

// Grid angin: titik pada kisi 3 derajat di atas Indonesia (94-142 BT, 9 LU - 12 LS).
export const WIND_GRID = { lonMin: 94, lonMax: 142, latMax: 9, latMin: -12, step: 3, cacheMs: 30 * 60 * 1000 };

// Layer tematik opsional: URL tile XYZ diisi lewat Environment Variables Vercel.
// Zoom asli layer ini tidak diketahui aplikasi; default konservatif 12, dapat diubah via zoomEnv.
const DEFAULT_OPTIONAL_NATIVE_ZOOM = 12;
const parseZoom = (v) => {
  if (v === "" || v == null) return DEFAULT_OPTIONAL_NATIVE_ZOOM;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= MAP_MAX_ZOOM ? n : DEFAULT_OPTIONAL_NATIVE_ZOOM;
};

const OPTIONAL_DEFS = [
  { id: "forestCover", group: "forest", title: "Forest cover", detail: "Tutupan pohon / hutan", env: "VITE_FOREST_COVER_TILE_URL", zoomEnv: "VITE_FOREST_COVER_MAX_NATIVE_ZOOM", color: "#3fb950" },
  { id: "glad", group: "forest", title: "GLAD alerts", detail: "Peringatan kehilangan tutupan pohon", env: "VITE_GLAD_TILE_URL", zoomEnv: "VITE_GLAD_MAX_NATIVE_ZOOM", color: "#d29922" },
  { id: "radd", group: "forest", title: "RADD alerts", detail: "Peringatan gangguan hutan berbasis radar", env: "VITE_RADD_TILE_URL", zoomEnv: "VITE_RADD_MAX_NATIVE_ZOOM", color: "#e3703a" },
  { id: "palm", group: "palm", title: "Oil palm map", detail: "Klasifikasi kebun sawit dari dataset eksternal", env: "VITE_OIL_PALM_TILE_URL", zoomEnv: "VITE_OIL_PALM_MAX_NATIVE_ZOOM", color: "#9ccc65" },
  { id: "concessions", group: "palm", title: "Palm concessions", detail: "Batas izin / konsesi, bukan bukti tanaman", env: "VITE_PALM_CONCESSION_TILE_URL", zoomEnv: "VITE_PALM_CONCESSION_MAX_NATIVE_ZOOM", color: "#b388eb" },
  { id: "peat", group: "ecosystem", title: "Peatland", detail: "Ekosistem gambut", env: "VITE_PEATLAND_TILE_URL", zoomEnv: "VITE_PEATLAND_MAX_NATIVE_ZOOM", color: "#a1785a" },
  { id: "mangrove", group: "ecosystem", title: "Mangroves", detail: "Ekosistem mangrove", env: "VITE_MANGROVE_TILE_URL", zoomEnv: "VITE_MANGROVE_MAX_NATIVE_ZOOM", color: "#2fb5ad" },
  { id: "protected", group: "ecosystem", title: "Protected areas", detail: "Kawasan konservasi", env: "VITE_PROTECTED_AREAS_TILE_URL", zoomEnv: "VITE_PROTECTED_AREAS_MAX_NATIVE_ZOOM", color: "#7b9be0" },
];

export const OPTIONAL_LAYERS = OPTIONAL_DEFS.map((d) => ({ ...d, url: env(d.env), maxNativeZoom: parseZoom(env(d.zoomEnv)) }));

// Metadata transparansi data per modul. Status runtime ditambahkan oleh App.
export const MODULE_GROUPS = [
  { id: "basemap", title: "Basemap" },
  { id: "fire", title: "Fire Intelligence" },
  { id: "forest", title: "Forest & Deforestation" },
  { id: "palm", title: "Palm Watch" },
  { id: "ecosystem", title: "Ecosystem Monitoring" },
  { id: "weather", title: "Weather Intelligence" },
];

const EXTERNAL = "Ditentukan oleh URL tile pada environment variable; aplikasi tidak memverifikasi isi dataset.";
const optionalMeta = {
  forestCover: { limits: "Menampilkan tutupan pohon sesuai dataset yang dikonfigurasi; definisi hutan mengikuti penyedia data." },
  glad: { limits: "Peringatan berbasis citra optik; dipengaruhi awan. Peringatan bukan verifikasi lapangan dan bukan bukti pelanggaran." },
  radd: { limits: "Peringatan berbasis radar Sentinel-1 yang tidak terhalang awan; cakupan umumnya terbatas pada hutan primer tropis lembap. Bukan verifikasi lapangan." },
  palm: { limits: "Aplikasi tidak melakukan deteksi sawit sendiri. Isi layer sepenuhnya mengikuti dataset klasifikasi yang dikonfigurasi." },
  concessions: { limits: "Batas konsesi menunjukkan izin, bukan bukti adanya tanaman atau kondisi lapangan. Analisis tumpang tindih otomatis belum tersedia." },
  peat: { limits: "Batas ekosistem mengikuti dataset yang dikonfigurasi dan dapat berbeda dengan kondisi aktual." },
  mangrove: { limits: "Sebaran mangrove mengikuti dataset dan tahun yang dikonfigurasi." },
  protected: { limits: "Batas kawasan mengikuti dataset yang dikonfigurasi; bukan dokumen hukum." },
};

export const DATA_MODULES = [
  {
    id: "esri", group: "basemap", name: "Esri World Imagery",
    source: "Esri World Imagery (Maxar, Earthstar Geographics, dan kontributor lain)",
    resolution: `Bervariasi per lokasi. Tile asli diminta sampai zoom ${BASEMAPS.esri.maxNativeZoom}; di atasnya tile diperbesar.`,
    cadence: "Tanggal citra berbeda-beda per area dan tidak ditampilkan.",
    limits: "Citra dapat berumur lama. Cakupan resolusi tinggi tidak merata di wilayah terpencil.",
  },
  {
    id: "sentinel", group: "basemap", name: "Sentinel-2 cloudless 2024",
    source: "EOX Sentinel-2 cloudless 2024 (data Copernicus Sentinel yang dimodifikasi)",
    resolution: `10 m. Tile asli sampai zoom ${BASEMAPS.sentinel.maxNativeZoom} (dokumentasi EOX); di atasnya diperbesar.`,
    cadence: "Mosaik tahunan 2024, bukan citra terkini.",
    limits: "Komposit bebas awan; tanggal akuisisi berbeda per piksel. Tidak cocok untuk memantau kejadian terbaru.",
  },
  {
    id: "hotspots", group: "fire", name: "NASA FIRMS hotspot",
    source: "NASA FIRMS (Fire Information for Resource Management System), diterima melalui endpoint proyek /api/hotspots",
    resolution: "Produk VIIRS 375 m (sesuai kolom bright_ti4 yang dibaca aplikasi). Koordinat adalah pusat piksel deteksi, bukan batas area terbakar.",
    cadence: "Near-real-time; mengikuti jadwal lintasan satelit dan latensi produk FIRMS. Dimuat ulang saat rentang diubah.",
    limits: "Hotspot adalah anomali termal yang terdeteksi satelit, bukan kebakaran terkonfirmasi. Dapat terlewat karena awan tebal atau jeda lintasan, dan dapat berasal dari sumber panas non-kebakaran. Satelit dan instrumen ditampilkan per titik bila ada pada data.",
  },
  {
    id: "loss", group: "forest", name: "Tree cover loss",
    source: "Global Forest Watch / University of Maryland (Hansen dkk.), tile dinamis umd_tree_cover_loss v1.13",
    resolution: `30 m. Tile asli sampai zoom ${GFW_LOSS.maxNativeZoom}; di atasnya diperbesar.`,
    cadence: "Tahunan; rentang 2001-2025 sesuai parameter URL. Ketersediaan tahun terakhir ditentukan GFW.",
    limits: "Tree cover loss bukan sama dengan deforestasi: mencakup kehilangan akibat kebakaran, panen perkebunan, dan penyebab alami. Layer ini tidak menentukan penyebab dan bukan bukti pembalakan liar. Ambang kerapatan tajuk 30%.",
  },
  ...OPTIONAL_DEFS.map((d) => ({
    id: d.id, group: d.group, name: d.title, source: EXTERNAL,
    resolution: `Mengikuti dataset. Zoom asli dianggap ${parseZoom(env(d.zoomEnv))} (atur lewat ${d.zoomEnv}).`,
    cadence: "Mengikuti penyedia data.", limits: optionalMeta[d.id].limits,
  })),
  {
    id: "rain", group: "weather", name: "Rain radar",
    source: "RainViewer Weather Maps API",
    resolution: `Komposit radar. Tile asli sampai zoom ${RAIN.maxNativeZoom} (dokumentasi RainViewer); di atasnya diperbesar.`,
    cadence: "Frame per 10 menit, hanya 2 jam terakhir. Aplikasi memuat ulang tiap 5 menit.",
    limits: "Cakupan radar tidak merata; area tanpa radar tampak kosong dan itu bukan berarti tidak hujan. Intensitas radar bukan akumulasi curah hujan terukur.",
  },
  {
    id: "wind", group: "weather", name: "Wind field",
    source: "Open-Meteo (keluaran model cuaca), kisi 3 x 3 derajat di atas Indonesia",
    resolution: "Jarak antar titik sekitar 330 km; diinterpolasi oleh leaflet-velocity.",
    cadence: "Diambil saat layer diaktifkan, disimpan 30 menit.",
    limits: "Estimasi model pada ketinggian 10 m dan sangat kasar. Tidak mewakili angin lokal dan bukan pengukuran.",
  },
  {
    id: "point", group: "weather", name: "Cuaca & kualitas udara per koordinat",
    source: "Open-Meteo Forecast API dan Open-Meteo Air Quality API",
    resolution: "Resolusi model; bukan pengukuran stasiun di titik tersebut.",
    cadence: "Diambil saat titik dipilih di peta atau pada hotspot.",
    limits: "Prakiraan adalah estimasi model. PM2.5 adalah estimasi model, bukan sensor. Kategori kualitas udara memakai ambang US EPA, bukan ISPU.",
  },
];
