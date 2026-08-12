-- Additive human-override fields on existing capturas (UI parity with zip).
-- Do NOT recreate capturas/trechos.

alter table public.capturas
  add column if not exists override_motivo text,
  add column if not exists override_at timestamptz;

comment on column public.capturas.override_motivo is
  'Reason recorded when an operator overrides the AI classe.';

comment on column public.capturas.override_at is
  'Timestamp of the last human override of classe.';
