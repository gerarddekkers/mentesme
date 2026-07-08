import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TopBar } from "@/components/topbar";
import { Icon } from "@/lib/icons";
import { groups, allSections, initialsOf, colorOf } from "@/lib/sections";
import { apiGet } from "@/lib/api";

type Status = "ok" | "warn" | "alert" | "empty";
const statusLabel: Record<Status, string> = { ok: "Compleet", warn: "Aandacht", alert: "Tekenen", empty: "Leeg" };

interface Meta {
  client: { id: string; first_name: string; last_name: string; born: string | null; tag: string | null };
  members: { id: string; role: string; full_name: string | null; initials: string | null }[];
  sectionRows: { section_key: string; data: any }[];
  logKeys: { section_key: string }[];
  gridKeys: { section_key: string }[];
  sigRows: { section_key: string; n: number }[];
}

export default function Dossier() {
  const { id } = useParams();
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    apiGet(`/api/clients/${id}`).then(setMeta).catch(() => setMeta(null));
  }, [id]);

  if (!meta) {
    return (
      <div className="app">
        <TopBar />
        <div className="screen"><p className="sub">Laden…</p></div>
      </div>
    );
  }

  const withData = new Set<string>();
  for (const r of meta.sectionRows) {
    const d = (r.data ?? {}) as Record<string, any>;
    if (Object.values(d).some((v) => typeof v === "string" && v.trim() !== "")) withData.add(r.section_key);
    else if (Array.isArray(d.rows) && d.rows.length) withData.add(r.section_key);
  }
  meta.logKeys.forEach((r) => withData.add(r.section_key));
  meta.gridKeys.forEach((r) => withData.add(r.section_key));
  const signed = new Map<string, number>();
  meta.sigRows.forEach((r) => signed.set(r.section_key, Number(r.n)));

  function statusOf(key: string): Status {
    const sec = allSections.find((s) => s.key === key)!;
    const hasData = withData.has(key);
    if (sec.signers && sec.signers.length) {
      if ((signed.get(key) ?? 0) >= sec.signers.length) return "ok";
      return hasData ? "warn" : "alert";
    }
    return hasData ? "ok" : "empty";
  }

  const c = meta.client;

  return (
    <div className="app">
      <TopBar />
      <div className="screen">
        <Link to="/clienten" className="backbtn">
          <Icon name="back" width={18} /> Alle cliënten
        </Link>
        <h1>{c.first_name} {c.last_name}</h1>
        <p className="sub">{[c.born, c.tag].filter(Boolean).join(" · ")}</p>

        <div className="collab">
          <div className="stack">
            {meta.members.slice(0, 6).map((m) => {
              const name = m.full_name || "Medewerker";
              return (
                <span key={m.id} className="av" title={name} style={{ background: colorOf(m.id) }}>
                  {m.initials || initialsOf(name)}
                </span>
              );
            })}
          </div>
          <small>
            {meta.members.length} {meta.members.length === 1 ? "medewerker heeft" : "medewerkers hebben"} toegang
          </small>
        </div>

        {groups.map((g) => (
          <div key={g.title}>
            <div className="groupt">{g.title}</div>
            <div className="tiles">
              {g.sections.map((s) => {
                const st = statusOf(s.key);
                return (
                  <Link key={s.key} to={`/clienten/${c.id}/${s.key}`} className="tile">
                    <span className={`status ${st}`}><span className="d" />{statusLabel[st]}</span>
                    <span className="ti"><Icon name={s.icon} width={22} /></span>
                    <span className="tt">{s.name}</span>
                    <span className="tm">{st === "empty" ? "Nog niet ingevuld" : "Bijgewerkt"}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <Link to={`/clienten/${c.id}/verslag`} className="reportbtn">
          <span className="ri"><Icon name="report" width={22} /></span>
          <span>
            Eindverslag samenstellen (PDF)
            <small>Alle onderwerpen in één document — met handtekeningen — om te bewaren of te printen</small>
          </span>
        </Link>
      </div>
    </div>
  );
}
