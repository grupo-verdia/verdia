"""Pipeline seam: segmentação then classificador ordinal (Option A)."""

import base64
from io import BytesIO

import numpy as np
from PIL import Image

from verdia_ml.pipeline import infer_captura


def _png(rgb: np.ndarray) -> bytes:
    buf = BytesIO()
    Image.fromarray(rgb.astype(np.uint8), mode="RGB").save(buf, format="PNG")
    return buf.getvalue()


def test_infer_captura_runs_segmentacao_then_ordinal_classifier_option_a():
    """Classe comes from the ordinal classifier; overlay from segmentação only."""
    size = 48
    baixa_img = np.zeros((size, size, 3), dtype=np.uint8)
    baixa_img[:, :] = (130, 95, 55)

    alta_img = np.zeros((size, size, 3), dtype=np.uint8)
    alta_img[:, :] = (30, 200, 40)  # full-frame dense vegetation → alta


    baixa = infer_captura(_png(baixa_img))
    alta = infer_captura(_png(alta_img))

    assert baixa.classe == "baixa"
    assert alta.classe == "alta"
    assert 0.0 <= baixa.confidence <= 1.0
    assert 0.0 <= alta.confidence <= 1.0

    for result in (baixa, alta):
        overlay = base64.b64decode(result.overlay_png_base64)
        assert overlay.startswith(b"\x89PNG")
