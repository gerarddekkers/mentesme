import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/supabase/server";

export default function Home() {
  if (!isConfigured()) redirect("/setup");
  redirect("/clienten");
}
