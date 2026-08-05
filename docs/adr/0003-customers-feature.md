# ADR 0003 — Customers: behaviour spec for a native iOS and Android port

- **Status:** Shipped on web (`feat/consultation-booking`). Not yet built natively.
- **Date:** 2026-08-05
- **Screens:** [docs/screenshots/customers-feat](../screenshots/customers-feat/README.md)
- **Audience:** whoever (or whatever) builds this in SwiftUI and Jetpack Compose.
  Everything below is behaviour and rules, not React. Where the web made a
  choice for web reasons, that is called out so it is not copied.
- **Reference implementation:** `src/pages/Customers.tsx`, `src/pages/CustomerDetail.tsx`,
  `src/pages/CustomerForm.tsx`, `src/components/pickers.tsx` (`CustomerPickerSheet`),
  `src/components/measure.tsx` (`MeasurementGrid`).

> **Note on ADR numbering.** [ADR 0002](0002-orders-feature.md) specifies Orders
> and is the natural companion to this one — Customers exists to feed it.
> ADR 0001 (multi-staff access control) lives on the `feat/multi-staff-access`
> branch; nothing here depends on it, but it is where customer-contact masking
> would be specified once both branches reach `main`.

---

## 1. Context

better tailor is for a one-person tailoring business in Lagos working from a
phone. Before the app, that tailor keeps measurements in a paper notebook and a
customer's phone number in WhatsApp. The single most expensive recurring
mistake is **re-measuring, or cutting to the wrong numbers** because the
notebook page was for a different garment.

So a customer record is not a CRM contact. It is a **named container for
measurement sets**, plus enough contact detail to reach the person on the
channel they actually use (WhatsApp, then a phone call).

## 2. Decision

Model a customer as `{ identity, contact, gender hint, [measurement sets] }`,
where each set is keyed by a **template** (Women's Gown, Men's Trouser, …) and
holds a free-form `field → value` map.

Five decisions distinguish this from a generic contacts screen. Each is
load-bearing; a port that drops one produces a different product.

### 2.1 Measurements are copied into orders, never referenced

When an order is created, the customer's saved set for that template is
**deep-copied** onto the order. Editing measurements on an order never writes
back. A customer's body changes; an order that was already cut must keep the
numbers it was cut to.

This is the single most important rule in the feature. It means a customer's
`sets` are a *starting point*, not a source of truth for historical work.

### 2.2 The field list is open, not a fixed schema

Templates supply the expected fields, but any set can gain an extra one
(`+ add field`), and any value may be a non-numeric string. Tailors take
measurements the schema designer never anticipated, and a field they cannot
record is a field they go back to paper for.

Store values as `number | string`. Coerce to number when the trimmed input
parses as a finite number, otherwise keep the raw string.

### 2.3 Gender sorts; it never filters

`gender` is optional and its only effect is to float the likely templates to the
top of the "add measurement set" sheet. A female customer can still be given the
Men's Trouser template. Never gate a template behind gender.

### 2.4 Contact actions live on the row

Call and WhatsApp are on the list card itself, not behind a tap into the detail.
The most frequent thing a tailor does with a customer record is message them.

### 2.5 Deleting a customer deletes their orders

An order without a customer has no name, no phone, and no measurement lineage.
Rather than support orphans, the delete cascades — and the confirm dialog says
so before the tap commits. Invoices and consultations are **not** cascaded;
they carry their own snapshot of the customer's name.

## 3. Domain model

Ported verbatim from `src/types.ts`. Field names are the contract — the web app,
iOS, and Android must agree on them if data is ever synced.

```
Template
  id: String                    // 't-gown', 't-agbada', …
  name: String                  // "Women's Gown"
  fields: [String]              // ordered; ["bust","waist","hip",…]

MeasurementSet
  templateId: String
  values: Map<String, Number|String>

Customer
  id: String                    // UUID
  name: String                  // required, non-empty after trim
  phone: String                 // may be ""
  area: String                  // may be ""
  gender: "male" | "female" | null
  sets: [MeasurementSet]
  createdAt: String             // ISO-8601 instant
```

