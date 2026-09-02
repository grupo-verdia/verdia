"""HTTP Inference API tests (fake / offline mode only)."""

from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from verdia_ai.api import app

# Minimal 1×1 PNG
_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("VLM_FAKE", "1")
    return TestClient(app)


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_classify_fake(client: TestClient) -> None:
    response = client.post(
        "/v1/classify",
        json={
            "image_base64": base64.b64encode(_PNG).decode("ascii"),
            "content_type": "image/png",
            "filename": "campo.png",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["fake"] is True
    assert body["model_version"]


def test_classify_rejects_bad_base64(client: TestClient) -> None:
    response = client.post(
        "/v1/classify",
        json={
            "image_base64": "!!!",
            "content_type": "image/jpeg",
            "filename": "x.jpg",
        },
    )
    assert response.status_code == 400
