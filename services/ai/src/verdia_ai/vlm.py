"""Hosted VLM grass classifier (Gemma 4 via Google AI Studio).

Prototype only — not wired into FastAPI `/infer`.
"""

from __future__ import annotations

import json
import mimetypes
import os
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from verdia_ai.labels import CLASSES, Classe

DEFAULT_MODEL = "gemma-4-26b-a4b-it"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"}

SYSTEM_PROMPT = """\
Você classifica fotos de vegetação à beira de rodovia para prioridade de manutenção.

FOCO OBRIGATÓRIO — julgue SOMENTE a faixa de grama/mato imediatamente junto à \
pista pavimentada / acostamento (a vegetação do shoulder, a poucos metros da \
borda do asfalto). Ignore e NÃO use para a classe:
- taludes, aterros ou encostas distantes;
- vegetação alta ao fundo (arbustos, mata, morro);
- vegetação da pista oposta ou do canteiro central distante;
- árvores ou mato longe da beira da faixa de rolamento.

Fotos tipo Fernão Dias / Street View costumam mostrar mato alto longe da pista — \
isso NÃO conta. Só importa o estado da faixa junto à pista.

A classe é um JULGAMENTO DE MANUTENÇÃO (quanto essa faixa junto à pista parece \
precisar de corte), NÃO uma fração de cobertura de pixels, NÃO um limiar em \
centímetros, e NÃO uma definição por área verde na imagem inteira.

Escala ordinal (baixa < média < alta):
- baixa: faixa junto à pista baixa / bem aparada / pouco urgente cortar.
- média: altura intermediária nessa faixa; manutenção em breve faz sentido.
- alta: faixa junto à pista alta / descuidada; prioridade alta de corte.

Responda somente com JSON válido conforme o schema. \
`confianca_declarada` é sua autoavaliação (0–1), não um score calibrado. \
`altura_estimada_cm` só se houver referência de escala visível na faixa julgada; \
senão null. \
`referencia_de_escala` descreve o objeto usado (poste, guarda-corpo, etc.) ou null. \
`justificativa` deve deixar claro que avaliou a faixa junto à pista (não o fundo).
"""

USER_PROMPT = (
    "Classifique SOMENTE a vegetação da faixa junto à pista / acostamento "
    "(ignore taludes e vegetação distante) e devolva o JSON do schema."
)

RESPONSE_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "classe": {"type": "string", "enum": list(CLASSES)},
        "altura_estimada_cm": {
            "anyOf": [
                {
                    "type": "object",
                    "properties": {
                        "min": {"type": "number"},
                        "max": {"type": "number"},
                    },
                    "required": ["min", "max"],
                },
                {"type": "null"},
            ]
        },
        "referencia_de_escala": {
            "anyOf": [{"type": "string"}, {"type": "null"}],
        },
        "vegetacao_visivel": {"type": "boolean"},
        "confianca_declarada": {"type": "number"},
        "justificativa": {"type": "string"},
    },
    "required": [
        "classe",
        "altura_estimada_cm",
        "referencia_de_escala",
        "vegetacao_visivel",
        "confianca_declarada",
        "justificativa",
    ],
}


@dataclass(frozen=True)
class AlturaEstimadaCm:
    min: float
    max: float


@dataclass(frozen=True)
class VlmVerdict:
    classe: Classe
    altura_estimada_cm: AlturaEstimadaCm | None
    referencia_de_escala: str | None
    vegetacao_visivel: bool
    confianca_declarada: float
    justificativa: str
    model: str
    fake: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class VlmError(ValueError):
    """Invalid VLM response or configuration."""


def use_fake_mode(*, api_key: str | None = None, fake_env: str | None = None) -> bool:
    """True when live Google calls should be skipped."""
    if (
        fake_env if fake_env is not None else os.environ.get("VLM_FAKE", "")
    ).strip() in {
        "1",
        "true",
        "True",
        "yes",
        "YES",
    }:
        return True
    key = api_key if api_key is not None else os.environ.get("GOOGLE_API_KEY")
    return not (key and key.strip())


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
        fake = use_fake_mode(api_key=api_key)
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
    return _verdict_from_payload(payload, model=model, fake=False)


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
        referencia_de_escala=None,
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


def _verdict_from_payload(
    payload: dict[str, Any],
    *,
    model: str,
    fake: bool,
) -> VlmVerdict:
    classe = _parse_classe(payload.get("classe"))
    altura = _parse_altura(payload.get("altura_estimada_cm"))
    ref = payload.get("referencia_de_escala")
    if ref is not None and not isinstance(ref, str):
        raise VlmError("referencia_de_escala must be string or null")
    if isinstance(ref, str) and not ref.strip():
        ref = None

    vegetacao = payload.get("vegetacao_visivel")
    if not isinstance(vegetacao, bool):
        raise VlmError("vegetacao_visivel must be bool")

    conf = payload.get("confianca_declarada")
    if not isinstance(conf, (int, float)) or isinstance(conf, bool):
        raise VlmError("confianca_declarada must be a number")
    conf_f = float(conf)
    if not 0.0 <= conf_f <= 1.0:
        raise VlmError(f"confianca_declarada must be in [0, 1], got {conf_f}")

    just = payload.get("justificativa")
    if not isinstance(just, str) or not just.strip():
        raise VlmError("justificativa must be a non-empty string")

    return VlmVerdict(
        classe=classe,
        altura_estimada_cm=altura,
        referencia_de_escala=ref,
        vegetacao_visivel=vegetacao,
        confianca_declarada=conf_f,
        justificativa=just.strip(),
        model=model,
        fake=fake,
    )


def _parse_classe(value: Any) -> Classe:
    match value:
        case "baixa" | "média" | "alta":
            return value
        case _:
            raise VlmError(f"classe must be one of {CLASSES}, got {value!r}")


def _parse_altura(value: Any) -> AlturaEstimadaCm | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise VlmError("altura_estimada_cm must be object or null")
    try:
        lo = float(value["min"])
        hi = float(value["max"])
    except (KeyError, TypeError, ValueError) as exc:
        raise VlmError("altura_estimada_cm requires numeric min/max") from exc
    if lo > hi:
        raise VlmError(f"altura_estimada_cm min > max ({lo} > {hi})")
    return AlturaEstimadaCm(min=lo, max=hi)
