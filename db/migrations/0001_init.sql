-- ============================================================================
--  Teamwork Cliëntdossier — databaseschema (RDS/Aurora Postgres, eu-west-1)
--
--  Auth loopt via Amazon Cognito. De app verbindt als de rol `app_rw` en zet
--  per request de ingelogde gebruiker in `app.user_id` (de Cognito `sub`).
--  Row Level Security leest die variabele, zodat elke medewerker alleen zijn
--  eigen dossiers ziet — afgedwongen in de database.
--
--  Draaien: psql "$DATABASE_URL" -f db/migrations/0001_init.sql
-- ============================================================================

create extension if not exists pgcrypto;

-- Applicatie-rol (niet-eigenaar → onderworpen aan RLS).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_rw') then
    create role app_rw login password 'CHANGE_ME_IN_SECRETS_MANAGER';
  end if;
end$$;

-- Huidige gebruiker uit de sessie-variabele (NULL als niet gezet → geen toegang).
create or replace function public.app_uid()
returns uuid language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;


-- 1. PROFIELEN -------------------------------------------------------------
-- Eén profiel per medewerker; id = Cognito `sub`. De app upsert dit bij login.
create table if not exists public.profiles (
  id          uuid primary key,
  full_name   text,
  initials    text,
  email       text,
  created_at  timestamptz not null default now()
);


-- 2. CLIËNTEN --------------------------------------------------------------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  born        text,
  tag         text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- 3. TOEGANG / LEDEN (multi-user) ------------------------------------------
create table if not exists public.client_members (
  client_id  uuid references public.clients on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  role       text not null default 'editor' check (role in ('owner','editor','viewer')),
  added_at   timestamptz not null default now(),
  primary key (client_id, user_id)
);

-- Helpers (security definer → mogen client_members lezen zonder RLS-recursie).
create or replace function public.is_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.client_members m
                 where m.client_id = cid and m.user_id = public.app_uid());
$$;

create or replace function public.can_edit(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.client_members m
                 where m.client_id = cid and m.user_id = public.app_uid()
                   and m.role in ('owner','editor'));
$$;

create or replace function public.is_owner(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.client_members m
                 where m.client_id = cid and m.user_id = public.app_uid()
                   and m.role = 'owner');
$$;

-- Zodra iemand een cliënt aanmaakt, wordt die persoon automatisch eigenaar.
create or replace function public.handle_new_client()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.client_members (client_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_client_created on public.clients;
create trigger on_client_created
  after insert on public.clients
  for each row execute function public.handle_new_client();


-- 4. SECTIE-GEGEVENS (auto-opslaan) ----------------------------------------
create table if not exists public.section_data (
  client_id    uuid references public.clients on delete cascade,
  section_key  text not null,
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles(id),
  primary key (client_id, section_key)
);


-- 5. LOGREGELS (rapportage, dubbele controle) — onwisbaar ------------------
create table if not exists public.log_entries (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references public.clients on delete cascade,
  section_key      text not null,
  body             text not null,
  author_initials  text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now()
);
create index if not exists log_entries_client_section_idx
  on public.log_entries (client_id, section_key, created_at);


-- 6. RASTERCELLEN (aftekenlijst, defecatielijst) ---------------------------
create table if not exists public.grid_cells (
  client_id    uuid references public.clients on delete cascade,
  section_key  text not null,
  cell_key     text not null,
  value        text not null,
  updated_by   uuid references public.profiles(id),
  updated_at   timestamptz not null default now(),
  primary key (client_id, section_key, cell_key)
);


-- 7. HANDTEKENINGEN --------------------------------------------------------
create table if not exists public.signatures (
  client_id     uuid references public.clients on delete cascade,
  section_key   text not null,
  signer_index  int not null,
  signer_name   text,
  image         text not null,
  signed_by     uuid references public.profiles(id),
  signed_at     timestamptz not null default now(),
  primary key (client_id, section_key, signer_index)
);


-- ============================================================================
--  Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.clients        enable row level security;
alter table public.client_members enable row level security;
alter table public.section_data   enable row level security;
alter table public.log_entries    enable row level security;
alter table public.grid_cells     enable row level security;
alter table public.signatures     enable row level security;

-- FORCE zodat ook de tabel-eigenaar aan RLS onderworpen is.
alter table public.profiles       force row level security;
alter table public.clients        force row level security;
alter table public.client_members force row level security;
alter table public.section_data   force row level security;
alter table public.log_entries    force row level security;
alter table public.grid_cells     force row level security;
alter table public.signatures     force row level security;

-- Profielen: ingelogde gebruikers zien elkaar (namen op gedeeld dossier);
-- je beheert alleen je eigen profiel.
create policy profiles_select on public.profiles for select using (app_uid() is not null);
create policy profiles_upsert on public.profiles for insert with check (id = app_uid());
create policy profiles_update on public.profiles for update using (id = app_uid());

-- Cliënten
create policy clients_select on public.clients for select using (is_member(id));
create policy clients_insert on public.clients for insert with check (created_by = app_uid());
create policy clients_update on public.clients for update using (can_edit(id));

-- Leden
create policy members_select on public.client_members for select using (is_member(client_id));
create policy members_insert on public.client_members for insert with check (is_owner(client_id));
create policy members_delete on public.client_members for delete using (is_owner(client_id));

-- Sectie-gegevens
create policy section_select on public.section_data for select using (is_member(client_id));
create policy section_insert on public.section_data for insert with check (can_edit(client_id));
create policy section_update on public.section_data for update using (can_edit(client_id));

-- Logregels (alleen toevoegen)
create policy log_select on public.log_entries for select using (is_member(client_id));
create policy log_insert on public.log_entries for insert with check (can_edit(client_id));

-- Rastercellen
create policy grid_select on public.grid_cells for select using (is_member(client_id));
create policy grid_insert on public.grid_cells for insert with check (can_edit(client_id));
create policy grid_update on public.grid_cells for update using (can_edit(client_id));
create policy grid_delete on public.grid_cells for delete using (can_edit(client_id));

-- Handtekeningen
create policy sig_select on public.signatures for select using (is_member(client_id));
create policy sig_insert on public.signatures for insert with check (can_edit(client_id));
create policy sig_update on public.signatures for update using (can_edit(client_id));
create policy sig_delete on public.signatures for delete using (can_edit(client_id));


-- ============================================================================
--  Rechten voor de applicatie-rol
-- ============================================================================
grant usage on schema public to app_rw;
grant select, insert, update, delete on all tables in schema public to app_rw;
grant usage, select on all sequences in schema public to app_rw;
grant execute on all functions in schema public to app_rw;
alter default privileges in schema public grant select, insert, update, delete on tables to app_rw;
