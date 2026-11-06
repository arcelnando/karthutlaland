export const dynamic = 'force-dynamic'; // Paksa Vercel jangan cache API ini
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
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`NASA API error: ${response.status}`);
    
    const csv = await response.text();
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate"); 
    return res.status(200).send(csv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
