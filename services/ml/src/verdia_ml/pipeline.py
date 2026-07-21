"""Hybrid sequential pipeline: segmentação → classificador ordinal (Option A)."""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

import numpy as np
from PIL import Image, ImageOps

from verdia_ml.classificador import classificar_ordinal
from verdia_ml.labels import Classe
from verdia_ml.segmentacao import segmentar

MODEL_VERSION = "hybrid-ordinal-0.1"


@dataclass(frozen=True)
class InferResult:
    classe: Classe
    confidence: float
    overlay_png_base64: str
    model_version: str = MODEL_VERSION


def infer_captura(image_bytes: bytes) -> InferResult:
    """Run Option A: segment for overlay, ordinal classifier decides classe."""
    rgb = decode_rgb(image_bytes)
    segmentacao = segmentar(rgb)
    classificacao = classificar_ordinal(rgb, segmentacao.mask)
    return InferResult(
        classe=classificacao.classe,
        confidence=classificacao.confidence,
        overlay_png_base64=segmentacao.overlay_png_base64,
    )


def decode_rgb(image_bytes: bytes) -> np.ndarray:
    if not image_bytes:
        raise ValueError("image must not be empty")
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image.load()
            # Phone geotagged capturas often store sensor orientation in EXIF.
            oriented = ImageOps.exif_transpose(image)
            return np.asarray(oriented.convert("RGB"), dtype=np.uint8)
    except OSError as exc:
        raise ValueError("image must be a decodable image") from exc
