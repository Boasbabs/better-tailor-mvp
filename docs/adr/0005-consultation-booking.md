# ADR 0005 — Consultation booking: behaviour spec for a native iOS and Android port

- **Status:** Shipped on web (`feat/consultation-booking`). Not yet built natively.
- **Date:** 2026-08-05
- **Screens:** [docs/screenshots/consultation-feat](../screenshots/consultation-feat/README.md)
- **Audience:** whoever (or whatever) builds this in SwiftUI and Jetpack Compose.
  Everything below is behaviour and rules, not React. Where the web made a
  choice for web reasons — and this feature is mostly such choices — that is
  called out so it is not copied. **§9 is the most important section in this
  document:** a native port gets a backend-shaped hole filled for free, and
  roughly half of what follows exists only to work around not having one.

---

## 1. What this is, and why it exists

Customers cannot measure themselves. An earlier direction sent them a link to
type their own numbers (`feat/customer-self-measurement`, abandoned, never
merged): it produced wrong sizes, and a bad fit is the *tailor's* bad review.
A tailor proposed the alternative unprompted — get on a video call and talk
them through the tape.

So: the customer books a short video call, and the tailor takes the
measurements **with** them, writing the numbers down as they are read back.

Three things have to work:

1. The tailor shares when they are free, without configuring anything first.
2. The customer picks a time on their own phone, without installing anything.
3. The tailor runs the call from one screen and keeps the numbers.

**In scope:** availability setup; the share screen and its two link kinds; the
customer-facing booking page and confirmation; the tailor's review-and-save
screen; the calls tab; the call console; cancel / done / reopen.

**Out of scope:** orders ([ADR 0002](0002-orders-feature.md)), invoices, and
multi-staff access control ([ADR 0001](0001-multi-staff-access-control.md) — if
it ships, a consultation plainly wants an `assignedTo` too).

---

## 2. Domain model

```
Consultation
  id            stable unique id
  customerId    → Customer
  name          SNAPSHOT of the customer's name at booking time
  phone         SNAPSHOT
  date          'YYYY-MM-DD'   the tailor's wall clock
  time          'HH:MM'        the tailor's wall clock
  durationMins  copied from Availability.slotMins at save time
  channel       whatsapp | meet | zoom
  link          meeting room URL; '' for whatsapp
  styleId       → bundled Style — what they want sewn
  templateId    → Template, guessed from styleId (§3.6)
  photo         small data-URL thumbnail, or ''
  photoPending  true = their photo was too big to travel; it is in the chat
  note          free text from the customer
  status        upcoming | done | cancelled
  createdAt     timestamp

Availability
  days          [Int]   0 = Sunday … 6 = Saturday
  from, to      'HH:MM' wall clock, one window per working day
  slotMins      15 | 30 | 45

Settings gains: callChannel, callLink, availability
```

`name` and `phone` are **snapshots on purpose** — the same rule as an order's
measurements. A customer renamed next month must not silently rewrite what last
month's call was booked under.

`durationMins` is likewise copied at save time, not read live from settings: a
tailor who switches to 15-minute calls must not retroactively shrink calls
already in the book.

Swift: `@Model final class Consultation`. Kotlin: `@Entity data class`, with
`Availability` as an embedded object or a small settings table.

---

## 3. Business rules

### 3.1 Fixed, deliberately not settings

| Rule | Value | Why it is not a setting |
|---|---|---|
| Booking horizon | 14 days | Every knob is one more place setup gets abandoned |
| Minimum notice | 120 minutes | Stops a customer booking a call five minutes from now |
| Max link length | 5000 chars | Web-only (§9); native drops this entirely |

Ship the defaults filled in — Mon–Sat, 09:00–18:00, 30-minute calls — so a
tailor can send a working link having configured nothing at all.

### 3.2 Slot generation

For each of the next 14 days, in order, starting today:

1. Skip the day unless its weekday is in `Availability.days`.
2. Walk `from` to `to` in `slotMins` steps, emitting a slot while
   `slotStart + slotMins <= to`. A 45-minute setting over 09:00–18:00 therefore
   ends at 17:15, not 17:45.
