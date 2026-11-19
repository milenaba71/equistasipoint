-- Pagina statistiche.html: dispositivi abbinati all'app (totali, per tipo, nuovi abbinamenti per settimana).
-- Solo numeri, protetti dallo stesso codice di accesso di app_week_stats. Esclusi i seriali di prova DEMO*.
create or replace function public.app_device_stats(p_code text)
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
  return jsonb_build_object(
    'ok', true,
    'since', (select min(at)::date from public.link_log),
    'devices', (select count(*) from public.phone_links where serial not like 'DEMO%'),
    'phones', (select count(distinct phone_id) from public.phone_links where serial not like 'DEMO%'),
    'last7', (select count(*) from public.phone_links where serial not like 'DEMO%' and linked_at > now() - interval '7 days'),
    'last30', (select count(*) from public.phone_links where serial not like 'DEMO%' and linked_at > now() - interval '30 days'),
    'kind', (select coalesce(jsonb_object_agg(t, n), '{}') from (
        select coalesce(nullif(trim(d.tipo), ''), 'altro') t, count(*) n
          from public.phone_links p join public.devices d on d.serial = p.serial
         where p.serial not like 'DEMO%' group by 1) x),
    'weeks', (select coalesce(jsonb_agg(jsonb_build_object('week', w, 'n', n) order by w desc), '[]') from (
        select to_char(date_trunc('week', at)::date, 'YYYY-MM-DD') w, count(distinct serial) n
          from public.link_log
         where action = 'abbinato' and serial not like 'DEMO%' and at > now() - interval '12 weeks'
         group by 1) y)
  );
end;
$$;
grant execute on function public.app_device_stats(text) to anon, authenticated;
