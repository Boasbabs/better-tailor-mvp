// Self-measurement links.
//
// There is no backend, so the request and the reply both travel *inside* the
// URL: the tailor's phone encodes what it wants, the customer's phone encodes
// what they typed, and WhatsApp carries both. Keys are single letters because
// the whole payload has to survive being pasted into a chat.

import type { MeasurementSet } from './types'

// ---------- payloads ----------

/** What the tailor sends out. `c`/`n` are empty for an open (unbound) link. */
export type RequestPayload = {
  v: 1
  r: string // request id
  b: string // business name
  g: string // tagline
  p: string // tailor phone — the reply is addressed back to this
  c: string // customer id ('' = open link)
  n: string // customer name ('' = open link)
  s: { i: string; n: string; f: string[] }[] // templateId, template name, fields
}

/** What the customer sends back. Values are always already in inches. */
export type ReplyPayload = {
  v: 1
  r: string
  c: string // customer id if the link was bound, else ''
  n: string // customer name (typed by them on an open link)
  h: string // phone (open link only)
  u: 'in' | 'cm' // what they *typed* in — values below are converted
  m: string // free-text note
  t: number // submitted-at epoch ms
  s: { i: string; n: string; v: Record<string, number | string> }[]
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

export const encodePayload = (p: RequestPayload | ReplyPayload) => b64urlEncode(JSON.stringify(p))

/** Returns null rather than throwing — a mangled link is an expected outcome here. */
export function decodeRequest(token?: string): RequestPayload | null {
  try {
    const p = JSON.parse(b64urlDecode(token ?? '')) as RequestPayload
    return p && p.v === 1 && Array.isArray(p.s) ? p : null
  } catch {
    return null
  }
}

export function decodeReply(token?: string): ReplyPayload | null {
  try {
    const p = JSON.parse(b64urlDecode(token ?? '')) as ReplyPayload
    return p && p.v === 1 && Array.isArray(p.s) ? p : null
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

export const fillLink = (p: RequestPayload, demo = false) =>
  `${appBase()}#/fill/${encodePayload(p)}${demo ? '?demo=1' : ''}`

export const replyLink = (p: ReplyPayload) => `${appBase()}#/received/${encodePayload(p)}`

// ---------- whatsapp text ----------

export function waLink(phone: string, text: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function requestMessage(p: RequestPayload): string {
  const hi = p.n ? `Hi ${p.n.split(' ')[0]} 👋` : 'Hi 👋'
  const what = p.s.map((s) => s.n).join(' and ')
  return [
    hi,
    '',
    `It's ${p.b}. Please tap the link below and fill in your measurements for ${what} — takes 2 minutes, nothing to install.`,
    '',
    fillLink(p),
    '',
    'Thank you! 🙏',
  ].join('\n')
}

// Mirrors whatsappInvoiceText: the numbers stay readable in the chat so the
// tailor still has them even if the link never gets tapped.
export function replyMessage(p: ReplyPayload, businessName: string): string {
  const lines: string[] = [`*MEASUREMENTS — ${p.n}*`, `for ${businessName}`, '─────────────']
  for (const set of p.s) {
    lines.push(`*${set.n}*`)
    for (const [field, value] of Object.entries(set.v)) lines.push(`${field} ....... ${value}"`)
  }
  if (p.m) lines.push('─────────────', `Note: ${p.m}`)
  if (p.u === 'cm') lines.push('(measured in cm, converted to inches)')
  lines.push('─────────────', `Tap to save: ${replyLink(p)}`)
  return lines.join('\n')
}

// ---------- units ----------

export const CM_PER_INCH = 2.54

/** Only numbers convert — a customer who typed "38 1/2" keeps their string. */
export function toInches(raw: string, unit: 'in' | 'cm'): number | string {
  const trimmed = raw.trim()
  const n = Number(trimmed)
  if (trimmed === '' || !Number.isFinite(n)) return trimmed
  return unit === 'cm' ? Math.round((n / CM_PER_INCH) * 10) / 10 : n
}

// ---------- guidance ----------
// One instruction per field, in the plain-imperative voice H&M, Gymshark and
// Zalando all use on their how-to-measure screens. Longest keys first so
// "sleeve length" doesn't get answered by the "sleeve" rule.

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
  return 'keep the tape flat against your body — snug, never tight'
}

export const TAPE_TIPS = [
  'use a soft tape measure, not a metal builder’s tape',
  'wear light clothes — no jacket or heavy wrapper',
  'keep the tape flat and snug, never pulled tight',
  'ask someone to help you if you can — it’s more accurate',
]

// ---------- misc ----------

export function agoLabel(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** Non-empty values only — a blank must never wipe a measurement the tailor took by hand. */
export function mergeIntoSets(sets: MeasurementSet[], incoming: ReplyPayload['s']): MeasurementSet[] {
  const next = sets.map((s) => ({ ...s, values: { ...s.values } }))
  for (const inc of incoming) {
    const values = Object.fromEntries(Object.entries(inc.v).filter(([, v]) => v !== '' && v !== undefined))
    const existing = next.find((s) => s.templateId === inc.i)
    if (existing) existing.values = { ...existing.values, ...values }
    else next.push({ templateId: inc.i, values })
  }
  return next
}
