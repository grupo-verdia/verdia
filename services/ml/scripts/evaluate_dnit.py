#!/usr/bin/env python3
"""Run DNIT validation eval and write EVAL_METRICS_JSON-shaped output."""

from __future__ import annotations

import argparse
from pathlib import Path

from verdia_ml.eval import evaluate_dnit_validation, write_eval_metrics

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FIXTURES = ROOT / "data" / "fixtures" / "dnit_validation.jsonl"
DEFAULT_OUT = ROOT / "data" / "eval_metrics.json"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fixtures",
        type=Path,
        default=DEFAULT_FIXTURES,
        help="DNIT validation JSONL",
    )
    parser.add_argument(
        "--write",
        type=Path,
        default=DEFAULT_OUT,
        help="Output path for observabilidade EVAL_METRICS_JSON payload",
    )
    args = parser.parse_args()

    report = evaluate_dnit_validation(args.fixtures)
    write_eval_metrics(report, args.write)
    print(
        f"wrote {args.write} "
        f"(ordinal_mae={report.ordinal_mae:.4f}, "
        f"accuracy={report.accuracy:.4f}, n={report.sample_count})"
    )


if __name__ == "__main__":
    main()
