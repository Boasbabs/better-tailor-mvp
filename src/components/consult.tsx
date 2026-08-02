import { Link } from 'react-router-dom'
import type { Availability, Consultation } from '../types'
import { consultUrgency, whenLabel } from '../consult'
import { StyleImage, styleName } from '../gallery'
import { Icons } from './ui'

// ---------- when pill ----------
// Same badge recipe as StatusPill/DuePill: soft tinted background, saturated
// same-hue text, leading dot. A call that is happening right now is the only
// one allowed a solid fill — it is the loudest thing on the orders screen.

const TONES: Record<string, { tone: string; dot: string }> = {
  now: { tone: 'bg-ok text-white', dot: 'bg-white' },
  today: { tone: 'bg-[#FFF1DC] text-[#9A5B00]', dot: 'bg-[#E89100]' },
  soon: { tone: 'bg-[#EAEEFF] text-[#3B4FD8]', dot: 'bg-[#3B4FD8]' },
  later: { tone: 'bg-ink/[0.06] text-ink/45', dot: 'bg-ink/25' },
  past: { tone: 'bg-ink/[0.06] text-ink/45', dot: 'bg-ink/25' },
}

export function WhenPill({ consultation }: { consultation: Consultation }) {
  const u = consultUrgency(consultation)
  const { tone, dot } =
    consultation.status === 'cancelled'
      ? { tone: 'bg-ink/[0.06] text-ink/45', dot: 'bg-ink/25' }
      : TONES[u]
  const label =
    consultation.status === 'cancelled'
      ? 'cancelled'
      : consultation.status === 'done'
        ? 'done'
        : u === 'now'
          ? 'happening now'
          : whenLabel(consultation)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-1 text-[11px] font-bold ${tone}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

// ---------- style thumbnail ----------
// The photo the customer sent rides inside the link at ~150px. Where it did not
// fit, say so plainly rather than showing an empty frame — the tailor needs to
// know to look in the chat.

export function StyleThumb({ consultation, className = 'w-14 h-14' }: { consultation: Consultation; className?: string }) {
  if (consultation.photo)
    return <img src={consultation.photo} alt="style they want" className={`${className} rounded-xl object-cover bg-card2`} />
  if (consultation.styleId)
    return <StyleImage styleId={consultation.styleId} className={`${className} rounded-xl`} />
  return <div className={`${className} rounded-xl bg-card2`} />
}

// ---------- list row ----------

export function ConsultCard({ consultation }: { consultation: Consultation }) {
  const dim = consultation.status !== 'upcoming'
  return (
    <Link
      to={`/consultations/${consultation.id}`}
      className={`bg-card rounded-2xl shadow-sm p-3.5 flex items-center gap-3 active:scale-[0.98] transition ${dim ? 'opacity-60' : ''}`}
    >
      <StyleThumb consultation={consultation} />
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{consultation.name}</div>
        <div className="text-xs text-ink/45 truncate">
          {consultation.styleId ? styleName(consultation.styleId).toLowerCase() : 'fitting call'} ·{' '}
          {consultation.durationMins} min
        </div>
        <div className="mt-1.5">
          <WhenPill consultation={consultation} />
        </div>
      </div>
      {Icons.chevron('w-5 h-5 text-ink/25 shrink-0')}
    </Link>
  )
}

// ---------- availability editor ----------
// The Beside "preferred hours" shape: day circles, one time range, and the call
// length. Everything else about scheduling is fixed in code.

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const LENGTHS = [15, 30, 45]

export function AvailabilityEditor({
  value,
  onChange,
}: {
  value: Availability
  onChange: (a: Availability) => void
}) {
  // The store repairs availability on every load, so this should never fire —
  // but reading .days off a partial object is what blanked the settings page
  // once, and a settings screen must never be the thing that cannot open.
  const days = Array.isArray(value?.days) ? value.days : []

  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort()
    onChange({ ...value, days: next })
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm p-4 space-y-4">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-2">days you take calls</div>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, d) => {
            const on = days.includes(d)
            return (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                aria-pressed={on}
                className={`w-9 h-9 rounded-full text-xs font-bold transition active:scale-90 ${
                  on ? 'bg-ink text-white' : 'bg-card2 text-ink/40'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-1.5">from</div>
          <input
            type="time"
            className="w-full bg-card2 rounded-xl px-3 py-2.5 font-bold font-display outline-none"
            value={value?.from ?? ''}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-1.5">to</div>
          <input
            type="time"
            className="w-full bg-card2 rounded-xl px-3 py-2.5 font-bold font-display outline-none"
            value={value?.to ?? ''}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </div>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-2">how long is a call</div>
        <div className="flex gap-2">
          {LENGTHS.map((m) => (
            <button
              key={m}
              onClick={() => onChange({ ...value, slotMins: m })}
              className={`flex-1 rounded-full py-2.5 text-xs font-bold transition active:scale-95 ${
                value?.slotMins === m ? 'bg-ink text-white' : 'bg-card2 text-ink/50'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
