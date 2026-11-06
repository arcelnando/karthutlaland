const pad = (n) => String(n).padStart(2, "0");
const stamp = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

export function fmtUtc(ms) {
  return Number.isFinite(ms) ? `${stamp(new Date(ms))} UTC` : "—";
}
export function fmtWib(ms) {
  return Number.isFinite(ms) ? `${stamp(new Date(ms + 7 * 3600 * 1000))} WIB` : "—";
}
