# Iris — AI-telefonist

> *"Goedemorgen, je spreekt met Iris. Waarmee kan ik je helpen?"*

Warme AI-telefonist die **afspraken maakt** voor **Psycholoog Eindhoven** en
**MentalAId**. Zelfde stem als de AI-Psycholoog. Doel: net zo fijn voor de
cliënt als nu, maar zonder de dure per-minuut-rekening. **Budget: < €50/mnd.**

---

## Kernidee

Iris hoeft niets te "weten". Ze heeft **gereedschap** nodig. Alles wat al
gebouwd is, bieden we aan als *tool* (function calling). **Claude is het brein**
dat beslist welk gereedschap ze pakt; jouw bestaande systemen dóén het werk.

```
   Cliënt belt
       │
 ┌─────▼──────────┐   nummer / test-nummer, EU
 │  Telefonie      │   (Vapi of Retell)
 └─────┬──────────┘
       │ audio
 ┌─────▼───────────────────┐
 │  Voice-laag              │   spraak→tekst · tekst→spraak (ElevenLabs)
 │  (het dure deel: kort!)  │
 └─────┬───────────────────┘
       │ tekst
 ┌─────▼───────────────────┐
 │  Claude = Iris (brein)   │   draait op JOUW backend (Haiku 4.5 = snel)
 └─────┬───────────────────┘
       │ tools
 ┌─────▼──────────────────────────────────────────────────┐
 │  Jouw systemen als gereedschap                           │
 │   • iCloud (CalDAV)   → beschikbaarheid + boeken          │
 │   • LeadHub           → lead/afspraak-record              │
 │   • afspraak-modal DB → boeking                           │
 │   • MentalAId-dossier → notitie (alleen bekende cliënt)   │
 │   • SMS/mail          → bevestiging                       │
 └────────────────────────────────────────────────────────────┘
```

## De tools

```
zoek_client(telefoonnummer, product)      → { client_id?, naam, bestaand? }
get_beschikbaarheid({vanaf, tot,          → [vrije slots]  (iCloud CalDAV:
   voorkeur:"ochtend|middag", behandelaar})                 werktijden − bezet)
boek_afspraak({slot, naam, telefoon,      → iCloud-event ✚ LeadHub-record
   type:"intake|vervolg", product})            ✚ bevestiging
noteer_in_dossier(client_id, afspraak)    → MentalAId-dossier (ALLEEN bekende
                                             cliënt, via RLS-endpoint)
verzet_afspraak({afspraakId, nieuw_slot})
annuleer_afspraak({afspraakId})
stuur_bevestiging({telefoon|mail, afspraak}) → SMS/mail
escaleer_crisis({telefoon, notitie})      → noemt 113 + seint mens
```

## De belervaring (warm, geen keuzemenu)

1. Warme opening met praktijknaam, natuurlijke NL-stem.
2. Herkenning op telefoonnummer → *"Spreek ik met [naam]?"*
3. Flexibel plannen: *"liever ochtend of middag?"* → concrete tijden.
4. Bevestigen + SMS/mail, zodat de cliënt niets hoeft te onthouden.
5. Verzetten/annuleren net zo makkelijk.
6. Warme afsluiting.

## Veiligheidsnet (niet-onderhandelbaar)

Klinkt iemand in crisis (suïcidaliteit/acute nood): géén gewone afspraak.
Iris noemt **113 Zelfmoordpreventie**, biedt aan een mens te laten terugbellen,
en legt een urgent bericht vast.

## De dossier-schrijfactie (MentalAId — hoogste lat)

MentalAId heeft strenge toegang op databaseniveau (RLS). Daarom:
- Niet rechtstreeks in de DB schrijven — via een **dedicated MentalAId-endpoint**
  dat de **RLS respecteert** (systeem-/service-identiteit), met audit-logging.
- **Alleen bij een bekende cliënt.** Onbekende beller → alleen LeadHub, geen dossier.
- Alleen de **feiten** (datum/tijd/type). Geen gespreksinhoud, geen opname.

## AVG

Geen medische inhoud aan de lijn, wél persoonsgegevens (dat iemand een
psycholoog belt is al gevoelig). EU-verwerking waar het kan · verwerkers-
overeenkomst met het platform · **geen opnames bewaren** · minimale opslag.

## Kosten (past ruim binnen €50)

Korte, zakelijke gesprekken (~60–90 sec):
- Nummer + inbound: ±€1–5/mnd
- Voice per gesprek: ~€0,10–0,20
- Claude (brein + tools): centen
- Bij ~150 afspraken/mnd → **ruim onder €50**. Hefboom: Iris *rondt af*, laat
  niet eindeloos praten.

## Stack-keuzes

- **Platform:** Vapi of Retell (custom LLM + server-side tools → Claude en tools
  op jouw Express-backend; data/logica blijft van jou).
- **Stem:** ElevenLabs `voice_id` = dezelfde als de AI-Psycholoog (+ zelfde
  model/settings, bv. `eleven_multilingual_v2`).
- **Model:** Haiku 4.5 voor de live beurten (snelheid = alles bij spraak).

## Bouwvolgorde

1. **`get_beschikbaarheid`** op iCloud (CalDAV, `tsdav`) — laag risico, meteen zichtbaar.
2. **`zoek_client`** + **`boek_afspraak`** (iCloud-event + LeadHub).
3. **`noteer_in_dossier`** voor MentalAId (RLS-endpoint).
4. **`stuur_bevestiging`** (SMS/mail) + **`escaleer_crisis`**.
5. Voice-laag erbovenop (Vapi/Retell) + ElevenLabs-stem.
6. Test-nummer → later porteren.

## Klaarleggen (checklist)

- [ ] LeadHub-API-toegang (hoe zet je er een afspraak/lead in?)
- [ ] afspraak-modal DB-schema
- [ ] iCloud app-specifiek wachtwoord + welke agenda's (per behandelaar)
- [ ] werktijden per behandelaar (Eindhoven ≠ MentalAId qua planning?)
- [ ] MentalAId: afspraken-concept of dossier-notitie? + RLS-schrijfweg
- [ ] ElevenLabs `voice_id` + settings uit de AI-Psycholoog-repo
- [ ] Vapi/Retell-account
