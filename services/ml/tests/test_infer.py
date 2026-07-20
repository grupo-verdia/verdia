"""Inference API infer — external behavior seam (classe contract)."""

import base64
from io import BytesIO

from fastapi.testclient import TestClient

from verdia_ml.app import app

CLASSES = {"baixa", "média", "alta"}


def _png_bytes() -> bytes:
    # Minimal valid 1x1 PNG
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f"
        b"\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )


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
    assert body["classe"] == "média"

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
