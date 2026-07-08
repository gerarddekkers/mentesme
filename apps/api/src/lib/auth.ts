import type { Request, Response, NextFunction } from "express";
import { exec } from "./db.js";

export interface AuthedRequest extends Request {
  userId?: string;
  userGroup?: string;
  userEmail?: string;
  userName?: string;
}

/**
 * Auth volgens de mentesme-standaard: een token in de `metro-auth`-header
 * (+ `metro-group` voor de tenant), net als metro / mira / builder_backend.
 *
 * >>> SEAM — hier plug je de echte metro-validatie in <<<
 * Vervang `resolveUser` door een aanroep naar de metro-backend
 * (mijn.metro.mentes.me/rest/...) die het token controleert en de gebruiker
 * teruggeeft. Nu (dev): we nemen het token als gebruikers-id zodat de app
 * lokaal meteen werkt.
 */
async function resolveUser(
  token: string,
  _group?: string
): Promise<{ id: string; email?: string; name?: string } | null> {
  if (!token) return null;
  // TODO(metro): valideer `token` (+ group) tegen mijn.metro.mentes.me/rest/...
  //   const r = await fetch(`${process.env.METRO_BASE_URL}/rest/auth/whoami`, {
  //     headers: { "metro-auth": token, "metro-group": group ?? "" },
  //   });
  //   if (!r.ok) return null;
  //   const u = await r.json();
  //   return { id: u.id, email: u.email, name: u.name };
  return { id: token, name: token };
}

/** Express-middleware: vereist een geldige metro-auth. Zet req.userId. */
export async function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = (req.header("metro-auth") || "").trim();
  const group = req.header("metro-group") || undefined;
  const user = await resolveUser(token, group);
  if (!user) return res.status(401).json({ error: "niet ingelogd" });
  req.userId = user.id;
  req.userEmail = user.email;
  req.userName = user.name;
  req.userGroup = group;
  next();
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Zorg dat er een profielrij bestaat voor deze gebruiker (idempotent). */
export async function ensureProfile(req: AuthedRequest): Promise<{ initials: string; name: string }> {
  const name = req.userName || req.userEmail || "Medewerker";
  const initials = initialsOf(name);
  await exec(
    `insert into profiles (id, full_name, initials, email)
     values (?, ?, ?, ?)
     on duplicate key update full_name = values(full_name), email = values(email)`,
    [req.userId, name, initials, req.userEmail ?? null]
  );
  return { initials, name };
}
