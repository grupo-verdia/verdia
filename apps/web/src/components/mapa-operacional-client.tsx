"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Captura } from "@/lib/domain";
import type { Rodovia } from "@/lib/rodovias";

type Props = {
  capturas: Captura[];
  rodovias: Rodovia[];
  height?: string;
};

const COLORS: Record<string, string> = {
  alta: "#ff5d5d",
  média: "#f5b942",
  baixa: "#61d58b",
};

export function MapaOperacionalClient({
  capturas,
  rodovias,
  height = "100%",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return;
    }

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

    const raf = requestAnimationFrame(() => {
      mapRef.current?.invalidateSize({ pan: false });
    });
    const handleResize = () => {
      mapRef.current?.invalidateSize({ pan: false });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
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
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) {
      return;
    }

    markers.clearLayers();
    const bounds: L.LatLngTuple[] = [];

    for (const captura of capturas) {
      if (!Number.isFinite(captura.lat) || !Number.isFinite(captura.lon)) {
        continue;
      }

      const color = COLORS[captura.classe ?? ""] ?? "#8da49d";
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 9px #0008"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const road = rodovias.find((item) => item.id === captura.rodoviaId);
      const marker = L.marker([captura.lat, captura.lon], { icon });
      marker.bindPopup(
        `<b>${road?.codigo ?? "Rodovia"}</b><br>` +
          `KM ${captura.km?.toFixed(1) ?? "—"}<br>` +
          `Altura: ${captura.alturaCm ?? "—"} cm<br>` +
          `Severidade: ${captura.classe ?? "pendente"}<br>` +
          `<small>${new Date(captura.capturedAt).toLocaleString("pt-BR")}</small>`,
      );
      marker.addTo(markers);
      bounds.push([captura.lat, captura.lon]);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0]!, 13);
    } else {
      map.setView([-14.235, -51.9253], 4);
    }

    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize({ pan: false });
    });
  }, [capturas, rodovias]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", minHeight: 320 }}
      role="img"
      aria-label="Mapa operacional de capturas"
    />
  );
}