3. Drop any slot starting sooner than **now + 120 minutes**.
4. Mark a slot **taken** if an `upcoming` consultation exists at exactly that
   `date` + `time`.
5. Drop the day only if it has *no slots at all*. A day whose slots are all
   taken **stays in the strip, shown as `full` and disabled** — a gap in the
   dates reads as a bug to the person tapping.

Group slots for display as **morning** (`< 12:00`), **afternoon**
(`12:00–16:59`), **evening** (`≥ 17:00`). Omit an empty group.

Parse `date + time` in **local time**. On the web a bare `new Date('2026-08-05')`
parses as UTC, which is the class of bug that puts a call on the wrong day; the
native equivalents are `DateComponents` with the current calendar, and
`LocalDateTime`.

### 3.3 Urgency and labels

`consultUrgency`, against a call's start and its duration:

| Condition | Urgency |
|---|---|
| `now` is within `[start − 15 min, start + durationMins]` | **now** |
| `now > start` (and not in that window) | past |
| same calendar day | today |
| 1–2 calendar days away | soon |
| otherwise | later |

The `when` label, which is what the pill actually shows:

| Condition | Label |
|---|---|
| more than a day ago | `was 3 days ago` |
| started, under a day ago | `started 20 min ago` |
| under 45 minutes away | `in 25 min` |
| today | `today at 10:00am` |
| tomorrow | `tomorrow at 12:00pm` |
| beyond | `Fri 7 Aug at 2:00pm` |

A `done` call shows `done`, a `cancelled` one shows `cancelled`, whatever the
clock says. Day comparisons are **whole calendar days at local midnight**, so
"tomorrow" survives a call booked at 11pm.

### 3.4 Clash detection — overlap, not equality

A link the tailor shared last week does not know about the bookings made since,
so an incoming booking can land on a slot that has filled up.

Two calls clash when their intervals **overlap**: `otherStart < newEnd && otherEnd > newStart`.
A 30-minute call at 10:15 collides with one at 10:00. Only `upcoming` calls
count. Equality of start times is not sufficient and will miss real collisions.

A clash **warns but never blocks** — offer "save anyway" and "offer them another
time instead". The tailor knows things the app does not.

### 3.5 Nothing is written until the tailor saves

The review screen is a preview. It creates nothing, updates nothing, and
navigates nowhere until the save button is pressed. Silently rewriting a
tailor's book is the one bug that ends trust.

On save, resolve the customer in this order:

1. The `customerId` carried by a bound link, if that customer still exists.
2. Otherwise, an existing customer whose phone matches **digits-only**
   (`+234 803 123 4567` and `08031234567` must not become two people).
3. Otherwise create a new customer from the booking.

Then create the consultation and go to its detail screen, **replacing** the
review screen in the back stack.

Re-opening a link that was already saved must detect it — same `date`, `time`
and `name`, not `cancelled` — and offer to open the existing call instead of
creating a duplicate.

### 3.6 Style → template guess

The call console opens on a measurement template rather than a chooser:

| Style | Template |
|---|---|
| agbada, senator, kaftan, dashiki, shirt, suit | `t-agbada` |
| trouser | `t-trouser` |
| gown | `t-gown` |
| anything else, or no style | first template |

It is a guess, and the tailor can switch template in one tap. Getting it right
most of the time is worth more than being asked every time.

### 3.7 Measurements taken on a call

Unlike an order — which snapshots measurements (ADR 0002 §3.3) — the call
console writes **straight to the customer's saved set** for the chosen template,
field by field as it is typed. That is the whole point: the next order
auto-fills from what was taken on the call.

Values are `number | string`, same as everywhere else: `38`, `38 (loose)` and
`40½` all have to round-trip. Parse to a number when the whole string is
numeric, keep the text otherwise.

If the customer record has been deleted, say so plainly — the measurements have
nowhere to go — rather than accepting typing that silently vanishes.

### 3.8 Status

