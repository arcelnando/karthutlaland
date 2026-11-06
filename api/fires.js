export default async function handler(req, res) {
  const MAP_KEY = process.env.FIRMS_MAP_KEY;
  // Bounding box Indonesia: Barat, Selatan, Timur, Utara
  const BBOX = "95,-11,141,6"; 
  const DAYS = "1";

  if (!MAP_KEY) {
    return res.status(500).json({ error: "FIRMS_MAP_KEY belum di-set di Vercel" });
  }

  // NOAA-20 adalah satelit pengganti SNPP yang datanya masih aktif
  const SOURCE = "VIIRS_NOAA20_NRT"; 

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/${SOURCE}/${BBOX}/${DAYS}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NASA API error: ${response.status}`);
    }
    
    const csv = await response.text();
    
    // Set header biar browser ngebaca ini sebagai teks biasa, bukan JSON
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate"); // Cache 1 jam biar API NASA ga di-spam
    
    return res.status(200).send(csv);
  } catch (err) {
    console.error("Fetch FIRMS gagal:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
