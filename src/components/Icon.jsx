// Ikon SVG inline. Seragam: viewBox 24, stroke 1.7, tanpa fill kecuali titik kecil.
const PATHS = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  locate: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></>,
  flame: <path d="M12 22c4 0 7-2.8 7-6.7 0-3.1-1.8-5.3-4.6-8.3-.1 2.2-1.1 3.4-2.2 4.2C12 7.4 10.6 4.7 8 2 8.2 6 5 9.1 5 14.8 5 19 7.8 22 12 22Z" />,
  tree: <><path d="M12 22v-5" /><path d="m12 2 5 7h-3l4 5H6l4-5H7l5-7Z" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  wind: <path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h7" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  satellite: <><path d="m4 4 5 5m6 6 5 5M8 3l4 4m5 5 4 4M3 8l4-4m10 13 4-4" /><rect x="8" y="8" width="8" height="8" rx="2" /></>,
  rain: <><path d="M20 16.2A4.8 4.8 0 0 0 18 7h-1.2A6 6 0 1 0 5 14" /><path d="m8 16-1 3m6-3-1 3m6-3-1 3" /></>,
  sprout: <><path d="M12 21v-9" /><path d="M12 12C5 12 4 7 4 4c5 0 8 2 8 8Zm0 2c0-5 3-8 8-8 0 4-1 8-8 8Z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.8v.01" /></>,
  database: <><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  alert: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4.5" /><path d="M12 17.3v.01" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  pin: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  chart: <><path d="M3 3v18h18" /><path d="M8 17v-4m5 4V6m5 11V9" /></>,
};

export default function Icon({ name, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name] || PATHS.layers}
    </svg>
  );
}

// Path ikon flame sebagai string untuk L.divIcon (tanpa emoji).
export const FLAME_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 22c4 0 7-2.8 7-6.7 0-3.1-1.8-5.3-4.6-8.3-.1 2.2-1.1 3.4-2.2 4.2C12 7.4 10.6 4.7 8 2 8.2 6 5 9.1 5 14.8 5 19 7.8 22 12 22Z"/></svg>';