`upcoming → done` and `upcoming → cancelled`, both reversible via "reopen this
call". Cancelling frees the slot and **sends nothing**; the dialog says so,
because a customer who was not told is worse than no cancellation at all.

A `done` call offers "start an order for {first name}", which is the entire
point of the feature.

---

## 4. Screens

### 4.1 Availability setup (inside settings)

Channel picker (three rows, one selected, each with a one-line hint) → the room
link field, shown **only** for Meet and Zoom → day circles `S M T W T F S` →
from / to time fields → call length `15 · 30 · 45` → a row into the share
screen.

### 4.2 Share screen

Who it is for (a customer, or "anyone (open link)") → a plain-language summary
of what the customer will see, including a count of free slots over the horizon
→ send / copy / preview.

- Picking Meet or Zoom **without** a saved room link warns but still lets the
  link go out; the customer is told the link is coming before the call.
- With **zero** free slots, sending is disabled and the summary says to widen
  the hours.
- "Preview it as your customer" opens the real customer page in a preview mode
  that skips the messaging hop — a one-phone demo, and genuinely useful.

### 4.3 The customer page

**Deliberately not the app.** No tab bar, no wordmark, no app branding: the
tailor's business name leads, and the person holding this phone has never heard
of better tailor and is not being sold it.

Header (business name, tagline, personalised heading) → day strip → slots →
your details → style grid → optional photo → note → sticky confirm bar showing
the chosen day and time.

**Bound link:** heading reads `{First name}, book your fitting call`, and the
name/phone inputs become a read-only "booking as" card.
**Open link:** generic heading, name and phone required.

Validation, one message at a time, in this order:
`pick a time first` → `please put your name` → `please put your phone number`.

The confirmation screen is a tick, what was booked, and what happens next — and
it must be honest that the booking is not real until the message is actually
sent.

A payload that will not decode gets a plain apology and an instruction to ask
for the link again. **Never a crash and never a blank screen** — a mangled link
is an expected outcome, not an exception.

### 4.4 Review screen

Clash or already-saved banner → who (with a `new customer — will be added` or
`already your customer` badge) → what they picked → what they want, their photo
and their note → save.

### 4.5 Calls tab

The next upcoming call is the headline, in the slot the orders tab gives to due
dates: the start time in the display face, the name and when beneath. Within 45
minutes the subtitle switches from naming the day to counting down (`in 25 min`);
once the call is running the big figure itself reads `now`.

Then filters `upcoming · past · all`, then a card per call. **With no calls at
all, hide the filters entirely** and show only the empty headline and the one
action that resolves it.

Cards dim at 60% opacity when not `upcoming`.

### 4.6 Call console

When → who (with a link to their profile) → what they want → **start the call**
→ measurements → after-the-call actions.

The measurement list is the feature. Each row is the field name, the instruction
to read aloud, and a numeric input with an inches suffix. A `filled/total`
counter sits by the heading. Template chips above let the tailor correct the
guess.

The instructions are written to be **read aloud to whoever is holding the tape**
— "around the fullest part of your chest, arms down at your sides". Match the
longest field-name key first, so `sleeve length` is not answered by the `sleeve`
rule, and fall back to "keep the tape flat against the body — snug, never
tight".

---

## 5. Navigation

```
Calls (tab)
 ├─ headline / card ──► Call console
 │                        ├─ profile ──────► Customer detail
 │                        └─ start order ──► Order form (customer prefilled)
 └─ send a booking link ─► Share screen
                             └─ preview ──► Customer booking page

(from a message) ──────────► Review screen ──► Call console

Settings ─► fitting calls ─► Share screen
Customer detail ─► "book a fitting call" ─► Share screen (bound)
Create sheet ─► "book a fitting call" ─► Share screen
```

The customer page and the review screen are the two ends of the round trip. On
web they are routes; on native they are **deep links** (§9).

---

## 6. Design tokens

