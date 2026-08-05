"""CLI: classify a folder of roadside grass photos via the VLM module.

Usage:
  uv run python -m verdia_ml.classify path/to/photos
  uv run python -m verdia_ml.classify path/to/photos --summary
  VLM_FAKE=1 uv run python -m verdia_ml.classify path/to/photos
"""

from __future__ import annotations

import argparse
import json
import sys

from verdia_ml.vlm import classify_folder, use_fake_mode


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Classify roadside grass photos (baixa|média|alta) with Gemma VLM."
    )
    parser.add_argument(
        "folder",
        help="Directory of images (.jpg/.png/.webp/...)",
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Print one JSON object with counts + results instead of JSON lines",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Override model id (default: VLM_MODEL or gemma-4-26b-a4b-it)",
    )
    parser.add_argument(
        "--fake",
        action="store_true",
        help="Force offline fake mode (also used when GOOGLE_API_KEY is unset)",
    )
    args = parser.parse_args(argv)

    fake = True if args.fake else None
    rows = classify_folder(args.folder, model=args.model, fake=fake)

    if args.summary:
        counts: dict[str, int] = {}
        for row in rows:
            classe = str(row["classe"])
            counts[classe] = counts.get(classe, 0) + 1
        print(
            json.dumps(
                {
                    "n": len(rows),
                    "counts": counts,
                    "fake": use_fake_mode() if fake is None else True,
                    "results": rows,
                },
                ensure_ascii=False,
            )
        )
    else:
        for row in rows:
            print(json.dumps(row, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    sys.exit(main())
