"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Nieuwe cliënt aanmaken; de aanmaker wordt automatisch eigenaar (DB-trigger). */
export async function createClientAction(formData: FormData) {
  const first = String(formData.get("first_name") || "").trim();
  const last = String(formData.get("last_name") || "").trim();
  const born = String(formData.get("born") || "").trim();
  const tag = String(formData.get("tag") || "").trim();
  if (!first || !last) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("clients")
    .insert({ first_name: first, last_name: last, born, tag, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) return;
  revalidatePath("/clienten");
  redirect(`/clienten/${data.id}`);
}
