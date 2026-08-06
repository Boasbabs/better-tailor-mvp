# ADR 0004 — Invoices: behaviour spec for a native iOS and Android port

- **Status:** Shipped on web (`feat/consultation-booking`). Not yet built natively.
- **Date:** 2026-08-05
- **Screens:** [docs/screenshots/invoices-feat](../screenshots/invoices-feat/README.md)
- **Audience:** whoever (or whatever) builds this in SwiftUI and Jetpack Compose.
  Everything below is behaviour and rules, not React. Where the web made a
  choice for web reasons, that is called out so it is not copied.
- **Reference implementation:** `src/pages/Invoices.tsx`, `src/pages/InvoiceNew.tsx`,
  `src/pages/InvoiceDetail.tsx`, `src/lib.ts` (`invoiceMath`, `deriveInvoiceStatus`,
  `nextInvoiceNumber`, `whatsappInvoiceText`), `src/components/pickers.tsx`
  (`CustomerPickerSheet`).

> **Note on ADR numbering.** [ADR 0002](0002-orders-feature.md) specifies Orders
> and [ADR 0003](0003-customers-feature.md) specifies Customers. Invoices sits
> downstream of both — an invoice bills a customer's orders — so read 0002 first
> if you are building the whole app. ADR 0001 (multi-staff access control) lives
> on the `feat/multi-staff-access` branch; nothing here depends on it, but it is
> where invoice-total masking for non-owner staff would be specified once both
> branches reach `main`.

This is a build spec, not a summary. Every rule here is enforced by the shipped
web app, and the screen gallery is the visual half of it — read them together.

---

## Context

The user is a tailor in Lagos with an Android phone, intermittent data, and a
business that runs on WhatsApp. They already record orders — garment, price,
deposit, due date. The thing they *cannot* do is produce something that looks
like a bill without either handwriting it or paying for accounting software
built for a shop with a POS terminal.

So invoicing here is not double-entry bookkeeping. It is: *turn work already
recorded into an image I can send down a chat thread, and tell me who still owes
me.* Everything below follows from that.

## Decision

Build invoices as a **local-first, offline-complete** feature with three screens
(list, composer, detail) whose only external dependency is the OS share sheet.
No accounts, no server, no sync, no payment processing. The invoice's canonical
output is **a picture and a block of text**, not a PDF and not a hosted link.

### Why not a PDF

A PDF is an attachment. Attachments in WhatsApp get a grey file chip that has to
be tapped, downloaded, and opened in another app — three chances to be ignored.
An image renders inline in the chat, so the customer sees the balance without
doing anything. Ship the image. If a customer asks for a PDF, that is a
different feature and it is not this one.

### Why not a hosted invoice link

It would require a backend, an account, and a working data connection at the
moment of sending. All three are things this user does not reliably have.

---

## Domain model

Port these shapes exactly. Field names are load-bearing — they appear in
persisted data and in the WhatsApp text format.

```
Invoice
  id           String        stable unique id
  number       String        display number, "BT-0001" (see numbering)
  customerId   String        FK → Customer
  lines        [InvoiceLine] ordered; order-derived lines first, manual after
  discount     Discount?     null means none
  depositPaid  Int           minor-unit-free integer, see money
  status       InvoiceStatus derived, never user-set — see status
  createdAt    Instant

InvoiceLine
  label        String        e.g. "Agbada (navy)"
  amount       Int
  orderId      String?       present iff the line came from an order

Discount
  kind         flat | percent
  value        Int           currency amount, or whole percent

InvoiceStatus = unpaid | part-paid | paid
```

An invoice is a **snapshot**. Lines copy the order's garment name and price at
generation time. Editing or deleting the underlying order afterwards must not
change an issued invoice — the customer already has a picture of it. `orderId`
exists for traceability only; never re-read the order to render an invoice.

There is deliberately **no `updatedAt`, no line editing, and no delete**. An
invoice, once generated, is only ever marked paid. Do not add invoice editing to
the native ports without a separate decision — the whole snapshot guarantee
depends on it.

### Money

Amounts are plain integers in the tailor's chosen currency, with no minor units
and no `Decimal`. ₦45,000 is `45000`. Naira has no practical kobo; the same holds
for the other supported currencies at the values a tailor invoices. Use `Int`
(Kotlin) / `Int` (Swift), not `Double` — never floating point.

