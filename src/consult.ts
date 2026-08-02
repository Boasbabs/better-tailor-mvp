// Consultation booking links.
//
// There is no backend, so the invitation and the booking both travel *inside*
// the URL: the tailor's phone encodes when it is free, the customer's phone
// encodes what they picked, and WhatsApp carries both. Keys are single letters
// because the whole payload has to survive being pasted into a chat.

import type { Availability, CallChannel, Consultation, Settings } from './types'

// ---------- fixed rules ----------
// Deliberately not settings. Every knob a tailor has to answer is one more
// place setup gets abandoned, and these three defaults are almost never wrong
// at a one-person shop.

export const HORIZON_DAYS = 14
export const MIN_NOTICE_MINS = 120
/** Past this, WhatsApp and browser address bars start to be a gamble. */
export const MAX_LINK_CHARS = 5000

// ---------- payloads ----------

/** What the tailor sends out. `c`/`n` are empty for an open (reusable) link. */
export type InvitePayload = {
  v: 1
  b: string // business name
  g: string // tagline
  p: string // tailor phone — the booking is addressed back to this
  z: string // tailor's timezone label, so the customer knows whose clock it is
  c: string // customer id ('' = open link)
  n: string // customer name ('' = open link)
  a: Availability
  k: CallChannel
  x: string[] // slot keys already taken at the moment the link was shared
}

/** What the customer sends back. */
export type BookingPayload = {
  v: 1
  c: string // customer id if the link was bound, else ''
  n: string // customer name
  h: string // phone
  d: string // 'YYYY-MM-DD'
  t: string // 'HH:MM'
  s: string // style id — what they want sewn
  y: string // style photo thumbnail (data URL), '' if none or too big
  o: 0 | 1 // 1 = they attached a photo that did not fit; it comes over WhatsApp
  m: string // free-text note
}

// ---------- base64url ----------
// Plain btoa would emit +, / and = — all of which get mangled somewhere between
// a WhatsApp message, a hash route and a paste into a browser bar.

function b64urlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(token: string): string {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(padded)
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)))
}

export const encodePayload = (p: InvitePayload | BookingPayload) => b64urlEncode(JSON.stringify(p))

/** Returns null rather than throwing — a mangled link is an expected outcome. */
export function decodeInvite(token?: string): InvitePayload | null {
  try {
    const p = JSON.parse(b64urlDecode(token ?? '')) as InvitePayload
    return p && p.v === 1 && p.a && Array.isArray(p.a.days) ? p : null
  } catch {
    return null
  }
}

export function decodeBooking(token?: string): BookingPayload | null {
  try {
    const p = JSON.parse(b64urlDecode(token ?? '')) as BookingPayload
    return p && p.v === 1 && typeof p.d === 'string' && typeof p.t === 'string' ? p : null
  } catch {
    return null
  }
}

// ---------- links ----------

// origin + pathname works for both `localhost:5173/` and the GH Pages
// `/better-tailor-mvp/` base; HashRouter keeps everything after the #.
function appBase(): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname.replace(/index\.html$/, '')}`
}

export const bookLink = (p: InvitePayload) => `${appBase()}#/book/${encodePayload(p)}`

export const savedLink = (p: BookingPayload) => `${appBase()}#/booked/${encodePayload(p)}`

/**
 * The photo is the one part of a booking that can blow the URL budget. Drop it
 * (flagging that it is coming over WhatsApp instead) rather than minting a link
 * too long to survive the trip.
 */
