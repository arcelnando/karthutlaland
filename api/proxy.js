// api/proxy.js — Vercel Serverless Function (ESM)
const SOURCES = {
  peat: [
    process.env.PEAT_FEATURE_URL,
    // URL GFW yang udah lu tes pakai curl (berhasil)
    'https://gis-gfw.wri.org/arcgis/rest/services/country_data/asia/MapServer/10',
  ].filter(Boolean),
  radd: [
    process.env.RADD_FEATURE_URL,
  ].filter(Boolean),
};

const MAX_SPAN_DEG = 10; // Batas maksimal luas peta yang di-fetch (derajat)

function parseBbox(raw) {
  const p = String(raw || '').split(',').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return null;
  const [minLon, minLat, maxLon, maxLat] = p;
  if (minLon >= maxLon || minLat >= maxLat) return null;
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) return null;
  if (maxLon - minLon > MAX_SPAN_DEG || maxLat - minLat > MAX_SPAN_DEG) return null;
  return p;
}

// Fungsi konversi Esri JSON ke GeoJSON (jaga-jaga kalau f=geojson gagal)
function ringArea(r) {
  let s = 0;
  for (let i = 0; i < r.length - 1; i++) s += (r[i + 1][0] - r[i][0]) * (r[i + 1][1] + r[i][1]);
  return s;
}

function esriToGeoJSON(esri) {
  const features = (esri.features || [])
    .map((f) => {
      const polys = [];
      for (const ring of f.geometry?.rings || []) {
        if (ringArea(ring) > 0) polys.push([ring]);
        else if (polys.length) polys[polys.length - 1].push(ring);
      }
      return {
        type: 'Feature',
        properties: f.attributes || {},
        geometry: polys.length ? { type: 'MultiPolygon', coordinates: polys } : null,
      };
    })
    .filter((f) => f.geometry);
  return { type: 'FeatureCollection', features };
}

// Buang koordinat Z (ketinggian) dan pangkas presisi ke ~1 meter
function slim(c) {
  return typeof c[0] === 'number' ? [+c[0].toFixed(5), +c[1].toFixed(5)] : c.map(slim);
}

function slimFC(fc) {
  for (const f of fc.features) {
    if (f.geometry?.coordinates) f.geometry.coordinates = slim(f.geometry.coordinates);
  }
  return fc;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { type, bbox } = req.query;
  if (!Object.prototype.hasOwnProperty.call(SOURCES, type)) {
    return res.status(400).json({ error: 'type harus "radd" atau "peat"' });
  }
  const urls = SOURCES[type];
  if (!urls.length) {
    return res.status(501).json({ error: `Sumber data "${type}" belum dikonfigurasi.` });
  }

  const box = parseBbox(bbox);
  if (!box) return res.status(400).json({ error: 'bbox tidak valid / terlalu besar (zoom in dulu)' });

  const span = Math.max(box[2] - box[0], box[3] - box[1]);
  const buildParams = (fmt) =>
    new URLSearchParams({
      where: '1=1',
      geometry: box.join(','),
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outSR: '4326',
      outFields: '*',
      returnGeometry: 'true',
      resultRecordCount: '2000',
      maxAllowableOffset: String(span / 500),
      f: fmt,
    });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000); // Timeout 25 detik

  const run = async (baseUrl, fmt) => {
    const r = await fetch(`${baseUrl}/query?${buildParams(fmt)}`, { signal: controller.signal });
    if (!r.ok) throw new Error(`ArcGIS ${r.status}`);
    return r.json();
  };

  try {
    let result = null;
    for (const baseUrl of urls) {
      try {
        let data = await run(baseUrl, 'geojson');
        if (data.error || data.type !== 'FeatureCollection') {
          const esri = await run(baseUrl, 'json');
          if (esri.error) continue;
          data = esriToGeoJSON(esri);
        }
        result = data;
        break; // Kalau berhasil, stop loop
      } catch (e) {
        if (e.name === 'AbortError') throw e; // Kalau timeout, langsung lempar
      }
    }

    if (!result) return res.status(502).json({ error: 'Semua sumber gagal' });

    // Cache 1 jam biar server nggak kerja berat
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(slimFC(result));
  } catch (err) {
    const timedOut = err.name === 'AbortError';
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'Timeout ke ArcGIS' : 'Gagal mengambil data ArcGIS',
    });
  } finally {
    clearTimeout(timer);
  }
}
