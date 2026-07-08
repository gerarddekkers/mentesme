import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TopBar } from "@/components/topbar";
import { handleCallback } from "@/lib/auth";

export default function Callback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    const code = params.get("code");
    if (!code) {
      setError(true);
      return;
    }
    handleCallback(code).then((ok) => {
      if (ok) navigate("/clienten", { replace: true });
      else setError(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <TopBar showAuth={false} />
      <div className="screen" style={{ maxWidth: 440, margin: "0 auto" }}>
        {error ? (
          <div className="notice">
            Inloggen is niet gelukt. <a href="/login" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>Probeer opnieuw</a>.
          </div>
        ) : (
          <p className="sub">Bezig met inloggen…</p>
        )}
      </div>
    </div>
  );
}
