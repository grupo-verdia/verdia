# Motiva height → classe mapping (2026-08-10)

## Decision

VLM estimates roadside grass height (`altura_estimada_cm`); **code** maps Motiva bands to product labels:

| Motiva | Height (cm) | Classe |
|--------|-------------|--------|
| 1 | h &lt; 10 | `baixa` |
| 2 | 10 ≤ h ≤ 30 | `média` |
| 3 | h &gt; 30 | `alta` |
| X | N/A | `null` |

Midpoint of `{min, max}` is used. N/A (`classe` null) only when the roadside strip is not
visible or has no grass (`vegetacao_visivel` false / no height). Uncertainty → lower
`confianca_declarada`, not a missing height.

Product labels stay Portuguese; Motiva `1|2|3|X` is not exposed in the UI yet.