### Platform typing

`Number|String` is the one shape that does not survive a naive port. Model it
explicitly rather than reaching for `Any`.

**Swift**

```swift
enum MeasurementValue: Codable, Equatable {
    case number(Double)
    case text(String)

    init(input: String) {
        let t = input.trimmingCharacters(in: .whitespaces)
        if !t.isEmpty, let d = Double(t), d.isFinite { self = .number(d) }
        else { self = .text(input) }
    }
    var isBlank: Bool {
        if case .text(let s) = self { return s.trimmingCharacters(in: .whitespaces).isEmpty }
        return false
    }
}
```

**Kotlin**

```kotlin
sealed interface MeasurementValue {
    data class Num(val value: Double) : MeasurementValue
    data class Text(val value: String) : MeasurementValue

    companion object {
        fun from(input: String): MeasurementValue {
            val t = input.trim()
            val d = t.toDoubleOrNull()
            return if (t.isNotEmpty() && d != null && d.isFinite()) Num(d) else Text(input)
        }
    }
}
```

Encode both as a JSON scalar (number or string), not as a tagged object — the
web store writes a bare scalar and cross-platform JSON must match.

### Ordering and identity

- `customers` is held **newest-first**. A new customer is prepended, not appended
  and re-sorted. Do not silently switch to alphabetical: the tailor's mental
  model is "the person I just added is at the top."
- `id` is a UUID generated on the client.
- A customer holds **at most one set per `templateId`**. Enforce it at the
  attach point (the add-set sheet only offers templates not already present).

## 4. Screens

Six surfaces. Route names below are the web routes; the native equivalents are
in §5.

| # | Surface | Web route | Frames |
|---|---|---|---|
| 1 | Customer list | `/customers` | 01, 02, 17 |
| 2 | Create / edit form | `/customer/new`, `/customers/:id/edit` | 04, 05, 15 |
| 3 | Customer detail | `/customers/:id` | 06, 09, 11, 12, 16 |
| 4 | Add measurement set sheet | modal on detail | 07 |
| 5 | Measurement grid | inline on detail | 08, 09, 10 |
| 6 | Customer picker sheet | modal on order form | 18, 19 |

### 4.1 Customer list

- Search field, then a scrolling column of cards, then a floating `+`.
- **Search matches `name` only**, case-insensitive `contains`. Not phone, not
  area. A tailor searches for a person, not a number.
- Card contents: avatar (initials), name, `phone · area` (the `· area` half is
  omitted when `area` is empty), and `N order(s)` counted by
  `orders.count { it.customerId == customer.id }`.
- **Trailing actions appear only when `phone` is non-empty**: a call button
  (`tel:`) and a WhatsApp button (`https://wa.me/<digits>`). No phone → no
  buttons at all, rather than disabled ones.
- Tapping the card body (not the buttons) opens the detail.
- Empty state (no customers at all, and also when a search matches nothing):
  🧵 / "no customers yet" / "tap + to add one".

### 4.2 Create / edit form

Four fields, in this order, with these exact placeholders:

| Field | Placeholder | Keyboard | Required |
|---|---|---|---|
| full name | `e.g. Adaeze Okafor` | default | **yes** |
| phone (with country code) | `+234 803 123 4567` | phone pad | no |
| area / city | `e.g. Surulere, Lagos` | default | no |
| gender (optional) | two chips: `female`, `male` | — | no |

- Under the phone field, the hint *"the country code makes WhatsApp sharing
  work."* This is not decoration — `wa.me` fails silently without a country
  code, and this line is the only place the app explains it.
- Gender chips are a **toggle**: tapping the selected chip clears the value back
  to null.
- Submitting with a blank name shows a toast `name is required` and does not
  save.
- All string fields are trimmed on save.
- **Create** navigates to the new customer's detail screen, *replacing* the form
  in the back stack (backing out must not land on a form for an already-created
  customer). **Edit** pops back to wherever it came from.
- Create-mode only, below the button: *"you'll add their measurements on the
  next screen."* This is what makes the two-step feel intentional rather than
  incomplete.
- Creating a customer fires the analytics event `engaged` (see §8).

