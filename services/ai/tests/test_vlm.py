"""Unit tests for the VLM grass classifier (fake / offline mode only)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from verdia_ai.labels import classe_from_altura_cm
from verdia_ai.vlm import (
    DEFAULT_MODEL,
    VlmError,
    classify_folder,
    classify_image,
    parse_verdict,
    use_fake_mode,
)

# Minimal 1×1 PNG (fake mode only needs a path with an image suffix).
_MIN_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
)


def _write_png(path: Path) -> Path:
    path.write_bytes(_MIN_PNG)
    return path


def test_use_fake_mode_without_vlm_fake(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("VLM_FAKE", raising=False)
    assert use_fake_mode() is False


def test_use_fake_mode_with_vlm_fake(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("VLM_FAKE", "1")
    assert use_fake_mode() is True


def test_classify_image_missing_key_raises(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("VLM_FAKE", raising=False)
    path = _write_png(tmp_path / "x.png")
    with pytest.raises(VlmError, match="GOOGLE_API_KEY"):
        classify_image(path)


def test_classify_image_fake_by_filename(tmp_path: Path) -> None:
    path = _write_png(tmp_path / "trecho_alta.png")
    verdict = classify_image(path, fake=True)
    assert verdict.fake is True
    assert verdict.classe == "alta"
    assert verdict.altura_estimada_cm is not None
    assert verdict.model == DEFAULT_MODEL
    assert 0.0 <= verdict.confianca_declarada <= 1.0


def test_classify_image_fake_default_media(tmp_path: Path) -> None:
    path = _write_png(tmp_path / "roadside.png")
    verdict = classify_image(path, fake=True)
    assert verdict.classe == "média"
    assert verdict.vegetacao_visivel is True
    assert verdict.altura_estimada_cm is not None


def test_classify_image_fake_na(tmp_path: Path) -> None:
    path = _write_png(tmp_path / "trecho_na.png")
    verdict = classify_image(path, fake=True)
    assert verdict.classe is None
    assert verdict.altura_estimada_cm is None
    assert verdict.vegetacao_visivel is False


def test_classify_folder_json_rows(tmp_path: Path) -> None:
    _write_png(tmp_path / "a_baixa.jpg")
    _write_png(tmp_path / "b_alta.jpg")
    (tmp_path / "notes.txt").write_text("ignore", encoding="utf-8")

    rows = classify_folder(tmp_path, fake=True)
    assert len(rows) == 2
    by_name = {Path(r["path"]).name: r for r in rows}
    assert by_name["a_baixa.jpg"]["classe"] == "baixa"
    assert by_name["b_alta.jpg"]["classe"] == "alta"
    assert by_name["a_baixa.jpg"]["fake"] is True


@pytest.mark.parametrize(
    ("min_cm", "max_cm", "visivel", "expected"),
    [
        (0.0, 9.9, True, "baixa"),
        (9.9, 9.9, True, "baixa"),
        (10.0, 10.0, True, "média"),
        (10.0, 30.0, True, "média"),
        (30.0, 30.0, True, "média"),
        (30.1, 30.1, True, "alta"),
        (40.0, 60.0, True, "alta"),
        (5.0, 15.0, True, "média"),  # midpoint 10
        (None, None, True, None),
        (5.0, 8.0, False, None),
        (40.0, 50.0, False, None),
    ],
)
def test_classe_from_altura_cm_bands(
    min_cm: float | None,
    max_cm: float | None,
    visivel: bool,
    expected: str | None,
) -> None:
    assert classe_from_altura_cm(min_cm, max_cm, vegetacao_visivel=visivel) == expected


def test_parse_verdict_happy_path() -> None:
    raw = json.dumps(
        {
            "altura_estimada_cm": {"min": 3, "max": 8},
            "vegetacao_visivel": True,
            "confianca_declarada": 0.8,
            "justificativa": "Vegetação aparada ao longo da faixa.",
        }
    )
    verdict = parse_verdict(raw, model="gemma-4-26b-a4b-it")
    assert verdict.classe == "baixa"
    assert verdict.altura_estimada_cm is not None
    assert verdict.altura_estimada_cm.min == 3
    assert verdict.altura_estimada_cm.max == 8


def test_parse_verdict_derives_media_from_midpoint() -> None:
    raw = json.dumps(
        {
            "altura_estimada_cm": {"min": 5, "max": 15},
            "vegetacao_visivel": True,
            "confianca_declarada": 0.8,
            "justificativa": "Altura intermediária na faixa.",
        }
    )
    verdict = parse_verdict(raw, model="m")
    assert verdict.classe == "média"


def test_parse_verdict_ignores_stray_classe() -> None:
    raw = json.dumps(
        {
            "classe": "alta",
            "altura_estimada_cm": {"min": 3, "max": 5},
            "vegetacao_visivel": True,
            "confianca_declarada": 0.5,
            "justificativa": "baixa pela altura",
        }
    )
    verdict = parse_verdict(raw, model="m")
    assert verdict.classe == "baixa"


def test_parse_verdict_null_when_no_height() -> None:
    raw = json.dumps(
        {
            "altura_estimada_cm": None,
            "vegetacao_visivel": True,
            "confianca_declarada": 0.4,
            "justificativa": "sem referência de escala",
        }
    )
    verdict = parse_verdict(raw, model="m")
    assert verdict.classe is None


def test_parse_verdict_rejects_confidence_out_of_range() -> None:
    raw = json.dumps(
        {
            "altura_estimada_cm": None,
            "vegetacao_visivel": False,
            "confianca_declarada": 1.5,
            "justificativa": "sem vegetação clara",
        }
    )
    with pytest.raises(VlmError, match="confianca"):
        parse_verdict(raw, model="m")


def test_parse_verdict_fenced_json() -> None:
    raw = """```json
{"altura_estimada_cm":{"min":40,"max":50},
"vegetacao_visivel":true,"confianca_declarada":0.9,
"justificativa":"mato alto"}
```"""
    verdict = parse_verdict(raw, model="m")
    assert verdict.classe == "alta"