Identical to [ADR 0002 §6](0002-orders-feature.md#6-design-tokens) — same
palette, radii, fonts, motion and lowercase headings. Two additions:

| Pill | Background | Text / dot |
|---|---|---|
| happening now | solid `#30A46C` | white |
| today | `#FFF1DC` | `#9A5B00` / dot `#E89100` |
| soon (≤ 2 days) | `#EAEEFF` | `#3B4FD8` |
| later / past / done / cancelled | ink @ 6% | ink @ 45% / 25% |

`happening now` is the only solid fill in this feature, exactly as `overdue` is
the only one in orders. Do not promote anything else.

**The customer page uses a different type voice from the rest of the app:**
sentence case and full sentences, not the app's lowercase. The tailor's
customers are not users of a tool, and the page should not read like one.
Keep that distinction on native.

---

## 7. Web pattern → native

| Web | SwiftUI | Compose |
|---|---|---|
| day strip (horizontal scroll) | `ScrollView(.horizontal)` of cards | `LazyRow` |
| slot grid | `LazyVGrid`, 3 columns | `LazyVerticalGrid(Fixed(3))` |
| channel picker | `List` of selectable rows | `Card` rows with `RadioButton` semantics |
| day circles | `HStack` of toggles | `FilterChip` row |
| `<input type="time">` | `DatePicker(… .hourAndMinute)` | M3 `TimePicker` |
| file input + canvas downscale | `PhotosPicker` + `ImageRenderer` | Photo Picker + `Bitmap.scale` |
| `wa.me` deep link | `UIApplication.open` | `Intent.ACTION_VIEW` |
| confirm dialog | `.alert` | `AlertDialog` |
| toast | overlay + `.transition` | `Snackbar` |
| store + persistence | SwiftData `@Model` | Room `@Entity` + DAO |

---

## 8. Build these natively — the web could not

1. **Calendar integration.** The largest gap. Write an `EKEvent` /
   `CalendarContract` entry on save, with an alarm. A tailor's fitting calls
   belong beside the rest of their day, not only inside this app.
2. **Call reminders.** `UNUserNotificationCenter` / `WorkManager`: the evening
   before, and again 15 minutes out. Currently the tailor has to remember, and
   the customer only gets a reminder if the tailor taps "send a reminder".
3. **Real camera** for the customer's style photo, and **no downscaling** —
   §9 explains why the web had to shrink it to a thumbnail.
4. **Keep the numbers off the call screen.** Measurements are typed while
   talking; a native app can keep the keypad up, move between fields without
   dismissing it, and use `.decimalPad` / `KeyboardType.Decimal` with a
   next-field return key.
5. **Speech input** for measurements is the obvious next step — the tailor's
   hands are holding a phone and a tape.
6. **Haptics** on slot selection and on a saved booking.
7. **Dynamic Type / font scaling.** Reading a hint aloud at arm's length is the
   exact case fixed-size type fails.
8. **Share sheet** for the invitation (`UIActivityViewController` /
   `ACTION_SEND`) instead of a hard-coded `wa.me` URL, so SMS, Telegram and
   email work too.

---

## 9. Do not port — the URL is a database

Everything in this table exists because there is no backend. **A native app
with any server at all should replace the whole mechanism with a booking id.**
The customer page becomes a real URL, the booking becomes a row, and the tailor
gets a push notification instead of a WhatsApp message to tap.

| Thing | Why it exists on web | Native equivalent |
|---|---|---|
| Invite and booking encoded into the URL | No backend; the link *is* the transport | A booking record and an id |
| Single-letter payload keys (`b`, `g`, `p`, `z`, `c`, `n`, `a`, `k`, `x`) | Every byte has to survive a paste into a chat | Normal field names |
| base64url instead of base64 | `+`, `/` and `=` get mangled between WhatsApp, a hash route and an address bar | Not needed |
| `x` — taken slots baked into each link | The customer's phone has no way to ask what is free | Query availability live; clashes mostly disappear |
| 5000-character link budget, and dropping the photo to stay inside it | WhatsApp and address bars stop being reliable past it | Upload the photo |
| Downscaling the photo to a ~3.4 KB thumbnail in the customer's browser | Same budget | Send the original |
| `photoPending` and "attach it to the chat as well" | A photo that did not fit had to arrive some other way | Delete this concept |
| `HashRouter`, `#/book/…` URLs | GitHub Pages has no server rewrites | Universal Links / App Links |
| `localStorage` + zustand persist | No backend | SwiftData / Room |
| Repair in zustand's `merge` (not `migrate`) | A PWA can ship a schema change to a browser holding old data, and `migrate` only fires on a version *change* — a blob stamped current but written by a half-updated build would keep its gaps forever | Real schema migrations |
| GoatCounter `consult/*` events | Prototype marketing | A real analytics SDK, or drop |
| `toLocaleString('en-GB')` day and month names | Expedient hard-code | Platform formatter, user's locale |

**The one thing worth keeping from all of that** is the *shape* of the flow:
the customer needs no account, no install, and no app. Whatever replaces the
payload must preserve that. A booking page that demands a signup will not be
used by the people this is for.

---

## 10. Acceptance checklist

Behaviour, not pixels. A port is done when all of these hold.

- [ ] A tailor who changes nothing in settings can still send a working link
- [ ] No slot is offered sooner than 2 hours from now
- [ ] A day whose slots are all taken still appears, marked full and disabled
- [ ] A weekday not in `days` never appears
- [ ] A 45-minute call length over 09:00–18:00 produces a last slot at 17:15
- [ ] Slots group into morning / afternoon / evening, and empty groups vanish
- [ ] A booked call shows as taken on links shared afterwards
- [ ] A 30-minute call at 10:15 is detected as clashing with one at 10:00
- [ ] A clash warns, and still allows the save
- [ ] Nothing is created until the tailor taps save
- [ ] `+234 803 123 4567` and `08031234567` resolve to the same customer
- [ ] Opening an already-saved booking offers to open it, not to duplicate it
- [ ] A bound link never asks the customer for their name or phone
- [ ] An open link requires both, one validation message at a time
- [ ] A corrupt or truncated payload shows an apology, never a crash or a blank
- [ ] Measurements typed on the call appear on the customer's profile, and a
      new order for them auto-fills from those numbers
- [ ] A measurement of `38 (loose)` round-trips through save and reload
- [ ] Renaming a customer does not change the name on calls already booked
- [ ] Changing the call length in settings does not change calls already booked
- [ ] Cancelling frees the slot and sends nothing
- [ ] A call under 45 minutes away is labelled `in 25 min`, not by day
- [ ] A call due tomorrow reads `tomorrow at …` at 23:59 tonight
- [ ] `happening now` is the only solid-filled pill in this feature
- [ ] With no calls at all, the filter row is not rendered
- [ ] Everything except sending and joining the call works offline

---

## 11. Seed data

Ship two upcoming calls, drawn from the **real slot generator** rather than
offset from now — a demo opened at 11pm must not show a 2am fitting call. One
today and one tomorrow, one carrying a note and a pending photo, so the urgency
pills and the "photo is in your chat" state both demonstrate themselves on any
day the app is opened.

---

## 12. Open questions for the native build

- **Timezones.** The customer page names the tailor's timezone
  (`times are in Lagos`) and otherwise assumes one clock. A customer abroad
  booking with a Lagos tailor is currently on their honour to do the arithmetic.
  Native has real timezone support; decide whose clock the slots are shown in
  before this is a support ticket.
- **Two-way cancellation.** The customer has no way to cancel or reschedule —
  they message the tailor. With a backend, they should.
- **Double-booking across devices.** Same question as
  [ADR 0001 §6](0001-multi-staff-access-control.md#6-what-production-actually-requires),
  but sharper here: two phones sharing one shop can accept the same slot twice.
- **Recurring availability exceptions.** One window per day, no holidays, no
  lunch break, no "closed this Saturday". The first tailor who takes a week off
  will ask.
- **Who runs the call.** With multi-staff (ADR 0001), a consultation needs an
  assignee, and availability stops being one shop-wide window.
