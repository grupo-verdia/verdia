"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Captura, Rodovia } from "@/lib/verdia-domain";

type Props = {
  capturas: Captura[];
  rodovias: Rodovia[];
  height?: string;
};

export function MapaOperacionalClient({
  capturas,
  rodovias,
  height = "100%",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const initializedRef = useRef(false);

  // Create Leaflet exactly once. Do not destroy/recreate the map when live data changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      zoomControl: false,
      scrollWheelZoom: true,
      preferCanvas: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    initializedRef.current = true;

    // Leaflet sometimes initializes its size before the container has its final
    // layout dimensions. invalidateSize after mount avoids stale pane positions.
    const raf = requestAnimationFrame(() => {
      if (mapRef.current) mapRef.current.invalidateSize({ pan: false });
    });

    const handleResize = () => {
      mapRef.current?.invalidateSize({ pan: false });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);

      // Disable interaction before removing the map so a pending wheel/zoom
      // handler cannot run against a pane that has already been detached.
      map.scrollWheelZoom.disable();
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();

      if (mapRef.current === map) {
        mapRef.current = null;
        markersRef.current = null;
      }
      map.remove();
      initializedRef.current = false;
    };
  }, []);

  // Update markers without recreating the Leaflet map.
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();

    const bounds: L.LatLngTuple[] = [];
    const colors: Record<string, string> = {
      alta: "#ff5d5d",
      "média": "#f5b942",
      baixa: "#61d58b",
    };

    for (const c of capturas) {
      if (!Number.isFinite(c.lat) || !Number.isFinite(c.lon)) continue;

      const color = colors[c.classeFinal ?? ""] ?? "#8da49d";
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 9px #0008"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const road = rodovias.find((r) => r.id === c.rodoviaId);
      const marker = L.marker([c.lat, c.lon], { icon });

      marker.bindPopup(
        `<b>${road?.codigo ?? "Rodovia"}</b><br>` +
          `KM ${c.km?.toFixed(1) ?? "—"}<br>` +
          `Altura: ${c.alturaCm ?? "—"} cm<br>` +
          `Severidade: ${c.classeFinal ?? "pendente"}<br>` +
          `<small>${new Date(c.capturedAt).toLocaleString("pt-BR")}</small>`,
      );

      marker.addTo(markers);
      bounds.push([c.lat, c.lon]);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    }

    // Important when the map is inside a tab/section whose dimensions changed.
    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize({ pan: false });
    });
  }, [capturas, rodovias]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", minHeight: 320 }}
    />
  );
}
