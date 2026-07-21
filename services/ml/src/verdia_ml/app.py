import os
import secrets
from datetime import datetime
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

from verdia_ml.pipeline import InferResult, infer_captura

Classe = Literal["baixa", "média", "alta"]

app = FastAPI(title="verdia Inference API")


class InferResponse(BaseModel):
    classe: Classe
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]
    model_version: str
    # Segmentação visualization only — never used as the classe source of truth.
    overlay_png_base64: str


def require_inference_api_key(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """When INFERENCE_API_KEY is set, require `Authorization: Bearer <key>`."""
    expected = os.environ.get("INFERENCE_API_KEY", "").strip()
    if not expected:
        return

    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.removeprefix("Bearer ").strip()
    if len(token) != len(expected) or not secrets.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/infer", response_model=InferResponse)
async def infer(
    image: Annotated[UploadFile, File()],
    lat: Annotated[float, Form()],
    lon: Annotated[float, Form()],
    captured_at: Annotated[str, Form()],
    _: Annotated[None, Depends(require_inference_api_key)],
) -> InferResponse:
    if image.content_type is None or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="image must be an image/* upload")

    payload = await image.read()
    if not payload:
        raise HTTPException(status_code=422, detail="image must not be empty")

    try:
        datetime.fromisoformat(captured_at.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="captured_at must be an ISO-8601 timestamp",
        ) from exc

    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(status_code=422, detail="lat must be between -90 and 90")
    if not (-180.0 <= lon <= 180.0):
        raise HTTPException(status_code=422, detail="lon must be between -180 and 180")

    try:
        result: InferResult = infer_captura(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return InferResponse(
        classe=result.classe,
        confidence=result.confidence,
        model_version=result.model_version,
        overlay_png_base64=result.overlay_png_base64,
    )
