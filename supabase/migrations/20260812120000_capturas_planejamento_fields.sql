-- Additive Planejamento / Excel fields on existing capturas (remote already has
-- capturas_trechos … drop_capturas_overlay). Do NOT recreate capturas/trechos.
-- Classe-from-height uses Motiva bands in app code: <10 baixa, 10–30 média, >30 alta.

alter table public.capturas
  add column if not exists rodovia_id text,
  add column if not exists km double precision,
  add column if not exists sentido text,
  add column if not exists altura_cm double precision;

create index if not exists capturas_rodovia_id_idx
  on public.capturas (rodovia_id);

comment on column public.capturas.altura_cm is
  'Estimated grass height (cm). Classe uses Motiva bands: <10 baixa, 10-30 média, >30 alta.';

comment on column public.capturas.rodovia_id is
  'Optional Motiva rodovia catalog id (code-seeded in apps/web; not a FK yet).';
