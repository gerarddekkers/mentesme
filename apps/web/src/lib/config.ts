/** Configuratie uit Vite-omgevingsvariabelen (VITE_*). */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:4000",
  cognitoDomain: import.meta.env.VITE_COGNITO_DOMAIN || "", // https://xxx.auth.eu-west-1.amazoncognito.com
  cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || "",
  region: import.meta.env.VITE_AWS_REGION || "eu-west-1",
};

export function isConfigured(): boolean {
  return Boolean(config.cognitoDomain && config.cognitoClientId);
}

export function redirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}