Compute in this order, and clamp at both steps:

```
subtotal = Σ lines.amount
discount = when (discount) {
             null      -> 0
             flat      -> discount.value
             percent   -> round(subtotal × discount.value / 100)
           }
total    = max(0, subtotal − discount)
balance  = max(0, total − depositPaid)
```

Both clamps are required behaviour, not defensive noise: a ₦50,000 flat discount
on a ₦40,000 subtotal must show `total = 0`, and a ₦100,000 deposit against a
₦64,800 total must show `balance = 0`. Round exactly once, on the percentage
branch, half-up.

Currency is a **display symbol only**, taken from settings (`₦ € $ £ GH₵`),
prefixed with no space and grouped with thousands separators: `₦72,000`.

### Numbering

`BT-` + a 4-digit zero-padded counter. The next number is derived by scanning
existing invoices, taking the maximum integer after the dash, and adding one —
not by storing a counter. Non-numeric or malformed suffixes contribute `0`.
A first invoice on a clean install is `BT-0001`.

This is intentionally naive and it is correct for a single-device, single-user
app. If the native client ever gains multi-device sync, revisit it — concurrent
generation on two devices will collide.

### Status

Derived from the money on every read. Never store a status the user set by hand.

```
paid       total > 0 && balance ≤ 0     (also: balance ≤ 0 with no lines)
part-paid  depositPaid > 0 && balance > 0
unpaid     otherwise
```

`mark as paid` does **not** set `status = paid`. It sets `depositPaid = total`,
and the status falls out. This keeps one source of truth and makes the detail
screen's "deposit paid −₦64,800" line honest after the action. Reproduce this
exactly; a native port that sets the enum directly will drift.

---

## Screens

Three screens plus one sheet. Frame numbers refer to the gallery.

### 1. List — `invoices` tab (frames 01, 16)

Chronological, newest first. One card per invoice:

- left: **number** (display font, bold), then `{customer name} · {date}` in muted small text
- right: **total** (not balance), and a status pill beneath it

Showing the total rather than the balance is deliberate: the list is a record of
what was billed. The balance is a property of a single invoice and belongs on it.

Empty state: receipt glyph, "no invoices yet", "tap + to create one". No
illustration, no marketing copy.

Tapping a card opens the detail. The floating `+` opens the shared create sheet
(frame 04), whose fourth entry is `new invoice`.

### 2. Composer — `new invoice` (frames 05–09, 12, 14)

A single scrolling form. Sections, in order:

**customer** — a card showing avatar/name/phone, or "choose customer…" when
empty, with a `change` affordance. On a blank invoice the picker sheet **opens
automatically on appear** (frame 05); nothing else on the form is usable without
a customer, so making the user tap once to discover that is wasted friction.
Changing the customer clears ticked orders and manual lines — those selections
belonged to someone else. The deposit clears too, unless the user had already
typed one by hand, in which case their figure survives (see `depositTouched`
below).

**bill their orders** — every order belonging to that customer, ticked or not.
A ticked row inverts to ink-on-white with a filled checkbox (frame 07); an
unticked row is a plain white card. Each row shows garment, `{status}` and
`· {deposit} deposit` when the deposit is above zero, and the order price.
Ticking adds `{label: order.garment, amount: order.price, orderId: order.id}`.

Show *all* orders including `delivered` ones — a delivered garment is exactly
the thing most likely to need billing. Do not filter by whether the order has
already been invoiced; the web MVP allows double-billing and the tailor is
trusted to notice. If the native port adds a "already on BT-000X" hint, that is
an improvement, not a requirement.

When the customer has no orders, replace the block with a flat card reading
"no orders for this customer — add a manual line below." (frame 14).

**extra line items** — repeatable label + amount rows with a delete control, and
a dashed `+ add line` button. A row counts as a line only when the label is
non-blank **and** the amount parses above zero, so half-typed rows never reach
the invoice.

Layout: label field takes the remaining width, amount field is fixed at roughly
112dp/pt, delete control trails both. (The web app first shipped this row with
the label collapsed to ~32px — `inputCls` carries `w-full`, so a `w-28` beside it
never took effect. Fixed by sizing on `flex-basis` instead.)

