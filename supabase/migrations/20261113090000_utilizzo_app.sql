-- Statistiche anonime di utilizzo dell'app, una volta alla settimana: quante persone l'hanno aperta e con che dispositivo.
-- L'app manda un solo segnale al giorno (app_ping) con il codice casuale del telefono, il tipo di dispositivo
-- e la piattaforma. Niente seriali, nomi, email o telefoni. Una riga per telefono e per giorno; dopo 13 mesi si cancella.
-- Il riepilogo si legge con app_week_stats(codice): il codice di accesso è salvato solo come impronta (sha256).

create table if not exists public.app_usage_day (
  day date not null,
  phone_id text not null,
  kind text not null default '',
  platform text not null default '',
  primary key (day, phone_id)
);
alter table public.app_usage_day enable row level security;

create table if not exists public.app_stats_access (
  code_hash text primary key,
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.app_stats_access enable row level security;

create or replace function public.app_ping(p_phone text, p_kind text default '', p_platform text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ph text := left(coalesce(p_phone, ''), 80);
begin
  if length(ph) < 8 then return; end if;
  insert into public.app_usage_day (day, phone_id, kind, platform)
  values ((now() at time zone 'Europe/Rome')::date, ph, left(lower(coalesce(p_kind, '')), 20), left(lower(coalesce(p_platform, '')), 20))
  on conflict (day, phone_id) do update set kind = excluded.kind, platform = excluded.platform;
  if random() < 0.01 then
    delete from public.app_usage_day where day < current_date - interval '13 months';
  end if;
end;
$$;

-- ultime 12 settimane (da lunedì a domenica): persone diverse, per tipo di dispositivo e per piattaforma
create or replace function public.app_week_stats(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_stats_access
                  where code_hash = encode(sha256(convert_to(upper(trim(coalesce(p_code, ''))), 'UTF8')), 'hex')) then
    perform pg_sleep(1);
    return jsonb_build_object('ok', false);
  end if;
  return jsonb_build_object('ok', true, 'weeks', (
    select coalesce(jsonb_agg(w order by w->>'week' desc), '[]') from (
      select jsonb_build_object(
        'week', to_char(wk, 'YYYY-MM-DD'),
        'people', (select count(distinct phone_id) from public.app_usage_day where day >= wk and day < wk + 7),
        'kind', (select coalesce(jsonb_object_agg(k, n), '{}') from (
            select coalesce(nullif(kind, ''), 'nessuno') k, count(distinct phone_id) n
              from public.app_usage_day where day >= wk and day < wk + 7 group by 1) x),
        'platform', (select coalesce(jsonb_object_agg(p, n), '{}') from (
            select coalesce(nullif(platform, ''), 'altro') p, count(distinct phone_id) n
              from public.app_usage_day where day >= wk and day < wk + 7 group by 1) x)
      ) w
      from generate_series(date_trunc('week', current_date)::date - 77, date_trunc('week', current_date)::date, interval '7 days') g(wk0),
           lateral (select wk0::date wk) z
    ) s));
end;
$$;

revoke all on function public.app_ping(text, text, text) from public;
grant execute on function public.app_ping(text, text, text) to anon, authenticated;
revoke all on function public.app_week_stats(text) from public;
grant execute on function public.app_week_stats(text) to anon, authenticated;
