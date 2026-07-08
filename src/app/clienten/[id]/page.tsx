import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/topbar";
import { Icon } from "@/lib/icons";
import { groups, allSections, initialsOf, colorOf } from "@/lib/sections";

export const dynamic = "force-dynamic";

type Status = "ok" | "warn" | "alert" | "empty";
const statusLabel: Record<Status, string> = {
  ok: "Compleet", warn: "Aandacht", alert: "Tekenen", empty: "Leeg",
};

export default async function DossierPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const clientId = params.id;

  const { data: client } = await supabase
    .from("clients")
    .select("id, first_name, last_name, born, tag")
    .eq("id", clientId)
    .single();

  if (!client) notFound();

  // Gegevens om statussen te bepalen
  const [{ data: sectionRows }, { data: logRows }, { data: gridRows }, { data: sigRows }, { data: members }] =
    await Promise.all([
      supabase.from("section_data").select("section_key, data").eq("client_id", clientId),
      supabase.from("log_entries").select("section_key").eq("client_id", clientId),
      supabase.from("grid_cells").select("section_key").eq("client_id", clientId),
      supabase.from("signatures").select("section_key, signer_index").eq("client_id", clientId),
      supabase.from("client_members").select("user_id, role").eq("client_id", clientId),
    ]);

  const withData = new Set<string>();
  (sectionRows ?? []).forEach((r) => {
    const d = (r.data ?? {}) as Record<string, unknown>;
    if (Object.values(d).some((v) => typeof v === "string" && v.trim() !== "")) withData.add(r.section_key);
    else if (d && (d as any).rows && Array.isArray((d as any).rows) && (d as any).rows.length) withData.add(r.section_key);
  });
  (logRows ?? []).forEach((r) => withData.add(r.section_key));
  (gridRows ?? []).forEach((r) => withData.add(r.section_key));

  const signedCount = new Map<string, number>();
  (sigRows ?? []).forEach((r) => signedCount.set(r.section_key, (signedCount.get(r.section_key) ?? 0) + 1));

  function statusOf(key: string): Status {
    const sec = allSections.find((s) => s.key === key)!;
    const hasData = withData.has(key);
    if (sec.signers && sec.signers.length) {
      const signed = signedCount.get(key) ?? 0;
      if (signed >= sec.signers.length) return "ok";
      return hasData ? "warn" : "alert";
    }
    return hasData ? "ok" : "empty";
  }

  // Medewerkers met toegang
  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("id, full_name, initials").in("id", memberIds)
    : { data: [] as { id: string; full_name: string | null; initials: string | null }[] };

  return (
    <div className="app">
      <TopBar />
      <div className="screen">
        <Link href="/clienten" className="backbtn">
          <Icon name="back" width={18} /> Alle cliënten
        </Link>
        <h1>
          {client.first_name} {client.last_name}
        </h1>
        <p className="sub">{[client.born, client.tag].filter(Boolean).join(" · ")}</p>

        <div className="collab">
          <div className="stack">
            {(profiles ?? []).slice(0, 6).map((p) => {
              const name = p.full_name || "Medewerker";
              return (
                <span
                  key={p.id}
                  className="av"
                  title={name}
                  style={{ background: colorOf(p.id) }}
                >
                  {p.initials || initialsOf(name)}
                </span>
              );
            })}
          </div>
          <small>
            {(members ?? []).length} {(members ?? []).length === 1 ? "medewerker heeft" : "medewerkers hebben"} toegang
          </small>
        </div>

        {groups.map((g) => (
          <div key={g.title}>
            <div className="groupt">{g.title}</div>
            <div className="tiles">
              {g.sections.map((s) => {
                const st = statusOf(s.key);
                return (
                  <Link key={s.key} href={`/clienten/${clientId}/${s.key}`} className="tile">
                    <span className={`status ${st}`}>
                      <span className="d" />
                      {statusLabel[st]}
                    </span>
                    <span className="ti">
                      <Icon name={s.icon} width={22} />
                    </span>
                    <span className="tt">{s.name}</span>
                    <span className="tm">{st === "empty" ? "Nog niet ingevuld" : "Bijgewerkt"}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <Link href={`/clienten/${clientId}/verslag`} className="reportbtn">
          <span className="ri">
            <Icon name="report" width={22} />
          </span>
          <span>
            Eindverslag samenstellen (PDF)
            <small>Alle onderwerpen in één document — met handtekeningen — om te bewaren of te printen</small>
          </span>
        </Link>
      </div>
    </div>
  );
}