export function savedLinkWithinBudget(p: BookingPayload): { url: string; payload: BookingPayload } {
  const full = savedLink(p)
  if (full.length <= MAX_LINK_CHARS) return { url: full, payload: p }
  const trimmed: BookingPayload = { ...p, y: '', o: p.y || p.o ? 1 : 0 }
  return { url: savedLink(trimmed), payload: trimmed }
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`
}

export function tzLabel(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    return (tz.split('/').pop() ?? '').replace(/_/g, ' ')
  } catch {
    return ''
  }
}

export function inviteFor(
  settings: Settings,
  consultations: Consultation[],
  customer?: { id: string; name: string },
): InvitePayload {
  return {
    v: 1,
    b: settings.businessName,
    g: settings.tagline,
    p: settings.phone,
    z: tzLabel(),
    c: customer?.id ?? '',
    n: customer?.name ?? '',
    a: settings.availability,
    k: settings.callChannel,
    x: takenKeys(consultations),
  }
}

// ---------- slots ----------

export const slotKey = (date: string, time: string) => `${date}T${time}`

export const takenKeys = (consultations: Consultation[]) =>
  consultations.filter((c) => c.status === 'upcoming').map((c) => slotKey(c.date, c.time))

const pad = (n: number) => String(n).padStart(2, '0')

export const toMins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export const toHHMM = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`

export const dateISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Local-time parse — a bare `new Date('2026-08-05')` would be treated as UTC. */
export const slotDate = (date: string, time: string) => new Date(`${date}T${time}:00`)

export type Slot = { time: string; taken: boolean }
export type BookableDay = {
  date: string
  weekday: string // 'Mon'
  dayNum: string // '05'
  month: string // 'Aug'
  slots: Slot[]
  open: number // slots still bookable
}

/**
 * Every working day inside the horizon, with its slots. Days with no slots left
 * are kept in the strip and shown as fully booked rather than silently vanishing
 * — a gap in the dates reads as a bug to the person tapping.
 */
export function bookableDays(av: Availability, taken: string[], now = new Date()): BookableDay[] {
  const takenSet = new Set(taken)
  const earliest = now.getTime() + MIN_NOTICE_MINS * 60000
  const start = toMins(av.from)
  const end = toMins(av.to)
  const step = av.slotMins > 0 ? av.slotMins : 30
  const days: BookableDay[] = []

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    if (!av.days.includes(d.getDay())) continue
    const date = dateISO(d)
    const slots: Slot[] = []
    for (let m = start; m + step <= end; m += step) {
      const time = toHHMM(m)
      if (slotDate(date, time).getTime() < earliest) continue
      slots.push({ time, taken: takenSet.has(slotKey(date, time)) })
    }
    if (slots.length === 0) continue
    days.push({
      date,
      weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayNum: pad(d.getDate()),
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
      slots,
      open: slots.filter((s) => !s.taken).length,
    })
  }
  return days
}

export type PartOfDay = 'morning' | 'afternoon' | 'evening'

export const partOfDay = (time: string): PartOfDay => {
  const m = toMins(time)
  if (m < 12 * 60) return 'morning'
  if (m < 17 * 60) return 'afternoon'
  return 'evening'
}

/** Slots grouped the way Fresha, Preply and Alan all group them. */
export function groupSlots(slots: Slot[]): [PartOfDay, Slot[]][] {
  const parts: PartOfDay[] = ['morning', 'afternoon', 'evening']
  return parts
    .map((p) => [p, slots.filter((s) => partOfDay(s.time) === p)] as [PartOfDay, Slot[]])
    .filter(([, list]) => list.length > 0)
}

// ---------- time labels ----------

