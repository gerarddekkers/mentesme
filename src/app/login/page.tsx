import { TopBar } from "@/components/topbar";
import { authorizeUrl, isConfigured } from "@/lib/auth/cognito";
import { Icon } from "@/lib/icons";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const configured = isConfigured();

  return (
    <div className="app">
      <TopBar showAuth={false} />
      <div className="screen" style={{ maxWidth: 440, margin: "0 auto" }}>
        <h1>Inloggen</h1>
        <p className="sub">
          Log in met je werk-e-mailadres. Je ontvangt een inlogcode — geen wachtwoord om te onthouden.
        </p>

        {!configured ? (
          <div className="notice">
            De app is nog niet gekoppeld aan de inlog-omgeving. Zie de{" "}
            <a href="/setup" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
              instelpagina
            </a>
            .
          </div>
        ) : (
          <a className="btn primary" href={authorizeUrl()} style={{ textDecoration: "none" }}>
            <Icon name="person" width={20} /> Inloggen met e-mail
          </a>
        )}
      </div>
    </div>
  );
}
