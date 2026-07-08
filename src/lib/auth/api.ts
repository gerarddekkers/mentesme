import { NextResponse } from "next/server";
import { getUser } from "./session";
import { withUser } from "@/lib/db";
import type { PoolClient } from "pg";

/**
 * Wrapper voor API-routes: vereist een ingelogde gebruiker en voert het werk uit
 * binnen een transactie met de juiste RLS-context. Retourneert 401 zonder sessie
 * en 403 als de database-toegang wordt geweigerd (geen bewerkrecht op dossier).
 */
export async function handleMutation(
  fn: (client: PoolClient, userId: string) => Promise<unknown>
): Promise<NextResponse> {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "niet ingelogd" }, { status: 401 });
  try {
    const result = await withUser(user.sub, (c) => fn(c, user.sub));
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    // RLS-weigering → 403; overige fouten → 500
    const msg = String(err?.message ?? err);
    const denied = msg.includes("row-level security") || msg.includes("permission denied");
    return NextResponse.json(
      { error: denied ? "geen toegang" : "opslaan mislukt" },
      { status: denied ? 403 : 500 }
    );
  }
}
