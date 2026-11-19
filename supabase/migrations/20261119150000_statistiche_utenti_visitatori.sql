-- Statistiche settimanali: «people» conta solo chi ha un dispositivo abbinato;
-- «visitors» chi ha aperto l'app senza averla attivata (e non l'ha attivata in quella settimana).
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
              from public.app_usage_day where day >= wk and day < wk + 7 and kind <> '' group by 1) x)
      ) w
      from generate_series(date_trunc('week', current_date)::date - 77, date_trunc('week', current_date)::date, interval '7 days') g(wk0),
           lateral (select wk0::date wk) z
    ) s));
end;
$$;