### 4.3 Customer detail

Top to bottom:

1. **Identity card** — large avatar, name, `phone` or the literal `no phone`,
   `area` if present.
2. **Call / WhatsApp** — a two-column pair, rendered **only when `phone` is
   non-empty**.
3. **Book a fitting call** — navigates to the consultation share flow with this
   customer pre-attached. See ADR for consultations.
4. **`measurements` header + `+ add set`.**
5. **Set cards**, one per `MeasurementSet`:
   - Collapsed: template name, and `{filled}/{total} measurements filled`.
     **Both numbers are computed over the fields the grid renders** — the
     template's plus any custom ones on this set (§4.5). `total` is that list's
     length; `filled` is how many of them hold a value that is neither absent
     nor empty-string. Counting the numerator over `template.fields` while
     sizing the denominator differently is how this drifted once already.
   - **One set open at a time.** Opening a second collapses the first.
   - Expanded: the measurement grid (§4.5) plus a `remove this set` destructive
     link. Removing a set is **not** confirmed — it is cheap to re-add and the
     numbers are re-enterable.
   - A set whose `templateId` no longer resolves falls back to the name
     `Custom set` and derives its fields from `values.keys`.
6. **Empty measurements state** — "no measurements saved yet — add a set so
   orders can auto-fill." State the payoff, not the absence.
7. **`their orders` header** with a count, then that customer's order cards, or
   "no orders yet."
8. **`new order for {firstName}`** — primary button; opens the order form with
   this customer preselected. `firstName` is `name.split(" ").first`.
9. **`delete customer`** — destructive text button → confirm dialog (§4.6).
10. Toolbar: back, the customer's name lowercased as the title, and an edit
    pencil.

### 4.4 Add measurement set sheet

