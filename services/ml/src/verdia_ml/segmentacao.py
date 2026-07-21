"""Segmentação — isolates roadside vegetation for overlay (ADR-0001 Option A).

Does not decide classe. ExG + Otsu is the lightweight CPU path allowed by
ADR-0001 as the early sanity-check segmentação baseline.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from io import BytesIO

import numpy as np
from PIL import Image

from verdia_ml.image_ops import excess_green


@dataclass(frozen=True)
class SegmentacaoResult:
    """Roadside vegetation mask + PNG overlay. No classe field by design."""

    mask: np.ndarray  # bool HxW
    overlay_png_base64: str


def segmentar(rgb: np.ndarray) -> SegmentacaoResult:
    """Isolate vegetation pixels and render a visualization overlay."""
    if rgb.ndim != 3 or rgb.shape[2] != 3:
        raise ValueError(f"expected HxWx3 RGB array, got shape {rgb.shape}")

    mask = _vegetation_mask(rgb)
    overlay_png_base64 = _overlay_png_base64(rgb, mask)
    return SegmentacaoResult(mask=mask, overlay_png_base64=overlay_png_base64)


def _vegetation_mask(rgb: np.ndarray) -> np.ndarray:
    exg = excess_green(rgb)
    threshold = _otsu_threshold(exg)
    return exg > threshold


def _otsu_threshold(values: np.ndarray) -> float:
    """Otsu threshold on a continuous ExG map (256-bin histogram).

    When ExG is constant / unsplittable, return -inf so the mask keeps the full
    frame. That avoids an all-false mask that would skip cleaned-region
    preprocessing in the ordinal classifier (Option A).
    """
    flat = values.ravel()
    vmin = float(flat.min())
    vmax = float(flat.max())
    if vmax <= vmin:
        return float("-inf")

    hist, bin_edges = np.histogram(flat, bins=256, range=(vmin, vmax))
    hist = hist.astype(np.float64)
    total = hist.sum()
    if total <= 0:
        return float("-inf")

    bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2.0
    weight_bg = np.cumsum(hist)
    weight_fg = total - weight_bg
    valid = (weight_bg > 0) & (weight_fg > 0)
    if not np.any(valid):
        return float("-inf")

    sum_total = np.dot(hist, bin_centers)
    sum_bg = np.cumsum(hist * bin_centers)
    mean_bg = np.zeros_like(weight_bg)
    mean_fg = np.zeros_like(weight_fg)
    mean_bg[valid] = sum_bg[valid] / weight_bg[valid]
    mean_fg[valid] = (sum_total - sum_bg[valid]) / weight_fg[valid]
    between = np.full_like(weight_bg, -1.0)
    between[valid] = (
        weight_bg[valid] * weight_fg[valid] * (mean_bg[valid] - mean_fg[valid]) ** 2
    )
    return float(bin_centers[int(np.argmax(between))])


def _overlay_png_base64(rgb: np.ndarray, mask: np.ndarray) -> str:
    overlay = rgb.astype(np.float64).copy()
    tint = np.array([40.0, 220.0, 80.0])
    alpha = 0.45
    overlay[mask] = (1.0 - alpha) * overlay[mask] + alpha * tint
    image = Image.fromarray(np.clip(overlay, 0, 255).astype(np.uint8), mode="RGB")
    buf = BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")
