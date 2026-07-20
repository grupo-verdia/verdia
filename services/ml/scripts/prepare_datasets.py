#!/usr/bin/env python3
"""Create the expected raw dataset layout and print obtain steps (ADR-0002)."""

from __future__ import annotations

from pathlib import Path

DATA_ROOT = Path(__file__).resolve().parents[1] / "data"
RAW_ROOT = DATA_ROOT / "raw"

DATASETS = {
    "tas500": {
        "role": "segmentation + height training",
        "license": "non-commercial (CC BY-NC-SA family — confirm on project page)",
        "url": "https://mucar3.de/icpr2020-tas500/",
        "notes": "Use low_grass / high_grass (~20 cm) for masks and height signal.",
    },
    "forefield_grassland": {
        "role": "classifier reinforcement",
        "license": "Zenodo open — check record terms before redistribution",
        "url": "https://zenodo.org/records/10371371",
        "notes": "Prefer mowed vs grass classes to reinforce the ordinal head.",
    },
    "dnit": {
        "role": "BR-realistic validation (hand-relabel vegetation)",
        "license": "CC BY 4.0",
        "url": "https://data.mendeley.com/datasets/t576ydh9v8/4",
        "notes": "Cracks/potholes masks are upstream; vegetation labels are ours.",
    },
}


def main() -> None:
    RAW_ROOT.mkdir(parents=True, exist_ok=True)
    print(f"Raw dataset root: {RAW_ROOT}")
    print()
    for name, meta in DATASETS.items():
        target = RAW_ROOT / name
        target.mkdir(parents=True, exist_ok=True)
        readme = target / "OBTAIN.md"
        readme.write_text(
            (
                f"# {name}\n\n"
                f"- Role: {meta['role']}\n"
                f"- License: {meta['license']}\n"
                f"- Obtain: {meta['url']}\n"
                f"- Notes: {meta['notes']}\n"
                f"- Place downloaded archives/images in this directory.\n"
            ),
            encoding="utf-8",
        )
        print(f"[ok] {target.relative_to(DATA_ROOT)}/")
        print(f"     role={meta['role']}")
        print(f"     license={meta['license']}")
        print(f"     obtain={meta['url']}")
        print()

    print("Committed fixtures (no download required):")
    print(f"  - {DATA_ROOT / 'fixtures' / 'dnit_validation.jsonl'}")
    print(f"  - {DATA_ROOT / 'fixtures' / 'training_eval.jsonl'}")
    print(f"  - {DATA_ROOT / 'thresholds.json'}")
    print()
    print("See data/README.md for cobertura → classe derivation.")


if __name__ == "__main__":
    main()