**discount** — a three-way segmented control `none · {currency} off · % off`,
with a value field appearing beside it when the mode is not `none`. Numeric
keypad. Flat is a currency amount; percent is whole percent.

**deposit already paid** — a numeric field, auto-summed from the ticked orders'
deposits, with the helper "auto-summed from ticked orders — edit if needed."
Once the user types in it, the auto-sum must **stop overwriting it** for the rest
of the session, even as they tick more orders. Track a `depositTouched` flag.

**live summary** — a card recomputing on every keystroke: subtotal, discount (only
when above zero), deposit paid (only when above zero), then `balance due` on its
own row with the amount at display-large size.

**generate invoice** — full-width primary button, disabled while there are zero
lines. On tap: build the invoice, assign the next number, derive status, persist,
then **replace** the composer in the back stack with the detail screen (frames 10).
Back from that detail must land on the list, never on a spent composer.

Two guarded cases surface as a toast rather than an inline error: no customer
("pick a customer first") and no lines ("add at least one line item").

**Prefilled entry** (frames 12, 13). The common path is not the `+` button — it
is `create invoice for this order`, at the bottom of an order detail above the
destructive delete. That route passes the order id and the composer opens with
the customer set, that order ticked, its deposit prefilled, and the picker *not*
shown. The composer must accept an order id (and, separately, a customer id) as
launch arguments.

### 3. Detail (frames 02, 03, 10, 11, 15)

Header: back, the invoice number as title, status pill trailing.

The body's top element is **the shareable card** — one view, isolated, that can
be rendered to an image without any app chrome. Contents in order:

1. business name (display font), tagline beneath if set — both from settings
2. `INVOICE {number}` / `{date}`, small caps, wide tracking, muted
3. `BILLED TO` block on a light grey fill: customer name, then `{phone} · {area}`
4. line items — label left, amount right, one row each
5. a rule, then subtotal / discount / deposit-paid, each shown only when non-zero;
   the discount row appends `(N%)` when the discount is a percentage
6. the headline row: `BALANCE DUE` + balance, or `PAID` + total in green when paid
7. a **pay to** block — dark fill, account number large, `{bank} · {account name}` —
   rendered only when bank details exist in settings **and** the invoice is unpaid.
   Nothing left to collect means nothing to pay to.
8. "thank you! 🙏", centred

Then three actions, in this order:

- **share on WhatsApp** — WhatsApp green, filled
- **download image** — ink, filled, shows a rendering state while busy
- **mark as paid ✓** — light, and only present while unpaid

Marking paid updates in place: pill flips to `paid`, headline turns green, the
`pay to` block disappears, and a toast confirms (frame 11).

---

## Sharing

### The WhatsApp text

Exact format — this is what the customer reads, and the asterisks are WhatsApp's
bold markers:

```
*INVOICE {number} — {businessName}*
Billed to: {customerName}
─────────────
{label} ....... {amount}          ← one per line
Subtotal ....... {subtotal}
Discount ....... -{discount}      ← only when > 0
Deposit paid ....... -{depositPaid}  ← only when > 0
*BALANCE DUE ....... {balance}*   ← or *PAID ....... {total}* when paid
─────────────
Pay to: {bank} {accountNumber} ({accountName})   ← only when set
Thank you! 🙏
```

Addressing: strip every non-digit from the customer's phone and open
`https://wa.me/{digits}?text={urlencoded}`. With no phone on file, omit the
number so WhatsApp asks who to send to.

- **iOS** — `https://wa.me/…` in `openURL`. Do not hand-roll `whatsapp://send`;
  the `wa.me` URL handles the not-installed case by falling back to the browser.
  You do not need `LSApplicationQueriesSchemes` for the https form.
- **Android** — same URL via `Intent.ACTION_VIEW`. Prefer this over a
  `setPackage("com.whatsapp")` intent, which crashes on devices with WhatsApp
  Business but not WhatsApp.

### The image

Render **only the card view** — not the screen — at 2× on a white background,
and hand the result to the system share sheet (and/or save to the gallery).

- **iOS** — `ImageRenderer` over the SwiftUI card with `scale = 3` (or the
  display scale), then `UIActivityViewController`. The card must not depend on
  the safe area or the surrounding scroll view for its layout.
