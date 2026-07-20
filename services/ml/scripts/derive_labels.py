#!/usr/bin/env python3
"""Derive ordinal classe from cobertura using documented DNIT-calibrated thresholds."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from verdia_ml.labels import classe_from_cobertura, load_thresholds

DATA_ROOT = Path(__file__).resolve().parents[1] / "data"
DEFAULT_THRESHOLDS = DATA_ROOT / "thresholds.json"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "input_jsonl",
        type=Path,
        help="JSONL with at least {id, cobertura} per line",
    )
    parser.add_argument(
        "--thresholds",
        type=Path,
        default=DEFAULT_THRESHOLDS,
        help=f"thresholds JSON (default: {DEFAULT_THRESHOLDS})",
    )
    args = parser.parse_args(argv)

    thresholds = load_thresholds(args.thresholds)
    for line_no, line in enumerate(args.input_jsonl.read_text(encoding="utf-8").splitlines(), 1):
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        row = json.loads(raw)
        if "id" not in row or "cobertura" not in row:
            print(f"{args.input_jsonl}:{line_no}: need id and cobertura", file=sys.stderr)
            return 1
        classe = classe_from_cobertura(float(row["cobertura"]), thresholds)
        out = {
            "id": row["id"],
            "cobertura": row["cobertura"],
            "classe": classe,
            "baixa_max": thresholds.baixa_max,
            "media_max": thresholds.media_max,
        }
        print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
