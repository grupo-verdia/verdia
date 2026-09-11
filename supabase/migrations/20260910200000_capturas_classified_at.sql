-- Null classified_at: not classified yet. Existing rows predate the queue.

alter table public.capturas
  add column if not exists classified_at timestamptz;

update public.capturas
  set classified_at = created_at
  where classified_at is null;
