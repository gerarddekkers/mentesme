# Kickoff-prompt voor Claude Code (plak dit in een verse sessie in de iris-repo)

---

Je bouwt **Iris**: een warme AI-telefonist die telefonisch **afspraken maakt**
voor **Psycholoog Eindhoven** en **MentalAId**. Lees `README.md` in deze repo —
dat is de complete blauwdruk. Houd je daaraan.

**Architectuur (kort):** voice-platform (Vapi/Retell) doet de audio → **Claude is
het brein** en draait op onze eigen Node/Express/TypeScript-backend → onze
bestaande systemen zijn *tools* (function calling): iCloud (CalDAV) voor
beschikbaarheid, LeadHub + afspraak-modal-DB voor de boeking, MentalAId-dossier
voor een notitie bij een bekende cliënt.

**Harde randvoorwaarden:**
- Gesprekken **kort en zakelijk** houden (afspraak boeken/verzetten, doorverwijzen). Budget < €50/mnd.
- **EU/AVG:** EU-verwerking waar het kan, **geen gespreksopnames bewaren**, minimale data.
- **MentalAId-dossier = hoogste lat:** alleen schrijven bij een **bekende cliënt**,
  via een **RLS-respecterend backend-endpoint** (nooit rechtstreeks in de DB), met
  audit-logging, en alleen de feiten (datum/tijd/type) — geen gespreksinhoud.
- **Crisis-vangnet:** klinkt iemand in acute nood → géén gewone afspraak, noem
  **113 Zelfmoordpreventie** en sein een mens.
- **Stem:** hergebruik de ElevenLabs `voice_id` + settings van de AI-Psycholoog
  (zelfde stem over alles heen).

**Tech-keuzes:** TypeScript · Express · `tsdav` voor iCloud CalDAV · Claude
(Haiku 4.5 voor de live gespreksbeurten, want snelheid).

---

## Eerste taak — bouw `get_beschikbaarheid` (en niks anders nog)

Bouw één tool, tekst-first (nog géén telefonie), zodat we hem los kunnen testen.

**Signatuur:**
```ts
get_beschikbaarheid({
  vanaf: string,        // ISO datum/tijd
  tot: string,          // ISO datum/tijd
  voorkeur?: "ochtend" | "middag",
  behandelaar?: string  // welke agenda; default = alle
}): Promise<Slot[]>     // Slot = { start: ISO, eind: ISO, behandelaar: string }
```

**Wat het doet:**
1. Verbind met iCloud via CalDAV (`tsdav`, met app-specifiek wachtwoord uit env).
2. Lees de bezette events in het `[vanaf, tot]`-venster uit de relevante agenda('s).
3. Trek bezet af van de **werktijden** (config per behandelaar) → vrije slots
   (bv. blokken van 60 min).
4. Filter op `voorkeur` als die is meegegeven. Geef een nette gesorteerde lijst terug.

**Acceptatiecriteria:**
- Draait als los scriptje/CLI dat ik met een datumbereik kan aanroepen en dat
  echte vrije slots uit mijn iCloud-agenda print.
- Geen secrets in code — alles via `.env` (`.env.example` toevoegen).
- Werktijden per behandelaar in een leesbare config (bv. `config/behandelaars.ts`).
- Correcte tijdzone (Europe/Amsterdam) en geen slots in het verleden.

**Vraag mij eerst om, voordat of terwijl je bouwt:**
- iCloud **app-specifiek wachtwoord** + Apple ID + welke **agenda's** (per behandelaar) meetellen.
- De **werktijden** per behandelaar (en of Eindhoven ≠ MentalAId qua planning).

Begin met een kort plan, daarna bouwen. Stapsgewijs — eerst dit werkend en
getest, dan pas de volgende tool.
