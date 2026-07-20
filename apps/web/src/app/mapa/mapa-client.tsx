"use client";

import { useEffect, useRef } from "react";
import L, { type LatLngExpression, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  SEVERIDADE_MARKER,
  type MapTrecho,
} from "@/lib/mapa";

type MapaClientProps = {
  trechos: MapTrecho[];
};

export function MapaClient({ trechos }: MapaClientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const map: LeafletMap = L.map(container, {
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const bounds: LatLngExpression[] = [];

    for (const trecho of trechos) {
      const markerStyle = SEVERIDADE_MARKER[trecho.severidade];
      const size = markerStyle.radius * 2;
      const icon = L.divIcon({
        className: "verdia-trecho-marker",
        html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${markerStyle.color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.35)"></span>`,
        iconSize: [size, size],
        iconAnchor: [markerStyle.radius, markerStyle.radius],
      });

      const marker = L.marker([trecho.lat, trecho.lon], { icon }).addTo(map);
      marker.bindPopup(
        `<strong>Trecho</strong> ${trecho.id.slice(0, 8)}…<br/>` +
          `Severidade: <strong>${markerStyle.label}</strong><br/>` +
          `${trecho.capturaCount} captura${trecho.capturaCount === 1 ? "" : "s"}<br/>` +
          `GPS ${trecho.lat.toFixed(5)}, ${trecho.lon.toFixed(5)}`,
      );
      bounds.push([trecho.lat, trecho.lon]);
    }

    if (bounds.length === 0) {
      map.setView([-14.235, -51.9253], 4);
    } else if (bounds.length === 1) {
      map.setView(bounds[0]!, 12);
    } else {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }

    return () => {
      map.remove();
    };
  }, [trechos]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "min(70vh, 36rem)",
        border: "1px solid #ccc",
        background: "#e8e8e8",
      }}
      role="img"
      aria-label="Mapa geoespacial de trechos"
    />
  );
}
