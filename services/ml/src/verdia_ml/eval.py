"""DNIT validation evaluation with an ordinal-aware metric (ADR-0001 / #12)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Sequence

import numpy as np
from PIL import Image

from verdia_ml.labels import Classe, load_labeled_fixtures
from verdia_ml.pipeline import MODEL_VERSION, infer_captura

RANK: dict[Classe, int] = {"baixa": 0, "média": 1, "alta": 2}


@dataclass(frozen=True)
class DnitEvalReport:
    ordinal_mae: float
    accuracy: float
    sample_count: int
    model_version: str
    evaluated_at: str
    notes: str = (
        "Provisional DNIT stand-in images synthesized from fixture cobertura; "
        "revisit when a hand-relabeled DNIT vegetation image split is available."
    )


def ordinal_mae(pairs: Sequence[tuple[Classe, Classe]]) -> float:
    """Mean absolute error on ordinal ranks (baixa=0, média=1, alta=2)."""
    if not pairs:
        raise ValueError("pairs must not be empty")
    total = 0
    for predicted, expected in pairs:
        total += abs(RANK[predicted] - RANK[expected])
    return total / len(pairs)


def synthesize_captura_from_cobertura(cobertura: float, size: int = 64) -> bytes:
    """Build a provisional RGB stand-in from cobertura (fixture-synthetic path).

    Green vegetation fraction approximates cobertura; remainder is brown soil.
    """
    if not (0.0 <= cobertura <= 1.0):
        raise ValueError(f"cobertura must be in [0, 1], got {cobertura}")

    rgb = np.zeros((size, size, 3), dtype=np.uint8)
    rgb[:, :] = (130, 95, 55)
    veg_cols = max(0, min(size, int(round(max(cobertura, 0.08) * size))))
    # Height cue lives in vegetation appearance (green intensity), not only extent.
    green = int(np.clip(70 + 160 * cobertura, 70, 230))
    rgb[:, :veg_cols] = (35, green, 35)

    buf = BytesIO()
    Image.fromarray(rgb, mode="RGB").save(buf, format="PNG")
    return buf.getvalue()


def evaluate_dnit_validation(fixtures_path: Path) -> DnitEvalReport:
    fixtures = load_labeled_fixtures(fixtures_path)
    if not fixtures:
        raise ValueError(f"no fixtures in {fixtures_path}")

    pairs: list[tuple[Classe, Classe]] = []
    for sample in fixtures:
        image_bytes = synthesize_captura_from_cobertura(sample.cobertura)
        predicted = infer_captura(image_bytes).classe
        pairs.append((predicted, sample.classe))

    correct = sum(1 for pred, exp in pairs if pred == exp)
    return DnitEvalReport(
        ordinal_mae=ordinal_mae(pairs),
        accuracy=correct / len(pairs),
        sample_count=len(pairs),
        model_version=MODEL_VERSION,
        evaluated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )


def report_to_eval_metrics_json(report: DnitEvalReport) -> dict[str, object]:
    """Shape consumed by apps/web observabilidade via EVAL_METRICS_JSON."""
    return {
        "ordinalMae": report.ordinal_mae,
        "accuracy": report.accuracy,
        "sampleCount": report.sample_count,
        "evaluatedAt": report.evaluated_at,
        "modelVersion": report.model_version,
        "notes": report.notes,
    }


def write_eval_metrics(report: DnitEvalReport, path: Path) -> None:
    path.write_text(
        json.dumps(report_to_eval_metrics_json(report), indent=2, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )
