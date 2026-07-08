import { TopBar } from "@/components/topbar";

export default function SetupPage() {
  return (
    <div className="app">
      <TopBar showAuth={false} />
      <div className="screen">
        <h1>Even instellen</h1>
        <p className="sub">De app is nog niet gekoppeld aan AWS. Dat gebeurt bij de eerste deploy.</p>
        <div className="notice">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>
              Rol de infrastructuur uit met <code>cdk deploy</code> (map <code>infra/</code>)
              in <strong>eu-west-1 (Ierland)</strong>: RDS Postgres + Cognito.
            </li>
            <li>
              Draai de database-migratie <code>db/migrations/0001_init.sql</code> tegen RDS.
            </li>
            <li>
              Vul de omgevingsvariabelen (<code>DATABASE_URL</code>,{" "}
              <code>COGNITO_*</code>, <code>NEXT_PUBLIC_SITE_URL</code>) — zie{" "}
              <code>.env.example</code> en <code>DEPLOY.md</code>.
            </li>
            <li>Herstart de app. Inloggen gaat dan via Cognito (e-mailcode).</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
