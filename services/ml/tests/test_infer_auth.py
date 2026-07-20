"""Inference API shared-secret auth — external behavior seam."""

from io import BytesIO

import pytest
from fastapi.testclient import TestClient

from verdia_ml.app import app


def _png_bytes() -> bytes:
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f"
        b"\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )


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
