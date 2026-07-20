from datetime import datetime
from typing import Annotated, Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

Classe = Literal["baixa", "média", "alta"]

MODEL_VERSION = "stub-0.1"

app = FastAPI(title="verdia Inference API")


class InferResponse(BaseModel):
    classe: Classe
    confidence: Annotated[float, Field(ge=0.0, le=1.0)]
    model_version: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/infer", response_model=InferResponse)
async def infer(
    image: Annotated[UploadFile, File()],
    lat: Annotated[float, Form()],
    lon: Annotated[float, Form()],
    captured_at: Annotated[str, Form()],
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

    # Stub baseline: deterministic ordinal prediction (real CV arrives in #12).
    return InferResponse(classe="média", confidence=0.5, model_version=MODEL_VERSION)
