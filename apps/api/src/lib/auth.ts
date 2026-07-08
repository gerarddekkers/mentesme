import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { Request, Response, NextFunction } from "express";
import { exec } from "./db.js";

let _verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
function getVerifier() {
  if (!_verifier) {
    _verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID || "",
      tokenUse: "id",
      clientId: process.env.COGNITO_CLIENT_ID || "",
    });
  }
  return _verifier;
}

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

/**
 * Express-middleware: verifieer het Cognito id-token uit de Authorization-header
 * en zet req.userId (de Cognito `sub`). Zonder geldig token → 401.
 */
export async function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "niet ingelogd" });
  try {
    const payload = (await getVerifier().verify(token)) as Record<string, unknown>;
    req.userId = String(payload.sub);
    req.userEmail = payload.email ? String(payload.email) : undefined;
    req.userName = payload.name
      ? String(payload.name)
      : payload.email
        ? String(payload.email)
        : undefined;
    next();
  } catch {
    return res.status(401).json({ error: "ongeldige sessie" });
  }
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
