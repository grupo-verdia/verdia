"""Classificador ordinal seam: single source of truth for classe (ADR-0001)."""

import numpy as np

from verdia_ml.classificador import classificar_ordinal


def _solid(rgb: tuple[int, int, int], size: int = 48) -> np.ndarray:
    image = np.zeros((size, size, 3), dtype=np.uint8)
    image[:, :] = rgb
    return image


def test_classificar_ordinal_is_source_of_truth_for_classe():
    baixa = classificar_ordinal(_solid((130, 95, 55)))  # brown soil
    media = classificar_ordinal(_solid((70, 140, 55)))  # moderate green
    alta = classificar_ordinal(_solid((30, 200, 40)))  # dense tall green

    assert baixa.classe == "baixa"
    assert media.classe == "média"
    assert alta.classe == "alta"
    assert 0.0 <= baixa.confidence <= 1.0
    assert 0.0 <= media.confidence <= 1.0
    assert 0.0 <= alta.confidence <= 1.0
