import type { Staff, StaffRole } from './types'

// Every gate in the app resolves through `can()`. Screens never test the role
// string themselves — a role comparison scattered across twelve files is how a
// permission system ends up with one page that forgot to check.

export type Ability =
  /** see prices, deposits, balances and the unpaid figure */
  | 'money'
  /** read a customer's phone, email and address — and reach the call/WhatsApp buttons */
  | 'contacts'
  /** the invoices tab and everything that leads to it */
  | 'invoices'
  /** create, edit and assign orders, customers and fitting calls */
  | 'editRecords'
  /** delete customers, orders, templates; reset the demo */
  | 'deleteRecords'
  /** decide who sews what */
  | 'assignWork'
  /** add people, set roles and PINs */
  | 'manageStaff'
  /** business name, bank details, fitting-call setup */
  | 'businessSettings'

export function can(me: Staff | undefined, ability: Ability): boolean {
  if (!me) return false
  if (me.role === 'owner') return true

  // The one override the boss can grant per person. Managers get it from their
  // role; for a tailor it is the switch on their staff page.
  if (ability === 'contacts') return me.role === 'manager' || me.canSeeContacts

  // A manager runs the shop but does not own it: no hiring, no bank details.
  if (me.role === 'manager') return ability !== 'manageStaff' && ability !== 'businessSettings'

  // Tailors sew. They advance an order's status — which is never gated — and
  // nothing else on this list.
  return false
}

// ---------- roles ----------
// Each option carries the sentence that explains it, so the boss picks a role
// by reading the consequence rather than guessing what the word means.

export const ROLES: { id: StaffRole; name: string; blurb: string }[] = [
  {
    id: 'tailor',
    name: 'tailor',
    blurb: 'sees orders, measurements and fitting calls. no prices, no customer contacts, and can’t add or delete anything.',
  },
  {
    id: 'manager',
    name: 'manager',
    blurb: 'runs the shop day to day — orders, invoices, money and customer contacts. can’t manage staff or change your bank details.',
  },
  {
    id: 'owner',
    name: 'owner',
    blurb: 'everything, including staff, bank details and the booking link.',
  },
]

// ---------- masking ----------
// A dot string rather than a blur or a truncation: "0803•••4567" still leaks
// enough to look someone up, and a blur can be screenshotted and sharpened.

export const MASK = '•••'
export const MASK_PHONE = '••• ••• ••••'

/** `value` when allowed, dots when not — and nothing at all when the field is
 *  empty, so a blank address doesn't masquerade as hidden data. */
export function masked(value: string | undefined, allowed: boolean, mask = MASK): string {
  if (!value) return ''
  return allowed ? value : mask
}

// ---------- pin ----------

export const PIN_LENGTH = 4

/** New hires get a working PIN the moment they're created, so a staff member
 *  can never exist in a tappable-straight-through state. The boss reads it out
 *  and can change it on the same screen. */
export function randomPin(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 10 ** PIN_LENGTH
  return String(n).padStart(PIN_LENGTH, '0')
}

// ---------- last active ----------

export function lastActiveLabel(iso: string): string {
  if (!iso) return 'never signed in'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'active now'
  if (mins < 60) return `active ${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `active ${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'active yesterday' : `active ${days} days ago`
}
