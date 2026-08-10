"""Ordinal vegetation classe labels (baixa < média < alta) and Motiva height mapping."""

from __future__ import annotations

from typing import Literal

Classe = Literal["baixa", "média", "alta"]
CLASSES: tuple[Classe, ...] = ("baixa", "média", "alta")

# Motiva roadside grass bands (cm): h < 10 → baixa; 10..30 → média; h > 30 → alta.
BAIXA_MAX_EXCLUSIVE_CM = 10.0
MEDIA_MAX_INCLUSIVE_CM = 30.0


def classe_from_altura_cm(
    min_cm: float | None,
    max_cm: float | None,
    *,
    vegetacao_visivel: bool,
) -> Classe | None:
    """Map estimated height range to classe using the midpoint; N/A → None."""
    if not vegetacao_visivel:
        return None
    if min_cm is None or max_cm is None:
        return None
    h = (min_cm + max_cm) / 2.0
    if h < BAIXA_MAX_EXCLUSIVE_CM:
        return "baixa"
    if h <= MEDIA_MAX_INCLUSIVE_CM:
        return "média"
    return "alta"
