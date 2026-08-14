"""Lean HTTP Inference API for Nova captura ingest."""

from __future__ import annotations

import base64
import binascii
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from verdia_ai.vlm import VlmError, VlmVerdict, classify_image

ClasseOut = Literal["baixa", "média", "alta"]


class ClassifyRequest(BaseModel):
    image_base64: str = Field(min_length=1)
    content_type: str = Field(min_length=1)
    filename: str | None = None


class ClassifyResponse(BaseModel):
    classe: ClasseOut | None
    altura_cm: float | None
    confidence: float
    model_version: str
    fake: bool
    vegetacao_visivel: bool
    justificativa: str


app = FastAPI(title="verdia AI", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/classify", response_model=ClassifyResponse)
def classify(body: ClassifyRequest) -> ClassifyResponse:
    try:
        image_bytes = base64.b64decode(body.image_base64, validate=True)
    except binascii.Error as exc:
        raise HTTPException(status_code=400, detail="image_base64 is invalid") from exc
    if not image_bytes:
        raise HTTPException(status_code=400, detail="image_base64 is empty")

    try:
        verdict = classify_image(
            image_bytes,
            mime_type=body.content_type,
            source_name=body.filename or "upload.jpg",
        )
    except VlmError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return _to_response(verdict)


def _to_response(verdict: VlmVerdict) -> ClassifyResponse:
    altura = verdict.altura_estimada_cm
    mid = None if altura is None else (altura.min + altura.max) / 2.0
    return ClassifyResponse(
        classe=verdict.classe,
        altura_cm=mid,
        confidence=verdict.confianca_declarada,
        model_version=verdict.model,
        fake=verdict.fake,
        vegetacao_visivel=verdict.vegetacao_visivel,
        justificativa=verdict.justificativa,
    )


def main() -> None:
    import uvicorn

    uvicorn.run(
        "verdia_ai.api:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )


if __name__ == "__main__":
    main()
