"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { Captura } from "@/lib/domain";
import { capturaMapPopupHtml } from "@/lib/mapa-popup";
import type { Rodovia } from "@/lib/rodovias";

type Props = {
  capturas: Captura[];
  rodovias: Rodovia[];
  height?: string;
  /** 1-based plan ordem keyed by trecho id (captura.trechoId). */
  planOrdemById?: Readonly<Record<string, number>>;
  /** Captura id to fly to and highlight on the map (e.g. selected from a list). */
  selectedCapturaId?: string | null;
};

/** Stable default so live re-renders do not rebuild markers or refit the camera. */
const EMPTY_PLAN_ORDEM: Readonly<Record<string, number>> = {};

const COLORS: Record<string, string> = {
  alta: "#ff5d5d",
  média: "#f5b942",
  baixa: "#61d58b",
};

function markerIcon(
  color: string,
  ordem: number | undefined,
  selected: boolean,
): L.DivIcon {
  const inPlan = typeof ordem === "number";
  const size = selected ? 26 : inPlan ? 22 : 14;
  const ring = selected
    ? "box-shadow:0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent),0 0 0 6px var(--accent)"
    : inPlan
      ? "box-shadow:0 0 0 1px color-mix(in srgb, var(--marker-ring) 35%, transparent),0 0 0 5px var(--marker-ring)"
      : "box-shadow:0 2px 9px color-mix(in srgb, var(--marker-ring) 50%, transparent)";
  const badge = inPlan
    ? `<span style="position:absolute;top:-0.55rem;right:-0.55rem;min-width:1.1rem;height:1.1rem;padding:0 0.15rem;border-radius:999px;background:var(--marker-ring);color:var(--marker-border);font:700 0.65rem/1.1rem sans-serif;text-align:center">${ordem}</span>`
    : "";
  return L.divIcon({
    className: "",
    html: `<span style="position:relative;display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid var(--marker-border);${ring}">${badge}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function MapaOperacionalClient({
  capturas,
  rodovias,
  height = "100%",
  planOrdemById = EMPTY_PLAN_ORDEM,
  selectedCapturaId = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());
  const fittedRef = useRef(false);
  const flownToRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

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
    setMapReady(true);

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
      setMapReady(false);
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
    if (!mapReady || !map || !markers) {
      return;
    }

    markers.clearLayers();
    markerByIdRef.current.clear();
    const bounds: L.LatLngTuple[] = [];

    for (const captura of capturas) {
      if (!Number.isFinite(captura.lat) || !Number.isFinite(captura.lon)) {
        continue;
      }

      const color = COLORS[captura.classe ?? ""] ?? "var(--muted)";
      const ordem = planOrdemById[captura.trechoId];
      const selected = captura.id === selectedCapturaId;
      const icon = markerIcon(color, ordem, selected);
      const road = rodovias.find((item) => item.id === captura.rodoviaId);
      const marker = L.marker([captura.lat, captura.lon], {
        icon,
        zIndexOffset: selected ? 1000 : 0,
      });
      marker.bindPopup(
        capturaMapPopupHtml(captura, road?.codigo ?? null, ordem),
        { maxWidth: 280, className: "map-popup-wrap" },
      );
      marker.addTo(markers);
      markerByIdRef.current.set(captura.id, marker);
      bounds.push([captura.lat, captura.lon]);
    }

    // Live refresh rebuilds this list every few seconds. Fit once so zoom/pan stay put.
    if (!fittedRef.current) {
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
        fittedRef.current = true;
      } else if (bounds.length === 1) {
        map.setView(bounds[0]!, 13);
        fittedRef.current = true;
      } else {
        map.setView([-14.235, -51.9253], 4);
      }
    }

    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize({ pan: false });
    });
  }, [mapReady, capturas, rodovias, planOrdemById, selectedCapturaId]);

  // Fly to and open the popup for a selected captura (e.g. clicked from a list),
  // once per selection so live data refreshes don't keep re-triggering the animation.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }
    if (!selectedCapturaId) {
      flownToRef.current = null;
      return;
    }
    if (flownToRef.current === selectedCapturaId) {
      return;
    }
    const marker = markerByIdRef.current.get(selectedCapturaId);
    if (!marker) {
      return;
    }
    flownToRef.current = selectedCapturaId;
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 14), {
      duration: 0.6,
    });
    marker.openPopup();
  }, [selectedCapturaId, mapReady, capturas]);

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
