const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/** Same basemap as prosecutor_dtp_next (lib/map-tiles.ts). */
export const MAP_TILE_OPTIONS = {
  maxZoom: 19,
  detectRetina: true,
  attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap',
} as const;

/** Dark Mapbox style for the login page backdrops; null without a token. */
export function darkTileUrl(): string | null {
  if (!MAPBOX_TOKEN) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}{r}?access_token=${MAPBOX_TOKEN}`;
}
