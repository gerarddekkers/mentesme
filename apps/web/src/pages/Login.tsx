import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/topbar";
import { Icon } from "@/lib/icons";
import { requestCode, verifyCode } from "@/lib/auth";

/**
 * Loginpagina — inloggen met je Teamwork-account via een e-mailcode (magic-link).
 * Geen wachtwoord: stap 1 stuurt een code naar je e-mail, stap 2 vult 'm in.
 */
export default function Login() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    try {
      const ok = await requestCode(email);
      if (ok) {
        setStep("code");
      } else {
        setError("Kon geen code versturen. Controleer je e-mailadres.");
      }
    } catch {
      setError("Kan niet inloggen. Probeer het zo nog eens.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    try {
      const ok = await verifyCode(email, code);
      if (ok) {
        navigate("/clienten", { replace: true });
      } else {
        setError("Deze code klopt niet of is verlopen. Vraag een nieuwe aan.");
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
        <p className="sub">Log in met je Teamwork-account. Je krijgt een code per e-mail.</p>

        {error && (
          <div className="notice" style={{ marginBottom: 16 }} role="alert">
            {error}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={sendCode}>
            <div className="field">
              <label htmlFor="email">E-mailadres</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@teamwork.nl"
                autoFocus
              />
            </div>
            <button className="btn primary" type="submit" disabled={busy}>
              <Icon name="person" width={20} /> {busy ? "Bezig…" : "Stuur mij een code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode}>
            <p className="sub">
              We hebben een code gestuurd naar <strong>{email}</strong>.
            </p>
            <div className="field">
              <label htmlFor="code">Code uit de e-mail</label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-cijferige code"
                autoFocus
              />
            </div>
            <button className="btn primary" type="submit" disabled={busy}>
              <Icon name="person" width={20} /> {busy ? "Bezig met inloggen…" : "Inloggen"}
            </button>
            <button
              className="btn"
              type="button"
              style={{ marginTop: 10 }}
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
              }}
            >
              Ander e-mailadres
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
