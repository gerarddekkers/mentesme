import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Verwerkt de inloglink uit de e-mail (magic link / OTP) en zet de sessie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/clienten";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?fout=inloggen`);
}
