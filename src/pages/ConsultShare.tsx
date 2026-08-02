import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Avatar, FieldLabel, Icons, PillButton, useToast } from '../components/ui'
import { CustomerPickerSheet } from '../components/pickers'
import { bookLink, bookableDays, channelName, encodePayload, fmtTime, inviteFor, inviteMessage, waLink } from '../consult'
import { trackConsult } from '../lib'
import type { Customer } from '../types'

export default function ConsultShare() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const show = useToast((s) => s.show)

  const settings = useStore((s) => s.settings)
  const customers = useStore((s) => s.customers)
  const consultations = useStore((s) => s.consultations)

  const [customerId, setCustomerId] = useState(sp.get('customer') ?? '')
  const [pickCustomer, setPickCustomer] = useState(false)

  const customer = customers.find((c) => c.id === customerId)
  const invite = useMemo(
    () => inviteFor(settings, consultations, customer),
    [settings, consultations, customer],
  )
  const days = useMemo(() => bookableDays(invite.a, invite.x), [invite])
  const openSlots = days.reduce((n, d) => n + d.open, 0)

  const av = settings.availability
  const needsLink = settings.callChannel !== 'whatsapp' && !settings.callLink.trim()

  const shareWhatsApp = () => {
    trackConsult('link-shared')
    // No number on an open link — WhatsApp opens its own "share with" picker.
    window.open(waLink(customer?.phone ?? '', inviteMessage(invite)), '_blank')
  }

  const copyLink = async () => {
    trackConsult('link-shared')
    try {
      await navigator.clipboard.writeText(bookLink(invite))
      show('link copied ✓')
    } catch {
      show('could not copy — use share on WhatsApp')
    }
  }

  const preview = () => navigate(`/book/${encodePayload(invite)}?preview=1`)

  return (
    <SubShell title="send a booking link">
      <div className="space-y-5 pb-8">
        <p className="text-[13px] text-ink/50 -mt-1">
          your customer picks a time from the hours you keep. you get their booking on WhatsApp, and take their
          measurements together on the call.
        </p>

        {/* who it is for */}
        <div>
          <FieldLabel>who is it for</FieldLabel>
          <button
            onClick={() => setPickCustomer(true)}
            className="w-full bg-card rounded-2xl shadow-sm p-3 flex items-center gap-3 text-left active:scale-[0.98] transition"
          >
            {customer ? (
              <>
                <Avatar name={customer.name} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{customer.name}</div>
                  <div className="text-xs text-ink/50">{customer.phone || 'no phone'}</div>
                </div>
              </>
            ) : (
              <>
                <div className="w-11 h-11 shrink-0 rounded-full bg-card2 grid place-items-center text-ink/45">
                  {Icons.link('w-[18px] h-[18px]')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">anyone (open link)</div>
                  <div className="text-xs text-ink/50">they type their name and phone themselves</div>
                </div>
              </>
            )}
            <span className="text-ink/30 text-sm font-bold shrink-0">change</span>
          </button>
          {customer && (
            <button onClick={() => setCustomerId('')} className="mt-2 ml-1 text-xs font-bold text-ink/40 active:scale-95 transition">
              use an open link instead
            </button>
          )}
        </div>

        {/* what they will see */}
        <div>
          <FieldLabel>what they will see</FieldLabel>
          <div className="bg-card rounded-2xl shadow-sm p-4 space-y-2.5">
            <Row icon={Icons.calendar('w-[18px] h-[18px]')} label={dayLabel(av.days)} />
            <Row
              icon={Icons.clock('w-[18px] h-[18px]')}
              label={`${fmtTime(av.from)} – ${fmtTime(av.to)} · ${av.slotMins} min calls`}
            />
            <Row icon={Icons.video('w-[18px] h-[18px]')} label={channelName(settings.callChannel)} />
            <div className="pt-1 text-xs text-ink/45 border-t border-ink/5">
              {openSlots > 0 ? (
                <>
                  <span className="font-bold text-ink/60">{openSlots} times free</span> over the next 2 weeks · change your
                  hours in settings
                </>
              ) : (
                <>no free times in the next 2 weeks — widen your hours in settings</>
              )}
            </div>
          </div>
        </div>

        {needsLink && (
          <div className="bg-[#FFF1DC] text-[#9A5B00] rounded-2xl p-4 text-sm font-semibold">
            you picked {channelName(settings.callChannel)} but have not saved your meeting link yet — customers will be
            told you will send it before the call.{' '}
            <button onClick={() => navigate('/settings')} className="underline font-bold">
              add it in settings
            </button>
          </div>
        )}

        <div className="space-y-2">
          <PillButton variant="whatsapp" className="w-full flex items-center justify-center gap-2" onClick={shareWhatsApp} disabled={openSlots === 0}>
            {Icons.whatsapp('w-5 h-5')} send on WhatsApp
          </PillButton>
          <PillButton variant="light" className="w-full" onClick={copyLink} disabled={openSlots === 0}>
            copy the link
          </PillButton>
          <button
            onClick={preview}
            disabled={openSlots === 0}
            className="w-full text-center text-sm font-bold text-ink/45 py-3 active:scale-95 transition disabled:opacity-30"
          >
            preview it as your customer →
          </button>
        </div>
      </div>

      <CustomerPickerSheet
        open={pickCustomer}
        onClose={() => setPickCustomer(false)}
        onPick={(c: Customer) => {
          setCustomerId(c.id)
          setPickCustomer(false)
        }}
      />
    </SubShell>
  )
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-semibold">
      <span className="text-ink/35 shrink-0">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  )
}

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "Mon–Sat" when the days are a run, "Mon, Wed, Fri" when they are not. */
function dayLabel(days: number[]): string {
  if (days.length === 0) return 'no days selected'
  if (days.length === 7) return 'every day'
  const sorted = [...days].sort((a, b) => a - b)
  const isRun = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1)
  if (isRun && sorted.length > 2) return `${NAMES[sorted[0]]}–${NAMES[sorted[sorted.length - 1]]}`
  return sorted.map((d) => NAMES[d]).join(', ')
}
