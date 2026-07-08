import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase-client voor server components, route handlers en server actions. */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // In een server component kunnen cookies niet gezet worden;
            // de middleware vernieuwt de sessie. Veilig te negeren.
          }
        },
      },
    }
  );
}

/** True als de Supabase-omgevingsvariabelen zijn ingesteld. */
export function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
