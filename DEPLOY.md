# Deploy — AWS eu-west-1 (Ierland) → zorgdossier.mentes.me

Deze app draait als **container** (Next.js standalone, zie `Dockerfile`) en past
zo in de standaard mentesme-AWS-opzet in **Ierland (eu-west-1)**. Hieronder de
kortste weg, plus de keuze voor de datalaag.

## Overzicht

```
Gebruiker ─► Route 53 (zorgdossier.mentes.me)
          ─► ACM-certificaat (eu-west-1)
          ─► Hosting (App Runner  óf  ECS Fargate achter ALB)
          ─► Next.js-container  ─► Supabase / Postgres (eu-west-1)
```

## 1. Datalaag kiezen

De app gebruikt Postgres + auth via een Supabase-compatibele laag. Twee opties,
beide met **data in AWS Ierland**:

- **A — Supabase, regio `eu-west-1` (Ierland).** Snelst: alle huidige code werkt
  ongewijzigd. Supabase draait zelf op AWS. Maak het project aan met regio
  *West EU (Ireland)* en draai `supabase/migrations/0001_init.sql`.
- **B — Volledig in jullie AWS-account.** RDS/Aurora Postgres (eu-west-1) +
  Amazon Cognito voor inlog. Vereist het ombouwen van `src/lib/supabase/*` en de
  auth-pagina naar Cognito. Meer werk; kies dit als beleid is dat *alles* in het
  eigen AWS-account moet staan. (Ik kan dit als vervolgstap doen.)

> Advies: begin met **A** om live te gaan op het subdomein; migreer later naar
> **B** als jullie compliance dat vereist. Het datamodel/SQL blijft gelijk.

## 2. Container bouwen & pushen (ECR)

```bash
# Eenmalig: ECR-repo
aws ecr create-repository --repository-name zorgdossier --region eu-west-1

# Inloggen op ECR
aws ecr get-login-password --region eu-west-1 \
  | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.eu-west-1.amazonaws.com

# Bouwen met de publieke env-waarden ingebakken
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --build-arg NEXT_PUBLIC_SITE_URL=https://zorgdossier.mentes.me \
  -t zorgdossier .

docker tag zorgdossier <ACCOUNT>.dkr.ecr.eu-west-1.amazonaws.com/zorgdossier:latest
docker push <ACCOUNT>.dkr.ecr.eu-west-1.amazonaws.com/zorgdossier:latest
```

## 3. Hosting

**Optie 1 — AWS App Runner (eenvoudigst).** Maak een App Runner-service in
`eu-west-1` op basis van de ECR-image, poort `3000`. Voeg onder *Custom domains*
`zorgdossier.mentes.me` toe; App Runner geeft DNS-records die je in Route 53 zet
en regelt het certificaat.

**Optie 2 — ECS Fargate + ALB.** Task definition met de ECR-image (poort 3000),
service achter een Application Load Balancer, ACM-certificaat op de HTTPS-listener,
en in Route 53 een alias-record `zorgdossier.mentes.me` → ALB. Past het beste als
jullie andere mentesme-services ook op ECS draaien.

## 4. DNS & certificaat (Route 53 + ACM)

- Vraag in **ACM (eu-west-1)** een certificaat aan voor `zorgdossier.mentes.me`
  (of een wildcard `*.mentes.me`) en valideer via DNS.
- Zet in de **Route 53 hosted zone van mentes.me** het record voor
  `zorgdossier` naar de hosting (App Runner-doel of ALB-alias).

## 5. Omgevingsvariabelen (runtime)

Zet op de service:

| Variabele | Waarde |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL van je Postgres/Supabase (eu-west-1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key |
| `NEXT_PUBLIC_SITE_URL` | `https://zorgdossier.mentes.me` |

De `NEXT_PUBLIC_*` waarden horen óók als `--build-arg` mee (stap 2), omdat ze in
de client-bundel worden ingebakken.

## 6. Inlog-redirects goedzetten

In Supabase (of Cognito) onder *Authentication → URL Configuration*:

- **Site URL**: `https://zorgdossier.mentes.me`
- **Redirect URL**: `https://zorgdossier.mentes.me/auth/callback`

(Voor lokaal testen ook `http://localhost:3000/auth/callback` toevoegen.)

## 7. Check

Open `https://zorgdossier.mentes.me` → je komt op het inlogscherm. Log in met je
e-mailadres, de link brengt je in het dossieroverzicht.

---

### CI/CD (optioneel, jullie standaard)

De bouwstappen hierboven passen 1-op-1 in een pipeline (GitHub Actions / Bitbucket
Pipelines): build → push naar ECR → nieuwe revisie op App Runner/ECS. Laat me
weten welke jullie gebruiken, dan lever ik het pipeline-bestand mee.
