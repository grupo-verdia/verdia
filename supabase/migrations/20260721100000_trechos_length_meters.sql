-- Trecho length: Motiva 500 m default (#26)
-- Each captura creates exactly one trecho; length is stored for map/planning.

alter table public.trechos
  add column if not exists length_meters integer not null default 500
    check (length_meters > 0);

comment on column public.trechos.length_meters is
  'Roadside stretch length in meters; Motiva manual-analysis default is 500.';

-- Enforce 1 captura = 1 trecho at the database layer.
create unique index if not exists capturas_trecho_id_unique
  on public.capturas (trecho_id);
