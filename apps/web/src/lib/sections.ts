import type { IconName } from "./icons";

/** Type onderwerp bepaalt hoe de pagina wordt weergegeven. */
export type SectionKind = "form" | "grid-med" | "grid-defec" | "table" | "log";

export interface FieldDef {
  key: string;
  label: string;
  hint?: string;
}

export interface SectionDef {
  key: string;
  name: string;
  icon: IconName;
  kind: SectionKind;
  title: string;
  sub?: string;
  fields?: FieldDef[];
  /** Namen van ondertekenaars; leeg = niet ondertekenen. */
  signers?: string[];
  /** Kolommen voor een tabel-onderwerp. */
  columns?: string[];
  /** Extra vrije notitie (textarea) onderaan een formulier. */
  note?: boolean;
}

export interface GroupDef {
  title: string;
  sections: SectionDef[];
}

const f = (key: string, label: string, hint?: string): FieldDef => ({ key, label, hint });

export const groups: GroupDef[] = [
  {
    title: "Cliënt & contacten",
    sections: [
      {
        key: "pers", name: "Persoonsgegevens cliënt", icon: "person", kind: "form",
        title: "Persoonsgegevens cliënt", sub: "Wordt automatisch opgeslagen terwijl je typt.",
        fields: [
          f("naam", "Naam"), f("bsn", "BSN", "8 of 9 cijfers"),
          f("adres", "Adres"), f("pc", "Postcode & woonplaats"),
          f("born", "Geboortedatum"), f("tel", "Telefoon"),
          f("zv", "Zorgverzekeraar"), f("polis", "Polisnummer"),
          f("indst", "Indicatiesteller"), f("inddat", "Indicatiedatum"),
        ],
      },
      {
        key: "huisarts", name: "Huisarts & apotheek", icon: "phone", kind: "form",
        title: "Huisarts & apotheek", sub: "Contactgegevens voor snelle bereikbaarheid.",
        fields: [
          f("ha", "Naam huisarts"), f("hatel", "Telefoon huisarts"),
          f("hap", "Huisartsenpost"), f("haptel", "Telefoon post"),
          f("haadres", "Adres praktijk"), f("haopen", "Praktijk open van–tot"),
          f("apo", "Apotheek"), f("apotel", "Telefoon apotheek"),
          f("apobez", "Medicatie bezorgen (ja/nee)"), f("baxter", "Baxter (ja/nee)"),
          f("apoweek", "Na sluitingstijd / weekend"), f("apobestel", "Wie bestelt de medicatie"),
        ],
      },
      {
        key: "contacten", name: "Contactpersonen", icon: "person", kind: "form",
        title: "Contactpersonen", sub: "Wie bellen we, en in welke volgorde?",
        fields: [
          f("c1", "1e contactpersoon"), f("c1r", "Relatie + telefoon"),
          f("c1altijd", "Altijd bellen? (ja/nee)"), f("c2", "2e contactpersoon"),
          f("c2r", "Relatie + telefoon"), f("c3", "3e contactpersoon"),
          f("c3r", "Relatie + telefoon"), f("bijz", "Bijzonderheden"),
        ],
      },
      {
        key: "hulp", name: "Hulpmiddelen & leveranciers", icon: "pill", kind: "form",
        title: "Hulpmiddelen & leveranciers", sub: "Vaste leveranciers en bereikbaarheid.",
        fields: [
          f("hm1", "Hulpmiddelen — 1e voorkeur"), f("hm1tel", "Telefoon"),
          f("hm2", "Hulpmiddelen — 2e keuze"), f("hm2tel", "Telefoon"),
          f("inf", "Infuustherapie"), f("inftel", "Telefoon"),
          f("inc", "Incontinentie / stoma / wondzorg"), f("inctel", "Telefoon"),
        ],
      },
    ],
  },
  {
    title: "Medicatie",
    sections: [
      {
        key: "aftek", name: "Aftekenlijst medicatie", icon: "grid", kind: "grid-med",
        title: "Aftekenlijst medicatie",
        sub: "Per dag aftekenen — precies zoals op papier, maar onuitwisbaar en op naam.",
      },
      {
        key: "dubbel", name: "Dubbele controle risicovol", icon: "check2", kind: "log",
        title: "Dubbele controle risicovolle medicatie",
        sub: "Losse regels met datum + twee parafen. Nooit overschreven.",
      },
      {
        key: "pomp", name: "Registratie medicijnpomp", icon: "pump", kind: "form",
        title: "Registratie medicijnpomp", sub: "Merk, dosering en bolussen.", note: true,
        fields: [
          f("merk", "Merk pomp"), f("blaas", "Blaascatheter (ja/nee)"),
          f("uvzdat", "Datum uitvoeringsverzoek"), f("arts", "Voorschrijvende arts"),
          f("startd", "Datum start pomp"), f("morf24", "Startdosis morfine (mg/24u)"),
          f("dorm24", "Startdosis dormicum (mg/24u)"), f("inhoud", "Medicatie-inhoud (mg = ml)"),
          f("bmorf", "Bolus morfine (mg)"), f("block", "Locktijd (uur)"),
          f("bestel", "Besteldatum nieuwe cassette"), f("los", "Los bij te spuiten medicatie"),
        ],
      },
    ],
  },
  {
    title: "Medische opdrachten & schema's",
    sections: [
      {
        key: "uvz", name: "Uitvoeringsverzoek arts", icon: "doc", kind: "form",
        title: "Uitvoeringsverzoek arts",
        sub: "Opdracht tot medisch handelen. Onderaan tekenen arts + verpleegkundige.",
        signers: ["Arts", "Verpleegkundige"], note: true,
        fields: [
          f("arts", "Naam huisarts / specialist"), f("agb", "AGB-code"),
          f("ind", "Indicatie"), f("hand", "Gewenste handeling"),
          f("tijd", "Tijdstip(pen) van uitvoering"), f("geld", "Geldigheidsduur van opdracht"),
          f("spec", "Specificatie van handeling"), f("med", "Naam medicijn / vloeistof"),
          f("dos", "Exacte dosering per keer"), f("compl", "Verwachte complicaties"),
          f("bijz", "Bijzonderheden"), f("datum", "Datum"),
        ],
      },
      {
        key: "kath", name: "Katheter — plaats & vervang", icon: "cath", kind: "table",
        title: "Katheter — plaats- & vervangschema",
        sub: "Elke regel is een handeling met paraaf.",
        columns: ["Datum ingebracht", "Ballon inhoud", "Soort & Char-maat", "Paraaf", "Datum vervangen"],
      },
      {
        key: "defec", name: "Defecatielijst", icon: "drop", kind: "grid-defec",
        title: "Defecatielijst", sub: "Snel dagelijks bijhouden met één tik.",
      },
      {
        key: "rapp", name: "Rapportage huisarts", icon: "note", kind: "log",
        title: "Rapportage huisarts", sub: "Gedateerde regels. Nooit overschreven — alleen toegevoegd.",
      },
    ],
  },
  {
    title: "Wilsverklaringen (tekenen)",
    sections: [
      {
        key: "nr", name: "Niet-reanimeren verklaring", icon: "heart", kind: "form",
        title: "Niet-reanimeren verklaring", sub: "Wordt ondertekend door cliënt én (huis)arts.",
        signers: ["Cliënt / vertegenwoordiger", "(Huis)arts"],
        fields: [
          f("naam", "Naam"), f("bsn", "Sofinummer / BSN"),
          f("born", "Geboortedatum"), f("adres", "Straat / huisnummer"),
          f("pc", "Postcode / woonplaats"), f("notaris", "Registratienummer notaris"),
          f("naasten", "Naasten op de hoogte? (ja/nee)"), f("plaats", "Plaats"), f("datum", "Datum"),
        ],
      },
      {
        key: "term", name: "Terminale verklaring", icon: "file", kind: "form",
        title: "Terminale verklaring", sub: "Ondertekend door de behandelend huisarts.",
        signers: ["Behandelend huisarts"],
        fields: [
          f("naam", "Naam"), f("adres", "Adres"), f("bsn", "BSN"),
          f("opstel", "Datum opstellen verklaring"), f("diag", "Diagnose"),
          f("prog", "Verwachte levensduur"),
          f("ha", "Naam huisarts"), f("prakt", "Praktijknaam"), f("plaats", "Plaats"),
        ],
      },
    ],
  },
  {
    title: "Zorgovereenkomst (SVB PGB)",
    sections: [
      {
        key: "zorg", name: "Zorgovereenkomst van opdracht", icon: "contract", kind: "form",
        title: "Zorgovereenkomst van opdracht",
        sub: "SVB PGB · Zvw of meerdere wetten. De 10 onderdelen in één scherm.",
        signers: ["Budgethouder / vertegenwoordiger", "Zorgverlener"],
        fields: [
          f("bh", "1 · Budgethouder"), f("bhbsn", "BSN budgethouder"),
          f("bhklant", "Klantnummer SVB"), f("bhadres", "Adres budgethouder"),
          f("zv", "2 · Zorgverlener (bedrijfsnaam)"), f("kvk", "KvK-nummer"),
          f("iban", "2.2 · Rekeningnummer (IBAN)"), f("agb", "AGB-code"),
          f("start", "3 · Ingangsdatum"), f("loop", "Looptijd (onbepaald / tot)"),
          f("werk", "5 · Werkzaamheden (wet + omschrijving)"),
          f("afspr", "6 · Werkafspraak (per uur / per maand)"), f("uren", "Aantal uur per week"),
          f("uur", "7.2 · Bruto vergoeding per uur"), f("reis", "7.4 · Reiskosten"),
          f("vert", "10 · Wettelijk vertegenwoordiger? (ja/nee)"),
        ],
      },
    ],
  },
];

export const allSections: SectionDef[] = groups.flatMap((g) => g.sections);

export function getSection(key: string): SectionDef | undefined {
  return allSections.find((s) => s.key === key);
}

/** Vaste initialen/kleur per medewerker-avatar op basis van naam. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const avatarColors = ["#0E7C7B", "#B9761B", "#7A5AF0", "#BC443B", "#2E7D32", "#0277BD"];
export function colorOf(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarColors[h % avatarColors.length];
}
