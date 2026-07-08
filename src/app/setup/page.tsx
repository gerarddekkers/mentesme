import { TopBar } from "@/components/topbar";

export default function SetupPage() {
  return (
    <div className="app">
      <TopBar showAuth={false} />
      <div className="screen">
        <h1>Even instellen</h1>
        <p className="sub">De app is nog niet gekoppeld aan een database. Dat doe je één keer.</p>
        <div className="notice">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>
              Maak een gratis project aan op <code>supabase.com</code> — kies een{" "}
              <strong>EU-regio</strong> (bijv. Frankfurt) i.v.m. AVG.
            </li>
            <li>
              Open in Supabase de <strong>SQL Editor</strong> en draai het bestand{" "}
              <code>supabase/migrations/0001_init.sql</code>.
            </li>
            <li>
              Kopieer <code>.env.example</code> naar <code>.env.local</code> en vul{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> en{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in (Supabase → Project Settings → API).
            </li>
            <li>
              Herstart de app (<code>npm run dev</code>). Klaar!
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
