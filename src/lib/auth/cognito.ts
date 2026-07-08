import { CognitoJwtVerifier } from "aws-jwt-verify";

/**
 * Amazon Cognito-configuratie. Inloggen gebeurt via de Cognito "managed login"
 * (hosted UI) met passwordless e-mailcode; onze app doet alleen de OAuth2
 * authorization-code-flow: doorsturen → code inwisselen voor tokens → cookies.
 */
export function cognitoConfig() {
  const region = process.env.AWS_REGION || "eu-west-1";
  return {
    region,
    domain: process.env.COGNITO_DOMAIN || "", // https://xxx.auth.eu-west-1.amazoncognito.com
    userPoolId: process.env.COGNITO_USER_POOL_ID || "",
    clientId: process.env.COGNITO_CLIENT_ID || "",
    clientSecret: process.env.COGNITO_CLIENT_SECRET || "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  };
}

export function isConfigured(): boolean {
  const c = cognitoConfig();
  return Boolean(c.domain && c.userPoolId && c.clientId);
}

export const COOKIE = {
  id: "zd_id",
  refresh: "zd_refresh",
};

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
function getVerifier() {
  const c = cognitoConfig();
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: c.userPoolId,
      tokenUse: "id",
      clientId: c.clientId,
    });
  }
  return verifier;
}

export interface UserClaims {
  sub: string;
  email?: string;
  name?: string;
}

/** Verifieer een Cognito id-token en geef de claims terug (of null). */
export async function verifyIdToken(idToken: string): Promise<UserClaims | null> {
  try {
    const payload = (await getVerifier().verify(idToken)) as Record<string, unknown>;
    return {
      sub: String(payload.sub),
      email: payload.email ? String(payload.email) : undefined,
      name: payload.name ? String(payload.name) : payload.email ? String(payload.email) : undefined,
    };
  } catch {
    return null;
  }
}

export function authorizeUrl(): string {
  const c = cognitoConfig();
  const params = new URLSearchParams({
    client_id: c.clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: `${c.siteUrl}/auth/callback`,
  });
  return `${c.domain}/oauth2/authorize?${params.toString()}`;
}

export function logoutUrl(): string {
  const c = cognitoConfig();
  const params = new URLSearchParams({
    client_id: c.clientId,
    logout_uri: `${c.siteUrl}/login`,
  });
  return `${c.domain}/logout?${params.toString()}`;
}

interface TokenSet {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function basicAuthHeader(): Record<string, string> {
  const c = cognitoConfig();
  if (!c.clientSecret) return {};
  const basic = Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64");
  return { Authorization: `Basic ${basic}` };
}

/** Wissel de authorization-code in voor tokens (server-side). */
export async function exchangeCodeForTokens(code: string): Promise<TokenSet | null> {
  const c = cognitoConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: c.clientId,
    code,
    redirect_uri: `${c.siteUrl}/auth/callback`,
  });
  const res = await fetch(`${c.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...basicAuthHeader() },
    body,
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenSet;
}

/** Vernieuw tokens met een refresh-token. */
export async function refreshTokens(refreshToken: string): Promise<TokenSet | null> {
  const c = cognitoConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: c.clientId,
    refresh_token: refreshToken,
  });
  const res = await fetch(`${c.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...basicAuthHeader() },
    body,
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenSet;
}
