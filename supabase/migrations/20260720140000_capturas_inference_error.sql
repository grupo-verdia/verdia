-- Add inference_error so failed inferences stay visible on the dashboard (#6).

alter table public.capturas
  add column if not exists inference_error text;
