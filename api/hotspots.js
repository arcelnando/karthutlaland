export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function handler(req, res) {
  const MAP_KEY = process.env.FIRMS_MAP_KEY;
  const BBOX = "95,-11,141,6";
  const DAYS = "1"; 
  const SOURCE = "VIIRS_NOAA20_NRT";

  if (!MAP_KEY) {
    return res.status(500).json({ error: "FIRMS_MAP_KEY belum di-set di Vercel" });
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/${SOURCE}/${BBOX}/${DAYS}`;

  try {
    // Request ke NASA dengan mode anti-cache
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    
    if (!response.ok) throw new Error(`NASA error: ${response.status}`);
    const csv = await response.text();
    
    // Paksa Vercel dan browser buat nggak nyimpen data ini sama sekali
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
