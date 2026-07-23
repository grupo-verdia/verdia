"""Inference API infer — external behavior seam (classe contract)."""

import base64
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from verdia_ml.app import app

CLASSES = {"baixa", "média", "alta"}


def _png_bytes(rgb: tuple[int, int, int] = (70, 140, 55), size: int = 16) -> bytes:
    image = Image.new("RGB", (size, size), rgb)
    buf = BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def test_infer_returns_ordinal_classe_for_captura():
    client = TestClient(app)
    response = client.post(
        "/infer",
        data={
            "lat": "-23.55",
            "lon": "-46.63",
            "captured_at": "2026-07-20T12:00:00.000Z",
        },
        files={"image": ("captura.png", BytesIO(_png_bytes()), "image/png")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["classe"] in CLASSES
    assert isinstance(body["confidence"], float)
    assert 0.0 <= body["confidence"] <= 1.0
    assert isinstance(body["model_version"], str)
    assert body["model_version"]
    assert set(body.keys()) == {
        "classe",
        "confidence",
        "model_version",
        "overlay_png_base64",
    }


def test_infer_returns_segmentacao_overlay_without_replacing_classe():
    """Segmentação overlay is visualization only; classe stays the ordinal field."""
    client = TestClient(app)
    response = client.post(
        "/infer",
        data={
            "lat": "-23.55",
            "lon": "-46.63",
            "captured_at": "2026-07-20T12:00:00.000Z",
        },
        files={"image": ("captura.png", BytesIO(_png_bytes()), "image/png")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["classe"] in CLASSES
    assert isinstance(body["overlay_png_base64"], str)
    assert body["overlay_png_base64"]
    overlay = base64.b64decode(body["overlay_png_base64"])
    assert overlay.startswith(b"\x89PNG")
    # Overlay must not be treated as the classe source of truth.
    assert "classe" in body
    assert body["model_version"]
    assert body["model_version"] != "stub-0.1"


def test_infer_rejects_missing_image():
    client = TestClient(app)
    response = client.post(
        "/infer",
        data={
            "lat": "-23.55",
            "lon": "-46.63",
            "captured_at": "2026-07-20T12:00:00.000Z",
        },
    )

    assert response.status_code == 422
    assert "classe" not in response.json()


def test_infer_rejects_invalid_lat():
    client = TestClient(app)
    response = client.post(
        "/infer",
        data={
            "lat": "999",
            "lon": "-46.63",
            "captured_at": "2026-07-20T12:00:00.000Z",
        },
        files={"image": ("captura.png", BytesIO(_png_bytes()), "image/png")},
    )

    assert response.status_code == 422
    body = response.json()
    assert "classe" not in body


def test_infer_rejects_invalid_lon():
    client = TestClient(app)
    response = client.post(
        "/infer",
        data={
            "lat": "-23.55",
            "lon": "999",
            "captured_at": "2026-07-20T12:00:00.000Z",
        },
        files={"image": ("captura.png", BytesIO(_png_bytes()), "image/png")},
    )

    assert response.status_code == 422
    assert "classe" not in response.json()


def test_infer_rejects_invalid_captured_at():
    client = TestClient(app)
    response = client.post(
        "/infer",
        data={
            "lat": "-23.55",
            "lon": "-46.63",
            "captured_at": "not-a-timestamp",
        },
        files={"image": ("captura.png", BytesIO(_png_bytes()), "image/png")},
    )

    assert response.status_code == 422
    assert "classe" not in response.json()


def test_infer_rejects_empty_image():
    client = TestClient(app)
    response = client.post(
        "/infer",
        data={
            "lat": "-23.55",
            "lon": "-46.63",
            "captured_at": "2026-07-20T12:00:00.000Z",
        },
        files={"image": ("captura.png", BytesIO(b""), "image/png")},
    )

    assert response.status_code == 422
    assert "classe" not in response.json()


def test_infer_rejects_non_image_content_type():
    client = TestClient(app)
    response = client.post(
        "/infer",
        data={
            "lat": "-23.55",
            "lon": "-46.63",
            "captured_at": "2026-07-20T12:00:00.000Z",
        },
        files={"image": ("notes.txt", BytesIO(b"hello"), "text/plain")},
    )

    assert response.status_code == 422
    assert "classe" not in response.json()
