"""Classificador ordinal — frozen features + CORAL head (ADR-0001 Option A).

CPU demo path: ExG/color stats on the cleaned vegetation region stand in for
frozen DINOv2/SigLIP embeddings (ADR-0001 early sanity-check allowance). The
small CORAL ordinal head remains the single source of truth for classe —
segmentação never bins cobertura into a class decision.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from verdia_ml.image_ops import excess_green
from verdia_ml.labels import CLASSES, Classe

# CORAL head: two cumulative logits P(y > baixa), P(y > média).
# Thresholds on mean ExG of vegetation pixels ≈ 0.30 and 0.65 (normalized /400).
_CORAL_WEIGHTS = np.array([[12.0], [12.0]], dtype=np.float64)
_CORAL_BIASES = np.array([-3.6, -7.8], dtype=np.float64)


@dataclass(frozen=True)
class ClassificacaoResult:
    classe: Classe
    confidence: float


def classificar_ordinal(
    rgb: np.ndarray,
    mask: np.ndarray | None = None,
) -> ClassificacaoResult:
    """Predict ordinal classe from frozen features of the cleaned region."""
    if rgb.ndim != 3 or rgb.shape[2] != 3:
        raise ValueError(f"expected HxWx3 RGB array, got shape {rgb.shape}")

    features = _frozen_features(rgb, mask)
    logits = (_CORAL_WEIGHTS @ features).ravel() + _CORAL_BIASES
    probs = 1.0 / (1.0 + np.exp(-logits))
    rank = int((probs > 0.5).sum())
    classe = CLASSES[rank]
    confidence = float(np.clip(np.mean(np.maximum(probs, 1.0 - probs)), 0.0, 1.0))
    return ClassificacaoResult(classe=classe, confidence=confidence)


def _frozen_features(rgb: np.ndarray, mask: np.ndarray | None) -> np.ndarray:
    """Frozen feature vector over vegetation pixels only (cleaned region).

    Uses mean ExG inside the mask — appearance of the vegetation itself — not
    mask area / cobertura fraction (that would be Option B fusion).
    """
    region = _vegetation_rgb(rgb, mask)
    exg = excess_green(region)
    mean_exg = float(np.clip(exg.mean() / 400.0, 0.0, 1.5))
    return np.array([mean_exg], dtype=np.float64)


def _vegetation_rgb(rgb: np.ndarray, mask: np.ndarray | None) -> np.ndarray:
    if mask is None:
        return rgb
    if mask.shape != rgb.shape[:2]:
        raise ValueError("mask must match RGB spatial shape")
    if not mask.any():
        return rgb
    # Keep spatial shape for excess_green; crop to a tight stack of veg pixels
    # via a 1×N×3 view.
    pixels = rgb[mask]
    return pixels.reshape(1, -1, 3)
