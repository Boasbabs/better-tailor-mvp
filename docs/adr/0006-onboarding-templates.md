# ADR 0006 — Onboarding: behaviour spec for a native iOS and Android port

- **Status:** Built on web (`feat/consultation-booking`), in the working tree
  and not yet committed at the time of writing. Not yet built natively.
- **Date:** 2026-08-05
- **Screens:** [`docs/screenshots/onboarding-feat/`](../screenshots/onboarding-feat/)
  — 19 frames off the running web build, every screen and state §4 describes.
  §4 is still written to stand on its own; the frames are corroboration, not the
  spec. Where a rule below has a frame, it is cited as **[N]**.
- **Audience:** whoever (or whatever) builds this in SwiftUI and Jetpack Compose.
  Everything below is behaviour and rules, not React. Where the web made a
  choice for web reasons, that is called out so it is not copied.

> **Note on ADR 0001.** Not referenced here. Onboarding runs before any notion
> of staff exists; if multi-staff ships, the open question in §12 is where it
> lands.

---

## 1. What this is, and why it exists

Onboarding is three screens between opening the app for the first time and the
orders list. The first two are a value pitch and shop details. The third is the
one this document is really about.

A tailor does not measure garments the way the app's authors guessed. The five
templates we ship — Agbada, Trouser, Gown, Blouse, Skirt — are a reasonable
Lagos default and are wrong for a tailor who only sews kaftans, or who takes an
`armhole` on everything, or who calls it `back length`. Until this step existed,
her first honest encounter with the app was a measurement form asking for
fields she does not use, and the fix was buried in settings behind a stub
template named "New template".

So the last thing onboarding does is ask her what *she* measures, and let her
say it in her own words before she has entered a single customer.

The deliberate choice, made against the obvious alternative: **she builds from
scratch, she does not tick our presets.** A preset picker is cheaper and
converts better, and it would have taught her that this app has opinions about
her trade. A blank garment field with suggestions underneath teaches the
opposite. The suggestions (§3.3) are there so that "from scratch" does not mean
"type fourteen words on a phone keyboard".

**In scope:** the three-step flow; what each step may write; the template
builder and its draft rules; the completion and skip paths; the first-run gate.

