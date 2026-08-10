-- Verdia x Motiva: modelo operacional.
-- Os limites abaixo são SOMENTE parâmetros de demonstração; substituir pelos critérios oficiais.
create extension if not exists pgcrypto;

create table if not exists public.rodovias (
  id text primary key,
  codigo text not null unique,
  nome text not null,
  concessionaria text not null default 'Motiva',
  extensao_km numeric,
  limite_atencao_cm numeric not null default 30,
  limite_critico_cm numeric not null default 60,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.trechos (
  id uuid primary key default gen_random_uuid(),
  rodovia_id text not null references public.rodovias(id) on delete cascade,
  km_inicio numeric not null,
  km_fim numeric not null,
  sentido text,
  created_at timestamptz not null default now()
);

create table if not exists public.capturas (
  id uuid primary key default gen_random_uuid(),
  rodovia_id text not null references public.rodovias(id),
  trecho_id uuid references public.trechos(id),
  storage_key text not null,
  lat double precision not null,
  lon double precision not null,
  captured_at timestamptz not null,
  km numeric,
  sentido text,
  altura_cm numeric,
  ai_classe text check (ai_classe in ('baixa','média','alta')),
  ai_confidence numeric check (ai_confidence between 0 and 1),
  model_version text,
  classe_final text check (classe_final in ('baixa','média','alta')),
  decisao_origem text not null default 'ia' check (decisao_origem in ('ia','manual')),
  override_motivo text,
  override_at timestamptz,
  inference_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.captura_overrides (
  id uuid primary key default gen_random_uuid(),
  captura_id uuid not null references public.capturas(id) on delete cascade,
  classe_anterior text,
  classe_nova text not null check (classe_nova in ('baixa','média','alta')),
  altura_cm_nova numeric,
  motivo text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_capturas_rodovia_time on public.capturas(rodovia_id, captured_at desc);
create index if not exists idx_capturas_geo on public.capturas(lat, lon);
create index if not exists idx_capturas_severity on public.capturas(classe_final);
create index if not exists idx_trechos_rodovia_km on public.trechos(rodovia_id, km_inicio, km_fim);

insert into public.rodovias(id,codigo,nome,concessionaria,extensao_km)
values
('sp-330','SP-330','Anhanguera','Motiva',453),
('sp-348','SP-348','Bandeirantes','Motiva',159),
('sp-310','SP-310','Washington Luís','Motiva',454),
('sp-270','SP-270','Raposo Tavares','Motiva',654)
on conflict (id) do nothing;

insert into storage.buckets (id,name,public) values ('capturas','capturas',false) on conflict (id) do nothing;

-- Importante: em produção, aplicar RLS/policies conforme o mecanismo de autenticação corporativo.
