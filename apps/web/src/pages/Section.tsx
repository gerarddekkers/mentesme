import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TopBar } from "@/components/topbar";
import { Icon } from "@/lib/icons";
import { getSection } from "@/lib/sections";
import { apiGet } from "@/lib/api";
import {
  FormEditor, MedGrid, DefecGrid, TableEditor, LogList, type LogEntry,
} from "@/components/editors";

interface SectionData {
  data: Record<string, any>;
  signatures: { signer_index: number; image: string }[];
  cells: { cell_key: string; value: string }[];
  logs: LogEntry[];
}

export default function Section() {
  const { id, section: key } = useParams();
  const section = key ? getSection(key) : undefined;
  const [payload, setPayload] = useState<SectionData | null>(null);
  const [me, setMe] = useState("");

  useEffect(() => {
    if (!section) return;
    Promise.all([
      apiGet(`/api/clients/${id}/section/${key}`),
      apiGet(`/api/me`).catch(() => ({ initials: "" })),
    ]).then(([p, m]) => {
      setPayload(p);
      setMe(m?.initials || "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, key]);

  if (!section) {
    return (
      <div className="app"><TopBar /><div className="screen"><p className="sub">Onbekend onderwerp.</p></div></div>
    );
  }

  let editor: React.ReactNode = <p className="sub">Laden…</p>;
  if (payload) {
    const clientId = id!;
    const cellMap: Record<string, string> = {};
    payload.cells.forEach((c) => (cellMap[c.cell_key] = c.value));

    if (section.kind === "form") {
      const initialSignatures = (section.signers ?? []).map(
        (_, i) => payload.signatures.find((s) => s.signer_index === i)?.image ?? null
      );
      editor = (
        <FormEditor clientId={clientId} section={section} initialData={payload.data as Record<string, string>} initialSignatures={initialSignatures} />
      );
    } else if (section.kind === "grid-med") {
      editor = (
        <MedGrid clientId={clientId} section={section} me={me}
          initialMeds={Array.isArray(payload.data.meds) ? payload.data.meds : []} initialCells={cellMap} />
      );
    } else if (section.kind === "grid-defec") {
      editor = <DefecGrid clientId={clientId} section={section} initialCells={cellMap} />;
    } else if (section.kind === "table") {
      editor = (
        <TableEditor clientId={clientId} section={section}
          initialRows={Array.isArray(payload.data.rows) ? payload.data.rows : []} />
      );
    } else if (section.kind === "log") {
      editor = <LogList clientId={clientId} section={section} me={me} initial={payload.logs} />;
    }
  }

  return (
    <div className="app">
      <TopBar />
      <div className="screen">
        <Link to={`/clienten/${id}`} className="backbtn">
          <Icon name="back" width={18} /> Dossier
        </Link>
        <h1>{section.title}</h1>
        {section.sub && <p className="sub">{section.sub}</p>}
        {editor}
      </div>
    </div>
  );
}
