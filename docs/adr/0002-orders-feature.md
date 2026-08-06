# ADR 0002 — Orders: behaviour spec for a native iOS and Android port

- **Status:** Shipped on web (`feat/consultation-booking`). Not yet built natively.
- **Date:** 2026-08-05
- **Screens:** [docs/screenshots/orders-feat](../screenshots/orders-feat/README.md)
- **Audience:** whoever (or whatever) builds this in SwiftUI and Jetpack Compose.
  Everything below is behaviour and rules, not React. Where the web made a
  choice for web reasons, that is called out so it is not copied.

> **Note on ADR 0001.** This document links to it in two places. ADR 0001 lives
> on the `feat/multi-staff-access` branch and those links will not resolve until
> both branches reach `main`. Nothing in this spec depends on it — it is
> referenced only where multi-staff would later change Orders.

---

## 1. What Orders is, and why it is the spine

A tailor opens this app to answer one question: *what am I sewing today, and
what is late?* Orders is the home tab and everything else hangs off it —
customers exist to be measured, invoices exist to be billed from an order.

An **order** is one garment for one customer, with a snapshot of the
measurements it was cut to, a style and fabric reference, money owed, a due
date, and a status.

**In scope for a native port:** the order list with its dashboard, search and
filters; create and edit; the customer picker with quick-add; measurement
templates and the autofill; style and fabric pickers; the order detail with its
status stepper; delete.

**Out of scope here:** invoices, consultations, and multi-staff access control
(the last is specified separately in [ADR 0001](0001-multi-staff-access-control.md)
and, if it ships, adds an `assignedTo` field to `Order` plus role gating over
the money card — worth knowing before you design the detail screen).

---

## 2. Domain model

```
Order
  id            stable unique id
  customerId    → Customer
  garment       free text, e.g. "Agbada (navy)"
  templateId    → Template, the measurement set this order was cut from
  measurements  map<String, Value>   ← SNAPSHOT. see §3.3
  styleId       → bundled Style
  fabricId      → bundled Fabric
  price         minor-unit-free integer (see §3.5)
  deposit       integer, already paid
  dueDate       date, optional
  status        new | sewing | ready | delivered
  notes         free text
  createdAt     timestamp

Template            id, name, fields: [String]   — an ordered list of field names
MeasurementSet      templateId, values: map<String, Value>   — hangs off Customer
Customer            id, name, phone, area, gender?, sets: [MeasurementSet], createdAt
Style / Fabric      id, name, image   — bundled assets, not user data (§7)
```

**`Value` is `number | string` and must stay that way.** Tailors write
`38` but also `38 (loose)` and `40½`. Do not type this as `Double`. Model it as
a string with numeric parsing at the edges, or a sealed/enum type. Losing this
loses real data.

Swift: `@Model final class Order` with `measurements: [String: String]`.
Kotlin: `@Entity data class Order` with a `Map<String, String>` TypeConverter, or
a child `measurement_values` table if you want to query them.

---

## 3. Business rules

These are the whole feature. Port them exactly; they are already the product of
several rounds of use.

### 3.1 Due-date urgency

`daysUntil` compares calendar days at local midnight, not elapsed hours — an
order due tomorrow at 09:00 must not read "due in 0 days" at 23:00 tonight.

| Condition | Urgency | Label |
|---|---|---|
| no due date | none | `no due date` |
| `d < -1` | overdue | `overdue by {-d} days` |
| `d == -1` | overdue | `overdue by 1 day` |
| `d == 0` | soon | `due today` |
| `d == 1` | soon | `due tomorrow` |
| `2 ≤ d ≤ 3` | soon | `due in {d} days` |
| `d > 3` | none | `due in {d} days` |

A **delivered** order shows a `delivered` pill instead of any due pill. Finished
work must stop nagging.

### 3.2 Dashboard figures

Over **active** orders only, where active means `status != delivered`:

- **due this week** — has a due date and `0 ≤ daysUntil ≤ 7`
- **overdue** — has a due date and `daysUntil < 0`; rendered red only when `> 0`
- **unpaid** — `Σ max(0, price − deposit)`, compact-formatted

### 3.3 The measurement snapshot — the rule most likely to be got wrong

When a template is chosen on the order form, the customer's saved set for that
template is **copied onto the order**. From that moment the two are independent.

- Editing measurements on an order **must not** write back to the customer.
- Editing the customer's set later **must not** change existing orders.

Why: last month's agbada was cut to last month's numbers. If the customer gains
weight and updates their profile, the old order must still show what was
actually cut, or every historical order becomes a lie.

The copy also carries any extra keys the saved set has beyond the template's
declared fields, and the UI names whose numbers arrived (`✓ auto-filled from
Layi's set`). A silent autofill is a silent wrong-size risk.

`+ add field` appends a one-off field to this order only, lowercased and
de-duplicated against existing keys.

### 3.4 Status

