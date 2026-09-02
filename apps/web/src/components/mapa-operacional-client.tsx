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
  /** 1-based plan ordem keyed by trecho id (captura.trechoId). */
  planOrdemById?: Readonly<Record<string, number>>;
};

const COLORS: Record<string, string> = {
  alta: "#ff5d5d",
  média: "#f5b942",
  baixa: "#61d58b",
};

function markerIcon(color: string, ordem: number | undefined): L.DivIcon {
  const inPlan = typeof ordem === "number";
  const size = inPlan ? 22 : 14;
  const ring = inPlan
    ? "box-shadow:0 0 0 1px rgba(0,0,0,0.35),0 0 0 5px #111"
    : "box-shadow:0 2px 9px #0008";
  const badge = inPlan
    ? `<span style="position:absolute;top:-0.55rem;right:-0.55rem;min-width:1.1rem;height:1.1rem;padding:0 0.15rem;border-radius:999px;background:#111;color:#fff;font:700 0.65rem/1.1rem sans-serif;text-align:center">${ordem}</span>`
    : "";
  return L.divIcon({
    className: "",
    html: `<span style="position:relative;display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;${ring}">${badge}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function MapaOperacionalClient({
  capturas,
  rodovias,
  height = "100%",
  planOrdemById = {},
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
      const ordem = planOrdemById[captura.trechoId];
      const icon = markerIcon(color, ordem);
      const road = rodovias.find((item) => item.id === captura.rodoviaId);
      const planLine =
        typeof ordem === "number" ? `Plano: ordem <b>${ordem}</b><br>` : "";
      const marker = L.marker([captura.lat, captura.lon], { icon });
      marker.bindPopup(
        `<b>${road?.codigo ?? "Rodovia"}</b><br>` +
          planLine +
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
  }, [capturas, rodovias, planOrdemById]);

  const inPlan = Object.keys(planOrdemById).length > 0;

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", minHeight: 320 }}
      role="img"
      aria-label={
        inPlan
          ? "Mapa de capturas com plano destacado"
          : "Mapa de capturas"
      }
    />
  );
}
