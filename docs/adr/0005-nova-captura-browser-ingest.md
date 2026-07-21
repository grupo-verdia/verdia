# ADR-0005: Nova captura replaces CLI ingest

Status: Accepted
Date: 2026-07-20

## Context

Ingest was a CLI **simulador de ingestão** replaying fixture capturas (including
misleading São Paulo–center GPS). Presenters had to leave the browser; the product
felt like a shell around a script.

## Decision

**Nova captura** is the only ingest path: multi-select geotagged upload in the web app
(infer → persist → dashboard/map). Missing/invalid GPS rejects that file. There is no
CLI ingest and no built-in sample-route replay. One captura creates one trecho
(default length **500 m**, Motiva’s manual-analysis constant; configurable later).

The existing infer→persist orchestrator stays the ingest engine; only the entrypoint
moves into the browser.

## Consequences

- Live E2E is: open the app → Nova captura → see results (see ADR-0004).
- Demo quality depends on real geotagged highway photos the presenter uploads.
- ADR-0003’s “Simulador de ingestão” front is superseded by this decision.
