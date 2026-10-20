-- Upgrade script for projects that were set up with an EARLIER version of supabase_schema.sql.
--
-- Run this whole file once in the Supabase SQL Editor. It is safe to run more than once:
-- every statement is either `create or replace` or guarded. It does NOT touch your tables
-- or data - so unlike supabase_schema.sql (which creates the tables and fails if they
-- already exist), you can run it on a live project.
--
-- What it does:
--   1. Pins `search_path` on the SECURITY DEFINER analytics functions (security hardening).
--   2. Adds delete_my_account(), used by "Delete Forever" on the dashboard.
--   3. Adds `invites` to the realtime publication so the dashboard updates live.
--   4. Caps the visit / "Yes" history arrays (200 / 50 newest entries) via append_capped(), so a link
--      that is opened thousands of times can no longer bloat its row. Totals are unaffected, and rows
--      that are already over the cap are trimmed the next time they are touched.

-- Helper: append to a timestamp array but keep only the newest `max_len` entries.
-- Without a cap the visit / yes arrays grew forever (every page load adds an element), so a link that
-- is opened or refreshed thousands of times - by a bot, or just a very keen recipient - made its row
-- ever larger and every dashboard refresh heavier. The exact totals are NOT lost: `total_visits` is a
-- separate counter, and `first_opened_at` / `first_yes_at` are stored separately; only the oldest
-- entries of the history list are dropped. It also trims rows that are already over the limit the next
-- time they are touched, so existing data heals itself.
create or replace function append_capped(arr timestamp with time zone[], item timestamp with time zone, max_len int)
returns timestamp with time zone[] as $$
  select case
    when coalesce(cardinality(arr), 0) >= max_len
      then (arr || item)[cardinality(arr) + 2 - max_len : cardinality(arr) + 1]
    else coalesce(arr, '{}'::timestamp with time zone[]) || item
  end
$$ language sql immutable;

-- 1. Analytics functions (same behaviour as before, now with a pinned search_path)
create or replace function track_visit(url_token text)
returns void as $$
begin
  update invites
  set
    total_visits = total_visits + 1,
    visit_timestamps = append_capped(visit_timestamps, now(), 200),
    first_opened_at = coalesce(first_opened_at, now())
  where token = url_token;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function track_yes(url_token text)
returns void as $$
begin
  update invites
  set
    used = true,
    used_at = now(),
    yes_timestamps = append_capped(yes_timestamps, now(), 50),
    first_yes_at = coalesce(first_yes_at, now()),
    first_opened_at = coalesce(first_opened_at, now())
  where token = url_token;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function track_no(url_token text)
returns void as $$
begin
  update invites
  set no_clicks = no_clicks + 1
  where token = url_token;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function check_invite_exists(url_token text)
returns boolean as $$
begin
  return exists(select 1 from invites where token = url_token);
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Self-service account deletion
create or replace function delete_my_account()
returns void as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, auth;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;

-- 3. Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'invites'
  ) then
    alter publication supabase_realtime add table public.invites;
  end if;
end
$$;
