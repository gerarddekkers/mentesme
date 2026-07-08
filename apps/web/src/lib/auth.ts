/**
 * Auth volgens de mentesme-standaard: een metro-token dat als `metro-auth`-header
 * naar de backend gaat (net als metro-web / de mobiele app). Inloggen gaat via
 * onze eigen API (`/api/login`), die met e-mail + wachtwoord een metro-token
 * ophaalt. Token + actieve groep bewaren we in localStorage.
 */
import { config } from "./config";

const KEY = "zd_token";
const GROUP = "zd_group";

export function getToken(): string | null {
  return localStorage.getItem(KEY);
}
export function getGroup(): string | null {
  return localStorage.getItem(GROUP);
}
export function setToken(token: string, group?: string) {
  localStorage.setItem(KEY, token);
  if (group) localStorage.setItem(GROUP, group);
}
export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

/** Inloggen met Teamwork-account (e-mail + wachtwoord). Geeft true bij succes. */
export async function login(email: string, password: string): Promise<boolean> {
  const res = await fetch(`${config.apiUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { token?: string; group?: string };
  if (!data?.token) return false;
  setToken(data.token, data.group || undefined);
  return true;
}

export function logout() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(GROUP);
  window.location.href = "/login";
}
