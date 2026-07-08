import { Link } from "react-router-dom";
import { TopBar } from "@/components/topbar";
import { Icon } from "@/lib/icons";
import { login } from "@/lib/auth";
import { isConfigured } from "@/lib/config";

export default function Login() {
  return (
    <div className="app">
      <TopBar showAuth={false} />
      <div className="screen" style={{ maxWidth: 440, margin: "0 auto" }}>
        <h1>Inloggen</h1>
        <p className="sub">
          Log in met je werk-e-mailadres. Je ontvangt een inlogcode — geen wachtwoord om te onthouden.
        </p>

        {!isConfigured() ? (
          <div className="notice">
            De app is nog niet gekoppeld aan de inlog-omgeving. Zie de{" "}
            <Link to="/setup" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
              instelpagina
            </Link>
            .
          </div>
        ) : (
          <button className="btn primary" onClick={() => login()}>
            <Icon name="person" width={20} /> Inloggen met e-mail
          </button>
        )}
      </div>
    </div>
  );
}
