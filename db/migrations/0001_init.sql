-- ============================================================================
--  Teamwork Cliëntdossier — databaseschema (MySQL / RDS-Aurora, eu-west-1)
--
--  Auth loopt via Amazon Cognito; toegangscontrole gebeurt in de applicatie
--  (de backend controleert lidmaatschap per dossier). MySQL kent geen RLS.
--
--  Draaien:  mysql --host=... --user=... -p zorgdossier < db/migrations/0001_init.sql
-- ============================================================================

-- 1. PROFIELEN — één per medewerker; id = Cognito `sub`.
create table if not exists profiles (
  id          char(36)    not null primary key,
  full_name   varchar(255),
  initials    varchar(8),
  email       varchar(255),
  created_at  timestamp    not null default current_timestamp
) engine=InnoDB default charset=utf8mb4;

-- 2. CLIËNTEN
create table if not exists clients (
  id          char(36)     not null primary key,
  first_name  varchar(120) not null,
  last_name   varchar(120) not null,
  born        varchar(40),
  tag         varchar(255),
  created_by  char(36),
  created_at  timestamp     not null default current_timestamp,
  updated_at  timestamp     not null default current_timestamp on update current_timestamp,
  constraint fk_clients_creator foreign key (created_by) references profiles(id)
) engine=InnoDB default charset=utf8mb4;

-- 3. TOEGANG / LEDEN (multi-user)
create table if not exists client_members (
  client_id  char(36) not null,
  user_id    char(36) not null,
  role       enum('owner','editor','viewer') not null default 'editor',
  added_at   timestamp not null default current_timestamp,
  primary key (client_id, user_id),
  constraint fk_members_client foreign key (client_id) references clients(id) on delete cascade,
  constraint fk_members_user   foreign key (user_id)   references profiles(id) on delete cascade
) engine=InnoDB default charset=utf8mb4;

-- 4. SECTIE-GEGEVENS (auto-opslaan) — velden als JSON.
create table if not exists section_data (
  client_id    char(36)    not null,
  section_key  varchar(64) not null,
  data         json        not null,
  updated_at   timestamp    not null default current_timestamp on update current_timestamp,
  updated_by   char(36),
  primary key (client_id, section_key),
  constraint fk_section_client foreign key (client_id) references clients(id) on delete cascade
) engine=InnoDB default charset=utf8mb4;

-- 5. LOGREGELS (rapportage, dubbele controle) — onwisbaar, alleen toevoegen.
create table if not exists log_entries (
  id               char(36)    not null primary key,
  client_id        char(36)    not null,
  section_key      varchar(64) not null,
  body             text        not null,
  author_initials  varchar(8),
  created_by       char(36),
  created_at       timestamp    not null default current_timestamp,
  key idx_log_client_section (client_id, section_key, created_at),
  constraint fk_log_client foreign key (client_id) references clients(id) on delete cascade
) engine=InnoDB default charset=utf8mb4;

-- 6. RASTERCELLEN (aftekenlijst medicatie, defecatielijst)
create table if not exists grid_cells (
  client_id    char(36)     not null,
  section_key  varchar(64)  not null,
  cell_key     varchar(64)  not null,
  value        varchar(255) not null,
  updated_by   char(36),
  updated_at   timestamp     not null default current_timestamp on update current_timestamp,
  primary key (client_id, section_key, cell_key),
  constraint fk_grid_client foreign key (client_id) references clients(id) on delete cascade
) engine=InnoDB default charset=utf8mb4;

-- 7. HANDTEKENINGEN — PNG als data-URL.
create table if not exists signatures (
  client_id     char(36)    not null,
  section_key   varchar(64) not null,
  signer_index  int         not null,
  signer_name   varchar(255),
  image         mediumtext  not null,
  signed_by     char(36),
  signed_at     timestamp    not null default current_timestamp on update current_timestamp,
  primary key (client_id, section_key, signer_index),
  constraint fk_sig_client foreign key (client_id) references clients(id) on delete cascade
) engine=InnoDB default charset=utf8mb4;
