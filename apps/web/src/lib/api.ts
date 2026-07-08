import { config } from "./config";
import { getToken, getGroup, logout } from "./auth";

/**
 * Aanroepen naar de backend-API met het token als `metro-auth`-header
 * (mentesme-standaard). Bij een verlopen sessie (401) → terug naar /login.
 */
async function request(path: string, init: RequestInit = {}): Promise<any> {
  const token = getToken();
  const group = getGroup();
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "metro-auth": token } : {}),
      ...(group ? { "metro-group": group } : {}),
      ...(init.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error("sessie verlopen");
  }
  if (!res.ok) throw new Error(`Verzoek mislukt (${res.status})`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const apiGet = (path: string) => request(path);
export const apiPost = (path: string, body: unknown) =>
  request(path, { method: "POST", body: JSON.stringify(body) });
