"""VLM prompt texts (edit the sibling ``.md`` files)."""

from __future__ import annotations

from pathlib import Path

_DIR = Path(__file__).resolve().parent

SYSTEM_PROMPT = (_DIR / "system.md").read_text(encoding="utf-8").strip()
USER_PROMPT = (_DIR / "user.md").read_text(encoding="utf-8").strip()
