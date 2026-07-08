import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "@/lib/api";
import { Icon } from "@/lib/icons";

export function AddClient() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const { id } = await apiPost("/api/clients", {
        first_name: form.get("first_name"),
        last_name: form.get("last_name"),
        born: form.get("born"),
        tag: form.get("tag"),
      });
      if (id) navigate(`/clienten/${id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="clientcard addclient" onClick={() => setOpen(true)}>
        <Icon name="plus" /> Nieuwe cliënt
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card-block">
      <div className="row2">
        <div className="field">
          <label htmlFor="first_name">Voornaam</label>
          <input id="first_name" name="first_name" required />
        </div>
        <div className="field">
          <label htmlFor="last_name">Achternaam</label>
          <input id="last_name" name="last_name" required />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="born">Geboortedatum</label>
          <input id="born" name="born" placeholder="dd-mm-jjjj" />
        </div>
        <div className="field">
          <label htmlFor="tag">Omschrijving / wijk</label>
          <input id="tag" name="tag" placeholder="bijv. Palliatieve zorg · Wijk Noord" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn primary" type="submit" disabled={busy}>Cliënt aanmaken</button>
        <button className="btn" type="button" onClick={() => setOpen(false)}>Annuleren</button>
      </div>
    </form>
  );
}
