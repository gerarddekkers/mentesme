import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/topbar";
import { Icon } from "@/lib/icons";
import { getSection, initialsOf } from "@/lib/sections";
import { FormEditor, MedGrid, DefecGrid, TableEditor, LogList, type LogEntry } from "@/components/editors";

export const dynamic = "force-dynamic";

export default async function SectionPage({
  params,
}: {
  params: { id: string; section: string };
}) {
  const section = getSection(params.section);
  if (!section) notFound();

  const supabase = createClient();
  const clientId = params.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meId = user?.id ?? "";
  const { data: profile } = meId
    ? await supabase.from("profiles").select("initials, full_name").eq("id", meId).single()
    : { data: null };
  const me = profile?.initials || initialsOf(profile?.full_name || user?.email || "MW");

  const { data: client } = await supabase
    .from("clients")
    .select("first_name, last_name")
    .eq("id", clientId)
    .single();

  // Sectie-gegevens
  const { data: sectionRow } = await supabase
    .from("section_data")
    .select("data")
    .eq("client_id", clientId)
    .eq("section_key", section.key)
    .maybeSingle();
  const data = (sectionRow?.data ?? {}) as Record<string, any>;

  let editor: React.ReactNode = null;

  if (section.kind === "form") {
    const { data: sigs } = section.signers?.length
      ? await supabase
          .from("signatures")
          .select("signer_index, image")
          .eq("client_id", clientId)
          .eq("section_key", section.key)
      : { data: [] as { signer_index: number; image: string }[] };
    const initialSignatures = (section.signers ?? []).map(
      (_, i) => sigs?.find((s) => s.signer_index === i)?.image ?? null
    );
    editor = (
      <FormEditor
        clientId={clientId}
        section={section}
        meId={meId}
        initialData={data as Record<string, string>}
        initialSignatures={initialSignatures}
      />
    );
  } else if (section.kind === "grid-med") {
    const { data: cells } = await supabase
      .from("grid_cells")
      .select("cell_key, value")
      .eq("client_id", clientId)
      .eq("section_key", section.key);
    const cellMap: Record<string, string> = {};
    (cells ?? []).forEach((c) => (cellMap[c.cell_key] = c.value));
    editor = (
      <MedGrid
        clientId={clientId}
        section={section}
        me={me}
        meId={meId}
        initialMeds={Array.isArray(data.meds) ? data.meds : []}
        initialCells={cellMap}
      />
    );
  } else if (section.kind === "grid-defec") {
    const { data: cells } = await supabase
      .from("grid_cells")
      .select("cell_key, value")
      .eq("client_id", clientId)
      .eq("section_key", section.key);
    const cellMap: Record<string, string> = {};
    (cells ?? []).forEach((c) => (cellMap[c.cell_key] = c.value));
    editor = <DefecGrid clientId={clientId} section={section} meId={meId} initialCells={cellMap} />;
  } else if (section.kind === "table") {
    editor = (
      <TableEditor
        clientId={clientId}
        section={section}
        meId={meId}
        initialRows={Array.isArray(data.rows) ? data.rows : []}
      />
    );
  } else if (section.kind === "log") {
    const { data: entries } = await supabase
      .from("log_entries")
      .select("id, body, author_initials, created_at")
      .eq("client_id", clientId)
      .eq("section_key", section.key)
      .order("created_at", { ascending: false });
    editor = (
      <LogList clientId={clientId} section={section} me={me} meId={meId} initial={(entries ?? []) as LogEntry[]} />
    );
  }

  return (
    <div className="app">
      <TopBar />
      <div className="screen">
        <Link href={`/clienten/${clientId}`} className="backbtn">
          <Icon name="back" width={18} /> Dossier
        </Link>
        <h1>{section.title}</h1>
        {section.sub && <p className="sub">{section.sub}</p>}
        {client && (
          <p className="sub" style={{ marginTop: -12 }}>
            {client.first_name} {client.last_name}
          </p>
        )}
        {editor}
      </div>
    </div>
  );
}
