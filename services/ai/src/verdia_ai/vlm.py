"""Hosted VLM grass classifier (Gemma 4 via Google AI Studio).

Prototype only — not wired into FastAPI `/infer`.
"""

from __future__ import annotations

import copy
import json
import mimetypes
import os
import re
from pathlib import Path
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)

from verdia_ai.labels import Classe

DEFAULT_MODEL = "gemma-4-26b-a4b-it"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"}

SYSTEM_PROMPT = """\
Classifique vegetação à beira de rodovia para prioridade de corte.

Julgue só a faixa de grama/mato junto à pista/acostamento (poucos metros da borda do asfalto).
Ignore: taludes e encostas distantes; vegetação ao fundo; pista oposta ou canteiro central; árvores/mato longe da beira.

Classe = urgência de manutenção nessa faixa. Não use cobertura de pixels, limiar em cm, nem área verde da imagem inteira.

- baixa: aparada / pouco urgente
- média: altura intermediária; cortar em breve
- alta: alta / descuidada; prioridade de corte

Responda só com JSON válido do schema.
confianca_declarada: autoavaliação 0–1 (não calibrada).
altura_estimada_cm: só com referência de escala na faixa julgada; senão null.
justificativa: cite a faixa junto à pista, não o fundo.
"""

USER_PROMPT = (
    "Classifique a vegetação da faixa junto à pista e devolva o JSON do schema."
)


class AlturaEstimadaCm(BaseModel):
    model_config = ConfigDict(frozen=True)

    min: float
    max: float

    @model_validator(mode="after")
    def _min_le_max(self) -> AlturaEstimadaCm:
        if self.min > self.max:
            raise ValueError(f"altura_estimada_cm min > max ({self.min} > {self.max})")
        return self


