"""Pitch-path fixtures under apps/web must be decodable by the Inference API."""

from pathlib import Path

import pytest

from verdia_ml.pipeline import decode_rgb, infer_captura

FIXTURES = (
    Path(__file__).resolve().parents[3] / "apps" / "web" / "fixtures" / "capturas"
)


@pytest.mark.parametrize("name", ["sp-01.png", "sp-02.png", "sp-03.png"])
def test_simulador_fixture_is_decodable(name: str) -> None:
    image_bytes = (FIXTURES / name).read_bytes()
    rgb = decode_rgb(image_bytes)
    assert rgb.ndim == 3
    assert rgb.shape[2] == 3
    assert rgb.shape[0] >= 1 and rgb.shape[1] >= 1


@pytest.mark.parametrize("name", ["sp-01.png", "sp-02.png", "sp-03.png"])
def test_simulador_fixture_runs_hybrid_pipeline(name: str) -> None:
    image_bytes = (FIXTURES / name).read_bytes()
    result = infer_captura(image_bytes)
    assert result.classe in {"baixa", "média", "alta"}
    assert 0.0 <= result.confidence <= 1.0
    assert result.overlay_png_base64
