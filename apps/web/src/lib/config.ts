/** Configuratie uit Vite-omgevingsvariabelen (VITE_*). */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:4000",
  // Basis-URL van de metro-backend voor inloggen (mentesme-standaard).
  metroBaseUrl: import.meta.env.VITE_METRO_BASE_URL || "https://mijn.metro.mentes.me",
};
