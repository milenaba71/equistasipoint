-- Novità di Equistasi nell'app (solo Supabase, niente Airtable).
-- L'ufficio le gestisce da app.equistasi.com/admin/ con il proprio account Supabase (email e password).
-- Possono scrivere solo gli account elencati in news_editors; l'app legge solo quelle pubblicate e non scadute.
-- Le immagini stanno nel bucket pubblico «news».

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 140),
  body text not null default '' check (length(body) <= 2000),
  image_url text not null default '',
  link_url text not null default '' check (link_url = '' or link_url ~* '^https://'),
  link_label text not null default '' check (length(link_label) <= 40),
  audience text[] not null default '{all}',  -- all | silicon | gel | prof | rent
  published boolean not null default false,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);
create index if not exists news_publish_at on public.news (publish_at desc);
alter table public.news enable row level security;

-- chi può gestire le novità (si aggiungono con SQL, non dall'app)
create table if not exists public.news_editors (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.news_editors enable row level security;

create or replace function public.is_news_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.news_editors e where lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke all on function public.is_news_editor() from public;
grant execute on function public.is_news_editor() to anon, authenticated;

drop policy if exists news_read on public.news;
create policy news_read on public.news for select to anon, authenticated
  using (published and publish_at <= now() and (expires_at is null or expires_at > now()));
drop policy if exists news_editor_all on public.news;
create policy news_editor_all on public.news for all to authenticated
  using (public.is_news_editor()) with check (public.is_news_editor());

create or replace function public.news_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', '');
  return new;
end;
$$;
drop trigger if exists news_touch on public.news;
create trigger news_touch before insert or update on public.news for each row execute function public.news_touch();

-- immagini: lettura pubblica, scrittura solo per l'ufficio (max 5 MB, solo immagini)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news', 'news', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists news_img_select on storage.objects;
create policy news_img_select on storage.objects for select to authenticated
  using (bucket_id = 'news' and public.is_news_editor());
drop policy if exists news_img_insert on storage.objects;
create policy news_img_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'news' and public.is_news_editor());
drop policy if exists news_img_update on storage.objects;
create policy news_img_update on storage.objects for update to authenticated
  using (bucket_id = 'news' and public.is_news_editor());
drop policy if exists news_img_delete on storage.objects;
create policy news_img_delete on storage.objects for delete to authenticated
  using (bucket_id = 'news' and public.is_news_editor());

-- (pulizia della riga di prova delle statistiche)
delete from public.app_usage_day where phone_id like 'test-claude%';
