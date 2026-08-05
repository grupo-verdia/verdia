"""Ordinal vegetation classe labels (baixa < média < alta)."""

from __future__ import annotations

from typing import Literal

Classe = Literal["baixa", "média", "alta"]
CLASSES: tuple[Classe, ...] = ("baixa", "média", "alta")
