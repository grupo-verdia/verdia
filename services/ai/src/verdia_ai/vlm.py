"""Hosted VLM grass classifier (Gemma 4 via Google AI Studio).

The VLM estimates roadside grass height; Motiva cm bands map to classe in code.
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

from verdia_ai.labels import Classe, classe_from_altura_cm
from verdia_ai.prompts import SYSTEM_PROMPT, USER_PROMPT

DEFAULT_MODEL = "gemma-4-26b-a4b-it"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"}


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
    """LLM JSON payload (excludes derived classe and call metadata)."""

    model_config = ConfigDict(frozen=True)

    # Ordem alterada: Força a IA a gerar o raciocínio (justificativa) ANTES dos números.
    vegetacao_visivel: bool
    justificativa: str = Field(min_length=1)
    altura_estimada_cm: AlturaEstimadaCm | None
    confianca_declarada: float = Field(ge=0.0, le=1.0)

    @field_validator("justificativa", mode="before")
    @classmethod
    def _strip_justificativa(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()
        return value


class VlmVerdict(BaseModel):
    """Validated classification plus call metadata; classe is derived from height."""

    model_config = ConfigDict(frozen=True)

    classe: Classe | None
    vegetacao_visivel: bool
    justificativa: str = Field(min_length=1)
    altura_estimada_cm: AlturaEstimadaCm | None
    confianca_declarada: float = Field(ge=0.0, le=1.0)
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
    source_name: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    temperature: float = 0.2,  # Respiro na criatividade visual
    fake: bool | None = None,
) -> VlmVerdict:
    """Estimate roadside grass height and map to baixa|média|alta|null."""
    resolved_model = resolve_model(model)
    image_bytes, resolved_mime, resolved_name = _load_image(
        image,
        mime_type=mime_type,
        source_name=source_name,
    )

    # 🔴 DESATIVAÇÃO DO MOCK: Garante que o modelo vai SEMPRE processar a imagem.
    fake = False

    if fake is None:
        fake = use_fake_mode()
    if fake:
        return _fake_verdict(resolved_model, source_name=resolved_name)

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
    """Parse model JSON, derive classe from Motiva height bands, return VlmVerdict."""
    payload = _extract_json_object(raw)
    # Classe is derived in code; ignore any stray key from the model.
    payload.pop("classe", None)
    try:
        response = VlmResponse.model_validate(payload)
    except ValidationError as exc:
        raise VlmError(str(exc)) from exc
    altura = response.altura_estimada_cm
    classe = classe_from_altura_cm(
        None if altura is None else altura.min,
        None if altura is None else altura.max,
        vegetacao_visivel=response.vegetacao_visivel,
    )
    return VlmVerdict(
        **response.model_dump(),
        classe=classe,
        model=model,
        fake=False,
    )


def _fake_altura_for_name(
    source_name: str,
) -> tuple[AlturaEstimadaCm | None, bool, float]:
    """Filename heuristics → height stub that exercises the real Motiva mapper."""
    stem = Path(source_name).stem.lower()
    parts = set(re.split(r"[_\-\s.]+", stem))
    if "na" in parts or "null" in parts:
        return None, False, 0.5
    if "alta" in parts:
        return AlturaEstimadaCm(min=40.0, max=60.0), True, 0.7
    if "media" in parts or "média" in parts:
        return AlturaEstimadaCm(min=15.0, max=25.0), True, 0.65
    if "baixa" in parts:
        return AlturaEstimadaCm(min=3.0, max=8.0), True, 0.7
    return AlturaEstimadaCm(min=15.0, max=25.0), True, 0.4


def _fake_verdict(model: str, *, source_name: str) -> VlmVerdict:
    altura, visivel, conf = _fake_altura_for_name(source_name)
    classe = classe_from_altura_cm(
        None if altura is None else altura.min,
        None if altura is None else altura.max,
        vegetacao_visivel=visivel,
    )
    return VlmVerdict(
        classe=classe,
        altura_estimada_cm=altura,
        vegetacao_visivel=visivel,
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

    # Injeção Direta (Zero-Shot) baseada nas regras de geometria/contraste do prompt
    contents_list = [
        types.Content(
            role="user",
            parts=[
                # CORREÇÃO AQUI: Passando o argumento com keyword 'text='
                types.Part.from_text(text=USER_PROMPT),
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ]
        )
    ]

    response = client.models.generate_content(
        model=model,
        contents=contents_list,
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
    source_name: str | None = None,
) -> tuple[bytes, str, str]:
    if isinstance(image, bytes):
        resolved = mime_type or "image/jpeg"
        return image, resolved, source_name or "bytes"

    path = Path(image)
    if not path.is_file():
        raise VlmError(f"image not found: {path}")
    data = path.read_bytes()
    name = source_name or path.name
    if mime_type:
        return data, mime_type, name
    guessed, _ = mimetypes.guess_type(path.name)
    return data, guessed or "image/jpeg", name


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