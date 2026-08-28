create extension if not exists pgcrypto;

create table if not exists public.aureo_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  birth_date date,
  birth_time time,
  birth_place text,
  zodiac_sign text not null default 'aries',
  personal_number integer not null default 0,
  power_word text not null default '',
  app_key_hash text not null default '',
  active_sections text[] not null default '{}',
  premium_active boolean not null default false,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aureo_profiles_personal_number_check check (personal_number between 0 and 33)
);

create table if not exists public.aureo_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  axis text not null,
  collection text not null,
  payload jsonb not null default '{}'::jsonb,
  device_id uuid not null,
  mutation_id uuid not null,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  revision bigint not null default 1,
  constraint aureo_records_axis_check check (axis in ('umbral', 'mundos', 'balance', 'edad_dorada')),
  constraint aureo_records_collection_check check (collection ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint aureo_records_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create index if not exists aureo_records_user_collection_idx
  on public.aureo_records (user_id, axis, collection, updated_at);
create index if not exists aureo_records_user_deleted_idx
  on public.aureo_records (user_id, deleted_at)
  where deleted_at is not null;

alter table public.aureo_profiles enable row level security;
alter table public.aureo_records enable row level security;

drop policy if exists "profiles_select_own" on public.aureo_profiles;
create policy "profiles_select_own" on public.aureo_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "profiles_insert_own" on public.aureo_profiles;
create policy "profiles_insert_own" on public.aureo_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "profiles_update_own" on public.aureo_profiles;
create policy "profiles_update_own" on public.aureo_profiles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "records_select_own" on public.aureo_records;
create policy "records_select_own" on public.aureo_records
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "records_insert_own" on public.aureo_records;
create policy "records_insert_own" on public.aureo_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "records_update_own" on public.aureo_records;
create policy "records_update_own" on public.aureo_records
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.touch_aureo_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_aureo_profile on public.aureo_profiles;
create trigger touch_aureo_profile
before update on public.aureo_profiles
for each row execute function public.touch_aureo_profile();

create or replace function public.sync_aureo_records(changes jsonb)
returns setof public.aureo_records
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  change jsonb;
  changed_ids uuid[] := '{}';
  change_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if jsonb_typeof(changes) <> 'array' then
    raise exception 'changes must be a JSON array' using errcode = '22023';
  end if;

  for change in select value from jsonb_array_elements(changes)
  loop
    change_id := (change->>'id')::uuid;
    insert into public.aureo_records (
      id, user_id, axis, collection, payload, device_id, mutation_id,
      client_updated_at, created_at, deleted_at
    ) values (
      change_id,
      current_user_id,
      change->>'axis',
      change->>'collection',
      coalesce(change->'payload', '{}'::jsonb),
      (change->>'device_id')::uuid,
      (change->>'mutation_id')::uuid,
      (change->>'client_updated_at')::timestamptz,
      coalesce((change->>'created_at')::timestamptz, now()),
      (change->>'deleted_at')::timestamptz
    )
    on conflict (id) do update set
      axis = excluded.axis,
      collection = excluded.collection,
      payload = excluded.payload,
      device_id = excluded.device_id,
      mutation_id = excluded.mutation_id,
      client_updated_at = excluded.client_updated_at,
      updated_at = now(),
      deleted_at = excluded.deleted_at,
      revision = public.aureo_records.revision + 1
    where public.aureo_records.user_id = current_user_id
      and (excluded.client_updated_at, excluded.mutation_id)
        >= (public.aureo_records.client_updated_at, public.aureo_records.mutation_id);

    changed_ids := array_append(changed_ids, change_id);
  end loop;

  return query
    select record.*
    from public.aureo_records as record
    where record.user_id = current_user_id
      and record.id = any(changed_ids);
end;
$$;

revoke all on function public.sync_aureo_records(jsonb) from public;
revoke all on function public.sync_aureo_records(jsonb) from anon;
grant execute on function public.sync_aureo_records(jsonb) to authenticated;
