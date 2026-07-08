"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/topbar";
import { Icon } from "@/lib/icons";

export default function LoginPage() {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    const supabase = createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${site}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="app">
      <TopBar showAuth={false} />
      <div className="screen" style={{ maxWidth: 440, margin: "0 auto" }}>
        <h1>Inloggen</h1>
        <p className="sub">
          Vul je werk-e-mailadres in. Je ontvangt een inloglink — geen wachtwoord om te onthouden.
        </p>

        {!configured ? (
          <div className="notice">
            De app is nog niet gekoppeld aan een database. Zie de{" "}
            <a href="/setup" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
              instelpagina
            </a>
            .
          </div>
        ) : status === "sent" ? (
          <div className="notice" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Icon name="check2" width={24} style={{ color: "var(--ok)", flex: "none", marginTop: 2 }} />
            <div>
              <strong>Check je mail</strong>
              <p style={{ margin: "4px 0 0", color: "var(--ink-soft)" }}>
                We hebben een inloglink gestuurd naar {email}. Klik erop om binnen te komen.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={sendLink}>
            <div className="field">
              <label htmlFor="email">E-mailadres</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="naam@teamwork.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="btn primary" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Versturen…" : "Stuur inloglink"}
            </button>
            {status === "error" && (
              <p style={{ color: "var(--alert)", fontSize: 14, marginTop: 12 }}>
                Er ging iets mis. Controleer het e-mailadres en probeer opnieuw.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
