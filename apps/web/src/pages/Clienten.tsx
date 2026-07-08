import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "@/components/topbar";
import { AddClient } from "@/components/add-client";
import { Icon } from "@/lib/icons";
import { initialsOf } from "@/lib/sections";
import { apiGet } from "@/lib/api";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  born: string | null;
  tag: string | null;
}

export default function Clienten() {
  const [clients, setClients] = useState<Client[] | null>(null);

  useEffect(() => {
    apiGet("/api/clients").then(setClients).catch(() => setClients([]));
  }, []);

  return (
    <div className="app">
      <TopBar />
      <div className="screen">
        <h1>Cliënten</h1>
        <p className="sub">Kies een cliënt om het dossier te openen.</p>

        {clients === null ? (
          <p className="sub">Laden…</p>
        ) : (
          <>
            {clients.map((c) => (
              <Link key={c.id} to={`/clienten/${c.id}`} className="clientcard">
                <span className="avatar">{initialsOf(`${c.first_name} ${c.last_name}`)}</span>
                <span className="who" style={{ flex: 1 }}>
                  <b>{c.first_name} {c.last_name}</b>
                  <span>{[c.born, c.tag].filter(Boolean).join(" · ") || "Geen omschrijving"}</span>
                </span>
                <Icon name="chev" width={22} style={{ color: "var(--ink-faint)" }} />
              </Link>
            ))}
            {clients.length === 0 && (
              <p className="sub" style={{ marginTop: 4 }}>Nog geen cliënten. Maak je eerste dossier aan.</p>
            )}
          </>
        )}

        <AddClient />
      </div>
    </div>
  );
}
