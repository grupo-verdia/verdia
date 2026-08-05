#!/usr/bin/env python3
"""Thin harness: classify a folder of photos via verdia_ml.vlm."""

from __future__ import annotations

import sys

from verdia_ml.classify import main

if __name__ == "__main__":
    sys.exit(main())