class VlmResponse(BaseModel):
    """LLM JSON payload (excludes call metadata)."""

    model_config = ConfigDict(frozen=True)

    classe: Classe
    altura_estimada_cm: AlturaEstimadaCm | None
    vegetacao_visivel: bool
    confianca_declarada: float = Field(ge=0.0, le=1.0)
    justificativa: str = Field(min_length=1)

    @field_validator("justificativa", mode="before")
    @classmethod
    def _strip_justificativa(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()
        return value


class VlmVerdict(VlmResponse):
    """Validated classification plus call metadata."""

    model: str
    fake: bool = False

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


def _response_json_schema() -> dict[str, Any]:
    """JSON Schema for GenAI structured output ($refs inlined)."""
    schema = VlmResponse.model_json_schema()
    defs = schema.pop("$defs", {})
    schema.pop("title", None)
    schema.pop("description", None)

    def resolve(node: Any) -> Any:
        if isinstance(node, dict):
            ref = node.get("$ref")
            if isinstance(ref, str) and ref.startswith("#/$defs/"):
                key = ref.rsplit("/", 1)[-1]
                return resolve(copy.deepcopy(defs[key]))
            return {k: resolve(v) for k, v in node.items() if k != "title"}
        if isinstance(node, list):
            return [resolve(v) for v in node]
        return node

    return resolve(schema)


RESPONSE_JSON_SCHEMA: dict[str, Any] = _response_json_schema()


class VlmError(ValueError):
    """Invalid VLM response or configuration."""


def use_fake_mode(*, fake_env: str | None = None) -> bool:
    """True when VLM_FAKE explicitly opts into offline stubs (missing key is an error)."""
    return (
        fake_env if fake_env is not None else os.environ.get("VLM_FAKE", "")
    ).strip() in {
        "1",
        "true",
        "True",
        "yes",
        "YES",
    }


def resolve_model(model: str | None = None) -> str:
    return (model or os.environ.get("VLM_MODEL") or DEFAULT_MODEL).strip()


def classify_image(
    image: Path | str | bytes,
    *,
    mime_type: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    temperature: float = 0.0,
    fake: bool | None = None,
) -> VlmVerdict:
    """Classify one roadside grass photo as baixa|média|alta."""
    resolved_model = resolve_model(model)
    image_bytes, resolved_mime, source_name = _load_image(image, mime_type=mime_type)

    if fake is None:
        fake = use_fake_mode()
    if fake:
        return _fake_verdict(resolved_model, source_name=source_name)

    key = (
        api_key if api_key is not None else os.environ.get("GOOGLE_API_KEY") or ""
    ).strip()
    if not key:
        raise VlmError("GOOGLE_API_KEY is required for live VLM calls")

    raw_text = _generate_once(
        image_bytes=image_bytes,
        mime_type=resolved_mime,
        model=resolved_model,
        api_key=key,
        base_url=base_url or os.environ.get("VLM_BASE_URL"),
        temperature=temperature,
    )
    try:
        return parse_verdict(raw_text, model=resolved_model)
    except VlmError:
        # One retry on invalid / unparseable JSON.
        raw_text = _generate_once(
            image_bytes=image_bytes,
            mime_type=resolved_mime,
            model=resolved_model,
            api_key=key,
            base_url=base_url or os.environ.get("VLM_BASE_URL"),
            temperature=temperature,
        )
        return parse_verdict(raw_text, model=resolved_model)


def classify_folder(
    folder: Path | str,
    *,
    model: str | None = None,
    fake: bool | None = None,
) -> list[dict[str, Any]]:
    """Classify image files in a folder; returns JSON-serializable rows."""
    root = Path(folder)
    if not root.is_dir():
        raise VlmError(f"not a directory: {root}")

    rows: list[dict[str, Any]] = []
    for path in sorted(p for p in root.iterdir() if p.is_file() and _is_image_path(p)):
        verdict = classify_image(path, model=model, fake=fake)
        row = verdict.to_dict()
        row["path"] = str(path)
        rows.append(row)
    return rows


def parse_verdict(raw: str, *, model: str) -> VlmVerdict:
    """Parse and validate model text into a VlmVerdict."""
    payload = _extract_json_object(raw)
    try:
        response = VlmResponse.model_validate(payload)
    except ValidationError as exc:
        raise VlmError(str(exc)) from exc
    return VlmVerdict(**response.model_dump(), model=model, fake=False)


def _fake_verdict(model: str, *, source_name: str) -> VlmVerdict:
    name = source_name.lower()
    if "alta" in name:
        classe: Classe = "alta"
        conf = 0.7
    elif "media" in name or "média" in name:
        classe = "média"
        conf = 0.65
    elif "baixa" in name:
        classe = "baixa"
        conf = 0.7
    else:
        classe = "média"
        conf = 0.4
    return VlmVerdict(
        classe=classe,
        altura_estimada_cm=None,
        vegetacao_visivel=True,
        confianca_declarada=conf,
        justificativa="fake mode (no live API call)",
        model=model,
        fake=True,
    )


def _generate_once(
    *,
    image_bytes: bytes,
    mime_type: str,
    model: str,
    api_key: str,
    base_url: str | None,
    temperature: float,
) -> str:
    from google import genai
    from google.genai import types

    http_options = None
    if base_url and base_url.strip():
        http_options = types.HttpOptions(base_url=base_url.strip())

    client = genai.Client(api_key=api_key, http_options=http_options)
    config = types.GenerateContentConfig(
        temperature=temperature,
        candidate_count=1,
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_json_schema=RESPONSE_JSON_SCHEMA,
    )
    response = client.models.generate_content(
        model=model,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            USER_PROMPT,
        ],
        config=config,
    )
    text = (response.text or "").strip()
    if not text:
        raise VlmError("empty model response")
    return text


def _load_image(
    image: Path | str | bytes,
    *,
    mime_type: str | None,
) -> tuple[bytes, str, str]:
    if isinstance(image, bytes):
        resolved = mime_type or "image/jpeg"
        return image, resolved, "bytes"

    path = Path(image)
    if not path.is_file():
        raise VlmError(f"image not found: {path}")
    data = path.read_bytes()
    if mime_type:
        return data, mime_type, path.name
    guessed, _ = mimetypes.guess_type(path.name)
    return data, guessed or "image/jpeg", path.name


def _is_image_path(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_SUFFIXES


def _extract_json_object(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            raise VlmError(f"response is not JSON: {raw[:200]!r}") from None
        try:
            payload = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise VlmError(f"invalid JSON in model response: {exc}") from exc
    if not isinstance(payload, dict):
        raise VlmError("JSON root must be an object")
    return payload
