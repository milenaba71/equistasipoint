-- Rubrica di Airtable (base EQUITUTTO): clienti con i dispositivi collegati, copiata ogni notte.
-- Dati personali: tabelle protette (RLS senza regole), l'app con la chiave publishable non le legge.
-- Servono anche al noleggio privato: per ogni seriale vale il cliente del noleggio in corso.

create table public.customers (
  airtable_id       text primary key,          -- id del record in Rubrica
  nome              text not null default '',  -- «Nome e cognome»
  tipologia_cliente text not null default '',
  data_noleggio     date,
  scadenza_noleggio date,
  noleggio_reso     boolean not null default false,
  reso_in_data      date,
  stato_noleggio    text not null default '',
  updated_at        timestamptz not null default now()
);

create table public.customer_devices (
  customer_id text not null references public.customers (airtable_id) on delete cascade,
  serial      text not null,                  -- numero di serie, maiuscolo e senza spazi
  relazione   text not null,                  -- vendita | noleggio
  kit         text not null default '',       -- «Codice scatola e Lotto» del kit
  primary key (customer_id, serial, relazione)
);
create index customer_devices_serial on public.customer_devices (serial);

alter table public.customers enable row level security;
alter table public.customer_devices enable row level security;

-- Vista comoda per il pannello: ogni dispositivo con il suo cliente e, se c'è, il telefono attivo
create view public.dispositivi_clienti with (security_invoker = true) as
select cd.serial, d.tipo, d.pro, cd.relazione, cd.kit, c.nome, c.tipologia_cliente,
       c.data_noleggio, c.scadenza_noleggio, c.noleggio_reso, c.reso_in_data,
       pl.linked_at as telefono_attivo_dal, pl.moves as spostamenti
  from public.customer_devices cd
  join public.customers c on c.airtable_id = cd.customer_id
  left join public.devices d on d.serial = cd.serial
  left join public.phone_links pl on pl.serial = cd.serial;
revoke all on public.dispositivi_clienti from anon, authenticated;
