# ADR-0002: Public datasets and 3-class definition

Status: Accepted
Date: 2026-07-20

## Context

There is **no ready-made Brazilian low/medium/high roadside-grass dataset**. We must
combine public datasets and relabel. Source datasets encode height as **binary**
(low/high, mowed/grass), but the product needs **three** ordinal classes.

## Decision

Use three datasets, each with a distinct role:

- **TAS500** — segmentation + height training. Ships explicit `low grass` / `high grass`
  classes split at a ~20 cm threshold (CC BY-NC-SA, free).
- **forefield_grassland** — classifier reinforcement (~15k mowed vs. grass images,
  Zenodo).
- **DNIT "Cracks and Potholes in Road Images"** — BR-realistic **validation** set. Real
  Brazilian-highway frames (CC BY 4.0); vegetation is relabeled by us for a realistic
  test/validation split.

Derive the **3 classes** from **cobertura** of tall grass in the roadside region (from
the segmentation mask): low coverage → baixa, intermediate → média, high → alta. Bin
thresholds are **calibrated on the DNIT set**. This produces a defensible "média" without
inventing labels the source data cannot support.

The Motiva narrative stays fixed; concrete labels adapt to the available public data.

## Consequences

- Credible, trainable pipeline today using real, free imagery.
- "média" is a derived, calibrated bin — document the thresholds and revisit if the DNIT
  calibration proves unstable.
- License note: TAS500 is non-commercial; DNIT (CC BY 4.0) is the commercial-safe path
  if Motiva later wants to commercialize.
- Prior art to mirror for evaluation: MeadowLevelSeg (ordinal height bins,
  distance-aware accuracy); its data is not public.
