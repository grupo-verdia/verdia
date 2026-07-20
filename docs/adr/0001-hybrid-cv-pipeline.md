# ADR-0001: Hybrid CV pipeline — segmentation + frozen-feature ordinal classifier

Status: Accepted
Date: 2026-07-20

## Context

The core task is to assess roadside vegetation height (baixa/média/alta) from a single
photo. The original coursework (Sprint DLCNN) proposed end-to-end fine-tuning of
**EfficientNet** (fallback ResNet-50) as a flat 3-class softmax classifier.

Research into the problem surfaced a critical constraint: **the bottleneck is data, not
the backbone.** We have no Motiva data and only scarce public labels. Full end-to-end
fine-tuning of a large CNN under scarce labels tends to **overfit** — the hidden risk of
the original plan.

## Decision

Adopt a **hybrid, sequential (pipeline) approach**, not two competing classifiers:

1. **Segmentação ("where"):** isolates the roadside vegetation region and produces the
   visual overlay. Does not decide the class.
2. **Classificador ordinal ("how much"):** built on **frozen foundation-model features**
   (DINOv2 / SigLIP) + a small **ordinal head** (CORN/CORAL), respecting baixa < média <
   alta. It receives the cleaned region and is the **single source of truth** for the
   class.

Because the heavy backbone is frozen, there is little to overfit, so it generalizes far
better under scarce data. The two networks have distinct jobs ("where" vs "how much"),
so they **complement rather than conflict**.

Start with **Option A**: segmentation is preprocessing + visualization only; the ordinal
classifier decides the class. Future evolution to **Option B** (fuse cobertura as an
extra classifier input, single fused decision) is allowed but not built now.

A same-day zero-shot baseline (SigLIP zero-shot + ExG+Otsu) is acceptable as an early
sanity check.

## Consequences

- Robust to scarce data; avoids the overfit risk of end-to-end fine-tuning.
- Strong, credible demo: interpretable overlay of the tall-grass region.
- If we later keep an end-to-end path for comparison, prefer **ConvNeXt-Tiny** over
  EfficientNet and an **ordinal loss** over flat softmax.
- Departs from the coursework plan; the rationale above is the justification.
