import { Router, type Response } from "express";
import { randomUUID } from "node:crypto";
import { query, exec, tx } from "../lib/db.js";
import { requireUser, ensureProfile, requestMagicCode, verifyMagicCode, type AuthedRequest } from "../lib/auth.js";
import { isMember, canEdit } from "../lib/access.js";

export const api = Router();

/* ---- Inloggen: magic-link / e-mailcode (publiek — vóór requireUser) ---- */
// Stap 1: vraag een 6-cijferige code aan per e-mail. Proxy naar metro zodat de
// metro-URL server-side blijft (geen browser-CORS naar metro).
api.post("/login/request", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email?.trim()) return res.status(400).json({ error: "e-mailadres verplicht" });
  const ok = await requestMagicCode(email);
  if (!ok) return res.status(400).json({ error: "kon geen code versturen" });
  res.json({ ok: true });
});

// Stap 2: wissel de code om voor een metro-token.
api.post("/login/verify", async (req, res) => {
  const { email, code } = req.body ?? {};
  if (!email?.trim() || !code?.trim())
    return res.status(400).json({ error: "e-mail en code verplicht" });
  const result = await verifyMagicCode(email, code);
  if (!result) return res.status(401).json({ error: "ongeldige of verlopen code" });
  res.json(result);
});

// Alle overige routes vereisen een ingelogde gebruiker + bestaand profiel.
api.use(requireUser);
api.use(async (req: AuthedRequest, _res, next) => {
  try {
    await ensureProfile(req);
    next();
  } catch (e) {
    next(e);
  }
});

async function guard(
  req: AuthedRequest,
  res: Response,
  clientId: string,
  edit: boolean
): Promise<boolean> {
  const uid = req.userId!;
  const ok = edit ? await canEdit(clientId, uid) : await isMember(clientId, uid);
  if (!ok) {
    res.status(403).json({ error: "geen toegang tot dit dossier" });
    return false;
  }
  return true;
}

/* ---- Huidige gebruiker ---- */
api.get("/me", async (req: AuthedRequest, res) => {
  const { initials, name } = await ensureProfile(req);
  res.json({ id: req.userId, name, initials, email: req.userEmail });
});

/* ---- Cliënten ---- */
api.get("/clients", async (req: AuthedRequest, res) => {
  const rows = await query(
    `select c.id, c.first_name, c.last_name, c.born, c.tag
     from clients c join client_members m on m.client_id = c.id
     where m.user_id = ? order by c.last_name, c.first_name`,
    [req.userId]
  );
  res.json(rows);
});

api.post("/clients", async (req: AuthedRequest, res) => {
  const { first_name, last_name, born, tag } = req.body ?? {};
  if (!first_name?.trim() || !last_name?.trim())
    return res.status(400).json({ error: "voor- en achternaam verplicht" });
  const id = randomUUID();
  await tx(async (conn) => {
    await conn.execute(
      `insert into clients (id, first_name, last_name, born, tag, created_by)
       values (?, ?, ?, ?, ?, ?)`,
      [id, first_name.trim(), last_name.trim(), born ?? null, tag ?? null, req.userId!]
    );
    await conn.execute(
      `insert into client_members (client_id, user_id, role) values (?, ?, 'owner')`,
      [id, req.userId!]
    );
  });
  res.json({ id });
});

api.get("/clients/:id", async (req: AuthedRequest, res) => {
  const clientId = req.params.id;
  if (!(await guard(req, res, clientId, false))) return;

  const [client] = await query(
    `select id, first_name, last_name, born, tag from clients where id = ?`,
    [clientId]
  );
  if (!client) return res.status(404).json({ error: "niet gevonden" });

  const members = await query(
    `select m.user_id as id, m.role, p.full_name, p.initials
     from client_members m join profiles p on p.id = m.user_id
     where m.client_id = ?`,
    [clientId]
  );
  const sectionRows = await query(
    `select section_key, data from section_data where client_id = ?`,
    [clientId]
  );
  const logKeys = await query(
    `select distinct section_key from log_entries where client_id = ?`,
    [clientId]
  );
  const gridKeys = await query(
    `select distinct section_key from grid_cells where client_id = ?`,
    [clientId]
  );
  const sigRows = await query(
    `select section_key, count(*) as n from signatures where client_id = ? group by section_key`,
    [clientId]
  );

  res.json({ client, members, sectionRows, logKeys, gridKeys, sigRows });
});

