import base64
import os
import secrets
from datetime import datetime
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

Classe = Literal["baixa", "média", "alta"]

MODEL_VERSION = "stub-0.1"

# Deterministic 1x1 PNG stub for segmentação overlay (real CV in #12).
_STUB_OVERLAY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f"
    b"\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)
STUB_OVERLAY_PNG_BASE64 = base64.b64encode(_STUB_OVERLAY_PNG).decode("ascii")

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

    # Stub baseline: deterministic ordinal prediction + overlay (real CV in #12).
    return InferResponse(
        classe="média",
        confidence=0.5,
        model_version=MODEL_VERSION,
        overlay_png_base64=STUB_OVERLAY_PNG_BASE64,
    )
