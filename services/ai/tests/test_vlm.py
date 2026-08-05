"""Unit tests for the VLM grass classifier (fake / offline mode only)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

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


def test_use_fake_mode_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("VLM_FAKE", raising=False)
    assert use_fake_mode() is True


def test_use_fake_mode_with_vlm_fake(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_API_KEY", "not-a-real-key")
    monkeypatch.setenv("VLM_FAKE", "1")
    assert use_fake_mode() is True


def test_classify_image_fake_by_filename(tmp_path: Path) -> None:
    path = _write_png(tmp_path / "trecho_alta.png")
    verdict = classify_image(path, fake=True)
    assert verdict.fake is True
    assert verdict.classe == "alta"
    assert verdict.model == DEFAULT_MODEL
    assert 0.0 <= verdict.confianca_declarada <= 1.0


def test_classify_image_fake_default_media(tmp_path: Path) -> None:
    path = _write_png(tmp_path / "roadside.png")
    verdict = classify_image(path, fake=True)
    assert verdict.classe == "média"
    assert verdict.vegetacao_visivel is True


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


def test_parse_verdict_happy_path() -> None:
    raw = json.dumps(
        {
            "classe": "baixa",
            "altura_estimada_cm": {"min": 5, "max": 15},
            "referencia_de_escala": "guarda-corpo",
            "vegetacao_visivel": True,
            "confianca_declarada": 0.8,
            "justificativa": "Vegetação aparada ao longo da faixa.",
        }
    )
    verdict = parse_verdict(raw, model="gemma-4-26b-a4b-it")
    assert verdict.classe == "baixa"
    assert verdict.altura_estimada_cm is not None
    assert verdict.altura_estimada_cm.min == 5
    assert verdict.altura_estimada_cm.max == 15
    assert verdict.referencia_de_escala == "guarda-corpo"


def test_parse_verdict_rejects_bad_classe() -> None:
    raw = json.dumps(
        {
            "classe": "muito_alta",
            "altura_estimada_cm": None,
            "referencia_de_escala": None,
            "vegetacao_visivel": True,
            "confianca_declarada": 0.5,
            "justificativa": "x",
        }
    )
    with pytest.raises(VlmError, match="classe"):
        parse_verdict(raw, model="m")


def test_parse_verdict_rejects_confidence_out_of_range() -> None:
    raw = json.dumps(
        {
            "classe": "média",
            "altura_estimada_cm": None,
            "referencia_de_escala": None,
            "vegetacao_visivel": False,
            "confianca_declarada": 1.5,
            "justificativa": "sem vegetação clara",
        }
    )
    with pytest.raises(VlmError, match="confianca"):
        parse_verdict(raw, model="m")


def test_parse_verdict_fenced_json() -> None:
    raw = """```json
{"classe":"alta","altura_estimada_cm":null,"referencia_de_escala":null,
"vegetacao_visivel":true,"confianca_declarada":0.9,
"justificativa":"mato alto"}
```"""
    verdict = parse_verdict(raw, model="m")
    assert verdict.classe == "alta"


def test_classify_image_missing_key_without_fake_raises(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("VLM_FAKE", raising=False)
    path = _write_png(tmp_path / "x.png")
    # fake=False forces live path; missing key must fail (not silently fake).
    with pytest.raises(VlmError, match="GOOGLE_API_KEY"):
        classify_image(path, fake=False)
