import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import type { SectionDef } from "@/lib/sections";
import { apiPost } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Server-communicatie                                                */
/* ------------------------------------------------------------------ */
async function post(url: string, body: unknown): Promise<any> {
  return apiPost(url, body);
}

/* ------------------------------------------------------------------ */
/*  Auto-opslaan-indicator                                            */
/* ------------------------------------------------------------------ */
type SaveState = "idle" | "saving" | "saved";

function useSaveState() {
  const [state, setState] = useState<SaveState>("idle");
  const [time, setTime] = useState("");
  const saving = useCallback(() => setState("saving"), []);
  const saved = useCallback(() => {
    const t = new Date();
    setTime(`${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`);
    setState("saved");
  }, []);
  return { state, time, saving, saved };
}

function SavePill({ state, time }: { state: SaveState; time: string }) {
  if (state === "idle") return null;
  return (
    <span
      className={`savepill${state === "saving" ? " saving" : ""}`}
      style={{ position: "fixed", top: 14, right: 66, zIndex: 40 }}
    >
      <span className="dot" />
      {state === "saving" ? "Opslaan…" : `Opgeslagen ${time}`}
    </span>
  );
}

function SaveFoot() {
  return (
    <div className="savefoot">
      <Icon name="cloud" width={16} style={{ color: "var(--ok)" }} /> Alles wordt automatisch bewaard in de beveiligde cloud
    </div>
  );
}

