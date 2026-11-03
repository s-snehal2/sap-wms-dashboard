-- Profile validation and Supabase auth wiring (no RLS — access rules live in the app's server code).
-- Run after the Drizzle migrations:  pnpm db:migrate  then  pnpm db:sql

-- Keep the Drizzle schema free of the auth schema; add this FK explicitly.
alter table public.profiles
  drop constraint if exists profiles_id_auth_users_fkey;
alter table public.profiles
  add constraint profiles_id_auth_users_fkey
  foreign key (id) references auth.users(id) on delete cascade;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_profile_hod()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin' and new.hod_id is not null then
    raise exception 'An admin cannot be assigned to an HOD';
  end if;

  if new.hod_id is not null then
    if new.hod_id = new.id then
      raise exception 'A user cannot be their own HOD';
    end if;

    if not exists (
      select 1
      from public.profiles p
      where p.id = new.hod_id
        and p.role = 'hod'
    ) then
      raise exception 'hod_id must reference a user with the hod role';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.role = 'admin'
       and new.role <> 'admin'
       and (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'Cannot remove the last admin';
    end if;

    if old.role = 'hod'
       and new.role <> 'hod'
       and exists (select 1 from public.profiles where hod_id = old.id) then
      raise exception 'Reassign team members before changing this HOD role';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  -- ⚠️ CHANGE THIS to your company's email domain (the part after @). Empty '' = allow any email.
  allowed_domain constant text := 'classicmarble.com';
begin
  if allowed_domain <> '' and lower(split_part(coalesce(new.email, ''), '@', 2)) <> lower(allowed_domain) then
    raise exception 'Only @% email addresses can use this dashboard', allowed_domain;
  end if;

  perform pg_advisory_xact_lock(hashtext('public.profiles.first_admin'));

  select not exists (select 1 from public.profiles) into is_first;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@no-email.local'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case
      when is_first then 'admin'::public.user_role
      else 'user'::public.user_role
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists profiles_validate_hod on public.profiles;
create trigger profiles_validate_hod
before insert or update on public.profiles
for each row execute function public.validate_profile_hod();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for auth users that existed before the trigger was installed.
-- The first user becomes admin only when no profiles exist yet.
with existing as (
  select count(*)::int as c from public.profiles
),
ranked as (
  select
    u.id,
    coalesce(u.email, u.id::text || '@no-email.local') as email,
    coalesce(u.raw_user_meta_data->>'full_name', u.email) as full_name,
    row_number() over (order by u.created_at) as rn
  from auth.users u
  where not exists (
    select 1 from public.profiles p where p.id = u.id
  )
)
insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  full_name,
  case
    when (select c from existing) = 0 and rn = 1 then 'admin'::public.user_role
    else 'user'::public.user_role
  end
from ranked
on conflict do nothing;
