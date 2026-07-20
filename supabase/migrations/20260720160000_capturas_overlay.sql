-- Segmentação overlay storage key for captura detail (#7).
-- Overlay is visualization only; classe remains the ordinal prediction.

alter table public.capturas
  add column if not exists overlay_storage_key text;