export function fmtTime(time: string): string {
  const m = toMins(time)
  const h24 = Math.floor(m / 60)
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${pad(m % 60)}${h24 < 12 ? 'am' : 'pm'}`
}

export function fmtDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

const startOfDay = (d: Date) => {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

/** Whole-day difference, so "tomorrow" survives a call booked at 11pm. */
export function daysBetween(date: string, now = new Date()): number {
  const a = startOfDay(new Date(`${date}T00:00:00`))
  const b = startOfDay(now)
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

/** Just the day, for places that already show the time beside it. */
export function dayLabel(date: string, now = new Date()): string {
  const days = daysBetween(date, now)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export type ConsultUrgency = 'now' | 'today' | 'soon' | 'later' | 'past'

export function consultUrgency(c: Pick<Consultation, 'date' | 'time' | 'durationMins'>, now = new Date()): ConsultUrgency {
  const start = slotDate(c.date, c.time).getTime()
  const t = now.getTime()
  if (t >= start - 15 * 60000 && t <= start + c.durationMins * 60000) return 'now'
  if (t > start) return 'past'
  const days = daysBetween(c.date, now)
  if (days === 0) return 'today'
  if (days <= 2) return 'soon'
  return 'later'
}

export function whenLabel(c: Pick<Consultation, 'date' | 'time'>, now = new Date()): string {
  const start = slotDate(c.date, c.time)
  const mins = Math.round((start.getTime() - now.getTime()) / 60000)
  if (mins <= -60 * 24) return `was ${Math.round(-mins / (60 * 24))} days ago`
  if (mins < -1) return `started ${-mins} min ago`
  if (mins < 45) return `in ${Math.max(mins, 1)} min`
  const days = daysBetween(c.date, now)
  if (days === 0) return `today at ${fmtTime(c.time)}`
  if (days === 1) return `tomorrow at ${fmtTime(c.time)}`
  return `${new Date(`${c.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${fmtTime(c.time)}`
}

// ---------- clashes ----------

/**
 * A link the tailor shared last week does not know about the bookings made
 * since, so an incoming booking can land on a slot that has filled up. Overlap,
 * not equality — a 30-minute call at 10:15 collides with one at 10:00.
 */
export function findClash(
  consultations: Consultation[],
  booking: { date: string; time: string; durationMins: number },
  ignoreId?: string,
): Consultation | undefined {
  const start = slotDate(booking.date, booking.time).getTime()
  const end = start + booking.durationMins * 60000
  return consultations.find((c) => {
    if (c.status !== 'upcoming' || c.id === ignoreId) return false
    const s = slotDate(c.date, c.time).getTime()
    return s < end && s + c.durationMins * 60000 > start
  })
}

// ---------- channel ----------

export const CHANNELS: { id: CallChannel; name: string; hint: string }[] = [
  { id: 'whatsapp', name: 'WhatsApp video call', hint: 'no link needed — you call their number at the time' },
  { id: 'meet', name: 'Google Meet', hint: 'paste your meeting room link — it goes on every booking' },
  { id: 'zoom', name: 'Zoom', hint: 'paste your personal meeting room link — it goes on every booking' },
]

export const channelName = (id: CallChannel) => CHANNELS.find((c) => c.id === id)?.name ?? 'call'

/** What the customer is told to expect, in the confirmation and the message. */
export function channelBlurb(id: CallChannel, link: string): string {
  if (id === 'whatsapp') return 'They will video-call you on WhatsApp at this time.'
  if (link) return `Join here at this time: ${link}`
  return `They will send you the ${channelName(id)} link before the call.`
}

export function joinUrl(c: Pick<Consultation, 'channel' | 'link' | 'phone'>): string {
  if (c.channel === 'whatsapp') return `https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`
  return c.link
}

// ---------- style → template ----------
// A best guess so the call console opens on the right fields instead of a
// chooser. The tailor can switch template in one tap if it guessed wrong.

const STYLE_TEMPLATE: Record<string, string> = {
  agbada: 't-agbada',
  senator: 't-agbada',
  kaftan: 't-agbada',
  dashiki: 't-agbada',
  shirt: 't-agbada',
  suit: 't-agbada',
  trouser: 't-trouser',
  gown: 't-gown',
}

export function templateForStyle(styleId: string, templateIds: string[]): string {
  const guess = STYLE_TEMPLATE[styleId]
  if (guess && templateIds.includes(guess)) return guess
  return templateIds[0] ?? ''
}

// ---------- style photo ----------
// The customer's photo has to fit inside a URL, so it is downscaled to a
// thumbnail in their own browser before it ever becomes a link. It is a
// reminder of the style, not a substitute for the full picture — which the
// WhatsApp message asks them to attach to the chat as well.

export const THUMB_MAX_CHARS = 3400

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('could not read that image'))
    }
    img.src = url
  })
}

