# ADR 0001 — Multi-staff access control for a tailoring shop

- **Status:** Prototyped, not production. Built on `feat/consultation-booking`, uncommitted.
- **Date:** 2026-08-05
- **Screens:** [docs/screenshots/multi-staff-feat](../screenshots/multi-staff-feat/README.md)

---

## 1. Context

better tailor was built for a solo tailor. A prospect asked two questions:

> How can the app be accessible to many people in an organization?
> Can accessibility be limited (client's email, phone number and address)?

The second question is the real one. When pressed on *why* contact details
should be hidden, the answer was blunt: **so a staff tailor cannot walk off with
the customer book and set up on their own.** That reframes the feature. This is
not privacy hygiene — it is an anti-poaching control, and it sets a much higher
bar. A number that is dotted out on one screen but reachable through a
`wa.me` link on another has not been hidden at all.

Two constraints shaped everything:

1. **There is no backend.** The app is a Vite + React PWA persisting to
   `localStorage` via `zustand/persist`, deployed to GitHub Pages. Real accounts
   are not buildable here. What *is* buildable is a faithful, clickable
   simulation of the interaction design — which is what a prospect needs to see
   before anyone funds a server.
2. **A live demo funnel is at stake.** The deployed prototype feeds a waitlist.
   Any change that puts a lock screen in front of a cold visitor would cost
   conversions to prove a feature most visitors do not have.

---

## 2. Decisions

Each row was settled by interview before any code was written. The rejected
alternatives matter as much as the choices — several are worth revisiting when a
backend exists.

| # | Decision | Why | Rejected |
|---|---|---|---|
| 1 | **PIN lock on app open** — a "who's working?" screen listing staff | Matches how a Lagos shop actually works: one shared phone or tablet on the counter. Also the most honest demo of gating — you cannot see hidden data without switching identity. | A settings-only "preview as" toggle. Reads as a preview, not access control; a viewer would not believe the gating is real. |
| 2 | **Three roles + one override** | Role sets a sensible bundle; a single `customer contact details` switch handles the exact thing the prospect asked about. Avoids permission-matrix fatigue on a phone. | Roles with no overrides (can't trust one senior tailor without also handing them the money). A full per-person toggle list (5+ decisions per hire, easy to misconfigure). |
| 3 | **Tailors are blocked from** the invoices tab, all money, bank/business settings, deleting, and customer contacts | The anti-poaching brief, plus: a tailor has no business reason to touch billing. | — |
| 4 | **Contact buttons are removed, not blind-dialled** | With no backend there is nothing to proxy a call through. `wa.me/2348…` puts the number in the URL bar the instant it is tapped. A visible button would be theatre. | Keep the buttons so a tailor can message about a fitting. Revisit once a server can proxy (see §6). |
| 5 | **Customers tab is read-only for tailors** | The edit form renders the raw phone in a text input — the leak that read-only closes with the fewest moving parts. Tailors keep measurement entry, which is their job. | Hiding the tab entirely (breaks "what were Bola's agbada measurements last time"). A half-disabled edit form (more code, fiddly on a small screen). |
| 6 | **`assignedTo` on orders + a `mine` filter; tailors still see all** | Answers the "manage multiple staff" half, not just the hiding half. Shops share work and someone covers when a colleague is sick. | Hard partition to own-orders-only. Tightest, but breaks cover-for-a-colleague and hides unassigned work from everyone but the boss. |
| 7 | **Add `email` and `address` to `Customer`; mask phone/email/address; keep `area` visible** | Answers the prospect literally. `area` is a neighbourhood — you cannot contact anyone with "Ikoyi", and tailors use it to group work. | Reusing `area` as the address field (a neighbourhood is not a delivery address). |
| 8 | **Staff live in Settings**, mirroring the templates convention; roster shows last-active + workload | Consistent with the existing information architecture. Last-active and open-order count answer the boss's real daily question — "who is overloaded" — using data already in the store, with zero new persistence. | A full activity log. Genuinely useful, but a new persisted array plus write hooks in every mutation. Deferred, see §7. |
| 9 | **Solo mode — no lock until a second person exists** | Protects the demo funnel completely. The feature announces itself by being used. | Seeding three staff with the lock on by default: maximum discoverability, but a lock screen in front of a cold prototype is exactly where people bounce. |
| 10 | **The owner's PIN is optional; staff PINs are mandatory** | A forgotten PIN in a `localStorage` app has no reset path. Nobody may be locked out of their own shop. The honest threat model is a staff member using their own login, not a colleague impersonating the boss on a shared counter device. | Mandatory owner PIN with a destructive "forgot pin → wipe" escape. A recovery word (a second setup step for a five-second flow). |
| 11 | **Session persists until "switch user"** | Like any app on your own phone. A reviewer is not re-entering a PIN on every reload. | Lock on every refresh (correct for a shared tablet, hostile to a demo). Idle timeout (a timer that locks itself mid-conversation). |

---

## 3. The permission model

One function is the entire gate. **No screen tests a role string directly** — a
role comparison scattered across a dozen files is how a permission system ends
up with one page that forgot to check.

```ts
// src/perm.ts
can(me: Staff | undefined, ability: Ability): boolean
```

| Ability | owner | manager | tailor |
|---|:--:|:--:|:--:|
| `money` — prices, deposits, balances, the unpaid figure | ✅ | ✅ | ❌ |
| `contacts` — phone/email/address + call & WhatsApp buttons | ✅ | ✅ | **override** |
| `invoices` — the tab and everything leading to it | ✅ | ✅ | ❌ |
| `editRecords` — create/edit orders, customers, fitting calls, templates | ✅ | ✅ | ❌ |
| `deleteRecords` — delete records, cancel calls, reset demo | ✅ | ✅ | ❌ |
| `assignWork` — decide who sews what | ✅ | ✅ | ❌ |
| `manageStaff` — add people, set roles and PINs | ✅ | ❌ | ❌ |
| `businessSettings` — business info, bank details, fitting-call setup | ✅ | ❌ | ❌ |

**Advancing an order's status is never gated.** It is a tailor's core action and
deliberately sits outside the ability list.

`canSeeContacts` is only consulted for tailors. Promoting someone to manager
sets it `true`; demoting them back to tailor restores the stored value, so a
promotion never silently strips access and a demotion never silently grants it.

---

## 4. Implementation map

**New files**

| File | Contains |
|---|---|
| `src/perm.ts` | `Ability`, `can()`, `ROLES` with their plain-English blurbs, `masked()`, `randomPin()`, `lastActiveLabel()` |
| `src/components/staff.tsx` | `useMe()`, `useCan()`, `useIsTeam()`, `LockedNote`, `RoleOptions`, `StaffRow`, `AssigneeSheet` |
| `src/pages/Lock.tsx` | "who's working?" roster and the PIN pad |
| `src/pages/StaffDetail.tsx` | Role picker, the contacts override, PIN management, removal |

**Type changes** (`src/types.ts`)

```ts
type StaffRole = 'owner' | 'manager' | 'tailor'
type Staff = { id, name, role, pin, canSeeContacts, lastActiveAt, createdAt }

Customer += { email?: string; address?: string }
Order    += { assignedTo?: string }
Data     += { staff: Staff[]; currentStaffId: string }
```

**Store** (`src/store.ts`) — persist `version` bumped to `3`. `signIn()` stamps
`lastActiveAt`. `deleteStaff()` unassigns their orders rather than deleting the
work, and clears the session if it was them. Two repair functions run on **every**
rehydrate, not just on version change:

- `repairStaff` — pre-feature saved data becomes a one-person shop with the user
  as owner. A roster with no owner promotes its first member, because a shop
  with no owner can never be administered again.
- `repairCurrentStaff` — a session pointing at a deleted person falls back to the
  lock screen, and a one-person shop signs itself straight in.

**Routing** (`src/App.tsx`) — hiding a button is a courtesy; the router is the
gate. `<Only ability="…">` wraps every restricted route and redirects to
`/orders`, because the first thing anyone does with a hash router is edit the
hash. `/book/:payload` sits **outside** the lock entirely — it belongs to the
customer who was sent the link, not to the shop, and must never meet a lock
screen.

---

## 5. The leak map

The highest-value artefact in this ADR. Every path by which a customer's phone
number can reach a screen, and how each was closed. **Re-check this list
whenever a new surface is added.**

| Surface | Treatment |
|---|---|
| Customers list — number, `tel:`, `wa.me` | Masked; buttons removed |
| Customer detail — phone, email, address, call/WhatsApp, "book a fitting call" | Masked; replaced by a `contact details are owner-only` note |
| Customer edit form (raw number in an input) | Route-guarded (`editRecords`) |
| Order form — customer picker row | Masked |
| `CustomerPickerSheet` | Masked (belt and braces; only intake roles reach it) |
| Invoice new / detail — number and the WhatsApp share | Route-guarded (`invoices`) |
| Consultation detail — number, WhatsApp reminder | Masked; reminder removed |
| Consultation "start the call" | **Nuanced:** a Meet/Zoom room is the shop's own link and stays open to everyone; a WhatsApp call dials the customer, so it needs `contacts` |
| Consultation share (booking link over WhatsApp) | Route-guarded (`editRecords`) |
| Consultation review `/booked/:payload` | Route-guarded (`editRecords`) |
| Customer booking page `/book/:payload` | **Deliberately ungated** — customer-facing, shows the customer their own details |

Verified by URL: `#/invoices`, `#/customer/:id/edit`, `#/order/new`,
`#/settings/staff/…`, `#/consult/share` and `#/invoice/new` all redirect for a
tailor.

---

## 6. What production actually requires

**The prototype demonstrates interaction design, not security.** Masked values
never reach the rendered DOM, but the full store sits in `localStorage` — anyone
who opens devtools reads every number. Say this plainly to any prospect who
pushes on it. Building it for real means the following, roughly in order.

### 6.1 Redact on the server, not the client — the single most important change

Today the client receives everything and chooses what to paint. In production a
client that may not display a phone number must **never be sent one**. Field-level
redaction belongs in the API serialiser, keyed on the caller's abilities.

```
GET /customers/:id   as tailor   →  { id, name, area, sets, orders }
                     as owner    →  { id, name, area, phone, email, address, … }
```

This also fixes the awkwardness in decision 4: with server-side redaction, a
proxied WhatsApp/voice handoff (Twilio-style masked numbers) becomes possible,
and tailors can contact customers without ever learning the number.

### 6.2 Port `can()` to the server, keep the client copy for UX only

`src/perm.ts` is deliberately free of React and store imports so it can move to
shared code. Every mutation endpoint must authorise independently. The client
copy exists only to avoid rendering buttons that would 403.

### 6.3 Real identity

Replace PINs with proper accounts. Phone-number OTP suits the Nigerian market
better than email/password. Per-device sessions, revocable — removing a staff
member must invalidate their tokens immediately, not just delete a row.

### 6.4 Multi-tenancy and sync

Every row needs a `shop_id`. The app is offline-first, so a synced multi-user
model needs a conflict policy — last-write-wins per field is likely sufficient
for this domain, since two people rarely edit the same measurement at once.

### 6.5 Invitations replace owner-creates-PIN

`+ add someone` becomes an SMS/email invite with an accept flow, so a teammate
sets their own credential and the owner never handles it. Keep the roster,
roles and the override switch exactly as designed — those tested well.

### 6.6 Commercial

Staff seats are the natural paid tier. Solo stays free; the moment a shop adds a
second person it has told you it is a business. Note that decision 9 (solo mode)
already places the paywall at exactly the right moment in the funnel.

### 6.7 Suggested schema sketch

```
shops        (id, name, currency, bank_*, availability, …)
staff        (id, shop_id, name, role, can_see_contacts, last_active_at,
              auth_user_id, invited_at, accepted_at, revoked_at)
customers    (id, shop_id, name, area, phone, email, address, …)
orders       (id, shop_id, customer_id, assigned_to → staff.id, …)
audit_events (id, shop_id, staff_id, action, entity, entity_id, at)
```

---

## 7. Deferred, with the reasoning intact

| Deferred | Revisit when |
|---|---|
| **Activity log** ("Tunde moved agbada to sewing · 2h ago") | A backend exists. It was rejected only on prototype cost — a new persisted array plus write hooks in every store mutation. Genuinely useful to a boss, and `audit_events` above is already sketched for it. |
| **Tailors see only their own orders** | A shop asks for it. Rejected because it breaks covering for a colleague, but it is a per-shop setting rather than a global choice. |
| **Custom roles / full permission matrix** | Three roles stop fitting. The `Ability` union is already the right seam — a role becomes a stored set of abilities rather than a string. |
| **Per-customer sharing** ("Tunde may contact only his own customers") | Contact access proves too coarse in practice. |
| **Proxied contact** (masked numbers via Twilio) | §6.1 lands. This is what makes decision 4 reversible. |

---

## 8. How to verify the prototype

```bash
npm run dev
```

1. Confirm the solo shop is unchanged — four tabs, `+`, `₦126k unpaid`.
2. Settings → `+ add someone` → name them, note the generated PIN.
3. Orders → open one → tap "sewing this" → assign.
4. Settings → `switch user` → tap the tailor → enter the PIN. Try a wrong one first.
5. Check what is gone: invoices tab, `+`, unpaid figure, contacts, prices.
6. Paste `#/invoices` into the URL bar — it bounces.
7. Switch back to owner, toggle `customer contact details` on, sign back in as
   the tailor: contacts return, editing stays locked.
8. Set the teammate to manager: invoices and money return, staff and bank do not.

Reset with Settings → `reset demo data` as the owner.
