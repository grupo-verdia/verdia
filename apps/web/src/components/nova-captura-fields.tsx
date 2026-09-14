import { Field } from "@/components/field";
import type { FieldErrors } from "@/components/nova-captura-ingest";
import type { Rodovia } from "@/lib/rodovias";

const SENTIDOS = [
  "Norte",
  "Sul",
  "Leste",
  "Oeste",
  "Crescente",
  "Decrescente",
] as const;

type CapturaMetaFieldsProps = {
  rodovias: Rodovia[];
  rodoviaId: string;
  km: string;
  sentido: string;
  lat: string;
  lon: string;
  errors: FieldErrors;
  onRodovia: (value: string) => void;
  onKm: (value: string) => void;
  onSentido: (value: string) => void;
  onLat: (value: string) => void;
  onLon: (value: string) => void;
};

export function CapturaMetaFields({
  rodovias,
  rodoviaId,
  km,
  sentido,
  lat,
  lon,
  errors,
  onRodovia,
  onKm,
  onSentido,
  onLat,
  onLon,
}: CapturaMetaFieldsProps) {
  return (
    <div className="form-grid">
      <Field label="Rodovia">
        <select
          className="select"
          value={rodoviaId}
          onChange={(event) => onRodovia(event.target.value)}
        >
          <option value="">Não informar</option>
          {rodovias.map((rodovia) => (
            <option key={rodovia.id} value={rodovia.id}>
              {rodovia.codigo} · {rodovia.nome}
            </option>
          ))}
        </select>
      </Field>
      <Field label="KM" error={errors.km}>
        <input
          className={`input${errors.km ? " input-invalid" : ""}`}
          value={km}
          onChange={(event) => onKm(event.target.value)}
          inputMode="decimal"
        />
      </Field>
      <Field label="Sentido">
        <select
          className="select"
          value={sentido}
          onChange={(event) => onSentido(event.target.value)}
        >
          <option value="">Não informar</option>
          {SENTIDOS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>
      <div className="coord-fields">
        <Field label="Latitude" error={errors.lat}>
          <input
            className={`input${errors.lat ? " input-invalid" : ""}`}
            value={lat}
            onChange={(event) => onLat(event.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Longitude" error={errors.lon}>
          <input
            className={`input${errors.lon ? " input-invalid" : ""}`}
            value={lon}
            onChange={(event) => onLon(event.target.value)}
            inputMode="decimal"
          />
        </Field>
        <p className="field-hint coord-fields-hint">Usada nas fotos sem GPS.</p>
      </div>
    </div>
  );
}
