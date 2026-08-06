-- Drop abandoned segmentação overlay column (VLM produces no mask).
-- Additive history: do not rewrite 20260720160000_capturas_overlay.sql.

alter table public.capturas
  drop column if exists overlay_storage_key;
