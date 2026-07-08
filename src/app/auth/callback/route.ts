import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE, exchangeCodeForTokens } from "@/lib/auth/cognito";

/**
 * OAuth2-callback: wissel de code in voor tokens en zet de sessie-cookies.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?fout=code`);

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens?.id_token) return NextResponse.redirect(`${origin}/login?fout=token`);

  const jar = cookies();
  const base = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
  jar.set(COOKIE.id, tokens.id_token, { ...base, maxAge: tokens.expires_in });
  if (tokens.refresh_token) {
    jar.set(COOKIE.refresh, tokens.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 30 });
  }
  return NextResponse.redirect(`${origin}/clienten`);
}
