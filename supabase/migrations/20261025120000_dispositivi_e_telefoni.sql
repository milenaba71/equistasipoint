-- Equistasi Point: dispositivi validi (copiati ogni notte da Airtable) e telefono attivo per ogni seriale.
-- Un seriale funziona su un solo telefono alla volta; si può spostare su un telefono nuovo
-- al massimo 3 volte in 30 giorni (poi serve Equistasi, che può azzerare il contatore).
-- L'app non legge le tabelle: usa solo la funzione pair_device (chiave publishable).

create table public.devices (
  serial     text primary key,               -- numero di serie, maiuscolo e senza spazi
  tipo       text not null default '',       -- tipologia di Airtable: SILICON, GEL, SLIM, EQUIX, noleggio prof...
  pro        boolean not null default false, -- noleggio professionale: strumenti per il professionista
  cal_next   date,                           -- data prossima calibrazione (tabella calibrazioni)
  updated_at timestamptz not null default now()
);

create table public.phone_links (
  serial        text primary key references public.devices (serial) on delete cascade,
  phone_id      text not null,               -- codice casuale creato dall'app al primo avvio (uno per telefono)
  linked_at     timestamptz not null default now(),
  moves         int not null default 0,      -- spostamenti su un altro telefono nella finestra di 30 giorni
  moves_since   timestamptz not null default now(),
  blocked       boolean not null default false, -- blocco manuale da parte di Equistasi
  note          text
);

create table public.link_log (
  id       bigint generated always as identity primary key,
  serial   text not null,
  phone_id text not null,
  action   text not null,                    -- abbinato | spostato | limite
  at       timestamptz not null default now()
);
create index link_log_serial on public.link_log (serial, at desc);

-- Nessun accesso diretto alle tabelle con la chiave publishable
alter table public.devices enable row level security;
alter table public.phone_links enable row level security;
alter table public.link_log enable row level security;

-- Verifica del seriale e telefono attivo.
-- p_move = false: verifica (abbinamento o controllo giornaliero). Se il seriale è su un altro telefono
--                 risponde status 'other_phone' e non cambia niente.
-- p_move = true:  la persona ha confermato di spostare il dispositivo su questo telefono.
-- Risposta: { valid, access, tipo, pro, cal, status }  status: ok | other_phone | moved | limit
create or replace function public.pair_device(p_serial text, p_phone text, p_move boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s text := upper(regexp_replace(coalesce(p_serial, ''), '\s', '', 'g'));
  ph text := left(coalesce(p_phone, ''), 80);
  d public.devices;
  l public.phone_links;
  base jsonb;
begin
  if s = '' or length(ph) < 8 then
    return jsonb_build_object('valid', false);
  end if;
  select * into d from public.devices where serial = s;
  if not found then
    return jsonb_build_object('valid', false);
  end if;
  base := jsonb_build_object('valid', true, 'tipo', d.tipo, 'pro', d.pro, 'cal', coalesce(to_char(d.cal_next, 'YYYY-MM-DD'), ''));
  -- Slim ed Equix non usano l'app
  if upper(trim(d.tipo)) in ('EQUIX', 'SLIM', 'SLIM MEDINAT') then
    return base || jsonb_build_object('access', false, 'status', 'ok');
  end if;
  base := base || jsonb_build_object('access', true);
  -- seriale di prova per i revisori Apple e Google: nessun limite di telefoni
  if s = 'DEMO2026' then
    return base || jsonb_build_object('status', 'ok');
  end if;

  select * into l from public.phone_links where serial = s for update;
  if not found then
    insert into public.phone_links (serial, phone_id) values (s, ph);
    insert into public.link_log (serial, phone_id, action) values (s, ph, 'abbinato');
    return base || jsonb_build_object('status', 'ok');
  end if;
  if l.phone_id = ph then
    return base || jsonb_build_object('status', 'ok');
  end if;
  if not p_move then
    return base || jsonb_build_object('status', 'other_phone');
  end if;
  -- spostamento confermato: al massimo 3 in 30 giorni
  if l.moves_since < now() - interval '30 days' then
    l.moves := 0; l.moves_since := now();
  end if;
  if l.blocked or l.moves >= 3 then
    insert into public.link_log (serial, phone_id, action) values (s, ph, 'limite');
    return base || jsonb_build_object('status', 'limit');
  end if;
  update public.phone_links
     set phone_id = ph, linked_at = now(), moves = l.moves + 1, moves_since = l.moves_since
   where serial = s;
  insert into public.link_log (serial, phone_id, action) values (s, ph, 'spostato');
  return base || jsonb_build_object('status', 'moved');
end;
$$;

revoke all on function public.pair_device(text, text, boolean) from public;
grant execute on function public.pair_device(text, text, boolean) to anon, authenticated;

-- Seriale di prova
insert into public.devices (serial, tipo, pro) values ('DEMO2026', 'SILICON', false)
on conflict (serial) do nothing;
