# Plan: VLM week-1 prototype (2026-08-05)

## Goal

- Week-1 **script/notebook** that classifies roadside grass photos as `baixa` | `média` | `alta` via a hosted open-weight VLM.
- JSON out: `classe`, optional height range, self-reported confidence, `justificativa`.
- **Not** wired into an HTTP Inference API yet, **not** deployed as a service.

## Model pick

- Primary: Gemma 4 26B A4B (`gemma-4-26b-a4b-it`) on **Google AI Studio** (free).
- Fallback: OpenRouter `:free`.
- Offline: `ollama pull gemma4`.
- Avoid Groq for this (preview vision + weak JSON schema for vision).

## Class definitions

- Plain natural-language **maintenance judgment** (not cm thresholds).

## Overlay gone (do now)

- Drop `overlay_png_base64` from ML contract, overlay DB column, and web client fail-closed check.

## Success bar

- Demo looks right on obvious cases; no formal accuracy number.

## Deferred

- HTTP Inference API that serves the VLM classifier (new shape when ready).

## Shape

- Core classify logic in an **importable Python module**; thin script and/or notebook as harness. Prefer module + harness over notebook-only.
