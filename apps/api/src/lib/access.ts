import { query } from "./db.js";

/**
 * Toegangscontrole op applicatieniveau (MySQL kent geen row-level security).
 * Elke route controleert of de ingelogde gebruiker lid is van het dossier.
 */

export async function isMember(clientId: string, userId: string): Promise<boolean> {
  const rows = await query(
    "select 1 from client_members where client_id = ? and user_id = ? limit 1",
    [clientId, userId]
  );
  return rows.length > 0;
}

export async function canEdit(clientId: string, userId: string): Promise<boolean> {
  const rows = await query(
    "select 1 from client_members where client_id = ? and user_id = ? and role in ('owner','editor') limit 1",
    [clientId, userId]
  );
  return rows.length > 0;
}
