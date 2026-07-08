# Teamwork — Digitaal Cliëntdossier

Een eenvoudige cloud-app waarmee zorgprofessionals het cliëntdossier en de
zorgovereenkomst digitaal bijhouden — zonder papier. Gebouwd om **niet eng** te
zijn: grote knoppen, auto-opslaan, en printen per onderwerp.

## Wat kan het

- **Alle onderwerpen** uit het papieren dossier + de SVB-zorgovereenkomst, als
  overzichtelijke tegels.
- **Auto-opslaan** — geen opslaan-knop; alles wordt direct in de cloud bewaard.
- **Aftekenen met één tik** (medicatie, defecatielijst) op naam van de medewerker.
- **Tekenen met vinger of Apple Pencil** op de wilsverklaringen en opdrachten.
- **Printen per onderwerp** en een **eindverslag als PDF** van het hele dossier.
- **Meerdere medewerkers per dossier** met veilige toegangsrechten.
- Werkt op **telefoon, tablet/iPad en pc** (installeerbaar als app / PWA).

## Techniek

- [Next.js](https://nextjs.org) (App Router, TypeScript) + Tailwind CSS
- [Supabase](https://supabase.com) — Postgres-database, inlog en toegangsrechten (RLS)

## Aan de slag (eenmalige setup)

1. **Supabase-project aanmaken** op <https://supabase.com>.
   Kies een **EU-regio** (bijv. Frankfurt) i.v.m. AVG — het gaat om medische
   gegevens en BSN.

2. **Database opzetten**: open in Supabase de _SQL Editor_ en draai het bestand
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   Dit maakt alle tabellen en de toegangsregels aan.

3. **Omgevingsvariabelen**: kopieer `.env.example` naar `.env.local` en vul in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Deze waarden staan in Supabase onder **Project Settings → API**.

4. **Installeren en starten**:

   ```bash
   npm install
   npm run dev
   ```

   Open <http://localhost:3000>. Log in met je e-mailadres — je ontvangt een
   inloglink (geen wachtwoord nodig).

## Inloglink instellen in Supabase

Zet in Supabase onder **Authentication → URL Configuration** de _Site URL_ en
de _Redirect URLs_ goed (bijv. `http://localhost:3000/auth/callback` en later je
echte domein). Zo komen de inloglinks op de juiste plek terecht.

## Publiceren (productie)

Productie draait op **AWS eu-west-1 (Ierland)** op het subdomein
**https://zorgdossier.mentes.me**, als container (zie `Dockerfile`). De volledige
stap-voor-stap staat in **[`DEPLOY.md`](DEPLOY.md)** (ECR → App Runner/ECS →
Route 53 + ACM). Zet `NEXT_PUBLIC_SITE_URL` op het subdomein en voeg de
redirect-URL `https://zorgdossier.mentes.me/auth/callback` toe bij de auth-config.

## Structuur

```
supabase/migrations/   Databaseschema + toegangsregels (RLS)
src/lib/sections.ts    Alle onderwerpen (velden, tekenaars, kolommen)
src/lib/supabase/      Supabase-clients (browser / server / middleware)
src/components/         Editors: formulieren, rasters, logregels, handtekening
src/app/               Pagina's: inloggen, cliënten, dossier, onderwerp, verslag
```

## Volgende stappen (roadmap)

- **OCR**: bestaande papieren formulieren inscannen en velden voorinvullen.
- Herinneringen (bijv. katheter vervangen), en dossier delen met een collega
  via de knop "toegang beheren".
