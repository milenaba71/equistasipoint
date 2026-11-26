-- Sezioni dell'app usate, anonime: una volta al giorno per telefono e per sezione (solo il nome della sezione,
-- mai risultati o misure). Si leggono nella pagina statistiche.html, divise per settimana.
alter table public.app_usage_day add column if not exists sections text[] not null default '{}';

create or replace function public.app_section(p_phone text, p_section text, p_kind text default '', p_platform text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ph text := left(coalesce(p_phone, ''), 80);
  sec text := left(lower(regexp_replace(coalesce(p_section, ''), '[^a-zA-Z0-9/_-]', '', 'g')), 40);
begin
  if length(ph) < 8 or sec = '' then return; end if;
  insert into public.app_usage_day (day, phone_id, kind, platform, sections)
  values ((now() at time zone 'Europe/Rome')::date, ph, left(lower(coalesce(p_kind, '')), 20), left(lower(coalesce(p_platform, '')), 20), array[sec])
  on conflict (day, phone_id) do update
    set sections = case when sec = any (public.app_usage_day.sections) or cardinality(public.app_usage_day.sections) >= 60
                        then public.app_usage_day.sections else public.app_usage_day.sections || sec end,
        kind = case when excluded.kind <> '' then excluded.kind else public.app_usage_day.kind end;
end;
$$;
grant execute on function public.app_section(text, text, text, text) to anon, authenticated;

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
        'people', (select count(distinct phone_id) from public.app_usage_day where day >= wk and day < wk + 7 and kind <> ''),
        'visitors', (select count(distinct a.phone_id) from public.app_usage_day a
                      where a.day >= wk and a.day < wk + 7 and a.kind = ''
                        and not exists (select 1 from public.app_usage_day b
                                         where b.phone_id = a.phone_id and b.day >= wk and b.day < wk + 7 and b.kind <> '')),
        'kind', (select coalesce(jsonb_object_agg(k, n), '{}') from (
            select kind k, count(distinct phone_id) n
              from public.app_usage_day where day >= wk and day < wk + 7 and kind <> '' group by 1) x),
        'platform', (select coalesce(jsonb_object_agg(p, n), '{}') from (
            select coalesce(nullif(platform, ''), 'altro') p, count(distinct phone_id) n
              from public.app_usage_day where day >= wk and day < wk + 7 and kind <> '' group by 1) x),
        'sections', (select coalesce(jsonb_object_agg(sc, n), '{}') from (
            select sc, count(distinct phone_id) n
              from public.app_usage_day, unnest(sections) sc where day >= wk and day < wk + 7 and kind <> '' group by 1) x)
      ) w
      from generate_series(date_trunc('week', current_date)::date - 77, date_trunc('week', current_date)::date, interval '7 days') g(wk0),
           lateral (select wk0::date wk) z
    ) s));
end;
$$;
