/** Configuratie uit Vite-omgevingsvariabelen (VITE_*). */
export const config = {
  // Onze backend-API. Inloggen loopt via /api/login (die praat met metro),
  // dus de metro-URL zit alleen server-side — niet in de browser-bundle.
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:4000",
};
