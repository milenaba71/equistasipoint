-- Letture delle novità, anonime: quante persone hanno aperto ogni novità e quante hanno toccato il suo pulsante.
-- Una riga per novità e per telefono (codice casuale dell'app, niente seriali né dati personali).
-- L'app scrive con news_seen / news_click; l'ufficio legge i totali con news_stats (solo account in news_editors).

create table if not exists public.news_reads (
  news_id uuid not null,  -- senza vincolo: se una novità viene tolta, le sue letture restano ma non si vedono più
  phone_id text not null,
  platform text not null default '',
  read_at timestamptz not null default now(),
  clicked_at timestamptz,
  primary key (news_id, phone_id)
);
alter table public.news_reads enable row level security;

create or replace function public.news_seen(p_ids uuid[], p_phone text, p_platform text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ph text := left(coalesce(p_phone, ''), 80);
begin
  if length(ph) < 8 or p_ids is null then return; end if;
  insert into public.news_reads (news_id, phone_id, platform)
  select n.id, ph, left(lower(coalesce(p_platform, '')), 20)
    from public.news n
   where n.id = any (p_ids[1:20]) and n.published
  on conflict (news_id, phone_id) do nothing;
end;
$$;

create or replace function public.news_click(p_id uuid, p_phone text, p_platform text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ph text := left(coalesce(p_phone, ''), 80);
begin
  if length(ph) < 8 or p_id is null then return; end if;
  insert into public.news_reads (news_id, phone_id, platform, clicked_at)
  select n.id, ph, left(lower(coalesce(p_platform, '')), 20), now()
    from public.news n where n.id = p_id and n.published
  on conflict (news_id, phone_id) do update set clicked_at = coalesce(public.news_reads.clicked_at, now());
end;
$$;

create or replace function public.news_stats()
returns table (news_id uuid, reads bigint, clicks bigint, ios bigint, android bigint, web bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.news_id, count(*), count(r.clicked_at),
         count(*) filter (where r.platform = 'ios'), count(*) filter (where r.platform = 'android'),
         count(*) filter (where r.platform not in ('ios', 'android'))
    from public.news_reads r
   where public.is_news_editor()
   group by r.news_id;
$$;

grant execute on function public.news_seen(uuid[], text, text) to anon, authenticated;
grant execute on function public.news_click(uuid, text, text) to anon, authenticated;
grant execute on function public.news_stats() to authenticated;
