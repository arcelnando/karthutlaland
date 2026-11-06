export default async function handler(req, res) {
  const MAP_KEY = process.env.FIRMS_MAP_KEY;
  const BBOX = "95,-11,141,6";
  const SOURCE = "VIIRS_SNPP_NRT";
  const DAYS = "1";

  if (!MAP_KEY) {
    return res.status(500).json({ error: "FIRMS_MAP_KEY belum di-set" });
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/${SOURCE}/${BBOX}/${DAYS}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FIRMS error: ${response.status}`);
    const csv = await response.text();
    res.setHeader("Content-Type", "text/csv");
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
