# Teamwork — Digitaal Cliëntdossier

Een eenvoudige cloud-app waarmee zorgprofessionals het cliëntdossier en de
zorgovereenkomst digitaal bijhouden — zonder papier. Gebouwd om **niet eng** te
zijn: grote knoppen, auto-opslaan, en printen per onderwerp.

## Wat kan het

- **Alle onderwerpen** uit het papieren dossier + de SVB-zorgovereenkomst, als
  overzichtelijke tegels.
- **Auto-opslaan** — geen opslaan-knop; alles gaat direct naar de cloud.
- **Aftekenen met één tik** (medicatie, defecatielijst) op naam van de medewerker.
- **Tekenen met vinger of Apple Pencil** op de wilsverklaringen en opdrachten.
- **Printen per onderwerp** en een **eindverslag als PDF** van het hele dossier.
- **Meerdere medewerkers per dossier** met toegangsrechten.
- Werkt op **telefoon, tablet/iPad en pc** (installeerbaar als PWA).

## Architectuur (mentesme-standaard)

Monorepo met npm workspaces — React-frontend + losse backend:

```
apps/web    Vite + React + TypeScript (SPA)
apps/api    Node + Express + TypeScript (REST API)
db/         MySQL-migraties
```

- **Database:** MySQL op AWS (RDS/Aurora), eu-west-1 (Ierland)
- **Inloggen:** Amazon Cognito (e-mailcode, geen wachtwoord)
- **Productie:** `apps/web` → S3 + CloudFront · `apps/api` → App Runner/ECS ·
  op **https://zorgdossier.mentes.me**. Zie [`DEPLOY.md`](DEPLOY.md).

## Lokaal draaien

1. **Installeren**

   ```bash
   npm install
   ```

2. **Env invullen** — kopieer de voorbeelden en vul ze in:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

   - `apps/api/.env`: `DATABASE_URL` (MySQL), `COGNITO_USER_POOL_ID`,
     `COGNITO_CLIENT_ID`, `WEB_ORIGIN`.
   - `apps/web/.env`: `VITE_API_URL`, `VITE_COGNITO_DOMAIN`,
     `VITE_COGNITO_CLIENT_ID`.

3. **Database** — draai de migratie tegen je MySQL:

   ```bash
   mysql --host=... --user=... -p zorgdossier < db/migrations/0001_init.sql
   ```

4. **Starten**

   ```bash
   npm run dev        # frontend op :5173, backend op :4000
   ```

   Zonder ingevulde env toont de app een setup-scherm.

## Structuur

```
apps/web/src/lib/sections.ts   Alle onderwerpen (velden, tekenaars, kolommen)
apps/web/src/components/         Editors: formulieren, rasters, log, handtekening
apps/web/src/pages/              Pagina's: login, clienten, dossier, sectie, verslag
apps/web/src/lib/{auth,api}.ts   Cognito-inlog (PKCE) + API-client
apps/api/src/routes/api.ts       REST-endpoints (met lidmaatschapscheck)
apps/api/src/lib/                db (mysql2), auth (Cognito verify), access
db/migrations/                   MySQL-schema
```

## Volgende stappen (roadmap)

- **OCR**: bestaande papieren formulieren inscannen en velden voorinvullen.
- "Toegang beheren": een collega uitnodigen voor een dossier vanuit de app.
- Herinneringen (bijv. katheter vervangen).
