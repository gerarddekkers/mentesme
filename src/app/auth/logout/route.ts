import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE, logoutUrl } from "@/lib/auth/cognito";

/** Wis de sessie-cookies en log uit bij Cognito. */
export async function GET() {
  const jar = cookies();
  jar.delete(COOKIE.id);
  jar.delete(COOKIE.refresh);
  return NextResponse.redirect(logoutUrl());
}