**Out of scope:** editing templates afterwards (settings, and
[ADR 0003](0003-customers-feature.md) for how templates are consumed);
measurement sets on a customer (ADR 0003 §4.4–4.5); the measurement snapshot taken
by an order ([ADR 0002 §3.3](0002-orders-feature.md#33-the-measurement-snapshot--the-rule-most-likely-to-be-got-wrong)).

---

## 2. Domain model

Onboarding introduces **no new persisted types**. It writes to two things that
already exist:

```
Template                    (unchanged — see ADR 0003 §3)
  id       stable unique id
  name     display name, case preserved as typed ("Kaftan", "Ankara gown")
  fields   [String]  lowercase, ordered — see §3.2

Settings gains nothing. Onboarding writes businessName, accountName, currency.

First-run flag                       web: a 'bt_seen_welcome' string in
  seenWelcome  Bool                  localStorage, deliberately NOT in the
                                     persisted store — see §9
```

Everything the tailor builds on step 3 is held in **transient screen state**
until she leaves the screen forwards:

```
Draft                       identical in shape to Template, but unsaved
  id       generated at draft time, and kept when it is committed
  name
  fields

Screen state
  drafts     [Draft]        saved cards, in creation order
  editingId  Draft.id?      which draft the form is currently bound to
  garment    String         the form's name field
  fields     [String]       the form's chosen fields
```

`Draft.id` is generated when the card is created, not when it is committed, so
that editing a card can find it again. Swift: a plain `struct Draft: Identifiable`
in an `@Observable` view model. Kotlin: a `data class` in a `ViewModel`
`StateFlow`. Neither should be an `@Model` / `@Entity` — see §3.1.

---

## 3. Business rules

### 3.1 What each step may write, and when

| Step | Primary action | Writes | Secondary action | Writes |
|---|---|---|---|---|
| 1 — splash | `let's go` → step 2 | nothing | — | — |
| 2 — shop details | `next` → step 3 | `currency`, and `businessName` + `accountName` if the name is non-empty | `skip for now` → step 3 | `currency` only |
| 3 — templates | `start` → orders | all drafts, then the first-run flag | `skip for now` → orders | the first-run flag only |

Two rules follow, and both matter:

**Currency is written on both paths out of step 2.** Skipping declines to name
the shop, not to pick a currency — the picker defaults to something and the
tailor has already seen it applied to the live invoice preview **[05]**.

**Step 3 writes nothing until it is left forwards.** Going *back* to step 2 must
leave the store exactly as it was found, and the drafts must still be there on
returning. This is why drafts are screen state and not model objects: a native
port that binds the builder straight to SwiftData or Room will persist
half-finished templates the moment a tailor taps back, and there is no undo.
**[16]** is the return trip: name and currency intact, drafts intact, store
untouched.

**`businessName` also seeds `accountName`.** Small shops bank under their
trading name, and an invoice whose header and "pay to" block disagree looks
fraudulent. If the two should diverge the tailor changes one in settings.

### 3.2 The draft fold — the rule most likely to be got wrong

At any moment step 3 holds both a list of saved cards *and* an open form. Every
exit from the form runs the same fold:

```
fold():
  name = garment.trimmed
  ready = name is not empty AND fields is not empty

  if editing an existing draft:
      ready  → replace that draft in place, keeping its position
      !ready → DELETE that draft
  else:
      ready  → append a new draft
      !ready → no change
```

Three consequences, all deliberate, all worth a test:

1. **`start` folds first.** A tailor who fills the form and taps `start` without
   noticing `save & add another` still gets her garment. Losing typing that is
   visible on screen is the worst outcome available here, and it is the exact
   moment a first-time user is least attentive.
2. **Tapping a card to edit it folds first.** Half-typing a second garment and
   then tapping the first card saves the second as its own card *and* opens the
   first. Nothing collides and nothing is lost.
3. **Emptying an edited card deletes it.** Clearing the name or removing every
   field of a card being edited, then leaving the form, removes it. This is how
   a card is discarded from inside the form, and it is why `!ready` while
   editing is a delete and not a no-op.

**The card being edited is not rendered in the card list.** It lives in the form
instead. Rendering both is a duplicate that invites the tailor to edit one copy
and delete the other. Compare **[12]** (two cards, blank form) with **[14]**
(one card left in the list, the other open in the form under `editing Kaftan`).

**Field order is tap order, not chip order.** `fields` is appended to as chips
are selected, so tapping chest → neck → armhole stores `[chest, neck, armhole]`
and the measurement grid renders in that order for every future order. The chip
grid's own layout (§3.3) is fixed and unrelated. Do not sort `fields`.

### 3.3 Suggested fields

Fourteen suggestions, in this fixed display order:

```
neck · shoulder · chest · bust · back · waist · hip
thigh · knee · ankle · wrist · sleeve · sleeve length · length
```

These are **not** the union of the five seeded templates, and the difference is
the point. That union carries `gown length`, `trouser length`, `blouse length`,
`skirt length` and `top length` — garment-bound names that are noise, and
faintly insulting, when the tailor is defining a kaftan. Every suggestion here
means the same thing on any garment.

The list is a starting point for a Lagos-first product. Treat it as content, not
architecture: it should be localisable, and a native build that learns the
tailor's real vocabulary should reorder it.

Chips **toggle in place** — unselected shows `+`, selected shows `✓` — rather
than moving into a separate "added" list. A chip must never change position
under the thumb that just tapped it. **[06]** all off, **[08]** five on.

**Typed fields are lowercased and trimmed**, then appended to the same chip row
after the fourteen, in insertion order **[09] → [10]**. A custom field is
therefore removable by exactly the gesture that removes a suggested one, which
is the whole reason it joins the row instead of getting its own list. Adding a
name that is already selected is a no-op, not an error and not a duplicate.

Field names are lowercase everywhere in this app. Garment **names** are not —
`Ankara gown` keeps its capital, matching the seeded `Women's Gown`.

### 3.4 The five starters are never touched

Whatever she builds is **prepended**; the shipped templates stay, in order,
beneath hers. Onboarding has no delete. **[18]** is the settings list after
building one `Kaftan`; **[19]** is the same list after skipping — five starters,
unchanged, in the same order.

This is not politeness. Seeded customers and orders hold `templateId`s pointing
at those five, and a customer's saved measurement set is keyed by template
(ADR 0003 §3). Removing a starter at signup orphans demo data that the tailor is
about to be shown. Deletion already exists in the template editor, where the
consequences are visible and confirmable.

Prepending, not appending, is the ordering rule: what she defined is the work
she actually does, so it outranks our guess in every template picker afterwards.
Note that this is the **opposite** of the ordering used when a template is
created from settings, which appends. Both are correct for their context; a
native port should keep them distinct rather than unify them.

### 3.5 Skip is offered only when there is something to skip

Step 3's `skip for now` renders **only while the screen is untouched** — no
saved cards, no garment name, no selected fields. The moment anything is
entered it disappears for the rest of the session. Present under `start` in
**[06]**, gone in **[13]** — the same screen scrolled to its foot with two
garments saved.

A skip link sitting under two saved garments is lying about what it does: it
would either discard them, which is destructive and unlabelled, or keep them,
in which case it is not a skip. Removing the control removes the question.

Skipping is cheap and must stay cheap — the five starters are already there, so
a tailor who skips has a working app.

### 3.6 Completion

On leaving step 3 by either path, in this order:

1. Commit the drafts, if any, prepended as a single batch.
2. Set the first-run flag.
3. Fire `opened` **once** (§9), plus one `onboard/template-added` per committed
   template, or a single `onboard/templates-skipped` if none.
4. Go to the orders list **[17]**, **replacing** onboarding in the back stack.
   There is no route back into the welcome flow.

**[18]** and **[19]** are the two outcomes seen from settings afterwards: the
`Kaftan` she built sitting above the five starters, and — from a second clean
run through the skip path — the five starters alone.

`opened` is the pre-existing funnel event and fires here whether or not
templates were created. Do not fire it per template and do not fire it on step
1 — it marks a finished onboarding, and its history has to stay comparable.

### 3.7 The first-run gate

The app's root decides: flag set → orders list; flag unset → onboarding. It is a
single boolean and it is written only at §3.6 step 2 — never on step 1 or 2, so
a tailor who force-quits midway is offered onboarding again rather than being
dropped into an unconfigured app.

The flag is **deliberately separate from the persisted store** (§9). Resetting
demo data does not clear it, and clearing it does not touch her templates.

---

## 4. Screens

Frames cited as **[N]** are in
[`docs/screenshots/onboarding-feat/`](../screenshots/onboarding-feat/), captured
at 390×844 @2x off the running web build. They show what the web does; where
this section says the native build should differ, the frame is the *before*.

All three are a single scrolling column, max width ~28rem, centred, with the
primary action at the bottom of the content rather than pinned — the step-3
screen is taller than a phone and a pinned bar would cover the chip grid.

### 4.1 Step 1 — splash · **[01]**

Wordmark in the display face at ~52pt over two lines → one-line value promise →
a card of three features (measurements on file, due dates that nag you, invoices
that show balance), each an icon tile, a bold title and a muted line → `let's go`
→ a footnote that this is a prototype and the data stays on the phone.

**No step counter and no back affordance.** This screen is a pitch, not a form,
and numbering it invites the reader to count how much work is coming.

### 4.2 Step 2 — make it yours · **[03] [04] [05]**

Back button and `2 / 3` on one row → heading `make it yours` → a line explaining
that both fields land on every invoice and are changeable later → business name
(autofocused) → currency picker → **live invoice preview** → `next` →
`skip for now`.

The preview is the payoff and the reason this step is second rather than last:
it shows the shop name and a `₦25,000` balance in the real invoice styling as
the tailor types **[04]**. It is why she is willing to do step 3 at all. With
the field empty the preview falls back to `your shop name` rather than rendering
a blank header **[03]** — a native port must keep that fallback, because the
preview is on screen before anything has been typed into it.

The currency cells are equal-width so the three-character `GH₵` does not stretch
its pill out of step with the single-character ones **[05]**.

> **[02] is a prototype artifact, not a spec.** The web build seeds demo data,
> including `businessName`, so step 2 opens prefilled. A native build shipping
> without seed data opens on **[03]**. Do not port the prefill.

### 4.3 Step 3 — what do you measure? · **[06]–[15]**

Back button and `3 / 3` → heading `what do you measure?` → an explanation that
names a garment and its sizes and states the payoff ("every order for that
garment will ask for exactly these") → **saved cards** → **the form** → the save
button → `start` → `skip for now`, conditionally (§3.5).

**Saved card.** A ruler tile, the garment name in bold, and its fields joined by
`·` on one muted line, truncated **[12]**. The card body is one tap target that
opens it in the form; a separate `✕` at the trailing edge removes it. Two
targets, not a tap-and-hold, because destructive gestures should be visible.
Removal is immediate and unconfirmed **[15]** — correct here, because nothing
has been persisted yet, and deliberately *unlike* the confirm dialogs everywhere
else in the app.

**The form.** A field label that reads `garment` normally **[07]** and
`editing {garment name}` while bound to a card **[14]** — this label is the only
thing telling the tailor which mode she is in, and it must change. Then the name box
(placeholder `e.g. Kaftan`), then the chip grid, then a text box
(`or type your own…`) with an `add` button, disabled while empty and also
committed by the keyboard's return key.

**The save button** is secondary styling, disabled unless the form is ready
(§3.2) — **[07]** is the disabled state, a garment named with no fields yet —
and reads `save & add another` **[08]** or `save changes` **[14]** depending on
mode.

**The primary button** reads `start` **[06]**, gaining ` · 1 template` /
` · 2 templates` **[13]** when there is anything to commit. The count includes an
unsaved-but-ready form — **[09]** and **[10]** read `start · 1 template` with
nothing saved and only the open form — so it always matches what tapping it will
actually do.

---

## 5. Navigation

```
first launch
 └─► Step 1 splash
       └─ let's go ──► Step 2 shop details
                         ├─ next ─────────┐
                         ├─ skip for now ─┤
                         │                └──► Step 3 templates
                         └─ back ──► Step 1        ├─ start ────────┐
                                                   ├─ skip for now ─┤
                                                   │                └──► Orders
                                                   └─ back ──► Step 2
                                                        (drafts survive,
                                                         nothing written)

subsequent launches ──────────────────────────────────────────────► Orders
```

Onboarding is **replaced**, never pushed, on the way to orders. Back from the
orders list must not return to step 3.

Going back within onboarding preserves everything typed on every step. On web
this is free because all three steps are one component; on native, hoist the
state above the navigation so a popped screen does not take its drafts with it.

---

## 6. Design tokens

Identical to [ADR 0002 §6](0002-orders-feature.md#6-design-tokens) — same
palette, radii, display face, motion and lowercase headings. No new tokens.

The chip uses the existing selection recipe, the same one the currency picker
uses: selected is a solid ink fill with white text, unselected is a card fill
with a soft shadow and 60% ink text. Nothing in onboarding earns a solid accent
colour — there is no urgency here and no state worth shouting about.

The step counter is 11pt, bold, wide-tracked, ink at 30%. It is orientation, not
information, and should never compete with the heading.

---

## 7. Web pattern → native

| Web | SwiftUI | Compose |
|---|---|---|
| three-step state machine in one component | `NavigationStack` + shared `@Observable` model | `NavHost` + shared `ViewModel` |
| wrapping chip row | `WrappingHStack` / `Layout` | `FlowRow` |
| chip toggle | `Toggle(…).toggleStyle` on a capsule | `FilterChip` |
| text field + `add` button | `TextField` + `.onSubmit` | `OutlinedTextField` + `ImeAction.Done` |
| saved card with separate `✕` | `HStack` row, trailing `Button` | `Row` + trailing `IconButton` |
| autofocus on step 2 | `@FocusState` | `FocusRequester` |
| `crypto.randomUUID()` | `UUID()` | `UUID.randomUUID()` |
| `localStorage` first-run flag | `@AppStorage` | `DataStore` / `SharedPreferences` |
| store + persistence | SwiftData `@Model` | Room `@Entity` + DAO |

---

## 8. Build these natively — the web could not

1. **Keyboard that stays up.** The chip grid and the custom-field box are used
   in alternation, and the web dismisses and re-raises the keyboard on every
   switch. Native can keep it up with a next-field return key, which is most of
   the friction in this screen.
2. **Speech input for field names.** A tailor saying "armhole" beats typing it,
   and this is a screen with exactly one free-text box.
3. **Drag to reorder fields.** Field order is tap order (§3.2) and there is
   currently no way to fix a mistake except removing and re-adding. `onMove` /
   `ReorderableItem` solves it; the settings editor's up/down buttons are a web
   workaround, not a design.
4. **Haptics** on chip toggle and on a saved card.
5. **Dynamic Type / font scaling.** Fourteen chips at an accessibility text size
   is the case a fixed grid fails, and this is a first-run screen — failing here
   loses the tailor entirely.
6. **Templates that survive the device.** iCloud / Drive backup, so a tailor who
   changes phone does not do this again.
7. **Share a template.** A tailor's field list is worth sending to another
   tailor. `ShareLink` / `ACTION_SEND` over a small encoded payload, or an
   import from a photo of a written list.
8. **Resume onboarding.** Native can persist the drafts across a force-quit
   without persisting them as templates — a proper draft store, which the web's
   all-or-nothing screen state cannot express.

---

## 9. Do not port

| Thing | Why it exists on web | Native equivalent |
|---|---|---|
| `bt_seen_welcome` as a bare `localStorage` string outside the store | It must survive "reset demo data", which replaces the entire persisted blob | `@AppStorage` / `DataStore` — but keep it outside the database for the same reason |
| `HashRouter`, `#/` as the onboarding route | GitHub Pages has no server rewrites | Normal navigation; onboarding is not addressable |
| `localStorage` + zustand persist | No backend | SwiftData / Room |
| Repair in zustand's `merge` (not `migrate`) | A PWA can ship a schema change to a browser holding old data, and `migrate` only fires on a version *change* | Real schema migrations |
| GoatCounter `onboard/*` and `opened` events | Prototype marketing | A real analytics SDK, or drop |
| A separate prepending `addTemplates` alongside the appending `addTemplate` | Two call sites wanted two orderings and the store had no batch write | One repository method taking an insertion position |
| Max-width column centred in a desktop viewport | The prototype is opened on laptops during demos | Full width; there is no desktop |

**The one thing worth keeping** is that step 3 commits nothing until it is left
forwards (§3.1). It is the only reason back and skip are safe, and it is the
first thing a native port will break by binding the form to a persisted model.

---

## 10. Acceptance checklist

Behaviour, not pixels. A port is done when all of these hold.

- [ ] A first launch shows onboarding; every launch after it goes straight to orders
- [ ] Force-quitting on step 2 shows onboarding again on the next launch
- [ ] `skip for now` on step 2 still saves the chosen currency
- [ ] Naming the shop on step 2 sets both the business name and the account name
- [ ] Step 3 reached with nothing typed shows `skip for now`; typing one character hides it
- [ ] `start` with an unsaved but complete form still creates that template
- [ ] `start · 2 templates` is shown when one card is saved and the open form is complete
- [ ] Half-typing a garment, then tapping a saved card, saves the half-typed one and opens the tapped one
- [ ] A card being edited appears in the form and **not** in the card list
- [ ] Clearing the name of a card being edited, then leaving the form, deletes it
- [ ] Tapping chest, then neck, then a typed `armhole` stores `[chest, neck, armhole]` in that order, and a new order renders them in that order
- [ ] A typed `Armhole ` is stored as `armhole`
- [ ] Typing a field name that is already selected neither duplicates it nor errors
- [ ] A typed field can be removed by tapping its chip, exactly like a suggested one
- [ ] Templates created at signup sort **above** the five shipped ones everywhere
- [ ] All five shipped templates still exist after onboarding, on both paths
- [ ] Seeded orders and customers still resolve their templates after onboarding
- [ ] Going back to step 2 from step 3 and forward again preserves every draft
- [ ] Going back to step 2 from step 3 has written no template to the store
- [ ] Back from the orders list does not return to onboarding
- [ ] `opened` fires exactly once per completed onboarding, on both paths
- [ ] The whole flow works offline

---

## 11. Seed data

None. Onboarding ships no fixtures of its own — the five starter templates are
part of the general seed ([ADR 0003](0003-customers-feature.md)) and this
feature's only relationship with them is that it must not disturb them.

For manual testing, clearing the first-run flag and the persisted store returns
the app to a true first launch. A native build should expose the same reset in a
debug menu; it is otherwise a reinstall, and this screen needs re-running far
more often than it needs shipping.

---

## 12. Open questions for the native build

- **Duplicate garment names are allowed.** Nothing stops a tailor creating two
  templates called `Kaftan`, at signup or in settings, and the template pickers
  show both with no way to tell them apart. Decide whether to block it, warn, or
  disambiguate in the picker.
- **No way back in.** A tailor who skips step 3 never sees it again; her route
  is settings → measurement templates → `+ new`, which is a different and worse
  screen. A "finish setting up" prompt on the orders list, dismissible, is the
  obvious fix and was cut from this pass.
- **The builder exists twice.** Settings' `+ new` still creates a stub named
  "New template" with a single `length` field and drops the tailor into the
  field editor. That predates this feature and was deliberately left alone.
  Native should ship one builder used by both entry points.
- **Fourteen suggestions is a Lagos guess.** No research backs the list. It
  should be measured, localised, and probably shortened.
- **Gender-aware suggestions.** Customers already carry an optional gender that
  floats likely templates (ADR 0003 §2.3), and the same idea would apply to
  suggested fields — but onboarding has no customer yet and asking a tailor what
  gender she sews for is a worse question than it looks.
- **Where onboarding lands with multi-staff.** If ADR 0001 ships, templates are
  shop-wide but onboarding is per-device. The second phone to join a shop should
  almost certainly not be asked this at all.