Free transition in either direction — a stepper, not a wizard. Tailors correct
mistakes. The only special case: **arriving at `delivered` triggers a
celebration**, once, on the transition and not on re-entry to the screen.

### 3.5 Money

Integers in the shop's own currency, no minor units, no conversion. `currency`
is a display symbol chosen in settings (`₦ € $ £ GH₵`).

- `fmtMoney` — grouped thousands, symbol prefix, rounded
- `fmtCompact` — `≥1,000,000` → `₦1.2m` (drop a trailing `.0`); `≥10,000` → `₦126k`; else full

On native, use the platform number formatter with grouping, and **do not**
hard-code the `en-NG` locale the web version uses — that was expedience, not
intent.

### 3.6 Search and filters

One search box, case-insensitive, matching **garment OR customer name**.
Filters are `all · new · sewing · ready · delivered`, and combine with search.

---

## 4. Screens

### 4.1 Order list — home

Top to bottom: dashboard card, search field, horizontally scrolling filter
chips, then a card per order. FAB floats bottom-right, clear of the tab bar.

**Order card:** fabric thumbnail (56pt, rounded), garment name (bold, one line),
customer name (secondary, one line), then status pill + due pill wrapping.

**Empty state:** icon, "no orders here", "tap + to add your first order".

### 4.2 Order form — create and edit

One form, two modes; edit prefills and changes the title and the submit label.
Field order matters: **customer first**, because it drives the autofill.

customer picker → garment name → template chips → measurement grid →
style + fabric (side by side) → price + deposit (side by side) → due date →
notes → submit.

Validation, in order, surfacing one message at a time:
`pick a customer first` → `give the garment a name` → `pick a measurement template`.

On save: empty measurement values are dropped rather than stored as blanks;
numeric-looking strings are stored as numbers, everything else as text.
Create navigates to the new order's detail **replacing** the form in the back
stack; edit pops back.

### 4.3 Customer picker

A sheet: search field, customer rows (avatar with initials, name, phone), and
an inline two-field quick-add so a walk-in never forces the tailor to abandon
the order. Quick-add creates the customer and selects it in one step.

### 4.4 Style and fabric pickers

Sheets with a 3-column photo grid, selection ringed. The first tile is a camera
slot — **on web it is a stub that shows "coming in the full app"; on native,
build it for real** (§8).

### 4.5 Order detail

Style photo (4:5) with the fabric swatch inset bottom-right over a white ring;
garment name and due pill; fabric name; a tappable customer chip. Then: status
stepper, money card (price / deposit / balance, balance green at zero),
measurements read-only in the same grid, notes if any, "create invoice for this
order", and delete.

---

## 5. Navigation

```
Orders (tab, home)
 ├─ FAB ─────────► create sheet ──► Order form (new)
 ├─ card ────────► Order detail
 │                  ├─ edit ──────► Order form (edit)
 │                  ├─ customer ──► Customer detail
 │                  └─ invoice ───► Invoice form
 └─ (tabs) Customers · Invoices · Calls
```

Customer detail also offers "new order for {first name}", entering the form with
the customer prefilled.

---

## 6. Design tokens

| Token | Value |
|---|---|
| background | `#F5F5F3` |
| card | `#FFFFFF` |
| card alt (chips, wells) | `#EFEFED` |
| ink (text, primary fill) | `#111111` |
| danger | `#E5484D` |
| ok | `#30A46C` |
| warn | `#F5A623` |
| body font | Inter |
| display font (numbers, headings) | Space Grotesk |

Headings are **lowercase by design** — a deliberate voice choice, not a bug.
Large figures use the display face; body copy uses Inter.

**Radii:** cards 16, chips/wells 12, sheets 24 (top corners), buttons and pills
fully rounded.

**Pills** — one recipe: tinted background, saturated same-hue text, leading dot.

| Pill | Background | Text / dot |
|---|---|---|
| new | ink @ 6% | ink @ 55% / 30% |
| sewing | `#EAEEFF` | `#3B4FD8` |
| ready | `#F1EAFF` | `#7139D4` |
| delivered | `#E4F5EC` | `#12764B` |
| due soon | `#FFF1DC` | `#9A5B00` / dot `#E89100` |
| overdue | solid `#E5484D` | white |
| due later | ink @ 6% | ink @ 45% / 25% |

**Only overdue gets a solid fill.** It is the loudest thing on the screen, and
it stays that way — do not promote anything else to solid.

**Motion:** sheets slide up 250 ms on `cubic-bezier(0.2, 0.8, 0.2, 1)`; overlays
fade 200 ms; dialogs and the celebration pop from 0.85 scale, same curve. Every
tappable surface scales to 0.95–0.98 while pressed — on native, prefer the
platform's own press treatment plus haptics.

---

## 7. Web pattern → native

