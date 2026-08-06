# Consultation booking — screen gallery

Every screen and state in the fitting-call feature, captured from the running
app at 390×844 @2x. No mockups — each frame came from driving the real UI, and
the two customer-facing pages were reached through real encoded links.

Sending customers a form to type their own measurements produces wrong sizes,
and a bad fit is the tailor's bad review — not the customer's. This feature
replaces that: the customer books a short video call, and the tailor takes the
measurements *with* them, over the tape. The build spec for porting this to
native iOS and Android is [ADR 0005](../../adr/0005-consultation-booking.md).

**There is no backend.** The invitation and the booking both travel *inside the
URL*, and WhatsApp carries them both ways:

```
/consult/share  ──►  /book/:payload  ──►  /booked/:payload
   (tailor)          (customer's phone)      (tailor)
```

---

## 1. Setup — three questions, already answered

Days, hours, call length. Booking horizon (14 days) and minimum notice (2
hours) are fixed in code and never shown: every extra knob is one more place
setup gets abandoned. The defaults ship filled in, so a link works having
configured nothing.

| | |
|:--|:--|
| <img src="01-settings-fitting-calls.png" width="260"> | <img src="02-settings-meet-link.png" width="260"> |
| **01** — WhatsApp needs no link, because the phone number is already stored. | **02** — Meet and Zoom reveal one room-link field, reused on every booking. |

## 2. Sending the link

Two link kinds share one customer page: **bound** (one named customer) and
**open** (reusable — a stranger fills in their own details and becomes a
customer only when the tailor saves).

| | | |
|:--|:--|:--|
| <img src="03-share-open-link.png" width="230"> | <img src="04-share-customer-picker.png" width="230"> | <img src="05-share-bound-customer.png" width="230"> |
| **03** — The open link, with a plain-language summary of what the customer will see. | **04** — The same customer picker the order form uses. | **05** — Bound to one customer, with a way back to an open link. |

| | |
|:--|:--|
| <img src="06-share-needs-meeting-link.png" width="260"> | |
| **06** — Meet chosen but no room link saved. It warns and still lets the link go out; the customer is simply told the link is coming. | |

## 3. What the customer opens

Deliberately **not the app**: no tab bar, no wordmark, the tailor's business
name leading. The person holding this phone has never heard of better tailor
and is not being sold it.

| | | |
|:--|:--|:--|
| <img src="07-book-header-days.png" width="230"> | <img src="08-book-slots-taken.png" width="230"> | <img src="09-book-your-details.png" width="230"> |
| **07** — Business name first, then the day strip. Sunday is absent because the tailor does not work it. | **08** — Slots grouped morning / afternoon / evening. 9:00am is struck through — it was taken when the link was shared. | **09** — On an open link they type their own name and phone. |

| | | |
|:--|:--|:--|
| <img src="10-book-style-grid.png" width="230"> | <img src="11-book-photo-note.png" width="230"> | <img src="12-book-validation.png" width="230"> |
| **10** — What they want sewn, so the tailor can prepare — and so the call opens on the right measurement template. | **11** — The photo is downscaled in *their* browser to fit inside the link; the message also asks them to attach the full-size original to the chat. | **12** — Validation surfaces one message at a time, above the sticky confirm. |

### The bound link

| | |
|:--|:--|
| <img src="13-book-bound-greeting.png" width="260"> | <img src="14-book-bound-booking-as.png" width="260"> |
| **13** — Greeted by first name. | **14** — And never asked who they are: the name and phone fields become a "booking as" card. |

### Both ends of the round trip

| | |
|:--|:--|
| <img src="15-book-confirmed.png" width="260"> | <img src="16-book-broken-link.png" width="260"> |
| **15** — A tick, what was booked, and what happens next. The booking is not real until the WhatsApp message is actually sent, and the screen says so. | **16** — A link cut short in the chat is an expected outcome, not a crash. |

## 4. The booking comes back

The tailor taps the link in the WhatsApp message and lands here. **Nothing is
written until they tap save** — silently rewriting a tailor's book is the one
bug that ends trust.

| | | |
|:--|:--|:--|
| <img src="17-review-new-customer.png" width="230"> | <img src="18-review-clash.png" width="230"> | <img src="19-review-already-saved.png" width="230"> |
| **17** — A stranger from an open link, badged as a new customer that saving will create. | **18** — A link shared last week does not know about the bookings made since. It warns, still allows the save, and offers to propose another time. | **19** — Opening the same link twice does not double-book. |

Matching is by customer id on a bound link, falling back to phone number — so
the same person booking twice through the open link stays one customer.

## 5. The calls tab

| | | |
|:--|:--|:--|
| <img src="20-calls-next-headline.png" width="230"> | <img src="21-calls-past-filter.png" width="230"> | <img src="22-calls-empty.png" width="230"> |
| **20** — On a tab about calls, *when the next one is* is the headline — the slot the orders tab gives to due dates. | **21** — `upcoming · past · all`. | **22** — With nothing booked the filters would be noise, so they are gone and only the one useful action remains. |

## 6. The call console

One screen the tailor stays on for the whole call: start it, then type the
numbers as they are read back, with the words to say beside every field.

| | |
|:--|:--|
| <img src="23-call-console-top.png" width="260"> | <img src="24-call-console-measurements.png" width="260"> |
| **23** — When, who, what they want, and one button that starts the call. | **24** — Every field carries an instruction written to be read aloud. Values save to the customer's profile as they are typed, so the next order auto-fills from them. |

| | |
|:--|:--|
| <img src="25-call-cancel-confirm.png" width="260"> | <img src="26-call-done-next-order.png" width="260"> |
| **25** — Cancelling frees the slot but sends nothing; the dialog is explicit that telling the customer is still the tailor's job. | **26** — A finished call hands straight off to the thing it existed for. |

---

## Pill states worth knowing

The calls tab reuses the orders badge recipe — tinted background, saturated
same-hue text, leading dot — with its own urgency scale.

| Pill | When |
|---|---|
| `happening now` | Solid green. From 15 min before the start until the call's duration is up |
| `today at 10:00am` | Amber. Same calendar day |
| `tomorrow at 12:00pm` / `Fri 7 Aug at 2:00pm` | Blue within 2 days, grey beyond |
| `in 25 min` | Replaces the clock time once the call is under 45 minutes away |
| `done` / `cancelled` | Grey, and the row dims |

`happening now` is the only pill here allowed a solid fill, exactly as `overdue`
is on the orders tab.

---

## Reading the frames

Times run on **Africa/Lagos**, matching the demo shop, and the customer page
names the timezone (`times are in Lagos`) because the two phones may not share
one. Days and slots are generated relative to *now*, so the gallery shows a call
happening today and one tomorrow whenever it is opened — the same
computed-from-today approach the orders seed uses.
