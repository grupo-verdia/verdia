"""Offline eval seam: cobertura → ordinal classe (ADR-0002)."""

from pathlib import Path

import pytest

from verdia_ml.labels import (
    CLASSES,
    CoberturaThresholds,
    calibrate_cobertura_thresholds,
    classe_from_cobertura,
    cobertura_from_masks,
    load_labeled_fixtures,
    load_thresholds,
)

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def test_cobertura_from_masks_is_tall_grass_fraction_in_roadside():
    # 4 roadside pixels; 1 of them tall grass → cobertura 0.25
    roadside = [
        [True, True, False],
        [True, True, False],
    ]
    tall_grass = [
        [True, False, True],  # non-roadside tall grass ignored
        [False, False, False],
    ]

    assert cobertura_from_masks(roadside, tall_grass) == pytest.approx(0.25)


def test_cobertura_from_masks_rejects_empty_roadside():
    with pytest.raises(ValueError, match="roadside"):
        cobertura_from_masks([[False, False]], [[True, True]])


def test_mask_cobertura_then_classe_derives_ordinal_label():
    thresholds = CoberturaThresholds(baixa_max=0.25, media_max=0.55)
    roadside = [[True] * 4, [True] * 4]  # 8 roadside pixels
    # 5 tall-grass pixels in roadside → 0.625 → alta
    tall_grass = [
        [True, True, True, False],
        [True, True, False, False],
    ]

    cobertura = cobertura_from_masks(roadside, tall_grass)
    assert cobertura == pytest.approx(0.625)
    assert classe_from_cobertura(cobertura, thresholds) == "alta"


def test_classe_from_cobertura_bins_ordinal_scale():
    thresholds = CoberturaThresholds(baixa_max=0.25, media_max=0.55)

    assert classe_from_cobertura(0.0, thresholds) == "baixa"
    assert classe_from_cobertura(0.24, thresholds) == "baixa"
    assert classe_from_cobertura(0.25, thresholds) == "média"
    assert classe_from_cobertura(0.54, thresholds) == "média"
    assert classe_from_cobertura(0.55, thresholds) == "alta"
    assert classe_from_cobertura(1.0, thresholds) == "alta"


def test_classe_from_cobertura_rejects_out_of_range():
    thresholds = CoberturaThresholds(baixa_max=0.25, media_max=0.55)

    with pytest.raises(ValueError, match="cobertura"):
        classe_from_cobertura(-0.01, thresholds)
    with pytest.raises(ValueError, match="cobertura"):
        classe_from_cobertura(1.01, thresholds)


def test_documented_thresholds_match_dnit_calibration_fixtures():
    thresholds = load_thresholds(DATA_DIR / "thresholds.json")
    fixtures = load_labeled_fixtures(DATA_DIR / "fixtures" / "dnit_validation.jsonl")

    assert thresholds.baixa_max < thresholds.media_max
    assert fixtures, "DNIT validation fixtures must exist for downstream eval"

    for sample in fixtures:
        assert sample.dataset == "dnit"
        assert sample.role == "validation"
        assert sample.classe in CLASSES
        derived = classe_from_cobertura(sample.cobertura, thresholds)
        assert derived == sample.classe, (
            f"{sample.id}: cobertura={sample.cobertura} "
            f"expected {sample.classe}, got {derived}"
        )


def test_calibrate_on_dnit_fixtures_recovers_documented_thresholds():
    documented = load_thresholds(DATA_DIR / "thresholds.json")
    fixtures = load_labeled_fixtures(DATA_DIR / "fixtures" / "dnit_validation.jsonl")
    pairs = [(s.cobertura, s.classe) for s in fixtures]

    calibrated = calibrate_cobertura_thresholds(pairs)

    assert calibrated.baixa_max == pytest.approx(documented.baixa_max)
    assert calibrated.media_max == pytest.approx(documented.media_max)


def test_all_dataset_role_fixtures_are_consumable():
    fixtures = load_labeled_fixtures(DATA_DIR / "fixtures" / "training_eval.jsonl")
    roles_by_dataset = {(s.dataset, s.role) for s in fixtures}

    assert ("tas500", "segmentation_height_train") in roles_by_dataset
    assert ("forefield_grassland", "classifier_reinforce") in roles_by_dataset
    assert ("dnit", "validation") in roles_by_dataset

    for sample in fixtures:
        assert sample.classe in CLASSES
        assert 0.0 <= sample.cobertura <= 1.0
        assert sample.id
        assert sample.license
