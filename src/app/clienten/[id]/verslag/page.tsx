import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/topbar";
import { PrintButton } from "@/components/print-button";
import { Icon } from "@/lib/icons";
import { groups } from "@/lib/sections";

export const dynamic = "force-dynamic";

export default async function VerslagPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const clientId = params.id;

  const { data: client } = await supabase
    .from("clients")
    .select("first_name, last_name, born, tag")
    .eq("id", clientId)
    .single();
  if (!client) notFound();

  const [{ data: sectionRows }, { data: sigRows }, { data: logRows }] = await Promise.all([
    supabase.from("section_data").select("section_key, data").eq("client_id", clientId),
    supabase.from("signatures").select("section_key, signer_index, image").eq("client_id", clientId),
    supabase.from("log_entries").select("section_key, body, author_initials, created_at").eq("client_id", clientId).order("created_at", { ascending: true }),
  ]);

  const dataBy = new Map<string, Record<string, any>>();
  (sectionRows ?? []).forEach((r) => dataBy.set(r.section_key, (r.data ?? {}) as Record<string, any>));
  const sigBy = new Map<string, Map<number, string>>();
  (sigRows ?? []).forEach((r) => {
    if (!sigBy.has(r.section_key)) sigBy.set(r.section_key, new Map());
    sigBy.get(r.section_key)!.set(r.signer_index, r.image);
  });
  const logBy = new Map<string, { body: string; author_initials: string | null; created_at: string }[]>();
  (logRows ?? []).forEach((r) => {
    if (!logBy.has(r.section_key)) logBy.set(r.section_key, []);
    logBy.get(r.section_key)!.push(r);
  });

  function fmt(iso: string) {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  }

  return (
    <div className="app">
      <TopBar />
      <div className="screen">
        <Link href={`/clienten/${clientId}`} className="backbtn">
          <Icon name="back" width={18} /> Dossier
        </Link>

        <div className="report">
          <div className="cover">
            <div style={{ fontWeight: 800, letterSpacing: ".04em" }}>TEAMWORK</div>
            <div style={{ color: "#4a5854", fontSize: 12, marginBottom: 10 }}>zorg voor kind, partner en ouder</div>
            <h2>Cliëntdossier — eindverslag</h2>
            <p><strong>{client.first_name} {client.last_name}</strong></p>
            <p>{[client.born, client.tag].filter(Boolean).join(" · ")}</p>
          </div>

          {groups.map((g) =>
            g.sections.map((s) => {
              const d = dataBy.get(s.key) ?? {};
              const sigs = sigBy.get(s.key);
              const logs = logBy.get(s.key);

              let inner: React.ReactNode;
              if (s.kind === "form") {
                inner = (
                  <>
                    <dl>
                      {(s.fields ?? []).map((f) => (
                        <div key={f.key} style={{ display: "contents" }}>
                          <dt>{f.label}</dt>
                          <dd>{d[f.key] || " "}</dd>
                        </div>
                      ))}
                    </dl>
                    {s.signers && s.signers.length > 0 && (
                      <div className="sign">
                        {s.signers.map((label, i) => (
                          <div key={i}>
                            {sigs?.get(i) ? <img className="" src={sigs.get(i)!} alt="" /> : null}
                            <div className="line" />
                            <small>{label}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              } else if (s.kind === "table") {
                const rows: string[][] = Array.isArray(d.rows) ? d.rows : [];
                inner = rows.length ? (
                  <table>
                    <thead>
                      <tr>{(s.columns ?? []).map((c, i) => <th key={i}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.map((r, ri) => (
                        <tr key={ri}>{(s.columns ?? []).map((_, ci) => <td key={ci}>{r[ci] || " "}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="empty">— nog geen regels —</p>
                );
              } else if (s.kind === "log") {
                inner = logs && logs.length ? (
                  <table>
                    <tbody>
                      {logs.map((it, i) => (
                        <tr key={i}>
                          <td style={{ width: 110, color: "#4a5854" }}>{fmt(it.created_at)} · {it.author_initials || "—"}</td>
                          <td>{it.body}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="empty">— nog geen regels —</p>
                );
              } else {
                inner = <p className="empty">Schema / aftekenlijst — apart afdrukken via het onderwerp zelf.</p>;
              }

              return (
                <div className="rsec" key={s.key}>
                  <h3>{s.title}</h3>
                  {inner}
                </div>
              );
            })
          )}
        </div>
      </div>
      <PrintButton />
    </div>
  );
}
