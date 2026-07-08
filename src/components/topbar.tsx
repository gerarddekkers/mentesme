"use client";

import { Icon } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme");
    const isDark = current
      ? current === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", isDark ? "light" : "dark");
  }
  return (
    <button className="iconbtn" onClick={toggle} aria-label="Licht of donker" title="Licht / donker">
      <Icon name="moon" />
    </button>
  );
}

export function LogoutButton() {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button className="iconbtn" onClick={signOut} aria-label="Uitloggen" title="Uitloggen">
      <Icon name="logout" />
    </button>
  );
}

export function TopBar({ showAuth = true }: { showAuth?: boolean }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" aria-hidden>
          <Icon name="heart" width={18} strokeWidth={2.2} />
        </span>
        <span>
          <b>Teamwork</b>
          <small>Cliëntdossier</small>
        </span>
      </div>
      <span style={{ flex: 1 }} />
      <ThemeToggle />
      {showAuth && <LogoutButton />}
    </header>
  );
}
