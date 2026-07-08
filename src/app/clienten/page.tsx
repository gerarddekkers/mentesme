import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/topbar";
import { AddClient } from "@/components/add-client";
import { Icon } from "@/lib/icons";
import { initialsOf } from "@/lib/sections";

export const dynamic = "force-dynamic";

export default async function ClientenPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, born, tag")
    .order("last_name", { ascending: true });

  return (
    <div className="app">
      <TopBar />
      <div className="screen">
        <h1>Cliënten</h1>
        <p className="sub">Kies een cliënt om het dossier te openen.</p>

        {(clients ?? []).map((c) => (
          <Link key={c.id} href={`/clienten/${c.id}`} className="clientcard">
            <span className="avatar">{initialsOf(`${c.first_name} ${c.last_name}`)}</span>
            <span className="who" style={{ flex: 1 }}>
              <b>
                {c.first_name} {c.last_name}
              </b>
              <span>
                {[c.born, c.tag].filter(Boolean).join(" · ") || "Geen omschrijving"}
              </span>
            </span>
            <Icon name="chev" width={22} style={{ color: "var(--ink-faint)" }} />
          </Link>
        ))}

        {clients && clients.length === 0 && (
          <p className="sub" style={{ marginTop: 4 }}>
            Nog geen cliënten. Maak je eerste dossier aan.
          </p>
        )}

        <AddClient />
      </div>
    </div>
  );
}
