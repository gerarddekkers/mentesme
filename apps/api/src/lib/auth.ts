import type { Request, Response, NextFunction } from "express";
import { exec } from "./db.js";

export interface AuthedRequest extends Request {
  userId?: string;
  userGroup?: string;
  userEmail?: string;
  userName?: string;
}

/**
 * Auth volgens de mentesme-standaard: een opaque metro-token in de
 * `metro-auth`-header (+ `metro-group` voor de tenant), net als metro-web,
 * de mobiele app en team-dynamics. Het token is een server-side UUID en is
 * niet lokaal te decoderen — we valideren het tegen de metro-backend.
 */
const METRO_BASE = (process.env.METRO_BASE_URL || "https://mijn.metro.mentes.me/rest").replace(/\/+$/, "");

interface MetroUser {
  id: string;
  email?: string;
  name?: string;
}

/**
 * Korte in-memory cache (token → gebruiker) zodat we de metro-backend niet bij
 * élke API-call bevragen. TTL bewust kort: bij uitloggen/verlopen valt het
 * token binnen een minuut alsnog terug op 401.
 */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { user: MetroUser; at: number }>();

function fullName(u: { firstName?: string; lastName?: string; email?: string }): string | undefined {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.email || undefined;
}

/**
 * Valideer een metro-token door een geauthenticeerde call naar de metro-backend
 * te doen (`GET {METRO_BASE}/user` met de `metro-auth`-header). 200 = geldig,
 * 401 = ongeldig/verlopen. Geeft de metro-identiteit terug (id/email/naam).
 */
async function resolveUser(token: string, group?: string): Promise<MetroUser | null> {
  if (!token) return null;
  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.user;
  try {
    const r = await fetch(`${METRO_BASE}/user`, {
      headers: {
        "metro-auth": token,
        ...(group ? { "metro-group": group } : {}),
      },
    });
    if (!r.ok) {
      cache.delete(token);
      return null;
    }
    const u = (await r.json()) as { id: number | string; email?: string; firstName?: string; lastName?: string };
    const user: MetroUser = { id: String(u.id), email: u.email ?? undefined, name: fullName(u) };
    cache.set(token, { user, at: Date.now() });
    return user;
  } catch {
    return null;
  }
}

/**
 * Magic-link (e-mailcode) inloggen — mentesme-standaard, passwordless. Metro
 * verstuurt een 6-cijferige code per e-mail en wisselt die om voor een token.
 * Geen wachtwoord: simpel voor zorgprofessionals, en de mailbox is de tweede
 * factor.
 */

/** Stap 1: vraag een inlogcode aan (`POST {METRO_BASE}/auth/magic-link`). */
export async function requestMagicCode(email: string): Promise<boolean> {
  try {
    const r = await fetch(`${METRO_BASE}/auth/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), language: "nl" }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Stap 2: wissel de code om voor een token (`POST {METRO_BASE}/auth/magic-verify`).
 * Geeft het token + actieve groep terug; de metro-URL blijft server-side.
 */
export async function verifyMagicCode(
  email: string,
  code: string
): Promise<{ token: string; group?: string; name?: string; email?: string } | null> {
  try {
    const r = await fetch(`${METRO_BASE}/auth/magic-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
    });
    if (!r.ok) return null;
    const u = (await r.json()) as {
      token?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      defaultGroupId?: number | string | null;
      groups?: Array<{ id: number | string }>;
    };
    if (!u?.token) return null;
    const group =
      u.defaultGroupId != null
        ? String(u.defaultGroupId)
        : Array.isArray(u.groups) && u.groups[0]?.id != null
          ? String(u.groups[0].id)
          : undefined;
    return { token: String(u.token), group, name: fullName(u), email: u.email ?? undefined };
  } catch {
    return null;
  }
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
