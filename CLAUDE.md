# CLAUDE.md — zorgdossier

Context voor Claude Code (lokaal in VSCode én op het web). Lees dit eerst.

## Wat is dit

Digitaal cliëntdossier voor thuiszorg (**Teamwork**). Vervangt de papieren
formulieren: cliëntdossier + de SVB PGB-zorgovereenkomst. Doel: **simpel genoeg
voor zorgprofessionals die software eng vinden** — grote knoppen, auto-opslaan,
printen per onderwerp, tekenen met vinger/pencil.

Productie-URL (subdomein): **https://zorgdossier.mentes.me**

## Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase** (Postgres + Auth + RLS) — database, inlog, toegangsrechten
- Deploy: **AWS eu-west-1 (Ierland)** als container (App Runner / ECS Fargate).
  Zie [`DEPLOY.md`](DEPLOY.md).

## Mapindeling

```
src/lib/sections.ts      Alle onderwerpen (velden, tekenaars, kolommen) — DE bron
src/lib/supabase/        Supabase-clients: browser / server / middleware
src/lib/icons.tsx        Icoon-set
src/components/           Editors: formulieren, rasters, logregels, handtekening
src/app/                 Pagina's: login, clienten, dossier, [section], verslag
supabase/migrations/     Databaseschema + RLS (SQL, draaien in Supabase)
Dockerfile               Container voor AWS-deploy (Next.js standalone)
```

## Onderwerp toevoegen of wijzigen

Alles is **data-gedreven**. Eén onderwerp bijwerken = alleen `src/lib/sections.ts`
aanpassen (velden, `signers`, `columns`, `kind`). De juiste editor
(`form` / `grid-med` / `grid-defec` / `table` / `log`) wordt automatisch gekozen
in `src/app/clienten/[id]/[section]/page.tsx`. Geen nieuwe pagina's nodig.

## Datamodel (kort)

- `clients` + `client_members` (multi-user toegang, rol owner/editor/viewer)
- `section_data` (JSONB per onderwerp — auto-opslaan)
- `grid_cells` (aftekenlijst / defecatielijst)
- `log_entries` (rapportage / dubbele controle — onwisbaar)
- `signatures` (handtekeningen als PNG data-URL)

Toegang is afgeschermd met **RLS**: je ziet alleen dossiers waar je lid van bent.

## Commando's

```bash
npm run dev        # lokaal draaien (http://localhost:3000)
npm run build      # productie-build
npm run typecheck  # TypeScript controleren
npm start          # productie-server (na build)
```

## Setup

Zie [`README.md`](README.md). Kort: Supabase-project (EU-regio) → migratie draaien
→ `.env.local` invullen → `npm run dev`.

## Belangrijk

- **AVG / medische data + BSN**: alles in EU (AWS Ierland). Geen cliëntdata in
  logs of externe diensten.
- Auto-opslaan gebruikt een debounce van ~600ms; nooit een handmatige opslaan-knop
  introduceren.
- Handtekeningen en logregels zijn bewijsstukken: niet overschrijven, alleen
  toevoegen / opnieuw tekenen.
