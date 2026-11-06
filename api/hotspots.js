export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function handler(req, res) {
  const MAP_KEY = process.env.FIRMS_MAP_KEY;
  const BBOX = "95,-11,141,6"; // Indonesia
  const DAYS = "3"; // Tarik data 3 hari ke belakang biar pasti ada isinya

  if (!MAP_KEY) return res.status(500).json({ error: "FIRMS_MAP_KEY belum di-set" });

  try {
    // Kita tarik dari 2 satelit sekaligus biar datanya melimpah
    const sensors = ["VIIRS_NOAA20_NRT", "VIIRS_SNPP_NRT"];
    
    const fetchPromises = sensors.map(sensor => {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/${sensor}/${BBOX}/${DAYS}`;
      return fetch(url, { cache: 'no-store' }).then(r => r.text());
    });

    const results = await Promise.all(fetchPromises);
    
    // Gabungin datanya (buang header duplikat)
    let combinedCsv = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n";
    
    results.forEach(csv => {
      const lines = csv.trim().split("\n");
      if (lines.length > 1) {
        // Ambil data aja, buang baris pertama (header)
        combinedCsv += lines.slice(1).join("\n") + "\n";
      }
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).send(combinedCsv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
