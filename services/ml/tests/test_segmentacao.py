"""Segmentação seam: isolates roadside vegetation; does not decide classe."""

import base64
from io import BytesIO

import numpy as np
from PIL import Image

from verdia_ml.segmentacao import segmentar


def _rgb_png(array: np.ndarray) -> bytes:
    image = Image.fromarray(array.astype(np.uint8), mode="RGB")
    buf = BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def test_segmentar_produces_mask_and_overlay_without_deciding_classe():
    # Green vegetation strip on brown soil — ExG should isolate the green region.
    height, width = 32, 48
    rgb = np.zeros((height, width, 3), dtype=np.uint8)
    rgb[:, :] = (120, 90, 60)  # brown soil
    rgb[:, 16:32] = (40, 180, 40)  # green vegetation

    result = segmentar(rgb)

    assert result.mask.shape == (height, width)
    assert result.mask.dtype == bool
    assert result.mask[:, 16:32].mean() > 0.8
    assert result.mask[:, :16].mean() < 0.2

    overlay = base64.b64decode(result.overlay_png_base64)
    assert overlay.startswith(b"\x89PNG")
    # Segmentação must not decide classe (no classe attribute on the result).
    assert not hasattr(result, "classe")