- Lists templates the customer does **not** already have a set for.
- Sorted by a gender rank, stable within rank:
  - `female` → `t-gown`, `t-blouse`, `t-skirt` rank 0; everything else rank 1.
  - `male` → `t-agbada`, `t-trouser` rank 0; everything else rank 1.
  - `null` → everything rank 0 (i.e. the template list's own order).
- Row shows template name and `{n} fields`.
- Choosing one attaches an **empty** set (`values` = `{}`), closes the sheet,
  and **opens that set expanded** so the tailor lands in the grid with the
  keyboard one tap away.
- When nothing is left: "all templates already added."

### 4.5 Measurement grid

- Three-column grid of chips. Each chip: field label on top (lowercase, small),
  value input below (bold, larger).
- Field order: `template.fields` in order, then any extra keys in `values` that
  the template does not name, in insertion order.
- Empty value renders placeholder `—`. Read-only renders `{value}"` (inches) or
  `—`.
- Decimal keypad. `15.5` must be typeable.
- Final tile is a dashed `+ add field` button. Tapping it swaps the tile for a
  text input (`field name`, autofocused) with a check button. **Commit on
  Enter, on the check, and on blur.** The name is lowercased and trimmed;
  duplicates of an existing field are silently ignored.
- Every keystroke persists. There is no save button on the detail screen — the
  tailor is measuring a person while holding the phone, and a lost edit is a
  re-measure.

> **Count over the rendered field list, not the template's.** This was a live
> bug in the web MVP: `filled` was computed over `template.fields` while the
> denominator was `max(template.fields.count, set.values.count)`, so a custom
> field raised the denominator but could never raise the numerator — a Women's
> Gown set with all 7 template fields *and* a custom `sleeve cuff` filled sat at
> `7/8` forever.
>
> Fixed on web by extracting the union the grid already computes
> (`renderedFields()` in `src/components/measure.tsx`) and counting over it in
> both places. Ports should do the same: whatever list the grid draws is the
> list the counter counts. One function, two call sites, no drift.



### 4.6 Destructive confirm

Title `delete this customer?`, body `{name} and their orders will be removed.`,
confirm label `yes, delete`, plus cancel. On confirm: delete the customer,
delete every order with that `customerId`, and navigate back to the list
**replacing** the detail in the back stack.

### 4.7 Customer picker (used by the order form)

A bottom sheet titled `choose customer`:

- Search field, same name-only matching.
- Rows: avatar, name, `phone` or `no phone`.
- No match: `no customers match "{query}"`.
- A dashed `+ new customer` button expands into a **two-field quick-add**: full
  name (autofocus) and `+234 phone (for WhatsApp)`. The add button is disabled
  until the name is non-empty. Committing creates the customer (`area: ""`,
  `gender: null`, `sets: []`), **and immediately selects them**, closing the
  sheet.
- Quick-add deliberately omits area and gender. A walk-in must not cost the
  tailor the order they were writing.

## 5. Native mapping

| Concern | Web (reference) | iOS — SwiftUI | Android — Compose |
|---|---|---|---|
| List | scrolling `div` | `List` / `LazyVStack` in `ScrollView`, `.searchable` | `LazyColumn` + `SearchBar` (M3) |
| Detail | route | `NavigationStack` destination | `NavHost` composable destination |
| Form | route | destination; `@FocusState` for field order | destination; `FocusRequester` |
| Bottom sheets (add set, picker) | fixed overlay | `.sheet` with `.presentationDetents([.medium, .large])` | `ModalBottomSheet` |
| Destructive confirm | overlay | `.confirmationDialog`, role `.destructive` | `AlertDialog` |
| Toast (`name is required`) | in-app toast | custom overlay — iOS has no system toast | `Snackbar` via `SnackbarHostState` |
| Measurement chip grid | CSS grid, 3 cols | `LazyVGrid(columns: 3 × .flexible())` | `LazyVerticalGrid(GridCells.Fixed(3))` |
| Avatar initials | derived div | `Text(initials)` in a `Circle()` | `Text` in a `Box` + `CircleShape` |
| Call | `tel:` link | `UIApplication.open(URL("tel://…"))` | `Intent(ACTION_DIAL, "tel:…")` |
| WhatsApp | `wa.me/<digits>` | `UIApplication.open(URL("https://wa.me/<digits>"))` | `Intent(ACTION_VIEW, "https://wa.me/<digits>")` |
| Persistence | `localStorage` JSON blob | see §6 | see §6 |
| ID generation | `crypto.randomUUID()` | `UUID().uuidString` | `UUID.randomUUID().toString()` |

### Navigation contract

Both platforms need the same three deep entry points, because other features
navigate straight into this one:

| Intent | iOS / Android route | Behaviour |
|---|---|---|
| `customers` | list | tab root |
| `customers/{id}` | detail | back goes to the list |
| `customers/{id}/edit` | form in edit mode | back pops to the detail |
| `customer/new` | form in create mode | on save, **replace** with `customers/{newId}` |
| `order/new?customer={id}` | order form | customer preselected, picker skipped |

### Platform-specific behaviour worth getting right

- **iOS.** The list should support swipe actions for delete; keep the in-screen
  `delete customer` button too, since it is the one the confirm copy is written
  for. Use `.keyboardType(.decimalPad)` for measurement inputs and
  `.keyboardType(.phonePad)` for the phone field.
- **Android.** Back-press from the create form after a successful save must not
  return to the form — use `popUpTo` with `inclusive = true`. Predictive back
  on the detail screen should reveal the list, not the form.
- **Both.** Measurement inputs commit on every keystroke; make sure that does
  not fight IME composition. Debounce the *write to disk*, never the write to
  in-memory state.

## 6. Persistence

The web MVP persists one JSON blob under `bt_data_v1` in `localStorage`,
containing `templates`, `customers`, `orders`, `invoices`, `consultations`,
`settings`, `bannerDismissed`. That is a demo-grade choice and should **not** be
ported literally.

Native targets should use a real local store:

- **iOS** — SwiftData (or Core Data) with `Customer` ↔ `MeasurementSet` as a
  one-to-many relation, cascade delete on the customer. `values` maps to a
  `Codable` dictionary stored as a transformable/JSON attribute.
- **Android** — Room with `CustomerEntity` and `MeasurementSetEntity`, foreign
  key on `customerId` with `onDelete = CASCADE`, and a `TypeConverter` for
  `Map<String, MeasurementValue>` via JSON.

Two requirements survive the change of storage:

1. **Order measurements stay denormalised.** Do not "fix" the duplication by
   pointing an order at a `MeasurementSet` row. See §2.1.
2. **Rehydration must be defensive.** The web store repairs missing fields on
   every load rather than only on version change, because a half-written blob
   otherwise white-screens the app with no recovery path on a phone. Native
   ports should default missing columns rather than throwing on decode.

## 7. Acceptance criteria

A port is done when all of these pass on device.

**List**
- [ ] Newest-added customer appears first.
- [ ] Search `"fun"` matches `Funke Akindele`; searching a phone number matches nothing.
- [ ] A customer with `phone == ""` shows neither the call nor the WhatsApp button.
- [ ] Order count on the card matches the count on the detail's `their orders`.
- [ ] Empty state shows when the store is empty **and** when a search matches nothing.

**Create / edit**
- [ ] Saving with a blank name shows `name is required` and does not create a record.
- [ ] Name/phone/area are trimmed on save.
- [ ] Tapping the already-selected gender chip clears gender to null.
- [ ] After create, system back does not return to the form.
- [ ] Edit prefills all four fields and does not touch `sets` or `createdAt`.

**Measurements**
- [ ] Attaching a set opens it expanded with `0/N measurements filled`.
- [ ] A template already attached does not appear in the add sheet.
- [ ] For a `female` customer, Gown / Blouse / Skirt sort above the men's templates; for `male`, Agbada / Trouser do; for null, template order is unchanged.
- [ ] `15.5` is enterable and round-trips as a number.
- [ ] A non-numeric value (e.g. `see note`) round-trips as a string.
- [ ] `+ add field` commits on Enter, on the check, and on blur; a duplicate name is ignored.
- [ ] A Women's Gown set with all 7 template fields **and** a filled custom field reports `8/8`; with the custom field added but still blank it reports `7/8`.
- [ ] Opening a second set collapses the first.
- [ ] Killing the app mid-edit and reopening preserves the last keystroke.

**Integration**
- [ ] `new order for {first name}` opens the order form with the customer already chosen.
- [ ] Picking a customer *and* a template in the order form copies that saved set in and labels it `✓ auto-filled from {first name}'s set`.
- [ ] Editing a measurement **on the order** leaves the customer's saved set unchanged.
- [ ] Editing the customer's saved set afterwards leaves existing orders unchanged.
- [ ] Quick-add in the picker creates the customer and selects them in one step.

**Delete**
- [ ] The confirm names the customer and warns about orders.
- [ ] Confirming removes the customer and every order with that `customerId`.
- [ ] Invoices and consultations referencing that customer survive.
- [ ] After delete, back does not return to the deleted customer's detail.

## 8. Analytics

The web build fires one event from this feature: `engaged`, on customer
creation — from both the full form and the picker's quick-add. Native ports
should keep the same event name so the funnel stays comparable across clients.
Nothing else in this feature is instrumented.

## 9. Out of scope

Deliberately absent, and a port should not add them:

- Customer photos or avatars beyond derived initials.
- Importing from the device address book.
- Any server, account, or sync. The MVP is single-device and offline-only.
- Notes, tags, or a customer-level free-text field.
- Measurement history or revisions — a set holds current numbers only; history
  lives in the orders that snapshotted them.
- Units. Everything is inches, stated once in the order form's
  `measurements (inches)` label and nowhere else.

## 10. Consequences

**Good.** The record earns its keep the second time a customer orders anything —
the tailor picks a name and a template and the numbers arrive. The two-step
create makes the measurement step feel like the point rather than an optional
extra field.

**Bad.** Snapshotting means a corrected measurement does not propagate to
in-flight orders; a tailor who fixes a typo on the customer must also fix it on
any order already written. This is the right trade for cut garments and the
wrong one for typos, and there is no UI today that distinguishes the two.

**Also.** One set per template means a customer who wants two gowns to different
fits has to use `+ add field` or a second template. Accepted for the MVP; revisit
if it shows up in feedback.
