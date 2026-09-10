-- Nova captura saves the photo first, then classifies. Null classified_at
-- means the captura is still in the AI queue. Existing rows are already done.

alter table public.capturas
  add column if not exists classified_at timestamptz;

update public.capturas
  set classified_at = created_at
  where classified_at is null
    and (
      model_version is not null
      or inference_error is not null
      or classe is not null
    );
