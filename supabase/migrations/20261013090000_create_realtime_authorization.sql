-- P0-08 — Realtime authorization (ADR-0008): private Broadcast channels, receive-only for every
-- client, published only by the database (realtime.send). Presence is not used and stays denied.
-- Table-session topics (s:{public_id}) are added with table_sessions in P1-09.

-- Parses a uuid without raising on malformed input (topics are client-supplied strings).
create or replace function public.try_uuid(value text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then value::uuid
  end;
$$;

-- Single source of truth for "may the current request receive this topic?" (ADR-0008 table).
-- Security definer so anon can check capability ids without any privilege on tenant tables;
-- auth.jwt() still reflects the caller's claims.
create or replace function public.can_receive_topic(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  kind text := split_part(topic, ':', 1);
  restaurant uuid;
  channel text;
begin
  -- m:{restaurant public_id} — menu availability, readable by anyone holding the capability id.
  if kind = 'm' then
    return exists (
      select 1 from public.restaurants r
      where r.public_id = split_part(topic, ':', 2)
        and r.deleted_at is null
        and r.status <> 'suspended'
    );
  end if;

  -- r:{restaurant id}:{channel} — staff topics, never anonymous.
  if kind = 'r' and auth.role() = 'authenticated' then
    restaurant := public.try_uuid(split_part(topic, ':', 2));
    channel := split_part(topic, ':', 3);
    if restaurant is null then
      return false;
    end if;
    if channel = 'requests' then
      return public.is_member(restaurant);
    end if;
    if channel = 'orders' then
      return public.has_restaurant_role(
        restaurant, array['owner', 'manager', 'counter']::public.membership_role[]
      );
    end if;
  end if;

  return false;
end;
$$;

revoke execute on function public.can_receive_topic(text) from public;
grant execute on function public.can_receive_topic(text) to anon, authenticated;

-- Receive (SELECT) only. There is deliberately NO insert policy: clients can never send
-- broadcasts on private channels, so events cannot be spoofed (ADR-0008 §4).
create policy "realtime: receive authorized broadcast topics" on realtime.messages
  for select to anon, authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select public.can_receive_topic(realtime.topic()))
  );

-- Server-side publisher used by triggers (P1-09+). Not callable by clients.
create or replace function public.broadcast(topic text, event text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(payload, event, topic, true);
end;
$$;

revoke execute on function public.broadcast(text, text, jsonb) from public, anon, authenticated;
