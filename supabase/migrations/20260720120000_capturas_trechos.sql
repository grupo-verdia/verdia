-- verdia captura / trecho persistence (#3)
-- Apply in Supabase SQL editor (or via CLI migration).

create table if not exists public.trechos (
  id uuid primary key default gen_random_uuid(),
  severidade text not null
    check (severidade in ('baixa', 'média', 'alta')),
  created_at timestamptz not null default now()
);

create table if not exists public.capturas (
  id uuid primary key default gen_random_uuid(),
  trecho_id uuid not null references public.trechos (id) on delete cascade,
  storage_key text not null,
  lat double precision not null,
  lon double precision not null,
  captured_at timestamptz not null,
  classe text check (classe is null or classe in ('baixa', 'média', 'alta')),
  confidence double precision,
  model_version text,
  created_at timestamptz not null default now()
);

create index if not exists capturas_captured_at_idx
  on public.capturas (captured_at desc);

create index if not exists capturas_trecho_id_idx
  on public.capturas (trecho_id);

-- Private bucket for captura images (service role uploads via BFF).
insert into storage.buckets (id, name, public)
values ('capturas', 'capturas', false)
on conflict (id) do nothing;
