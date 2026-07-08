# CLAUDE.md — zorgdossier

Context voor Claude Code (lokaal in VSCode én op het web). Lees dit eerst.

## Wat is dit

Digitaal cliëntdossier voor thuiszorg (**Teamwork**). Vervangt de papieren
formulieren: cliëntdossier + de SVB PGB-zorgovereenkomst. Doel: **simpel genoeg
voor zorgprofessionals die software eng vinden** — grote knoppen, auto-opslaan,
printen per onderwerp, tekenen met vinger/pencil.

Productie-URL (subdomein): **https://zorgdossier.mentes.me**

## Architectuur — mentesme-standaard (React SPA + losse backend)

Monorepo met npm workspaces:

```
apps/web    Vite + React + TypeScript (SPA)      → S3 + CloudFront
apps/api    Node + Express + TypeScript (REST)   → App Runner / ECS Fargate
db/         MySQL-migraties
infra/      (optioneel) IaC voor AWS
```

- **Database:** MySQL op AWS (RDS/Aurora), eu-west-1 (Ierland).
- **Auth:** Amazon Cognito (managed login, passwordless e-mailcode). De SPA doet
  de OAuth2 code-flow met PKCE; de backend verifieert het id-token per request.
- **Toegangscontrole:** op applicatieniveau (de backend checkt lidmaatschap per
  dossier). Bewust niet zo streng als MentalAId — geen database-RLS.

## Onderwerp toevoegen of wijzigen

Alles is **data-gedreven**. Eén onderwerp bijwerken = alleen
`apps/web/src/lib/sections.ts` aanpassen (velden, `signers`, `columns`, `kind`).
De juiste editor (`form` / `grid-med` / `grid-defec` / `table` / `log`) wordt
automatisch gekozen in `apps/web/src/pages/Section.tsx`.

## Datamodel (MySQL, kort)

- `clients` + `client_members` (multi-user toegang, rol owner/editor/viewer)
- `section_data` (JSON per onderwerp — auto-opslaan)
- `grid_cells` (aftekenlijst / defecatielijst)
- `log_entries` (rapportage / dubbele controle — onwisbaar, alleen toevoegen)
- `signatures` (handtekeningen als PNG data-URL)
- `profiles` (id = Cognito `sub`)

## Commando's

```bash
npm install            # alle workspaces
npm run dev            # web (5173) + api (4000) samen
npm run dev:web        # alleen frontend
npm run dev:api        # alleen backend
npm run build          # beide bouwen
npm run typecheck      # beide typechecken
```

## Setup

Zie [`README.md`](README.md) en [`DEPLOY.md`](DEPLOY.md). Env staat in
`apps/web/.env.example` en `apps/api/.env.example`. Migratie:
`db/migrations/0001_init.sql`.

## Belangrijk

- **AVG / medische data + BSN**: alles in EU (AWS Ierland). Geen cliëntdata in
  logs of externe diensten.
- Auto-opslaan gebruikt een debounce van ~600ms; nooit een handmatige
  opslaan-knop introduceren.
- Handtekeningen en logregels zijn bewijsstukken: niet overschrijven, alleen
  toevoegen / opnieuw tekenen.
- De frontend praat met de backend via `apps/web/src/lib/api.ts` (Bearer-token);
  editors slaan op via de API-routes in `apps/api/src/routes/api.ts`.