/* ---- Sectie lezen ---- */
api.get("/clients/:id/section/:key", async (req: AuthedRequest, res) => {
  const clientId = req.params.id;
  if (!(await guard(req, res, clientId, false))) return;
  const key = req.params.key;

  const [row] = await query(
    `select data from section_data where client_id = ? and section_key = ?`,
    [clientId, key]
  );
  const signatures = await query(
    `select signer_index, image from signatures where client_id = ? and section_key = ?`,
    [clientId, key]
  );
  const cells = await query(
    `select cell_key, value from grid_cells where client_id = ? and section_key = ?`,
    [clientId, key]
  );
  const logs = await query(
    `select id, body, author_initials, created_at from log_entries
     where client_id = ? and section_key = ? order by created_at desc`,
    [clientId, key]
  );
  res.json({ data: (row as any)?.data ?? {}, signatures, cells, logs });
});

/* ---- Verslag (alles) ---- */
api.get("/clients/:id/report", async (req: AuthedRequest, res) => {
  const clientId = req.params.id;
  if (!(await guard(req, res, clientId, false))) return;
  const [client] = await query(
    `select first_name, last_name, born, tag from clients where id = ?`,
    [clientId]
  );
  const sectionRows = await query(
    `select section_key, data from section_data where client_id = ?`,
    [clientId]
  );
  const signatures = await query(
    `select section_key, signer_index, image from signatures where client_id = ?`,
    [clientId]
  );
  const logs = await query(
    `select section_key, body, author_initials, created_at from log_entries
     where client_id = ? order by created_at asc`,
    [clientId]
  );
  res.json({ client, sectionRows, signatures, logs });
});

/* ---- Mutaties ---- */
api.post("/section", async (req: AuthedRequest, res) => {
  const { clientId, sectionKey, data } = req.body ?? {};
  if (!(await guard(req, res, clientId, true))) return;
  await exec(
    `insert into section_data (client_id, section_key, data, updated_by)
     values (?, ?, ?, ?)
     on duplicate key update data = values(data), updated_by = values(updated_by)`,
    [clientId, sectionKey, JSON.stringify(data ?? {}), req.userId]
  );
  res.json({ ok: true });
});

api.post("/grid", async (req: AuthedRequest, res) => {
  const { op, clientId, sectionKey, cellKey, value } = req.body ?? {};
  if (!(await guard(req, res, clientId, true))) return;
  if (op === "delete") {
    await exec(
      `delete from grid_cells where client_id = ? and section_key = ? and cell_key = ?`,
      [clientId, sectionKey, cellKey]
    );
  } else {
    await exec(
      `insert into grid_cells (client_id, section_key, cell_key, value, updated_by)
       values (?, ?, ?, ?, ?)
       on duplicate key update value = values(value), updated_by = values(updated_by)`,
      [clientId, sectionKey, cellKey, value, req.userId]
    );
  }
  res.json({ ok: true });
});

api.post("/signature", async (req: AuthedRequest, res) => {
  const { op, clientId, sectionKey, signerIndex, signerName, image } = req.body ?? {};
  if (!(await guard(req, res, clientId, true))) return;
  if (op === "delete") {
    await exec(
      `delete from signatures where client_id = ? and section_key = ? and signer_index = ?`,
      [clientId, sectionKey, signerIndex]
    );
  } else {
    await exec(
      `insert into signatures (client_id, section_key, signer_index, signer_name, image, signed_by)
       values (?, ?, ?, ?, ?, ?)
       on duplicate key update image = values(image), signer_name = values(signer_name), signed_by = values(signed_by)`,
      [clientId, sectionKey, signerIndex, signerName ?? null, image, req.userId]
    );
  }
  res.json({ ok: true });
});

api.post("/log", async (req: AuthedRequest, res) => {
  const { clientId, sectionKey, body, authorInitials } = req.body ?? {};
  if (!(await guard(req, res, clientId, true))) return;
  const id = randomUUID();
  await exec(
    `insert into log_entries (id, client_id, section_key, body, author_initials, created_by)
     values (?, ?, ?, ?, ?, ?)`,
    [id, clientId, sectionKey, body, authorInitials ?? null, req.userId]
  );
  const [row] = await query(
    `select id, body, author_initials, created_at from log_entries where id = ?`,
    [id]
  );
  res.json({ result: row });
});
