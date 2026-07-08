import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/topbar";
import { Icon } from "@/lib/icons";
import { setToken } from "@/lib/auth";

/**
 * Loginpagina — dev-seam voor de metro-inlog.
 * Nu: plak een metro-token (+ evt. group) om lokaal te werken.
 * Later: vervang dit door de echte metro-inlogflow (mijn.metro.mentes.me),
 * die na inloggen setToken(token, group) aanroept en doorstuurt naar /clienten.
 */
export default function Login() {
  const [token, setTok] = useState("");
  const [group, setGroup] = useState("");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setToken(token.trim(), group.trim() || undefined);
    navigate("/clienten", { replace: true });
  }

  return (
    <div className="app">
      <TopBar showAuth={false} />
      <div className="screen" style={{ maxWidth: 440, margin: "0 auto" }}>
        <h1>Inloggen</h1>
        <p className="sub">Log in met je Teamwork-account.</p>

        <div className="notice" style={{ marginBottom: 16 }}>
          <strong>Nog te koppelen:</strong> de metro-inlog. Voor lokaal testen kun
          je hieronder een metro-token plakken.
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="token">Metro-token</label>
            <input id="token" value={token} onChange={(e) => setTok(e.target.value)} placeholder="metro-auth token" />
          </div>
          <div className="field">
            <label htmlFor="group">Groep (optioneel)</label>
            <input id="group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="metro-group" />
          </div>
          <button className="btn primary" type="submit">
            <Icon name="person" width={20} /> Inloggen
          </button>
        </form>
      </div>
    </div>
  );
}
