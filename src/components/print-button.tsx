"use client";

import { Icon } from "@/lib/icons";

export function PrintButton({ label = "Bewaar als PDF" }: { label?: string }) {
  return (
    <div className="actionbar">
      <button className="btn primary" onClick={() => window.print()}>
        <Icon name="print" width={20} /> {label}
      </button>
    </div>
  );
}
