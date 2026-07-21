"""Inference API shared-secret auth — external behavior seam."""

from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from verdia_ml.app import app


def _png_bytes() -> bytes:
    image = Image.new("RGB", (16, 16), (70, 140, 55))
    buf = BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def _infer(client: TestClient, headers: dict[str, str] | None = None):
    return client.post(
        "/infer",
        data={
            "lat": "-23.55",
            "lon": "-46.63",
            "captured_at": "2026-07-20T12:00:00.000Z",
        },
        files={"image": ("captura.png", BytesIO(_png_bytes()), "image/png")},
        headers=headers or {},
    )


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_infer_rejects_missing_bearer_when_api_key_configured(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("INFERENCE_API_KEY", "test-secret")

    response = _infer(client)

    assert response.status_code == 401
    assert "classe" not in response.json()


def test_infer_rejects_wrong_bearer_when_api_key_configured(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("INFERENCE_API_KEY", "test-secret")

    response = _infer(client, headers={"Authorization": "Bearer wrong"})

    assert response.status_code == 401
    assert "classe" not in response.json()


def test_infer_rejects_wrong_length_bearer_when_api_key_configured(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("INFERENCE_API_KEY", "test-secret")

    response = _infer(client, headers={"Authorization": "Bearer short"})

    assert response.status_code == 401
    assert "classe" not in response.json()


def test_infer_accepts_valid_bearer_when_api_key_configured(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("INFERENCE_API_KEY", "test-secret")

    response = _infer(client, headers={"Authorization": "Bearer test-secret"})

    assert response.status_code == 200
    assert response.json()["classe"] in {"baixa", "média", "alta"}


def test_health_remains_public_when_api_key_configured(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("INFERENCE_API_KEY", "test-secret")

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_infer_stays_open_when_api_key_unset(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("INFERENCE_API_KEY", raising=False)

    response = _infer(client)

    assert response.status_code == 200
    assert response.json()["classe"] in {"baixa", "média", "alta"}
