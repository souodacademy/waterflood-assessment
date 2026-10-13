-- Waterflood role model.
-- Run this in the Supabase SQL editor before running the demo account seed.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operator'
    check (role in ('operator', 'engineer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.set_user_role(target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() <> 'admin' then
    raise exception 'Only administrators can assign roles';
  end if;
  if new_role not in ('operator', 'engineer', 'admin') then
    raise exception 'Unsupported role';
  end if;
  insert into public.user_roles(user_id, role)
  values (target_user, new_role)
  on conflict (user_id) do update
    set role = excluded.role, updated_at = now();
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public;
grant execute on function public.set_user_role(uuid, text) to authenticated;