function ActionBar() {
  return (
    <div className="actionbar">
      <button className="btn primary" onClick={() => window.print()}>
        <Icon name="print" width={20} /> Print deze pagina
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Handtekening-veld (vinger / Apple Pencil)                          */
/* ------------------------------------------------------------------ */
export function SignaturePad({
  clientId, sectionKey, signerIndex, label, initial,
}: {
  clientId: string; sectionKey: string; signerIndex: number; label: string; initial: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signed, setSigned] = useState(!!initial);
  const [when, setWhen] = useState("");
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineJoin = ctx.lineCap = "round";
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#16211f";
    if (initial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = initial;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent) {
    drawing.current = true;
    last.current = pos(e);
    setSigned(true);
    e.preventDefault();
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    const pr = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    ctx.lineWidth = 1 + pr * 2.4;
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    dirty.current = true;
    e.preventDefault();
  }
  async function up() {
    if (!drawing.current) return;
    drawing.current = false;
    if (!dirty.current) return;
    dirty.current = false;
    const image = canvasRef.current!.toDataURL("image/png");
    const t = new Date();
    setWhen(`${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`);
    await post("/api/signature", { op: "set", clientId, sectionKey, signerIndex, signerName: label, image });
  }
  async function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    setWhen("");
    await post("/api/signature", { op: "delete", clientId, sectionKey, signerIndex });
  }

  return (
    <div className="sigcard">
      <div className="lbl">
        <Icon name="pen" width={16} style={{ color: "var(--accent)" }} /> {label}
      </div>
      <div ref={wrapRef} className={`sigpad${signed ? " signed" : ""}`}>
        <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
        <div className="ph">Teken hier met je vinger of pen</div>
      </div>
      <div className="sigrow">
        <small>{signed ? (when ? `Getekend · ${when}` : "Getekend") : ""}</small>
        <button className="sigclear" onClick={clear} type="button">Wissen</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Formulier-editor                                                   */
/* ------------------------------------------------------------------ */
export function FormEditor({
  clientId, section, initialData, initialSignatures = [],
}: {
  clientId: string; section: SectionDef;
  initialData: Record<string, string>; initialSignatures?: (string | null)[];
}) {
  const [values, setValues] = useState<Record<string, string>>(initialData || {});
  const { state, time, saving, saved } = useSaveState();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(key: string, val: string) {
    const next = { ...values, [key]: val };
    setValues(next);
    saving();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await post("/api/section", { clientId, sectionKey: section.key, data: next });
      saved();
    }, 600);
  }

  const fields = section.fields ?? [];
  const rows: (typeof fields)[] = [];
  for (let i = 0; i < fields.length; i += 2) rows.push(fields.slice(i, i + 2));

  return (
    <>
      <SavePill state={state} time={time} />
      {rows.map((pair, i) => (
        <div key={i} className={pair.length > 1 ? "row2" : ""}>
          {pair.map((fl) => (
            <div className="field" key={fl.key}>
              <label htmlFor={fl.key}>{fl.label}</label>
              {fl.hint && <div className="hint">{fl.hint}</div>}
              <input id={fl.key} value={values[fl.key] ?? ""} onChange={(e) => update(fl.key, e.target.value)} />
            </div>
          ))}
        </div>
      ))}

      {section.note && (
        <div className="field">
          <label htmlFor="note">Vrije notitie</label>
          <textarea id="note" value={values["note"] ?? ""} onChange={(e) => update("note", e.target.value)} />
        </div>
      )}

      {section.signers && section.signers.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="sectiontitle" style={{ fontSize: 18 }}>Ondertekenen</div>
          <p className="sectionsub">
            Teken met je vinger of Apple Pencil. De handtekening verschijnt in het printvoorbeeld en het eindverslag.
          </p>
          <div className="signblock">
            {section.signers.map((label, i) => (
              <SignaturePad
                key={i}
                clientId={clientId}
                sectionKey={section.key}
                signerIndex={i}
                label={label}
                initial={initialSignatures[i] ?? null}
              />
            ))}
          </div>
        </div>
      )}

      <SaveFoot />
      <ActionBar />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Aftekenlijst medicatie                                             */
/* ------------------------------------------------------------------ */
export function MedGrid({
  clientId, section, me, initialMeds, initialCells,
}: {
  clientId: string; section: SectionDef; me: string; initialMeds: string[]; initialCells: Record<string, string>;
}) {
  const [meds, setMeds] = useState<string[]>(initialMeds.length ? initialMeds : ["", "", "", ""]);
  const [cells, setCells] = useState<Record<string, string>>(initialCells);
  const { state, time, saving, saved } = useSaveState();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  function saveMeds(next: string[]) {
    setMeds(next);
    saving();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await post("/api/section", { clientId, sectionKey: section.key, data: { meds: next } });
      saved();
    }, 600);
  }

  async function toggle(medIdx: number, day: number) {
    const key = `m${medIdx}_d${day}`;
    saving();
    if (cells[key]) {
      const next = { ...cells };
      delete next[key];
      setCells(next);
      await post("/api/grid", { op: "delete", clientId, sectionKey: section.key, cellKey: key });
    } else {
      setCells({ ...cells, [key]: me });
      await post("/api/grid", { op: "set", clientId, sectionKey: section.key, cellKey: key, value: me });
    }
    saved();
  }

  return (
    <>
      <SavePill state={state} time={time} />
      <div className="card-block">
        <div className="sectiontitle">Maand · huidige maand</div>
        <div className="sectionsub">Tik in een vakje om af te tekenen met je initialen ({me}). Vul links de medicijnnamen in.</div>
        <div className="gridwrap">
          <table className="aftek">
            <thead>
              <tr>
                <th className="med">Medicijn</th>
                {days.map((d) => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {meds.map((name, mi) => (
                <tr key={mi}>
                  <td className="med" style={{ minWidth: 160 }}>
                    <input
                      value={name}
                      placeholder="Medicijn…"
                      onChange={(e) => saveMeds(meds.map((m, i) => (i === mi ? e.target.value : m)))}
                      style={{ border: "none", background: "transparent", font: "inherit", color: "var(--ink)", width: "100%", padding: "10px 4px" }}
                    />
                  </td>
                  {days.map((d) => {
                    const key = `m${mi}_d${d}`;
                    const v = cells[key];
                    return (
                      <td key={d}>
                        <div className={`cell${v ? " done" : ""}`} onClick={() => toggle(mi, d)}>{v || ""}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn" style={{ maxWidth: 200, marginTop: 14 }} onClick={() => saveMeds([...meds, ""])}>
          <Icon name="plus" width={18} /> Medicijn toevoegen
        </button>
      </div>
      <SaveFoot />
      <ActionBar />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Defecatielijst                                                     */
/* ------------------------------------------------------------------ */
const defecOpts = ["", "N", "H", "D", "Z", "ml", "C"];

export function DefecGrid({
  clientId, section, initialCells,
}: {
  clientId: string; section: SectionDef; initialCells: Record<string, string>;
}) {
  const [cells, setCells] = useState<Record<string, string>>(initialCells);
  const { state, time, saving, saved } = useSaveState();
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  async function cycle(day: number) {
    const key = `d${day}`;
    const cur = cells[key] || "";
    const idx = (defecOpts.indexOf(cur) + 1) % defecOpts.length;
    const val = defecOpts[idx];
    saving();
    if (!val) {
      const next = { ...cells };
      delete next[key];
      setCells(next);
      await post("/api/grid", { op: "delete", clientId, sectionKey: section.key, cellKey: key });
    } else {
      setCells({ ...cells, [key]: val });
      await post("/api/grid", { op: "set", clientId, sectionKey: section.key, cellKey: key, value: val });
    }
    saved();
  }

  return (
    <>
      <SavePill state={state} time={time} />
      <div className="card-block">
        <div className="sectiontitle">Defecatielijst — huidige maand</div>
        <div className="sectionsub">Tik een dag om de status te wisselen.</div>
        <div className="gridwrap">
          <table className="aftek">
            <tbody>
              {days.map((d) => (
                <tr key={d}>
                  <td className="med">Dag {d}</td>
                  <td>
                    <div className={`cell${cells[`d${d}`] ? " done" : ""}`} style={{ width: "auto", minWidth: 120 }} onClick={() => cycle(d)}>
                      {cells[`d${d}`] || "—"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="legend">
          <span><b>H</b> hard</span><span><b>N</b> normaal</span><span><b>D</b> dun</span>
          <span><b>Z</b> zacht</span><span><b>ml</b> microlax</span><span><b>C</b> colexclysma</span>
        </div>
      </div>
      <SaveFoot />
      <ActionBar />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabel-editor (katheterschema)                                      */
/* ------------------------------------------------------------------ */
export function TableEditor({
  clientId, section, initialRows,
}: {
  clientId: string; section: SectionDef; initialRows: string[][];
}) {
  const cols = section.columns ?? [];
  const [rows, setRows] = useState<string[][]>(
    initialRows.length ? initialRows : Array.from({ length: 3 }, () => cols.map(() => ""))
  );
  const { state, time, saving, saved } = useSaveState();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persist(next: string[][]) {
    setRows(next);
    saving();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await post("/api/section", { clientId, sectionKey: section.key, data: { rows: next } });
      saved();
    }, 600);
  }

  return (
    <>
      <SavePill state={state} time={time} />
      <div className="card-block">
        <div className="sectiontitle">{section.title}</div>
        {section.sub && <div className="sectionsub">{section.sub}</div>}
        <div className="gridwrap">
          <table className="aftek">
            <thead>
              <tr>{cols.map((c, i) => <th key={i} className={i === 0 ? "med" : ""} style={{ minWidth: 120 }}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {cols.map((_, ci) => (
                    <td key={ci} className={ci === 0 ? "med" : ""} style={{ minWidth: 120 }}>
                      <input
                        value={row[ci] ?? ""}
                        onChange={(e) => persist(rows.map((r, i) => (i === ri ? r.map((v, j) => (j === ci ? e.target.value : v)) : r)))}
                        style={{ border: "none", background: "transparent", font: "inherit", color: "var(--ink)", width: "100%", padding: "10px 8px" }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn" style={{ maxWidth: 200, marginTop: 14 }} onClick={() => persist([...rows, cols.map(() => "")])}>
          <Icon name="plus" width={18} /> Regel toevoegen
        </button>
      </div>
      <SaveFoot />
      <ActionBar />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Logregels (rapportage / dubbele controle)                          */
/* ------------------------------------------------------------------ */
export interface LogEntry {
  id: string;
  body: string;
  author_initials: string | null;
  created_at: string;
}

export function LogList({
  clientId, section, me, initial,
}: {
  clientId: string; section: SectionDef; me: string; initial: LogEntry[];
}) {
  const [items, setItems] = useState<LogEntry[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { result } = await post("/api/log", {
        clientId, sectionKey: section.key, body: text.trim(), authorInitials: me,
      });
      if (result) setItems([result as LogEntry, ...items]);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  function fmt(iso: string) {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return (
    <>
      <div className="card-block">
        <div className="sectiontitle">{section.title}</div>
        {section.sub && <div className="sectionsub">{section.sub}</div>}
        <div className="field">
          <label htmlFor="entry">Nieuwe regel toevoegen</label>
          <textarea
            id="entry"
            placeholder="Typ je rapportage… wordt met datum + jouw initialen vastgelegd."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <button className="btn" style={{ maxWidth: 220 }} onClick={add} disabled={busy}>
          <Icon name="plus" width={18} /> Regel opslaan
        </button>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {items.length === 0 && <p style={{ color: "var(--ink-faint)", fontSize: 13.5 }}>Nog geen regels.</p>}
          {items.map((it) => (
            <div key={it.id} className="card-block" style={{ margin: 0, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 4 }}>
                {fmt(it.created_at)} · {it.author_initials || "—"}
              </div>
              <div>{it.body}</div>
            </div>
          ))}
        </div>
      </div>
      <SaveFoot />
      <ActionBar />
    </>
  );
}
