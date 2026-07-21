"""Pipeline seam: segmentação then classificador ordinal (Option A)."""

import base64
from io import BytesIO

import numpy as np
from PIL import Image

from verdia_ml.pipeline import decode_rgb, infer_captura


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


def test_decode_rgb_applies_exif_orientation():
    """Geotagged phone JPEGs must be decoded in display orientation, not sensor."""
    # Intended display: 30×10, green vegetation on the left third.
    display = Image.new("RGB", (30, 10), (130, 95, 55))
    for x in range(10):
        for y in range(10):
            display.putpixel((x, y), (30, 200, 40))

    # Sensor storage: rotate 90° CCW and tag Orientation=6 (rotate 90° CW to view).
    stored = display.transpose(Image.Transpose.ROTATE_90)
    exif = Image.Exif()
    exif[274] = 6  # Orientation
    buf = BytesIO()
    stored.save(buf, format="JPEG", exif=exif, quality=95)

    rgb = decode_rgb(buf.getvalue())
    assert rgb.shape == (10, 30, 3)
    assert rgb[:, :10, 1].mean() > 150  # green strip on the left
    assert rgb[:, 20:, 1].mean() < 120  # brown soil on the right
