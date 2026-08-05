# Plan: VLM week-1 prototype (2026-08-05)

## Goal

- Week-1 **script/notebook** that classifies roadside grass photos as `baixa` | `média` | `alta` via a hosted open-weight VLM.
- JSON out: `classe`, optional height range, self-reported confidence, `justificativa`.
- **Not** integrated into `/infer`, **not** deployed.

## Model pick

- Primary: Gemma 4 26B A4B (`gemma-4-26b-a4b-it`) on **Google AI Studio** (free).
- Fallback: OpenRouter `:free`.
- Offline: `ollama pull gemma4`.
- Avoid Groq for this (preview vision + weak JSON schema for vision).

## Class definitions

- Plain natural-language **maintenance judgment** (not cobertura / cm thresholds).

## Overlay gone (do now)

- Drop `overlay_png_base64` from ML contract, overlay DB column, and web client fail-closed check.
- App team hasn't started — clean this up immediately.

## Success bar

- Demo looks right on obvious cases; no formal accuracy number.

## Deferred

- Wiring into FastAPI `/infer`, Render deploy, Colab training, TAS500/forefield datasets.

## Shape

- Core classify logic in an **importable Python module**; thin script and/or notebook as harness. Prefer module + harness over notebook-only.
