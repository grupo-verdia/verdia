"""Inference API health — external behavior seam."""

from fastapi.testclient import TestClient

from verdia_ml.app import app


def test_health_responds_successfully():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
