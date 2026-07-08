/**
 * Auth volgens de mentesme-standaard: een token dat als `metro-auth`-header
 * naar de backend gaat (net als metro / mira). Het token bewaren we in
 * localStorage.
 *
 * >>> SEAM — hier plug je de echte metro-login in <<<
 * Vervang `login()` door jullie metro-inlogflow (mijn.metro.mentes.me) die een
 * token teruggeeft; roep daarna setToken(token) aan. Nu (dev) kun je op de
 * loginpagina een token plakken zodat de app lokaal werkt.
 */

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
export function logout() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(GROUP);
  window.location.href = "/login";
}
