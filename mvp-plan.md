# Better Tailor — MVP Prototype Plan

**Goal:** a mobile-responsive, static-hosted, high-fidelity prototype (throwaway) to validate demand among tailors in Nigeria (and abroad) for a customer/measurement/order/invoice app — demoed in person and shared via WhatsApp, funneling interest into a Google Form waitlist.

**Ship target: today.** No auth, no backend, no image upload, no cloud backup. localStorage + seeded demo data.

---

## 1. Validation hypothesis & success criteria

**Hypothesis:** Tailors who currently track customers and measurements in notebooks will pay a one-time fee (₦20,000 / €10) for a phone app that stores measurements per customer, tracks order due dates, and produces shareable invoices.

**The funnel we're measuring** (via GoatCounter events + Google Form):

| Stage | Signal | Instrument |
|---|---|---|
| Reach | Opened the app link | GoatCounter page view |
| Engagement | Created an order/customer/invoice | GoatCounter event `engaged` |
| Interest | Tapped the waitlist banner | GoatCounter event `waitlist-click` |
| Intent | Submitted the Google Form | Form responses |
| Strong intent | Answered "Yes, I'd pay ₦20k now" | Form pricing question |

**Suggested pass/fail bar** (adjust to your sample size): from ~30 tailors demoed/shared, ≥ 40% submit the form, ≥ 25% of submitters say yes at ₦20k/€10, and the "which ONE feature would make you switch" answers cluster (a cluster = a wedge; a flat spread = no wedge).

---

## 2. Decisions log (from the interview)

