"""Package entry — serve Inference API or print help."""

from __future__ import annotations

import sys


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if args and args[0] == "serve":
        from verdia_ai.api import main as serve_main

        serve_main()
        return 0

    print(
        "verdia AI\n"
        "  Serve Inference API:\n"
        "    uv run python -m verdia_ai serve\n"
        "    VLM_FAKE=1 uv run python -m verdia_ai serve\n"
        "  Classify folder (CLI):\n"
        "    uv run python -m verdia_ai.classify path/to/photos\n"
        "    VLM_FAKE=1 uv run python -m verdia_ai.classify path/to/photos --summary",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
