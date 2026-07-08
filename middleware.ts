import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, isConfigured, verifyIdToken, refreshTokens } from "@/lib/auth/cognito";

const PUBLIC = ["/login", "/auth", "/setup"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Zonder Cognito-configuratie: app toont een setup-scherm, niets afschermen.
  if (!isConfigured()) return NextResponse.next();

  if (PUBLIC.some((p) => path.startsWith(p))) return NextResponse.next();

  const idToken = request.cookies.get(COOKIE.id)?.value;
  if (idToken && (await verifyIdToken(idToken))) {
    return NextResponse.next();
  }

  // Id-token ontbreekt of is verlopen → probeer te vernieuwen.
  const refresh = request.cookies.get(COOKIE.refresh)?.value;
  if (refresh) {
    const tokens = await refreshTokens(refresh);
    if (tokens?.id_token) {
      const res = NextResponse.next();
      res.cookies.set(COOKIE.id, tokens.id_token, cookieOpts(tokens.expires_in));
      return res;
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

function cookieOpts(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
