'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

import { darkTileUrl, MAP_TILE_OPTIONS } from '@/lib/map-tiles';

const ALMATY_CENTER: [number, number] = [43.238949, 76.889709];

/** Approximate district centres — decorative pulses on the hero map. */
const DISTRICTS: [string, number, number][] = [
  ['Алмалинский', 43.252, 76.912],
  ['Бостандыкский', 43.214, 76.903],
  ['Ауэзовский', 43.223, 76.843],
  ['Медеуский', 43.25, 76.968],
  ['Турксибский', 43.33, 76.95],
  ['Жетысуский', 43.288, 76.94],
  ['Наурызбайский', 43.19, 76.79],
  ['Алатауский', 43.282, 76.83],
];

type Props = {
  zoom: number;
  /** Shows pulsing district markers (hero side only). */
  withDistricts?: boolean;
};

/** Non-interactive dark Leaflet map used purely as decoration on the login
 * page (as in prosecutor_dtp_next/components/LoginBackgroundMap). Must be
 * loaded via next/dynamic({ ssr: false }) — leaflet touches `window`. */
export function LoginMap({ zoom, withDistricts = false }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const url = darkTileUrl();
    if (!containerRef.current || !url) return;
    const map = L.map(containerRef.current, {
      center: ALMATY_CENTER,
      zoom,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: false,
    });
    L.tileLayer(url, MAP_TILE_OPTIONS).addTo(map);
    if (withDistricts) {
      DISTRICTS.forEach(([name, lat, lon], i) => {
        const icon = L.divIcon({
          className: 'login-district',
          html: `<span style="animation-delay:${(i * 0.45).toFixed(2)}s"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([lat, lon], { icon, interactive: false, keyboard: false, title: name }).addTo(map);
      });
    }
    return () => {
      map.remove();
    };
  }, [zoom, withDistricts]);

  // Explicit zIndex: its own stacking context, so Leaflet panes stay below the overlays.
  return <div ref={containerRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />;
}
