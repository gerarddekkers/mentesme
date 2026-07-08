# Deploy — AWS eu-west-1 (Ierland) → zorgdossier.mentes.me

Twee onderdelen, jullie eigen AWS-account, alles in **eu-west-1 (Ierland)**:

```
Frontend (apps/web)  → S3 + CloudFront            → zorgdossier.mentes.me
Backend  (apps/api)  → App Runner / ECS Fargate   → api.zorgdossier.mentes.me
Database             → RDS / Aurora MySQL (privé subnets)
Inloggen             → Amazon Cognito (managed login, e-mailcode)
DNS + TLS            → Route 53 + ACM
```

## 1. Cognito (inloggen)

- Maak een **User Pool** (eu-west-1). Zet sign-in op **e-mail** en schakel
  **passwordless e-mailcode** (managed login / hosted UI) in.
- Maak een **App client** (public, geen secret) voor de SPA. Zet:
  - Allowed callback URL: `https://zorgdossier.mentes.me/auth/callback`
    (en lokaal `http://localhost:5173/auth/callback`)
  - Allowed sign-out URL: `https://zorgdossier.mentes.me/login`
  - OAuth flows: **Authorization code grant** (PKCE), scopes `openid email profile`
- Noteer: **User Pool ID**, **App client ID** en het **Cognito-domein**
  (`https://<prefix>.auth.eu-west-1.amazoncognito.com`).

## 2. Database (MySQL)

- Zet een **RDS/Aurora MySQL** op in privé subnets (eu-west-1). Maak database
  `zorgdossier` en een app-gebruiker.
- Draai de migratie:

  ```bash
  mysql --host=<rds-endpoint> --user=<app> -p zorgdossier < db/migrations/0001_init.sql
  ```

## 3. Backend (apps/api) — container

```bash
# Bouwen (vanuit repo-root) en pushen naar ECR
aws ecr create-repository --repository-name zorgdossier-api --region eu-west-1
aws ecr get-login-password --region eu-west-1 \
  | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.eu-west-1.amazonaws.com
docker build -f apps/api/Dockerfile -t zorgdossier-api .
docker tag zorgdossier-api <ACCOUNT>.dkr.ecr.eu-west-1.amazonaws.com/zorgdossier-api:latest
docker push <ACCOUNT>.dkr.ecr.eu-west-1.amazonaws.com/zorgdossier-api:latest
```

Draai de image op **App Runner** of **ECS Fargate** (poort 4000), in het VPC dat
bij de RDS kan. Zet de env-variabelen:

| Variabele | Waarde |
| --- | --- |
| `DATABASE_URL` | `mysql://user:pass@<rds-endpoint>:3306/zorgdossier` |
| `COGNITO_USER_POOL_ID` | uit stap 1 |
| `COGNITO_CLIENT_ID` | uit stap 1 |
| `WEB_ORIGIN` | `https://zorgdossier.mentes.me` |
| `PORT` | `4000` |

Zet er een subdomein op, bijv. `api.zorgdossier.mentes.me` (ACM-certificaat +
Route 53). Bewaar geheimen in **Secrets Manager**.

## 4. Frontend (apps/web) — statisch

```bash
# Bouwen met productie-env (VITE_* worden ingebakken)
VITE_API_URL=https://api.zorgdossier.mentes.me \
VITE_COGNITO_DOMAIN=https://<prefix>.auth.eu-west-1.amazoncognito.com \
VITE_COGNITO_CLIENT_ID=<app-client-id> \
VITE_AWS_REGION=eu-west-1 \
npm run build --workspace apps/web

# Uploaden naar S3 + CloudFront invalidatie
aws s3 sync apps/web/dist s3://<bucket> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

CloudFront: zet een **SPA-fallback** (403/404 → `/index.html`, status 200) zodat
de client-side routes werken. Koppel `zorgdossier.mentes.me` via Route 53 + ACM.

## 5. Check

Open `https://zorgdossier.mentes.me` → inlogscherm → inloggen met e-mailcode →
dossieroverzicht. Backend-gezondheid: `https://api.zorgdossier.mentes.me/health`.

---

### CI/CD (optioneel)

De stappen 3–4 passen in een pipeline (GitHub Actions / Bitbucket Pipelines):
frontend build → S3 sync + invalidatie; backend build → ECR push → nieuwe
revisie. Laat weten welke jullie gebruiken, dan lever ik het pipeline-bestand mee.
