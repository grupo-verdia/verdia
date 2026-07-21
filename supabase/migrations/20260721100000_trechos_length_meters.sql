-- Trecho length: Motiva 500 m default (#26)
-- Each captura creates exactly one trecho; length is stored for map/planning.

alter table public.trechos
  add column if not exists length_meters integer not null default 500
    check (length_meters > 0);

comment on column public.trechos.length_meters is
  'Roadside stretch length in meters; Motiva manual-analysis default is 500.';

-- Previous write path allowed N capturas per trecho. Split extras onto new
-- trechos so the unique index below can be created safely on existing data.
do $$
declare
  r record;
  new_trecho_id uuid;
  new_severidade text;
begin
  for r in
    select
      c.id as captura_id,
      c.classe
    from public.capturas c
    where c.id not in (
      select distinct on (trecho_id) id
      from public.capturas
      order by trecho_id, created_at asc, id asc
    )
  loop
    new_severidade := case r.classe
      when 'alta' then 'alta'
      when 'média' then 'média'
      when 'baixa' then 'baixa'
      else 'baixa'
    end;

    insert into public.trechos (severidade, length_meters)
    values (new_severidade, 500)
    returning id into new_trecho_id;

    update public.capturas
    set trecho_id = new_trecho_id
    where id = r.captura_id;
  end loop;

  -- Align kept trechos’ severidade with their remaining captura’s classe.
  update public.trechos t
  set severidade = case c.classe
    when 'alta' then 'alta'
    when 'média' then 'média'
    when 'baixa' then 'baixa'
    else 'baixa'
  end
  from public.capturas c
  where c.trecho_id = t.id;
end $$;

-- Enforce 1 captura = 1 trecho at the database layer.
create unique index if not exists capturas_trecho_id_unique
  on public.capturas (trecho_id);
