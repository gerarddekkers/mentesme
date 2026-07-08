import { config } from "./config";
import { getIdToken, clearTokens } from "./auth";

/**
 * Aanroepen naar de backend-API met het Cognito id-token als Bearer.
 * Bij een verlopen sessie (401) sturen we naar /login.
 */
async function request(path: string, init: RequestInit = {}): Promise<any> {
  const token = await getIdToken();
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (res.status === 401) {
    clearTokens();
    window.location.href = "/login";
    throw new Error("sessie verlopen");
  }
  if (!res.ok) throw new Error(`Verzoek mislukt (${res.status})`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const apiGet = (path: string) => request(path);
export const apiPost = (path: string, body: unknown) =>
  request(path, { method: "POST", body: JSON.stringify(body) });
