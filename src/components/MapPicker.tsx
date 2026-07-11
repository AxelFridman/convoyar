import React, { useEffect, useRef } from "react";
import L from "leaflet";
import type { LatLng } from "../engine/types";

export interface MapMarker {
  loc: LatLng;
  kind: "origin" | "destination" | "meeting" | "stop";
  label?: string;
}

interface Props {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  route?: LatLng[];
  onTap?: (loc: LatLng) => void;
  height?: number;
}

const ERROR_TILE =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect width='256' height='256' fill='#1d232b'/><path d='M0 0h256M0 64h256M0 128h256M0 192h256M0 0v256M64 0v256M128 0v256M192 0v256' stroke='#303a46' stroke-width='1'/></svg>`
  );

function divIcon(kind: MapMarker["kind"], label?: string) {
  const cls = `mkr mkr-${kind}`;
  const inner = label ? `<span class="mkr-lbl">${escapeHtml(label)}</span>` : "";
  return L.divIcon({
    className: "",
    html: `<div class="${cls}">${inner}</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export default function MapPicker({ center, zoom = 12, markers = [], route, onTap, height = 220 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([center.lat, center.lng], zoom);
    map.attributionControl.setPrefix(false);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      errorTileUrl: ERROR_TILE,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      onTapRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Leaflet a veces mide mal dentro de layouts flex recién montados
    setTimeout(() => map.invalidateSize(), 60);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // markers + ruta
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const m of markers) {
      L.marker([m.loc.lat, m.loc.lng], { icon: divIcon(m.kind, m.label), interactive: false }).addTo(layer);
    }
    if (route && route.length > 1) {
      L.polyline(
        route.map((p) => [p.lat, p.lng]),
        { color: "#FFB53F", weight: 3, opacity: 0.85, dashArray: "6 8" }
      ).addTo(layer);
    }
    const pts = [...markers.map((m) => m.loc), ...(route ?? [])];
    if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [28, 28], maxZoom: 14 });
    } else if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], Math.max(map.getZoom(), 13));
    }
  }, [markers, route]);

  return <div ref={ref} className="map" style={{ height }} />;
}