| # | Decision | Choice |
|---|---|---|
| 1 | Stack | React + Vite + Tailwind CSS, localStorage, no backend |
| 2 | Visual identity | Pushr-style B&W (off-white bg, black text/buttons, lowercase bold wordmark) + status colors only for urgency (red overdue, amber due soon, green delivered/paid) |
| 3 | Navigation | Bottom tabs: orders / customers / invoices + center black FAB (+) + settings in header; Pushr-style stat dashboard strip on orders tab |
| 4 | Measurements | Live on the customer per template; orders **snapshot** the set at creation, tweakable per order |
| 5 | Templates | 5 pre-seeded Nigerian templates (Agbada/Men's Top, Men's Trouser, Women's Gown, Blouse, Skirt), inches, editable + create-your-own |
| 6 | Orders | Fields: garment, customer, template+snapshot, style ref, fabric, price, deposit, due date, notes. Status: New → Sewing → Ready → Delivered. Urgency auto-computed from due date |
| 7 | Style/fabric | Bundled gallery (~12 style illustrations, ~10 fabric swatches) via bottom sheet; camera button = "Coming in the full app!" toast (demand probe) |
| 8 | Invoice | Line items from orders, subtotal, discount (₦ or %), deposit, **balance due**, bank payment details from settings, thank-you line. No tax |
| 9 | Sharing | WhatsApp `wa.me` prefilled text invoice + PNG download (html2canvas); customers get `tel:` call + WhatsApp buttons |
| 10 | Currency | ₦ default; settings picker swaps display symbol (₦/€/$/£/GH₵), no conversion |
| 11 | Data | Nigerian seed data (6 customers, 8 orders staged across statuses/urgency, 2 invoices, one part-paid) + localStorage + "Reset demo data" in settings |
| 12 | Onboarding | Single Pushr-style welcome screen → "let's go"; dismissible waitlist banner on orders tab + card in settings |
| 13 | Google Form | All 4 sections + **email** + WhatsApp number (see §8) |
| 14 | PWA | Manifest + icons only (installable, standalone). **No service worker** (avoids stale-cache demos) |
| 15 | Analytics | GoatCounter (free, no cookie banner) + 3 custom events: `opened`, `engaged`, `waitlist-click` |
| 16 | Deploy | GitHub Pages via `gh-pages` npm package, HashRouter, single canonical URL |

---

## 3. Research summary

### Tailoric (the competitor we're testing against)
[Play Store listing](https://play.google.com/store/apps/details?id=com.ejastech.tailoric) — EJAS Technologies, 10K+ downloads, 4.4★ (8 reviews), freemium with in-app purchases.

**Features:** customizable measurement templates, multiple orders per customer, invoices (recently changed from PDF → image for easy sharing), order deadline notifications, fabric + style photo capture, call customers in-app, cloud backup. "Business Analytics" listed as coming soon.

**Observed UI (from store screenshots):**
- **Orders tab:** search bar, order cards (fabric thumbnail + garment name + due-date pill with progress ring; blue = normal, red = urgent, grey = no due date), center FAB, bottom nav.
- **Order detail:** garment name, style photos, customer chip with call button, due-date pill, notes, fabric photo, price tag, measurements grid.
- **Customers tab:** search + cards with call buttons.
- **Customer info:** name/phone/location, Measurements section with **Templates dropdown**, chips (label + value), "Add field +", Save / Add order.
- **Create Template:** name + field list with delete, "Add field".
- **Invoice:** logo, business name, date, invoice #, BILLED TO, item/amount table, total, thank-you, Share.

**Their exposed weakness (top review, July 2025):** invoicing lacks amount breakdown, tax, discount, part payment, and payment details. **Better Tailor's invoice ships all of that except tax** — our sharpest differentiator, demoable in 30 seconds.

### Pushr (design language source)
Reference: [pushr on Mobbin](https://mobbin.com/apps/pushr-ios-b9fbf2d1-5e5d-4c38-b77d-2f22efb506be/057a254e-7368-4961-ad06-c5cc18c95928/screens). Key screens studied:
- [Welcome screen](https://mobbin.com/screens/48eddd1b-a5aa-4e37-b304-ed7a39423c53) — lowercase glitch wordmark, one-line value prop, single black pill CTA ("let's go").
- [Home dashboard](https://mobbin.com/screens/2d9dedab-7961-4927-ada0-5d9338d95bf7) — oversized stat number, 3-column stat row, week strip card, inverted (black) highlight card, floating pill CTA.
- [Stat share card](https://mobbin.com/screens/50a35ef8-8d21-455c-a411-cd941749d767) — clean white card with giant number + label grid; our invoice card follows this pattern.
- [Celebration modal](https://mobbin.com/screens/5cfa8827-6feb-446e-9758-c156382450e9) — blurred backdrop + icon + bold line; reuse for "Order marked Delivered 🎉".

**Extracted design system:**
- Background `#F5F5F3` (off-white), cards `#FFFFFF` and `#EFEFED`, text/buttons `#111111`, inverted cards black with white text.
- Status colors (only place color appears): red `#E5484D` (overdue), amber `#F5A623` (due ≤ 3 days), green `#30A46C` (delivered/paid).
- Type: Inter or Space Grotesk, bold/black weights; the wordmark **better tailor** always lowercase; giant numerals for stats.
- Shapes: rounded-2xl cards, fully-rounded pill buttons/chips, generous whitespace, no borders (shadow-sm only).

---

## 4. Screens & flows (complete inventory)

```
/            welcome (first visit only) → "let's go"
/orders      ORDERS TAB (default)
/orders/:id  order detail / edit
/order/new   create order
/customers   CUSTOMERS TAB
/customers/:id  customer detail (info + measurement sets + their orders)
/customer/new   create customer
/invoices    INVOICES TAB
/invoices/:id   invoice detail (shareable card)
/invoice/new    create invoice
/settings    settings (templates, business info, currency, reset, waitlist)
/settings/templates      template list
/settings/templates/:id  template editor
```

### 4.1 Welcome (`/`)
Pushr-clone: wordmark **better tailor**, line: *"your customers, measurements, orders & invoices — in one place."*, black pill **let's go** → `/orders`. Sets `bt_seen_welcome`, fires `opened` event. Skipped on revisit.

### 4.2 Orders tab (home)
1. Header: `better tailor` (small wordmark) + settings gear.
2. **Dashboard strip** (Pushr stat row): **due this week** (big number) · **overdue** (red if > 0) · **unpaid ₦** (sum of price − deposit for non-delivered orders).
3. Dismissible black banner: *"❤️ want this app? join the waitlist"* → Google Form (fires `waitlist-click`).
4. Search field (garment or customer name).
5. Status filter chips: all / new / sewing / ready / delivered.
6. Order cards: fabric swatch thumbnail, garment name, customer name, status pill, due pill (*"due in 4 days"* — red overdue / amber ≤ 3 days / grey none).
7. Center FAB (+) → sheet: new order / new customer / new invoice.

### 4.3 New order
Customer picker (or inline "+ new customer") → template picker → **measurements auto-fill from customer's set** (editable = the snapshot) → garment name → style picker (bottom-sheet grid of bundled illustrations; camera icon → "Coming in the full app!" toast) → fabric picker (swatch grid, same toast on camera) → price, deposit, due date, notes → **add order**. Fires `engaged`.

### 4.4 Order detail
Hero: style illustration + fabric swatch. Customer chip (tap → customer). Status stepper (tap to advance New → Sewing → Ready → Delivered; celebration modal on Delivered). Due pill, price/deposit/balance, measurement chips grid, notes. Actions: edit, delete, create invoice (pre-selects this order).

### 4.5 Customers tab
Search + cards (initials avatar, name, phone, order count, call + WhatsApp buttons). FAB shared.

### 4.6 Customer detail / new customer
Name, phone (with country code so `wa.me` works), area/city, gender (optional — filters default templates). **Measurement sets:** one card per template ("Gown — 8 measurements") → tap to edit chips grid, "Add field +" for ad-hoc fields, "add set" to attach another template. Their orders list below. New-customer fires `engaged`.

### 4.7 Invoices tab
Cards: invoice #, customer, total, **status pill: paid / part-paid / unpaid**, date. FAB shared.

### 4.8 New invoice
Pick customer → tick their orders as line items (or add manual line) → discount (₦ or %) → deposits auto-summed → **balance due** computed → generate. Fires `engaged`.

### 4.9 Invoice detail (the money screen)
White card, Pushr share-card style: business name + tagline (from settings), invoice #, date, billed-to (name, phone, area), items table, subtotal, discount, **deposit paid**, **balance due** (bold, largest number), bank details (bank / account number / account name), *"thank you!"*. Buttons: **share on WhatsApp** (prefilled `wa.me` text, see §6), **download image** (html2canvas → PNG), mark paid.

### 4.10 Settings
Business info (name, tagline, phone, bank name, account number, account name) · measurement templates (list → editor: rename, add/remove/reorder fields, delete; "create template") · currency symbol picker (₦ default / € / $ / £ / GH₵) · **join the waitlist** card → Google Form · **reset demo data** (confirm dialog → restore seed) · tiny footer: "better tailor — prototype".

---

## 5. Data model (localStorage)

Single key `bt_data_v1`, one JSON blob; `bt_seen_welcome` flag separate. Zustand (or useReducer + context) with a persist wrapper. IDs: `crypto.randomUUID()`.

```ts
type Template = { id, name, fields: string[] }                  // "Agbada", ["neck","shoulder",...]
type MeasurementSet = { templateId, values: Record<string, number|string> }
type Customer = { id, name, phone, area, gender?, sets: MeasurementSet[], createdAt }
type Order = {
  id, customerId, garment, templateId,
  measurements: Record<string, number|string>,  // SNAPSHOT, editable per order
  styleId, fabricId,                            // refs into bundled galleries
  price, deposit, dueDate?: string,             // ISO date
  status: 'new'|'sewing'|'ready'|'delivered',
  notes, createdAt
}
type Invoice = {
  id, number,                                   // e.g. BT-0007
  customerId, lines: { label, amount, orderId? }[],
  discount: { kind: 'flat'|'percent', value: number } | null,
  depositPaid, status: 'unpaid'|'part-paid'|'paid', createdAt
}
type Settings = { businessName, tagline, phone, bankName, accountNumber, accountName, currency: '₦'|'€'|'$'|'£'|'GH₵' }
```

Derived (never stored): urgency = f(dueDate, today); balance = total − discount − depositPaid; dashboard stats.

### Seed data (`src/seed.ts`)
- **Templates (5):** Agbada/Men's Top (neck, shoulder, chest, sleeve length, top length, wrist) · Men's Trouser (waist, hip, thigh, trouser length, ankle) · Women's Gown (bust, waist, hip, shoulder, sleeve, gown length, back) · Blouse (bust, shoulder, sleeve, blouse length) · Skirt (waist, hip, skirt length).
- **Customers (6):** Adaeze Okafor, Emeka Obi, Funke Adeyemi, Tunde Bakare, Chiamaka Eze, Ibrahim Musa — Nigerian phone formats (+234…), areas (Surulere, Ikeja, Yaba, Lekki…), realistic filled measurement sets.
- **Orders (8):** staged so the demo lands — 1 **overdue** (red), 2 **due this week** (amber), mix of statuses including 2 delivered, garments: Agbada, Senator, Ankara gown, Kaftan, 2-pc suit trouser…, prices ₦15,000–₦85,000, some with deposits.
- **Invoices (2):** one paid, one **part-paid** (shows deposit + balance-due math immediately).

---

## 6. Key mechanics

- **WhatsApp invoice text** (`https://wa.me/<phone>?text=<encoded>`):
  ```
  *INVOICE BT-0007 — {businessName}*
  Billed to: {customer}
  ─────────────
  Agbada (navy) ......... ₦45,000
  Senator wear .......... ₦30,000
  Subtotal .............. ₦75,000
  Discount .............. -₦5,000
  Deposit paid .......... -₦30,000
  *BALANCE DUE .......... ₦40,000*
  ─────────────
  Pay to: {bankName} {accountNumber} ({accountName})
  Thank you! 🙏
  ```
- **PNG download:** `html2canvas` on the invoice card node → `canvas.toDataURL` → anchor download `invoice-BT-0007.png`.
- **Urgency:** overdue = dueDate < today (red); due-soon = ≤ 3 days (amber); else grey. Delivered orders show green and drop out of dashboard counts.
- **GoatCounter:** script tag in `index.html`; `window.goatcounter.count({path:'opened'|'engaged'|'waitlist-click', event:true})`.
- **PWA:** `manifest.webmanifest` (name "better tailor", `display: standalone`, theme `#111111`, bg `#F5F5F3`, 192/512 icons) + `apple-touch-icon`. No service worker.
- **Routing:** HashRouter (`/#/orders`) — survives refresh on GH Pages with no 404 hack.

---

## 7. Build plan (one day, with cut lines)

**Phase 1 — Skeleton (~1.5h):** Vite + React + Tailwind scaffold, tokens (colors/type), HashRouter + bottom nav + FAB, layout shell, seed data + persisted store.
**Phase 2 — Core loop (~3h):** orders list + dashboard strip → customer list/detail with measurement sets → new order flow with snapshot autofill → order detail + status stepper. *(If time-boxed: a demo works after Phase 2.)*
**Phase 3 — The differentiator (~2h):** invoice create → invoice card → WhatsApp share + PNG download → settings (business/bank info, currency).
**Phase 4 — Fidelity & funnel (~2h):** welcome screen, style/fabric galleries + "coming soon" camera toast, waitlist banner + form links, GoatCounter, PWA manifest, celebration modal, reset-demo-data.
**Phase 5 — Ship (~0.5h):** deploy (§9), test on a real Android phone over WhatsApp-shared link.

**Cut lines if the day runs out (in order):** celebration modal → style illustrations (fall back to fabric swatches only) → template editor (keep the 5 seeded, read-only) → PNG download (keep WhatsApp text share). **Never cut:** measurements autofill, due-date urgency, invoice balance math, waitlist banner.

Throwaway rules: no tests, no i18n, no dark mode, minimal edge-case handling, delete = simple confirm.

---

## 8. Google Form (waitlist + validation survey)

Title: **better tailor — early access**. Intro: *"You tried the demo. Help us build it right — 3 minutes."*

**Section 1 — About you:** name · **email** · WhatsApp number (with country code) · city & country · "Do you work alone or with staff?" (solo / 1–3 staff / 4+) · "Roughly how many orders do you handle per month?" (<10 / 10–30 / 30–60 / 60+).
**Section 2 — Your phone:** Android / iPhone / both · phone model (open, optional).
**Section 3 — Pricing:** "Would you pay **₦20,000 (or €10) one-time** — pay once, own it forever — for this app?" (Yes, I'd pay that today / Yes, but cheaper / I'd prefer small monthly / No) · "What price feels fair for it?" (open) · "Have you ever paid for a business app before?" (Yes/No).
**Section 4 — Features:** "Which ONE feature would make you drop your notebook?" (measurements per customer / due-date reminders / invoices & payment tracking / customer list with call & WhatsApp / other) · "What's missing that you'd need before using this daily?" (open) · "Can we WhatsApp you when it launches?" (Yes/No).

Link it from: waitlist banner, settings card, and your demo follow-up message.

---

## 9. Deploy to GitHub Pages (exact steps)

```bash
# 1. Scaffold (inside better-tailor-mvp/)
npm create vite@latest . -- --template react-ts
npm i
npm i -D tailwindcss @tailwindcss/vite gh-pages
npm i react-router-dom zustand html2canvas
```

```ts
// 2. vite.config.ts — base MUST match the repo name
export default defineConfig({
  base: '/better-tailor-mvp/',
  plugins: [react(), tailwindcss()],
})
```

```jsonc
// 3. package.json — add scripts
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

```bash
# 4. Create the GitHub repo and push
git init && git add -A && git commit -m "better tailor mvp"
gh repo create better-tailor-mvp --public --source=. --push

# 5. Deploy (builds then pushes dist/ to the gh-pages branch)
npm run deploy

# 6. One-time: repo Settings → Pages → Source: "Deploy from a branch" → gh-pages / root
#    (gh CLI equivalent:)
gh api repos/{owner}/better-tailor-mvp/pages -X POST -f "source[branch]=gh-pages" -f "source[path]=/"
```

Live at `https://<username>.github.io/better-tailor-mvp/` in ~1–2 minutes. **Redeploy = `npm run deploy`.** Use HashRouter so deep links/refresh never 404. Verify on a real phone via a WhatsApp-shared link (that's the actual distribution channel).

---

## 10. Demo script (5 minutes per tailor)

1. Open from home-screen icon ("it installs like an app — works on Android and iPhone").
2. Orders tab: point at **overdue in red** — "it nags you before the customer does."
3. Open Adaeze → her Gown measurements — "your book, but it can't get lost."
4. New order for her → measurements **auto-fill** — pause here, this is the aha.
5. Open the part-paid invoice → **balance due + your bank details** → tap **share on WhatsApp** and let their own WhatsApp open. Second aha.
6. Hand them the phone. Watch silently. Note what they tap first and where they stall (especially the camera button).
7. "If this existed today at ₦20,000 — once, not monthly — would you buy it?" Then: waitlist banner → form (or send the link to their WhatsApp).

**Log after each demo:** name, first tap, stall point, camera-button reaction, verbal price reaction, form submitted Y/N.

---

## 11. Pressure-test — honest risks going in

1. **Tailoric is free-to-start.** A ₦20k one-time ask competes with "free + IAP". The form's pricing section exists to measure this exact gap — treat "Yes but cheaper" clusters as real data, not failure.
2. **No cloud backup in the MVP** — but backup is a top Tailoric selling point and phone loss is THE nightmare for a measurements book. Expect tailors to ask; log every mention (it's your strongest premium-feature signal). Don't build it — probe it.
3. **iOS reach:** Tailoric is Android-only; the form's device question tells you if an iPhone-tailor segment actually exists (PWA = your cheap iOS story).
4. **One-time payment economics** are shaky long-term (support, updates, hosting). Fine for validation — the form's "monthly instead?" option hedges it.
5. **Demo ≠ daily use.** A tailor nodding in a demo is weak evidence; a WhatsApp number + email that answers your launch message is the asset. Optimize for contactable leads over compliments.
6. **Localization blind spot:** if demos reveal Yoruba/Hausa/Igbo or Pidgin requests, log it — it's a moat candidate the incumbent ignores.

---

## 12. Immediate next steps

1. Create the Google Form (§8) — 20 min, needed before the app links can go in.
2. Sign up at goatcounter.com → get the site code — 5 min.
3. Build Phases 1–5 (§7).
4. Deploy (§9), send yourself the link on WhatsApp, run the demo script on your own phone.
5. Book the first 5 tailor demos.
