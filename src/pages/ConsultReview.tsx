import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Avatar, Icons, PillButton, useToast } from '../components/ui'
import { StyleImage, styleName } from '../gallery'
import { decodeBooking, findClash, fmtDay, fmtTime, templateForStyle, whenLabel } from '../consult'
import { trackConsult, uid, waPhone } from '../lib'
import type { Consultation, Customer } from '../types'

// Where an incoming booking lands. Nothing is written until the tailor taps
// save — silently rewriting their book is the one bug that ends trust.

export default function ConsultReview() {
  const { payload } = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const show = useToast((s) => s.show)

  const settings = useStore((s) => s.settings)
  const templates = useStore((s) => s.templates)
  const customers = useStore((s) => s.customers)
  const consultations = useStore((s) => s.consultations)
  const addCustomer = useStore((s) => s.addCustomer)
  const addConsultation = useStore((s) => s.addConsultation)

  const booking = useMemo(() => decodeBooking(payload), [payload])

  // Bound link wins; otherwise a phone match stops the same person becoming two
  // customers when they book twice through the open link.
  const existing = useMemo(() => {
    if (!booking) return undefined
    if (booking.c) {
      const byId = customers.find((c) => c.id === booking.c)
      if (byId) return byId
    }
    const digits = waPhone(booking.h)
    return digits ? customers.find((c) => waPhone(c.phone) === digits) : undefined
  }, [booking, customers])

  const already = useMemo(
    () =>
      booking &&
      consultations.find(
        (c) => c.date === booking.d && c.time === booking.t && c.name === booking.n && c.status !== 'cancelled',
      ),
    [booking, consultations],
  )

  const duration = settings.availability.slotMins
  const clash = useMemo(
    () => booking && findClash(consultations, { date: booking.d, time: booking.t, durationMins: duration }),
    [booking, consultations, duration],
  )

  if (!booking) {
    return (
      <SubShell title="booking" backTo="/orders">
        <div className="text-center py-20 px-6">
          <div className="text-4xl">🔗</div>
          <div className="font-bold mt-3">this booking link didn't open properly</div>
          <p className="text-sm text-ink/45 mt-2">
            it was probably cut short when it was copied out of the chat. the details are still written out in the
            WhatsApp message itself.
          </p>
        </div>
      </SubShell>
    )
  }

  const name = existing?.name ?? booking.n
  const phone = booking.h || existing?.phone || ''
  const templateId = templateForStyle(
    booking.s,
    templates.map((t) => t.id),
  )

  const save = () => {
    let customerId = existing?.id
    if (!customerId) {
      const c: Customer = {
        id: uid(),
        name: booking.n,
        phone: booking.h,
        area: '',
        sets: [],
        createdAt: new Date().toISOString(),
      }
      addCustomer(c)
      customerId = c.id
    }
    const consultation: Consultation = {
      id: uid(),
      customerId,
      name,
      phone,
      date: booking.d,
      time: booking.t,
      durationMins: duration,
      channel: settings.callChannel,
      link: settings.callLink,
      styleId: booking.s,
      templateId,
      photo: booking.y,
      photoPending: booking.o === 1,
      note: booking.m,
      status: 'upcoming',
      createdAt: new Date().toISOString(),
    }
    addConsultation(consultation)
    trackConsult('saved')
    show('added to your calls ✓')
    navigate(`/consultations/${consultation.id}`, { replace: true })
  }

  return (
    <SubShell title="new booking" backTo="/orders">
      <div className="space-y-3 pb-8">
        {already ? (
          <Banner tone="bg-card2 text-ink/60">
            you have already saved this one.{' '}
            <button onClick={() => navigate(`/consultations/${already.id}`, { replace: true })} className="underline font-bold">
              open it
            </button>
          </Banner>
        ) : clash ? (
          <Banner tone="bg-[#FFF1DC] text-[#9A5B00]">
            <span className="font-bold">this time is already taken.</span> {clash.name} is booked for{' '}
            {fmtTime(clash.time)} on {fmtDay(clash.date)}. you can still save it, or offer them another time.
          </Banner>
        ) : null}

        {/* who */}
        <div className="bg-card rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <Avatar name={name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-lg leading-tight truncate">{name}</div>
            <div className="text-sm text-ink/50 font-medium">{phone || 'no phone'}</div>
            <div className="mt-1.5">
              {existing ? (
                <span className="text-[11px] font-bold bg-ink/[0.06] text-ink/55 rounded-full px-2.5 py-1">
                  already your customer
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-[#E4F5EC] text-[#12764B] rounded-full px-2.5 py-1">
                  new customer — will be added
                </span>
              )}
            </div>
          </div>
        </div>

        {/* when */}
        <div className="bg-card rounded-2xl shadow-sm p-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink/35">they picked</div>
          <div className="font-display font-bold text-xl mt-1">{fmtTime(booking.t)}</div>
          <div className="text-sm text-ink/55 font-medium">{fmtDay(booking.d)}</div>
          <div className="text-xs text-ink/40 mt-1">
            {duration} minutes · {whenLabel({ date: booking.d, time: booking.t })}
          </div>
        </div>

        {/* what */}
        {(booking.s || booking.y || booking.m) && (
          <div className="bg-card rounded-2xl shadow-sm p-5 space-y-3">
            {(booking.s || booking.y) && (
              <div className="flex items-center gap-3">
                {booking.y ? (
                  <img src={booking.y} alt="style they want" className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <StyleImage styleId={booking.s} className="w-16 h-16 rounded-xl" />
                )}
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-ink/35">wants</div>
                  <div className="font-bold">{booking.s ? styleName(booking.s) : 'a photo of a style'}</div>
                  {booking.o === 1 && <div className="text-xs text-ink/45">full photo is in your WhatsApp chat</div>}
                </div>
              </div>
            )}
            {booking.m && (
              <div className="bg-card2 rounded-xl p-3 text-sm text-ink/70">
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink/35 block mb-0.5">their note</span>
                {booking.m}
              </div>
            )}
          </div>
        )}

        {!already && (
          <>
            <PillButton className="w-full" onClick={save}>
              save this call
            </PillButton>
            {clash && (
              <button
                onClick={() => navigate(existing ? `/consult/share?customer=${existing.id}` : '/consult/share')}
                className="w-full text-sm font-bold text-ink/45 py-3 active:scale-95 transition"
              >
                offer them another time instead
              </button>
            )}
          </>
        )}

        {sp.get('preview') === '1' && (
          <p className="text-center text-[11px] text-ink/35 pt-2 flex items-center justify-center gap-1.5">
            {Icons.link('w-3.5 h-3.5')} in real use this screen opens from the WhatsApp message
          </p>
        )}
      </div>
    </SubShell>
  )
}

function Banner({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl p-4 text-sm font-medium ${tone}`}>{children}</div>
}
