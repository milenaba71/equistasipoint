-- Pop-up all'apertura dell'app, gestiti dall'ufficio su /admin/ (solo Supabase, niente Airtable).
-- kind 'popup': un messaggio (titolo, testo, foto, pulsante, codice sconto).
-- kind 'advent': calendario dell'Avvento, 24 caselle in «doors»; la casella N si apre dal giorno starts_at + N-1.
-- audience: 'none' = solo chi non ha ancora abbinato un dispositivo, 'device' = chi ce l'ha (tutti i tipi), 'all' = tutti.
-- frequency: 'always' = a ogni apertura, 'daily' = una volta al giorno, 'once' = una volta sola.
-- Conteggi anonimi in popup_views (door 0 = pop-up visto; door N = casella N aperta), solo codice casuale del telefono.

create table if not exists public.popups (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'popup' check (kind in ('popup', 'advent')),
  title text not null check (length(title) between 1 and 140),
  body text not null default '' check (length(body) <= 2000),
  image_url text not null default '',
  link_url text not null default '' check (link_url = '' or link_url ~* '^https://'),
  link_label text not null default '' check (length(link_label) <= 40),
  coupon text not null default '' check (length(coupon) <= 40),
  audience text not null default 'all' check (audience in ('none', 'device', 'all')),
  frequency text not null default 'always' check (frequency in ('always', 'daily', 'once')),
  doors jsonb not null default '[]',
  active boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
alter table public.popups enable row level security;

create policy popups_read on public.popups for select to anon, authenticated
  using (active and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy popups_editor_all on public.popups for all to authenticated
  using (public.is_news_editor()) with check (public.is_news_editor());
create trigger popups_touch before insert or update on public.popups for each row execute function public.news_touch();

create table if not exists public.popup_views (
  popup_id uuid not null,
  door int not null default 0,
  phone_id text not null,
  platform text not null default '',
  seen_at timestamptz not null default now(),
  clicked_at timestamptz,
  primary key (popup_id, door, phone_id)
);
alter table public.popup_views enable row level security;

create or replace function public.popup_seen(p_id uuid, p_door int, p_phone text, p_platform text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ph text := left(coalesce(p_phone, ''), 80);
begin
  if length(ph) < 8 or p_id is null or coalesce(p_door, 0) not between 0 and 31 then return; end if;
  insert into public.popup_views (popup_id, door, phone_id, platform)
  select p.id, coalesce(p_door, 0), ph, left(lower(coalesce(p_platform, '')), 20)
    from public.popups p where p.id = p_id and p.active
  on conflict (popup_id, door, phone_id) do nothing;
end;
$$;

create or replace function public.popup_click(p_id uuid, p_door int, p_phone text, p_platform text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ph text := left(coalesce(p_phone, ''), 80);
begin
  if length(ph) < 8 or p_id is null or coalesce(p_door, 0) not between 0 and 31 then return; end if;
  insert into public.popup_views (popup_id, door, phone_id, platform, clicked_at)
  select p.id, coalesce(p_door, 0), ph, left(lower(coalesce(p_platform, '')), 20), now()
    from public.popups p where p.id = p_id and p.active
  on conflict (popup_id, door, phone_id) do update set clicked_at = coalesce(public.popup_views.clicked_at, now());
end;
$$;

create or replace function public.popup_stats()
returns table (popup_id uuid, door int, views bigint, clicks bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.popup_id, v.door, count(*), count(v.clicked_at)
    from public.popup_views v
   where public.is_news_editor()
   group by v.popup_id, v.door;
$$;

grant execute on function public.popup_seen(uuid, int, text, text) to anon, authenticated;
grant execute on function public.popup_click(uuid, int, text, text) to anon, authenticated;
grant execute on function public.popup_stats() to authenticated;
