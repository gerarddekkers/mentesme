"use client";

import { Icon } from "@/lib/icons";

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
  return (
    <a className="iconbtn" href="/auth/logout" aria-label="Uitloggen" title="Uitloggen">
      <Icon name="logout" />
    </a>
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
