"""Package entry — HTTP serve is deferred; use the classify CLI."""

from __future__ import annotations

import sys


def main() -> None:
    print(
        "HTTP Inference API is deferred.\n"
        "Classify photos with:\n"
        "  uv run python -m verdia_ml.classify path/to/photos\n"
        "  VLM_FAKE=1 uv run python -m verdia_ml.classify path/to/photos --summary",
        file=sys.stderr,
    )
    raise SystemExit(2)


if __name__ == "__main__":
    main()
