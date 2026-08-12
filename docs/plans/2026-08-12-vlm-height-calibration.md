# VLM height interval calibration (2026-08-12)

## Problem

Sample shoulder photos were almost always `média` even when the strip looked
mowed/short. The model often said “grama baixa/aparada” but returned spans like
`5–15` / `10–20` (midpoint ≥ 10 → Motiva `média`).

## Change

Prompt-only (`services/ai/src/verdia_ai/prompts/system.md`):

- Max span ~5 cm (was ~10)
- Ban lazy defaults `5–15`, `10–20`, `10–30`
- Scale anchors: meio-fio ~10–15 cm, PET bottle ~20–25, shin ~40
- If aparada/rasteira / shorter than curb face → entire interval `< 10`

Motiva bands and midpoint mapping unchanged.

## Retest (notebook samples, live Gemma)

| Sample | Before | After |
|--------|--------|-------|
| dutra.png | média 5–15 | baixa 5–10 |
| dutra_2.png | média 5–15 | baixa 5–10 |
| dutra_3.png | média 10–20 | média 10–15 |
| fernao_dias_1.png | média 5–15 | baixa 5–10 |
| fernao_dias_2.png | média 5–15 | baixa 5–10 |