/** Returns '' when nothing small enough could be produced — never throws. */
export async function makeThumb(file: File): Promise<string> {
  try {
    const img = await loadImage(file)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    for (const size of [180, 150, 120, 96]) {
      const scale = size / Math.max(img.width, img.height)
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.5, 0.4, 0.3]) {
        const url = canvas.toDataURL('image/jpeg', quality)
        if (url.length <= THUMB_MAX_CHARS) return url
      }
    }
    return ''
  } catch {
    return ''
  }
}

// ---------- whatsapp messages ----------

export function inviteMessage(p: InvitePayload): string {
  const hi = p.n ? `Hi ${p.n.split(' ')[0]} 👋` : 'Hi 👋'
  return [
    hi,
    '',
    `It's ${p.b}. Before we start sewing, let's have a quick ${channelName(p.k).toLowerCase()} so I can take your measurements properly with you.`,
    '',
    'Pick a time that suits you here — takes a minute, nothing to install:',
    bookLink(p),
    '',
    'Thank you! 🙏',
  ].join('\n')
}

/**
 * Mirrors the invoice share: the details stay readable in the chat so the
 * tailor still has the booking even if the link is never tapped.
 */
export function bookingMessage(p: BookingPayload, url: string, styleLabel: string): string {
  const lines = [
    `*CONSULTATION BOOKED — ${p.n}*`,
    '─────────────',
    `When ....... ${fmtDay(p.d)}`,
    `Time ....... ${fmtTime(p.t)}`,
    `Phone ....... ${p.h}`,
  ]
  if (styleLabel) lines.push(`Wants ....... ${styleLabel}`)
  if (p.m) lines.push('─────────────', `Note: ${p.m}`)
  lines.push('─────────────', `Tap to save it: ${url}`)
  if (p.o) lines.push('', '📎 Sending the photo of the style I want in this chat.')
  return lines.join('\n')
}

export function reminderMessage(c: Consultation, settings: Settings): string {
  return [
    `Hi ${c.name.split(' ')[0]} 👋`,
    '',
    `Reminder from ${settings.businessName}: our fitting call is on ${fmtDay(c.date)} at ${fmtTime(c.time)}.`,
    '',
    channelBlurb(c.channel, c.link),
    '',
    'Please have a soft tape measure ready if you can. See you then! 🙏',
  ].join('\n')
}

// ---------- what the tailor says on the call ----------
// One instruction per field, in the plain-imperative voice H&M, Gymshark and
// Zalando all use on their how-to-measure pages — written to be read aloud to
// whoever is holding the tape. Longest keys first so "sleeve length" is not
// answered by the "sleeve" rule.

const HINTS: [string, string][] = [
  ['sleeve length', 'from your shoulder tip down to where the sleeve should end'],
  ['trouser length', 'from your waist down the outside of your leg to your ankle'],
  ['gown length', 'from your shoulder straight down to where the gown should end'],
  ['blouse length', 'from your shoulder down to where the blouse should end'],
  ['skirt length', 'from your waist down to where the skirt should end'],
  ['top length', 'from your shoulder down to where the top should end'],
  ['shoulder', 'across your back, from the tip of one shoulder to the other'],
  ['sleeve', 'from your shoulder tip down to where the sleeve should end'],
  ['chest', 'around the fullest part of your chest, arms down at your sides'],
  ['bust', 'around the fullest part of your bust, arms down at your sides'],
  ['waist', "around the narrowest part of your waist — don't pull the tape tight"],
  ['thigh', 'around the fullest part of one thigh'],
  ['ankle', 'around your ankle, leaving room to get your foot through'],
  ['wrist', 'around your wrist bone, with one finger under the tape'],
  ['neck', 'around the base of your neck, with one finger under the tape'],
  ['hip', 'around the fullest part of your hips and bottom'],
  ['back', 'across your back, from one armhole to the other'],
  ['length', 'from the top down to where you want it to end'],
]

export function hintFor(field: string): string {
  const f = field.toLowerCase()
  for (const [key, hint] of HINTS) if (f.includes(key)) return hint
  return 'keep the tape flat against the body — snug, never tight'
}
