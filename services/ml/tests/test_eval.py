"""DNIT offline-eval seam: ordinal-aware metric on the validation split."""

from pathlib import Path

from verdia_ml.eval import (
    evaluate_dnit_validation,
    ordinal_mae,
    synthesize_captura_from_cobertura,
)
from verdia_ml.labels import load_labeled_fixtures
from verdia_ml.pipeline import infer_captura

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def test_ordinal_mae_is_mean_absolute_rank_error():
    # baixa=0, média=1, alta=2 → errors 0, 1, 2 → mean 1.0
    assert ordinal_mae(
        [
            ("baixa", "baixa"),
            ("média", "baixa"),
            ("alta", "baixa"),
        ]
    ) == 1.0


def test_dnit_validation_reports_ordinal_aware_metric():
    report = evaluate_dnit_validation(DATA_DIR / "fixtures" / "dnit_validation.jsonl")

    assert report.sample_count == 9
    assert isinstance(report.ordinal_mae, float)
    assert report.ordinal_mae >= 0.0
    assert 0.0 <= report.accuracy <= 1.0
    assert report.model_version


def test_synthetic_dnit_standin_images_are_classified_by_pipeline():
    """Provisional stand-ins (no multi-GB DNIT imagery) still exercise the pipeline."""
    fixtures = load_labeled_fixtures(DATA_DIR / "fixtures" / "dnit_validation.jsonl")
    sample = next(s for s in fixtures if s.classe == "alta")
    image_bytes = synthesize_captura_from_cobertura(sample.cobertura)
    result = infer_captura(image_bytes)
    assert result.classe in {"baixa", "média", "alta"}
