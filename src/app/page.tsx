import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/auth/cognito";

export default function Home() {
  if (!isConfigured()) redirect("/setup");
  redirect("/clienten");
}
