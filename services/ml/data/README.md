# Public datasets (ADR-0002)

verdia trains and validates on **public** imagery only. Motiva narrative stays fixed;
concrete labels adapt to these sources.

Raw downloads are **not** committed. This tree holds:

| Path | Purpose |
|------|---------|
| `thresholds.json` | Cobertura bin edges calibrated on the DNIT validation fixtures |
| `fixtures/*.jsonl` | Small labeled rows downstream training/eval can consume today |
| `eval_metrics.json` | Latest DNIT ordinal-aware eval report (`EVAL_METRICS_JSON` shape) |
| `raw/` (gitignored) | Optional local downloads created by `prepare_datasets.py` |

## Roles and licenses

| Dataset | ADR-0002 role | License | Obtain |
|---------|---------------|---------|--------|
| **TAS500** | Segmentation + height training (`low grass` / `high grass` @ ~20 cm) | **Non-commercial** (CC BY-NC-SA family; confirm on project page) | https://mucar3.de/icpr2020-tas500/ |
| **forefield_grassland** | Classifier reinforcement (mowed vs grass signal) | Zenodo open dataset — check record terms before redistribution | https://zenodo.org/records/10371371 |
| **DNIT** “Cracks and Potholes in Road Images” | BR-realistic **validation** after hand-relabel of vegetation | **CC BY 4.0** (commercial-safer path) | https://data.mendeley.com/datasets/t576ydh9v8/4 |

Commercialization note (ADR-0002): TAS500 is non-commercial; DNIT (CC BY 4.0) is the safer commercial path if Motiva later productizes.

## 3-class ground truth from cobertura

Source datasets are effectively **binary** height (low/high, mowed/grass). Product classes
are ordinal **baixa < média < alta**, derived from **cobertura**: the fraction of
tall-grass pixels inside the roadside region (from a segmentation mask).

Compute cobertura from masks, then bin:

```python
from verdia_ml.labels import cobertura_from_masks, classe_from_cobertura, load_thresholds

cobertura = cobertura_from_masks(roadside_mask, tall_grass_mask)
classe = classe_from_cobertura(cobertura, load_thresholds(...))
```

Documented bins (`thresholds.json`):

- **baixa** — `cobertura < 0.25`
- **média** — `0.25 <= cobertura < 0.55`
- **alta** — `cobertura >= 0.55`

### Provisional DNIT calibration

Committed `fixtures/dnit_validation.jsonl` rows are **synthetic stand-ins** for the
offline-eval seam (no multi‑GB DNIT imagery in-repo). Thresholds were calibrated on
those rows via `calibrate_cobertura_thresholds` so the binning + tooling path is
exercisable today. **Revisit** once a hand-relabeled DNIT vegetation split exists:
re-run `scripts/calibrate_thresholds.py --write` and update `thresholds.json`.

The obtain/prepare process for real archives is documented above; downloads stay in
`data/raw/` (gitignored).

## Prepare local raw layout

```bash
cd services/ml
uv run python scripts/prepare_datasets.py
```

The script creates the expected `data/raw/{tas500,forefield_grassland,dnit}/`
directories and prints obtain steps. Place downloads there; it does not fetch
multi‑GB archives automatically.

Derive labels for a JSONL of `{id, cobertura}` rows:

```bash
uv run python scripts/derive_labels.py data/fixtures/dnit_validation.jsonl
```

Recalibrate thresholds from labeled DNIT fixtures:

```bash
uv run python scripts/calibrate_thresholds.py
```

## Fixture schema (JSONL)

Each line is one sample:

```json
{
  "id": "dnit-val-001",
  "dataset": "dnit",
  "role": "validation",
  "cobertura": 0.05,
  "classe": "baixa",
  "license": "CC-BY-4.0",
  "source_label": "hand-relabeled-vegetation"
}
```

`training_eval.jsonl` mixes all three dataset roles for smoke training/eval wiring.
`dnit_validation.jsonl` is the provisional calibration / offline-eval split
(`source_label: fixture-synthetic` until real DNIT vegetation relabel lands).
