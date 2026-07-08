import { config, redirectUri } from "./config";

/**
 * Inloggen via Amazon Cognito met de OAuth2 authorization-code-flow + PKCE
 * (publieke client, geen secret in de browser). Tokens staan in localStorage.
 */

const KEY = { id: "zd_id", refresh: "zd_refresh", exp: "zd_exp", verifier: "zd_pkce" };

/* ---- PKCE-helpers ---- */
function base64url(bytes: Uint8Array): string {
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return base64url(arr);
}
async function challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/* ---- Token-opslag ---- */
function store(tokens: { id_token: string; refresh_token?: string; expires_in: number }) {
  localStorage.setItem(KEY.id, tokens.id_token);
  if (tokens.refresh_token) localStorage.setItem(KEY.refresh, tokens.refresh_token);
  localStorage.setItem(KEY.exp, String(Date.now() + tokens.expires_in * 1000));
}
export function clearTokens() {
  [KEY.id, KEY.refresh, KEY.exp].forEach((k) => localStorage.removeItem(k));
}
export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(KEY.id));
}

/* ---- Flow ---- */
export async function login() {
  const verifier = randomVerifier();
  sessionStorage.setItem(KEY.verifier, verifier);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.cognitoClientId,
    redirect_uri: redirectUri(),
    scope: "openid email profile",
    code_challenge_method: "S256",
    code_challenge: await challenge(verifier),
  });
  window.location.href = `${config.cognitoDomain}/oauth2/authorize?${params.toString()}`;
}

export async function handleCallback(code: string): Promise<boolean> {
  const verifier = sessionStorage.getItem(KEY.verifier) || "";
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.cognitoClientId,
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  const res = await fetch(`${config.cognitoDomain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  store(await res.json());
  sessionStorage.removeItem(KEY.verifier);
  return true;
}

async function refresh(): Promise<string | null> {
  const rt = localStorage.getItem(KEY.refresh);
  if (!rt) return null;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.cognitoClientId,
    refresh_token: rt,
  });
  const res = await fetch(`${config.cognitoDomain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const tokens = await res.json();
  store({ ...tokens, refresh_token: rt });
  return tokens.id_token as string;
}

/** Geef een geldig id-token; ververs indien bijna verlopen. */
export async function getIdToken(): Promise<string | null> {
  const id = localStorage.getItem(KEY.id);
  const exp = Number(localStorage.getItem(KEY.exp) || 0);
  if (!id) return null;
  if (Date.now() > exp - 30_000) return (await refresh()) ?? id;
  return id;
}

export function logout() {
  clearTokens();
  const params = new URLSearchParams({
    client_id: config.cognitoClientId,
    logout_uri: `${window.location.origin}/login`,
  });
  window.location.href = `${config.cognitoDomain}/logout?${params.toString()}`;
}
