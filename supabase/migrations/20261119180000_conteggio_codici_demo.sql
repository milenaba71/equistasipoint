-- Conteggio dei codici demo (DEMO2026, DEMOPRO2026): telefoni che li hanno usati, da oggi in poi.
-- pair_device registra il telefono (codice casuale) in demo_uses; app_device_stats li mostra in statistiche.html.
create table if not exists public.demo_uses (
  serial text not null,
  phone_id text not null,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (serial, phone_id)
);
alter table public.demo_uses enable row level security;

-- in pair_device, ramo dei seriali di prova:
--   insert into public.demo_uses (serial, phone_id) values (s, ph)
--     on conflict (serial, phone_id) do update set last_at = now();
do $m$
declare def text := pg_get_functiondef('public.pair_device(text,text,boolean)'::regprocedure);
begin
  if position('insert into public.demo_uses' in def) > 0 then return; end if;
  def := replace(def, 'if s in (''DEMO2026'', ''DEMOPRO2026'') then',
    'if s in (''DEMO2026'', ''DEMOPRO2026'') then
    insert into public.demo_uses (serial, phone_id) values (s, ph)
      on conflict (serial, phone_id) do update set last_at = now();');
  execute def;
end $m$;

-- app_device_stats: aggiunti 'demo_since' e 'demo' [{serial, phones, last7}] (vedi definizione completa applicata su Supabase)
