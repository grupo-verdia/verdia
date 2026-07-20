#!/usr/bin/env python3
"""Calibrate cobertura bin thresholds on DNIT validation fixtures and print JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from verdia_ml.labels import calibrate_cobertura_thresholds, load_labeled_fixtures

DATA_ROOT = Path(__file__).resolve().parents[1] / "data"
DEFAULT_DNIT = DATA_ROOT / "fixtures" / "dnit_validation.jsonl"
DEFAULT_OUT = DATA_ROOT / "thresholds.json"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dnit-fixtures",
        type=Path,
        default=DEFAULT_DNIT,
        help=f"labeled DNIT JSONL (default: {DEFAULT_DNIT})",
    )
    parser.add_argument(
        "--write",
        type=Path,
        nargs="?",
        const=DEFAULT_OUT,
        default=None,
        help=f"optional path to write thresholds JSON (default path if flag alone: {DEFAULT_OUT})",
    )
    args = parser.parse_args(argv)

    fixtures = load_labeled_fixtures(args.dnit_fixtures)
    pairs = [(s.cobertura, s.classe) for s in fixtures]
    thresholds = calibrate_cobertura_thresholds(pairs)

    payload = {
        "baixa_max": thresholds.baixa_max,
        "media_max": thresholds.media_max,
        "definition": (
            "Bins on cobertura (fraction of tall-grass pixels in the roadside region)."
        ),
        "mapping": {
            "baixa": "cobertura < baixa_max",
            "média": "baixa_max <= cobertura < media_max",
            "alta": "cobertura >= media_max",
        },
        "calibrated_on": str(args.dnit_fixtures.as_posix()),
        "calibration_method": (
            "Midpoint between linearly separable class clusters "
            "(verdia_ml.labels.calibrate_cobertura_thresholds)."
        ),
        "notes": (
            "Fixtures are synthetic DNIT stand-ins for the offline-eval seam. "
            "Recalibrate on a hand-relabeled DNIT vegetation split when available. "
            "Values are fractions in [0, 1]."
        ),
        "provisional": True,
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    print(text, end="")
    if args.write is not None:
        args.write.parent.mkdir(parents=True, exist_ok=True)
        args.write.write_text(text, encoding="utf-8")
        print(f"Wrote {args.write}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