- **Android** — render the composable off-screen and capture it, then share via
  `FileProvider` + `ACTION_SEND` with `image/png`. Writing to the gallery needs
  `MediaStore` on API 29+; do not request `WRITE_EXTERNAL_STORAGE`.

Both platforms: the card renders on an explicit white background regardless of
the app's light/dark state. A dark-mode invoice image is unreadable when the
recipient views it in a light chat.

---

## Persistence

Local-only, survives restart, no network.

- **iOS** — SwiftData (or Core Data) with `Invoice` and an embedded/related
  `InvoiceLine`. Discount is two optional columns (`kind`, `value`) or a small
  codable value.
- **Android** — Room with `Invoice` and `InvoiceLine` tables, or a single table
  with a JSON-serialised lines column. Room + a `TypeConverter` for `Discount` is
  the smaller change.

Persist `status` if it is convenient for querying, but always **recompute on
read**. It is derived data and stored copies will go stale.

The web app persists everything under one key and repairs missing fields on every
load rather than only on version change. Native ports should mirror that
instinct: a migration that only runs on a version bump leaves half-written data
broken forever, on a device the user cannot debug.

---

## Design tokens

| Token | Value | Use |
|---|---|---|
| bg | `#F5F5F3` | screen background |
| card | `#FFFFFF` | cards, inputs, the invoice card |
| card2 | `#EFEFED` | inset blocks (billed-to), unticked checkbox |
| ink | `#111111` | text, primary buttons, ticked rows, pay-to block |
| ok | `#30A46C` | paid amount, paid pill text |
| warn | `#F5A623` | part-paid pill dot |
| danger | `#E5484D` | destructive text only |
| wa | `#25D366` | WhatsApp button — official brand green, do not tint |

Type: **Space Grotesk** for numbers, invoice numbers and headings; **Inter** for
everything else. Numerals are the point of this screen — keep the display face
for money and set balances noticeably larger than their labels.

Shape: 16pt radius on cards, 12pt on inset blocks, fully-rounded pills and
primary buttons. Shadows are soft and low-contrast; the ticked-row inversion, not
elevation, carries selection.

Pills: `paid` green-on-pale-green, `part-paid` amber-on-pale-amber, `unpaid`
grey. Each has a leading dot in the darker tone. Lowercase labels.

Touch: primary buttons ≥ 48dp tall. The web app scales elements to 0.95–0.98 on
press; use each platform's native press feedback rather than porting the numbers.

## Accessibility

- Money must not be conveyed by size alone — the status pill carries a text label,
  not just a colour.
- The ticked/unticked order row needs an explicit selected state for screen
  readers (`.accessibilityAddTraits(.isSelected)` / `Modifier.toggleable`), because
  the visual signal is a colour inversion.
- Amount fields use the decimal/number keypad and announce their currency.
- Support Dynamic Type / font scaling on all three screens. The invoice **card**
  may pin its own type scale so the exported image is stable regardless of the
  tailor's font-size setting — that is the one justified exception.

## Acceptance checklist

A native port is done when all of these hold:

1. Fresh install shows the empty state; first generated invoice is `BT-0001`.
2. Ticking two orders sums their prices into the subtotal and their deposits into
   the deposit field.
3. Editing the deposit, then ticking a third order, leaves the edited deposit alone.
4. A 10% discount on ₦72,000 with ₦45,000 deposit produces exactly
   subtotal ₦72,000 · discount ₦7,200 · balance ₦19,800.
5. A flat discount larger than the subtotal produces a total of 0, not a negative.
6. `generate invoice` is disabled with zero lines and enabled the moment one exists.
7. Generating replaces the composer in the back stack — back goes to the list.
8. Deleting the order an invoice was built from leaves the invoice unchanged.
9. `mark as paid` sets the deposit to the total; the pill, headline colour and the
   disappearance of the pay-to block all follow from that one write.
10. The exported PNG is white-backed, chrome-free, and legible at chat-thumbnail size
    in both light and dark app themes.
11. The WhatsApp message matches the format above character for character,
    including the `─────────────` rules and the `.......` separators.
12. Everything above works in airplane mode.

## Out of scope

Deliberately not built, and not to be added without a new ADR: invoice editing or
deletion, partial payment history (only a single `depositPaid` total exists), tax
or VAT lines, multi-currency per invoice, PDF export, payment links or
integrations, recurring invoices, reminders, and any server-side component.
