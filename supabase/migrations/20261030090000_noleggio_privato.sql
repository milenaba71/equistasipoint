-- Noleggio privato: l'app funziona per il cliente del noleggio in corso.
-- - vale il cliente più recente collegato al seriale (Rubrica 2 = kit a noleggio);
-- - si blocca solo quando su quel cliente è spuntato «Noleggio reso» (la data di scadenza non conta);
-- - un nuovo cliente prende il dispositivo sul suo telefono senza contare negli spostamenti;
-- - il telefono del cliente precedente riceve status 'ended' e non può riprenderlo.

alter table public.phone_links add column if not exists customer_id text;  -- cliente del noleggio al momento dell'abbinamento
alter table public.link_log add column if not exists customer_id text;     -- per «fine_noleggio»: il cliente il cui noleggio è finito

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
  rental boolean;
  cust text;
  reso boolean := false;
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

  rental := upper(trim(d.tipo)) = 'NOLEGGIO PRIVATO';
  if rental then
    select c.airtable_id, c.noleggio_reso into cust, reso
      from public.customer_devices cd join public.customers c on c.airtable_id = cd.customer_id
     where cd.serial = s and cd.relazione = 'noleggio'
     order by c.data_noleggio desc nulls last, c.updated_at desc
     limit 1;
    if coalesce(reso, false) then
      return base || jsonb_build_object('access', false, 'status', 'ended');
    end if;
    -- telefono di un cliente precedente: il noleggio per lui è finito (se lo stesso cliente noleggia di nuovo, torna valido)
    if cust is not null and exists (select 1 from public.link_log g where g.serial = s and g.phone_id = ph
                                      and g.action = 'fine_noleggio' and g.customer_id is distinct from cust) then
      return base || jsonb_build_object('access', false, 'status', 'ended');
    end if;
  end if;

  select * into l from public.phone_links where serial = s for update;
  if not found then
    insert into public.phone_links (serial, phone_id, customer_id) values (s, ph, cust);
    insert into public.link_log (serial, phone_id, action) values (s, ph, 'abbinato');
    return base || jsonb_build_object('status', 'ok');
  end if;

  if rental and cust is not null then
    if l.customer_id is null then
      -- abbinato prima che la Rubrica arrivasse su Supabase: il cliente è quello in corso
      update public.phone_links set customer_id = cust where serial = s;
      l.customer_id := cust;
    elsif l.customer_id <> cust then
      -- il dispositivo è passato a un nuovo cliente: il telefono precedente è chiuso
      insert into public.link_log (serial, phone_id, action, customer_id) values (s, l.phone_id, 'fine_noleggio', l.customer_id);
      if l.phone_id = ph then
        return base || jsonb_build_object('access', false, 'status', 'ended');
      end if;
      update public.phone_links
         set phone_id = ph, customer_id = cust, linked_at = now(), moves = 0, moves_since = now()
       where serial = s;
      insert into public.link_log (serial, phone_id, action) values (s, ph, 'abbinato');
      return base || jsonb_build_object('status', 'ok');
    end if;
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
