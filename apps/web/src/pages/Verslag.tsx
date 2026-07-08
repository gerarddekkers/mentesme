import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TopBar } from "@/components/topbar";
import { PrintButton } from "@/components/print-button";
import { Icon } from "@/lib/icons";
import { groups } from "@/lib/sections";
import { apiGet } from "@/lib/api";

interface Report {
  client: { first_name: string; last_name: string; born: string | null; tag: string | null };
  sectionRows: { section_key: string; data: any }[];
  signatures: { section_key: string; signer_index: number; image: string }[];
  logs: { section_key: string; body: string; author_initials: string | null; created_at: string }[];
}

function fmt(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

export default function Verslag() {
  const { id } = useParams();
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    apiGet(`/api/clients/${id}/report`).then(setReport).catch(() => setReport(null));
  }, [id]);

  if (!report) {
    return <div className="app"><TopBar /><div className="screen"><p className="sub">Laden…</p></div></div>;
  }

  const dataBy = new Map<string, Record<string, any>>();
  report.sectionRows.forEach((r) => dataBy.set(r.section_key, (r.data ?? {}) as Record<string, any>));
  const sigBy = new Map<string, Map<number, string>>();
  report.signatures.forEach((r) => {
    if (!sigBy.has(r.section_key)) sigBy.set(r.section_key, new Map());
    sigBy.get(r.section_key)!.set(r.signer_index, r.image);
  });
  const logBy = new Map<string, Report["logs"]>();
  report.logs.forEach((r) => {
    if (!logBy.has(r.section_key)) logBy.set(r.section_key, []);
    logBy.get(r.section_key)!.push(r);
  });

  const c = report.client;

  return (
    <div className="app">
      <TopBar />
      <div className="screen">
        <Link to={`/clienten/${id}`} className="backbtn">
          <Icon name="back" width={18} /> Dossier
        </Link>

        <div className="report">
          <div className="cover">
            <div style={{ fontWeight: 800, letterSpacing: ".04em" }}>TEAMWORK</div>
            <div style={{ color: "#4a5854", fontSize: 12, marginBottom: 10 }}>zorg voor kind, partner en ouder</div>
            <h2>Cliëntdossier — eindverslag</h2>
            <p><strong>{c.first_name} {c.last_name}</strong></p>
            <p>{[c.born, c.tag].filter(Boolean).join(" · ")}</p>
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
                          <dd>{d[f.key] || " "}</dd>
                        </div>
                      ))}
                    </dl>
                    {s.signers && s.signers.length > 0 && (
                      <div className="sign">
                        {s.signers.map((label, i) => (
                          <div key={i}>
                            {sigs?.get(i) ? <img src={sigs.get(i)!} alt="" /> : null}
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
                    <thead><tr>{(s.columns ?? []).map((col, i) => <th key={i}>{col}</th>)}</tr></thead>
                    <tbody>
                      {rows.map((r, ri) => (
                        <tr key={ri}>{(s.columns ?? []).map((_, ci) => <td key={ci}>{r[ci] || " "}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="empty">— nog geen regels —</p>;
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
                ) : <p className="empty">— nog geen regels —</p>;
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
