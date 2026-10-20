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

-- 1. Analytics functions (same behaviour as before, now with a pinned search_path)
create or replace function track_visit(url_token text)
returns void as $$
begin
  update invites
  set
    total_visits = total_visits + 1,
    visit_timestamps = array_append(visit_timestamps, now()),
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
    yes_timestamps = array_append(yes_timestamps, now()),
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
