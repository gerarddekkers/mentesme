import { TopBar } from "@/components/topbar";

export default function Setup() {
  return (
    <div className="app">
      <TopBar showAuth={false} />
      <div className="screen">
        <h1>Even instellen</h1>
        <p className="sub">De app is nog niet gekoppeld aan AWS. Dat gebeurt bij de eerste deploy.</p>
        <div className="notice">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Zet in AWS (eu-west-1) een MySQL-database (RDS/Aurora) en een Cognito user pool op.</li>
            <li>Draai de migratie <code>db/migrations/0001_init.sql</code> tegen de database.</li>
            <li>
              Vul de frontend-variabelen (<code>VITE_API_URL</code>,{" "}
              <code>VITE_COGNITO_DOMAIN</code>, <code>VITE_COGNITO_CLIENT_ID</code>) en de
              backend-variabelen (<code>DATABASE_URL</code>, <code>COGNITO_*</code>) — zie{" "}
              <code>.env.example</code> en <code>DEPLOY.md</code>.
            </li>
            <li>Herstart de apps. Inloggen gaat dan via Cognito (e-mailcode).</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
