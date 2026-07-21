# ADR-0006: Train on Colab, infer on Render CPU

Status: Accepted
Date: 2026-07-20

## Context

ADR-0001 requires a hybrid pipeline with frozen foundation-model features
(DINOv2 / SigLIP) plus a small ordinal head. Live inference runs on Render’s hobby
**CPU** tier (ADR-0004). Training that stack on the inference host is impractical.

## Decision

**Train offline on Google Colab** (GPU), export compact weight artifacts into the ML
service, and **serve inference on Render CPU**. Keep the public `POST /infer` contract
stable so the web client does not care how weights were produced.

If CPU inference is too slow or does not fit memory for a credible demo, **revisit the
model choice** (architecture / backbone size) — do not jump first to paid GPU hosting.

## Consequences

- Dataset obtain + Colab notebooks/scripts are part of the CV delivery track.
- Deployed image must include (or download at boot) the shipped weights.
- Latency and cold starts remain acceptable constraints for single-photo demo use.
