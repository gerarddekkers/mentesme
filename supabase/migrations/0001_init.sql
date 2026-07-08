-- ============================================================================
--  Teamwork Cliëntdossier — databaseschema
--  Draai dit in je Supabase-project via: SQL Editor > New query > plak & Run.
--  (Kies een EU-regio voor je project i.v.m. AVG / medische data + BSN.)
-- ============================================================================

-- 1. PROFIELEN -------------------------------------------------------------
-- Eén profiel per ingelogde medewerker. Bevat de initialen die bij het
-- aftekenen en ondertekenen worden vastgelegd.
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  initials    text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Iedereen die ingelogd is mag profielen lezen (nodig om namen/initialen van
-- collega's op een gedeeld dossier te tonen). Alleen jezelf mag je eigen
-- profiel wijzigen.
create policy "profielen zichtbaar voor ingelogde gebruikers"
  on public.profiles for select to authenticated using (true);
create policy "eigen profiel bijwerken"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "eigen profiel invoegen"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Automatisch een profiel aanmaken zodra iemand zich registreert.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'full_name', new.email), 2))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. CLIËNTEN --------------------------------------------------------------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  born        text,
  tag         text,
  created_by  uuid references auth.users,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.clients enable row level security;


-- 3. TOEGANG / LEDEN (multi-user) ------------------------------------------
-- Wie mag bij welk dossier? Meerdere medewerkers per cliënt = gedeelde toegang.
create table if not exists public.client_members (
  client_id  uuid references public.clients on delete cascade,
  user_id    uuid references auth.users on delete cascade,
  role       text not null default 'editor' check (role in ('owner','editor','viewer')),
  added_at   timestamptz not null default now(),
  primary key (client_id, user_id)
);

alter table public.client_members enable row level security;

-- Helper: is de ingelogde gebruiker lid van dit dossier?
create or replace function public.is_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.client_members m
    where m.client_id = cid and m.user_id = auth.uid()
  );
$$;

-- Helper: mag de ingelogde gebruiker bewerken (owner of editor)?
create or replace function public.can_edit(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.client_members m
    where m.client_id = cid and m.user_id = auth.uid()
      and m.role in ('owner','editor')
  );
$$;

-- Helper: is de ingelogde gebruiker eigenaar?
create or replace function public.is_owner(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.client_members m
    where m.client_id = cid and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- Beleid cliënten: alleen leden zien/bewerken hun dossiers.
create policy "leden zien hun cliënten"
  on public.clients for select to authenticated using (public.is_member(id));
create policy "ingelogde gebruiker maakt cliënt aan"
  on public.clients for insert to authenticated with check (auth.uid() = created_by);
create policy "leden bewerken cliënt"
  on public.clients for update to authenticated using (public.can_edit(id));

-- Beleid leden: je ziet de ledenlijst van dossiers waar je zelf lid van bent;
-- eigenaren beheren wie erbij mag.
create policy "leden zien mede-leden"
  on public.client_members for select to authenticated using (public.is_member(client_id));
create policy "eigenaar voegt leden toe"
  on public.client_members for insert to authenticated with check (public.is_owner(client_id));
create policy "eigenaar verwijdert leden"
  on public.client_members for delete to authenticated using (public.is_owner(client_id));

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
-- Eén rij per onderwerp per cliënt. De velden staan als JSON in `data`,
-- zodat we onderwerpen kunnen toevoegen zonder het schema te wijzigen.
create table if not exists public.section_data (
  client_id    uuid references public.clients on delete cascade,
  section_key  text not null,
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users,
  primary key (client_id, section_key)
);

alter table public.section_data enable row level security;

create policy "leden lezen sectie-gegevens"
  on public.section_data for select to authenticated using (public.is_member(client_id));
create policy "leden schrijven sectie-gegevens"
  on public.section_data for insert to authenticated with check (public.can_edit(client_id));
create policy "leden wijzigen sectie-gegevens"
  on public.section_data for update to authenticated using (public.can_edit(client_id));


-- 5. LOGREGELS (rapportage huisarts, dubbele controle) ----------------------
-- Onwisbare, gedateerde regels. Nooit overschreven — alleen toegevoegd.
create table if not exists public.log_entries (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references public.clients on delete cascade,
  section_key      text not null,
  body             text not null,
  author_initials  text,
  created_by       uuid references auth.users,
  created_at       timestamptz not null default now()
);

alter table public.log_entries enable row level security;

create index if not exists log_entries_client_section_idx
  on public.log_entries (client_id, section_key, created_at);

create policy "leden lezen logregels"
  on public.log_entries for select to authenticated using (public.is_member(client_id));
create policy "leden voegen logregels toe"
  on public.log_entries for insert to authenticated with check (public.can_edit(client_id));


-- 6. RASTERCELLEN (aftekenlijst medicatie, defecatielijst, schema's) --------
create table if not exists public.grid_cells (
  client_id    uuid references public.clients on delete cascade,
  section_key  text not null,
  cell_key     text not null,       -- bijv. "med2_dag14" of "2026-07_dag5"
  value        text not null,
  updated_by   uuid references auth.users,
  updated_at   timestamptz not null default now(),
  primary key (client_id, section_key, cell_key)
);

alter table public.grid_cells enable row level security;

create policy "leden lezen rastercellen"
  on public.grid_cells for select to authenticated using (public.is_member(client_id));
create policy "leden schrijven rastercellen"
  on public.grid_cells for insert to authenticated with check (public.can_edit(client_id));
create policy "leden wijzigen rastercellen"
  on public.grid_cells for update to authenticated using (public.can_edit(client_id));
create policy "leden verwijderen rastercellen"
  on public.grid_cells for delete to authenticated using (public.can_edit(client_id));


-- 7. HANDTEKENINGEN --------------------------------------------------------
create table if not exists public.signatures (
  client_id     uuid references public.clients on delete cascade,
  section_key   text not null,
  signer_index  int not null,
  signer_name   text,
  image         text not null,       -- PNG als data-URL
  signed_by     uuid references auth.users,
  signed_at     timestamptz not null default now(),
  primary key (client_id, section_key, signer_index)
);

alter table public.signatures enable row level security;

create policy "leden lezen handtekeningen"
  on public.signatures for select to authenticated using (public.is_member(client_id));
create policy "leden zetten handtekeningen"
  on public.signatures for insert to authenticated with check (public.can_edit(client_id));
create policy "leden wijzigen handtekeningen"
  on public.signatures for update to authenticated using (public.can_edit(client_id));
create policy "leden verwijderen handtekeningen"
  on public.signatures for delete to authenticated using (public.can_edit(client_id));
