-- No RLS: the app's server code (Drizzle) checks who can see/change what.
-- Instead, Supabase's public Data API (anon / authenticated keys) is locked out of
-- every table with plain permissions, so the browser can never read or write data directly.
-- Safe to re-run.

-- 1. Remove any RLS policies that an earlier setup created.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'projects', 'notes', 'pins', 'remarks')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- 2. Make sure RLS is off (the Drizzle migration does this too).
alter table public.profiles disable row level security;
alter table public.projects disable row level security;
alter table public.notes    disable row level security;
alter table public.pins     disable row level security;
alter table public.remarks  disable row level security;

-- 3. Helper functions that only the old policies used.
drop function if exists public.can_view_project(text);
drop function if exists public.can_view_owner(uuid);
drop function if exists public.is_admin();
drop function if exists public.current_user_role();

-- 4. Lock the public Data API out of the app's tables and sequences.
revoke all on table public.profiles, public.projects, public.notes, public.pins, public.remarks
  from anon, authenticated;
revoke all on sequence public.project_pid_seq, public.note_id_seq from anon, authenticated;

-- …and out of any table created later in this schema.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- 5. Trigger helpers are internal only.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.validate_profile_hod() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
