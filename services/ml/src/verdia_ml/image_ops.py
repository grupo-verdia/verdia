"""Shared image primitives for segmentação / classificador."""

from __future__ import annotations

import numpy as np


def excess_green(rgb: np.ndarray) -> np.ndarray:
    """ExG = 2G − R − B (ADR-0001 lightweight vegetation cue)."""
    r = rgb[:, :, 0].astype(np.float64)
    g = rgb[:, :, 1].astype(np.float64)
    b = rgb[:, :, 2].astype(np.float64)
    return 2.0 * g - r - b
