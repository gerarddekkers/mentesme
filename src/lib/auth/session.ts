import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, verifyIdToken, type UserClaims } from "./cognito";
import { withUser } from "@/lib/db";
import { initialsOf } from "@/lib/sections";

/** Huidige gebruiker uit de sessie-cookie (of null). */
export async function getUser(): Promise<UserClaims | null> {
  const token = cookies().get(COOKIE.id)?.value;
  if (!token) return null;
  return verifyIdToken(token);
}

/** Zorg dat er een profielrij bestaat voor deze gebruiker (idempotent). */
export async function ensureProfile(user: UserClaims): Promise<{ initials: string; name: string }> {
  const name = user.name || user.email || "Medewerker";
  const initials = initialsOf(name);
  await withUser(user.sub, async (c) => {
    await c.query(
      `insert into profiles (id, full_name, initials, email)
       values ($1, $2, $3, $4)
       on conflict (id) do update set full_name = excluded.full_name, email = excluded.email`,
      [user.sub, name, initials, user.email ?? null]
    );
  });
  return { initials, name };
}

/** Vereis een ingelogde gebruiker; stuur anders naar /login. Werkt profiel bij. */
export async function requireUser(): Promise<UserClaims & { initials: string; displayName: string }> {
  const user = await getUser();
  if (!user) redirect("/login");
  const { initials, name } = await ensureProfile(user);
  return { ...user, initials, displayName: name };
}
