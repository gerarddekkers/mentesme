import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/topbar";
import { Icon } from "@/lib/icons";
import { login } from "@/lib/auth";

/**
 * Loginpagina — inloggen met het Teamwork-account (metro). E-mail + wachtwoord
 * gaan naar onze API (`/api/login`), die er een metro-token voor teruggeeft.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError("");
    try {
      const ok = await login(email, password);
      if (ok) {
        navigate("/clienten", { replace: true });
      } else {
        setError("Inloggen mislukt. Controleer je e-mail en wachtwoord.");
      }
    } catch {
      setError("Kan niet inloggen. Probeer het zo nog eens.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <TopBar showAuth={false} />
      <div className="screen" style={{ maxWidth: 440, margin: "0 auto" }}>
        <h1>Inloggen</h1>
        <p className="sub">Log in met je Teamwork-account.</p>

        {error && (
          <div className="notice" style={{ marginBottom: 16 }} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">E-mailadres</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@teamwork.nl"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Wachtwoord</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Je wachtwoord"
            />
          </div>
          <button className="btn primary" type="submit" disabled={busy}>
            <Icon name="person" width={20} /> {busy ? "Bezig met inloggen…" : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
