"""Cobertura → ordinal classe labels (ADR-0002 offline-eval seam)."""

from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

Classe = Literal["baixa", "média", "alta"]
CLASSES: tuple[Classe, ...] = ("baixa", "média", "alta")


@dataclass(frozen=True)
class CoberturaThresholds:
    """Bin edges for cobertura of tall grass in the roadside region.

    baixa:  cobertura < baixa_max
    média:  baixa_max <= cobertura < media_max
    alta:   cobertura >= media_max
    """

    baixa_max: float
    media_max: float

    def __post_init__(self) -> None:
        if not (0.0 < self.baixa_max < self.media_max < 1.0):
            raise ValueError(
                "thresholds must satisfy 0 < baixa_max < media_max < 1 "
                f"(got baixa_max={self.baixa_max}, media_max={self.media_max})"
            )


@dataclass(frozen=True)
class LabeledSample:
    """Fixture row consumable by training / offline eval."""

    id: str
    dataset: str
    role: str
    cobertura: float
    classe: Classe
    license: str
    source_label: str | None = None


def classe_from_cobertura(
    cobertura: float,
    thresholds: CoberturaThresholds,
) -> Classe:
    """Derive ordinal classe from cobertura of tall grass in the roadside region."""
    if not (0.0 <= cobertura <= 1.0):
        raise ValueError(f"cobertura must be in [0, 1], got {cobertura}")

    if cobertura < thresholds.baixa_max:
        return "baixa"
    if cobertura < thresholds.media_max:
        return "média"
    return "alta"


def cobertura_from_masks(
    roadside: Sequence[Sequence[bool]],
    tall_grass: Sequence[Sequence[bool]],
) -> float:
    """Fraction of tall-grass pixels among pixels in the roadside region.

    Both masks must share the same H×W shape. Tall-grass pixels outside the
    roadside region are ignored (segmentação isolates "where"; cobertura is
    measured only inside that region).
    """
    if not roadside or not roadside[0]:
        raise ValueError("roadside mask must be non-empty")
    height = len(roadside)
    width = len(roadside[0])
    if len(tall_grass) != height or any(
        len(row) != width for row in [*roadside, *tall_grass]
    ):
        raise ValueError("roadside and tall_grass masks must share the same H×W shape")

    roadside_count = 0
    tall_in_roadside = 0
    for y in range(height):
        for x in range(width):
            if not roadside[y][x]:
                continue
            roadside_count += 1
            if tall_grass[y][x]:
                tall_in_roadside += 1

    if roadside_count == 0:
        raise ValueError("roadside region must contain at least one pixel")

    return tall_in_roadside / roadside_count


def load_thresholds(path: Path) -> CoberturaThresholds:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return CoberturaThresholds(
        baixa_max=float(payload["baixa_max"]),
        media_max=float(payload["media_max"]),
    )


def load_labeled_fixtures(path: Path) -> list[LabeledSample]:
    samples: list[LabeledSample] = []
    for line_no, line in enumerate(
        path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        try:
            row = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}:{line_no}: invalid JSON") from exc
        samples.append(_sample_from_row(row, path, line_no))
    return samples


def calibrate_cobertura_thresholds(
    labeled: Sequence[tuple[float, Classe]],
) -> CoberturaThresholds:
    """Calibrate bin edges from DNIT (or DNIT-like) labeled cobertura pairs.

    For each adjacent pair of ordinal classes on the ordered scale, place the
    threshold at the midpoint between the highest cobertura of the lower class
    and the lowest cobertura of the higher class.
    """
    by_classe: dict[Classe, list[float]] = {c: [] for c in CLASSES}
    for cobertura, classe in labeled:
        if not (0.0 <= cobertura <= 1.0):
            raise ValueError(f"cobertura must be in [0, 1], got {cobertura}")
        if classe not in by_classe:
            raise ValueError(f"unknown classe {classe!r}")
        by_classe[classe].append(cobertura)

    for classe, values in by_classe.items():
        if not values:
            raise ValueError(f"calibration requires at least one sample for {classe}")

    baixa_hi = max(by_classe["baixa"])
    media_lo = min(by_classe["média"])
    media_hi = max(by_classe["média"])
    alta_lo = min(by_classe["alta"])

    if not (baixa_hi < media_lo and media_hi < alta_lo):
        raise ValueError(
            "labeled coberturas are not linearly separable by classe; "
            f"baixa_hi={baixa_hi}, media=[{media_lo}, {media_hi}], alta_lo={alta_lo}"
        )

    baixa_max = round((baixa_hi + media_lo) / 2.0, 4)
    media_max = round((media_hi + alta_lo) / 2.0, 4)
    return CoberturaThresholds(baixa_max=baixa_max, media_max=media_max)


def _sample_from_row(row: dict[str, object], path: Path, line_no: int) -> LabeledSample:
    try:
        classe = row["classe"]
        if classe not in CLASSES:
            raise ValueError(f"classe must be one of {CLASSES}, got {classe!r}")
        return LabeledSample(
            id=str(row["id"]),
            dataset=str(row["dataset"]),
            role=str(row["role"]),
            cobertura=float(row["cobertura"]),  # type: ignore[arg-type]
            classe=classe,  # type: ignore[arg-type]
            license=str(row["license"]),
            source_label=None
            if row.get("source_label") is None
            else str(row["source_label"]),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError(f"{path}:{line_no}: invalid fixture row ({exc})") from exc