| Web | SwiftUI | Compose |
|---|---|---|
| bottom sheet | `.sheet` + `.presentationDetents([.medium, .large])` | `ModalBottomSheet` |
| FAB over tab bar | `ZStack` overlay on the tab content | `Scaffold(floatingActionButton = …)` |
| tab bar | `TabView` | `NavigationBar` + `NavHost` |
| filter chip row | `ScrollView(.horizontal)` of capsules | `LazyRow` of `FilterChip` |
| status stepper | `HStack` of capsule buttons | `SingleChoiceSegmentedButtonRow` |
| measurement grid | `LazyVGrid`, 3 columns | `LazyVerticalGrid(Fixed(3))` |
| style/fabric grid | `LazyVGrid` in a sheet | `LazyVerticalGrid` in a sheet |
| confirm dialog | `.alert` | `AlertDialog` |
| toast | overlay + `.transition` | `Snackbar` |
| celebration | overlay, `.scale` transition | `Dialog` + `AnimatedVisibility` |
| date field | `DatePicker(… .compact)` | M3 `DatePickerDialog` |
| decimal entry | `.keyboardType(.decimalPad)` | `KeyboardType.Decimal` |
| bundled photos | asset catalog | `res/drawable` |
| store + persistence | SwiftData `@Model` | Room `@Entity` + DAO |

---

## 8. Build these natively — the web could not

1. **Camera for style and fabric.** Currently a stub toast. `PhotosPicker` /
   `UIImagePickerController`; CameraX / Photo Picker. This is the single most
   requested thing the prototype cannot do.
2. **Due-date notifications.** A real gap. `UNUserNotificationCenter` /
   `WorkManager` + notification. "2 orders due tomorrow" the evening before.
3. **Haptics** on status change, and a stronger one on `delivered`.
4. **Swipe actions** on the order row — advance status, delete.
5. **Home-screen widget / Live Activity** showing due-this-week and overdue.
6. **Share sheet** for order and invoice hand-off (`UIActivityViewController` /
   `ACTION_SEND`) instead of hard-coded `wa.me` links.
7. **Dynamic Type / font scaling.** The web version is fixed-size; a tailor
   reading a tape measure at arm's length will want it bigger.

---

## 9. Do not port

| Thing | Why it exists on web | Native equivalent |
|---|---|---|
| `HashRouter`, `#/orders` URLs | GitHub Pages has no server rewrites | Normal nav stacks |
| `localStorage` + zustand persist | No backend | SwiftData / Room |
| The `merge` / repair functions in `store.ts` | A PWA can ship a schema change to a browser holding old data with no migration hook | Real schema migrations |
| `html2canvas-pro` invoice rendering | Only way to rasterise DOM | `ImageRenderer` / `Canvas` |
| `import.meta.env.BASE_URL` image paths | GitHub Pages sub-path | Asset catalogs |
| Waitlist banner and GoatCounter events | Prototype marketing | Drop, or a real analytics SDK |
| `toLocaleString('en-NG')` | Expedient hard-code | Platform formatter, user's locale |

---

## 10. Acceptance checklist

Behaviour, not pixels. A port is done when all of these hold.

- [ ] Dashboard counts match §3.2 exactly, including excluding delivered orders
- [ ] An order due tomorrow reads `due tomorrow` at 23:59 today, not `due in 0 days`
- [ ] Overdue is the only solid-filled pill anywhere in the app
- [ ] A delivered order shows no due pill
- [ ] Picking a template copies the customer's set and names the source
- [ ] Editing an order's measurements leaves the customer's saved set untouched
- [ ] Editing a customer's set leaves existing orders untouched
- [ ] `+ add field` adds to that order only, lowercased, no duplicates
- [ ] A measurement of `38 (loose)` round-trips through save and reload
- [ ] Empty measurement values are dropped on save, not stored blank
- [ ] Validation surfaces one message at a time in the §4.2 order
- [ ] Quick-add creates the customer and selects it without leaving the form
- [ ] Reaching `delivered` celebrates once, and not again on revisit
- [ ] Status moves backwards as freely as forwards
- [ ] Delete asks first and names the garment
- [ ] Create replaces the form in the back stack; back from the new order's
      detail goes to the list, not back into the form
- [ ] Search matches garment and customer name, and combines with the filter
- [ ] Everything works with the device offline

---

## 11. Seed data

Ship the same demo content: 5 templates, 7 customers, 8 orders across all four
statuses, 8 styles and 6 fabrics. **Due dates are computed relative to today**
(one overdue, two due within three days), so the app demonstrates its own
urgency states on any day it is opened. Keep that — a static seed goes stale and
shows every order grey.

---

## 12. Open questions for the native build

- **Multi-device sync.** Native makes offline free but does not answer two
  phones. Same backend question as [ADR 0001 §6](0001-multi-staff-access-control.md#6-what-production-actually-requires).
- **Photo storage.** Once the camera is real, orders carry images. Local files
  plus a path in the DB, and a size budget before the first shop with 500 orders
  fills their phone.
- **Tablet layout.** A list-detail split is natural on iPad and large Android
  tablets. The web version is phone-only by construction.
- **Measurement units.** Inches are hard-coded (`"` suffix). Centimetres are the
  obvious next market.
