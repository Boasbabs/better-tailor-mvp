import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { HomeHeader, HomeShell } from '../components/shell'
import { Icons, PillButton } from '../components/ui'
import { ConsultCard } from '../components/consult'
import { WaitlistBanner } from '../components/WaitlistBanner'
import { useCan } from '../components/staff'
import { consultUrgency, dayLabel, fmtTime, slotDate, whenLabel } from '../consult'
import type { Consultation } from '../types'

const FILTERS: ('upcoming' | 'past' | 'all')[] = ['upcoming', 'past', 'all']

const isPast = (c: Consultation) => c.status !== 'upcoming' || consultUrgency(c) === 'past'
const byWhen = (a: Consultation, b: Consultation) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)

/** Close enough that "in 25 min" beats naming the day. */
const imminent = (c: Consultation) => slotDate(c.date, c.time).getTime() - Date.now() < 45 * 60000

export default function Consultations() {
  const navigate = useNavigate()
  const consultations = useStore((s) => s.consultations)
  const canEdit = useCan('editRecords')
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  const upcoming = useMemo(() => consultations.filter((c) => !isPast(c)).sort(byWhen), [consultations])

  const list = useMemo(() => {
    if (filter === 'upcoming') return upcoming
    const past = consultations.filter(isPast).sort((a, b) => byWhen(b, a))
    return filter === 'past' ? past : [...upcoming, ...past]
  }, [consultations, upcoming, filter])

  const next = upcoming[0]

  return (
    <HomeShell active="calls">
      <HomeHeader />

      {/* The next call gets the dashboard slot the orders tab gives to due
          dates — on a tab about calls, when the next one is IS the headline.
          Once it is close, the countdown is worth more than the clock time. */}
      <div className="bg-card rounded-2xl shadow-sm p-5">
        {next ? (
          <>
            <div className="font-display font-bold text-[34px] leading-none tracking-tight">
              {consultUrgency(next) === 'now' ? 'now' : fmtTime(next.time)}
            </div>
            <div className="text-xs font-bold text-ink/45 mt-1.5">
              {next.name} · {consultUrgency(next) === 'now' ? 'happening now' : imminent(next) ? whenLabel(next) : dayLabel(next.date)}
            </div>
          </>
        ) : (
          <>
            <div className="font-display font-bold text-2xl leading-none">no calls booked</div>
            <div className="text-xs font-bold text-ink/45 lowercase mt-1.5">
              send a link and let customers pick a time
            </div>
          </>
        )}
      </div>

      <WaitlistBanner source="calls" className="mt-3" />

      {/* With nothing booked at all the headline card already says so, and
          filters over an empty set are noise — go straight to the one action. */}
      {consultations.length > 0 && (
        <>
          <div className="mt-4 flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-bold lowercase transition ${
                  filter === f ? 'bg-ink text-white' : 'bg-card text-ink/60 shadow-sm'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2 flex flex-col">
            {list.map((c) => (
              <ConsultCard key={c.id} consultation={c} />
            ))}
            {list.length === 0 && (
              <div className="text-center py-14 text-ink/35">
                <div className="text-3xl">📹</div>
                <div className="font-bold lowercase mt-2 text-sm">no {filter} calls</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* The share screen hands the link over on WhatsApp, addressed to a
          customer's number — intake, and the boss's job. */}
      {canEdit && (
        <PillButton className="w-full mt-4 flex items-center justify-center gap-2" onClick={() => navigate('/consult/share')}>
          {Icons.link('w-[18px] h-[18px]')} send a booking link
        </PillButton>
      )}
    </HomeShell>
  )
}
