import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  bookableDays,
  bookingMessage,
  channelBlurb,
  decodeInvite,
  encodePayload,
  fmtDay,
  fmtTime,
  groupSlots,
  makeThumb,
  savedLinkWithinBudget,
  waLink,
  type BookingPayload,
} from '../consult'
import { STYLES, StyleImage, styleName } from '../gallery'
import { trackConsult } from '../lib'

// The customer-facing page. Deliberately NOT the app: no tab bar, no wordmark,
// the tailor's business name leading — the person holding this phone has never
// heard of better tailor and is not being sold it.

export default function ConsultBook() {
  const { payload } = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const preview = sp.get('preview') === '1'

  const invite = useMemo(() => decodeInvite(payload), [payload])

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [name, setName] = useState(invite?.n ?? '')
  const [phone, setPhone] = useState('')
  const [styleId, setStyleId] = useState('')
  const [photo, setPhoto] = useState('')
  const [photoAttached, setPhotoAttached] = useState(false)
  const [busyPhoto, setBusyPhoto] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [booked, setBooked] = useState<{ payload: BookingPayload; url: string; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const days = useMemo(() => (invite ? bookableDays(invite.a, invite.x) : []), [invite])

  useEffect(() => {
    if (invite && !preview) trackConsult('page-opened')
  }, [invite, preview])

  // Land on the first day that still has something free.
  useEffect(() => {
    if (!date && days.length > 0) setDate((days.find((d) => d.open > 0) ?? days[0]).date)
  }, [days, date])

  if (!invite) return <Broken />

  if (booked) return <Confirmed booked={booked} invite={invite} preview={preview} />

  const day = days.find((d) => d.date === date)
  const bound = Boolean(invite.c)

  const pickPhoto = async (file?: File) => {
    if (!file) return
    setBusyPhoto(true)
    setPhotoAttached(true)
    setPhoto(await makeThumb(file))
    setBusyPhoto(false)
  }

  const confirm = () => {
    if (!time) return setError('pick a time first')
    if (!bound && !name.trim()) return setError('please put your name')
    if (!bound && !phone.trim()) return setError('please put your phone number')
    setError('')

    const draft: BookingPayload = {
      v: 1,
      c: invite.c,
      n: bound ? invite.n : name.trim(),
      h: bound ? '' : phone.trim(),
      d: date,
      t: time,
      s: styleId,
      y: photo,
      o: photoAttached ? 1 : 0,
      m: note.trim(),
    }
    const { url, payload: final } = savedLinkWithinBudget(draft)
    const text = bookingMessage(final, url, styleId ? styleName(styleId) : '')

    if (preview) {
      // One-phone demo: skip the WhatsApp hop and hand the booking straight to
      // the tailor's review screen.
      navigate(`/booked/${encodePayload(final)}?preview=1`)
      return
    }
    trackConsult('booked')
    window.open(waLink(invite.p, text), '_blank')
    setBooked({ payload: final, url, text })
  }

  return (
    <Page>
      {preview && <PreviewRibbon />}

      <header className="pt-6">
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink/35">{invite.b}</div>
        {invite.g && <div className="text-xs text-ink/40 mt-0.5">{invite.g}</div>}
        <h1 className="font-display font-bold text-[26px] leading-tight mt-3">
          {invite.n ? `${invite.n.split(' ')[0]}, book your fitting call` : 'book your fitting call'}
        </h1>
        <p className="text-sm text-ink/55 mt-2">
          A short video call to take your measurements together, so your clothes fit the first time. Have a soft tape
          measure nearby if you can.
        </p>
      </header>

      {days.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-sm p-6 text-center text-sm text-ink/50 mt-6">
          There are no free times at the moment. Please message {invite.b} directly.
        </div>
      ) : (
        <>
          {/* day strip */}
          <Section title="pick a day">
            <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
              {days.map((d) => {
                const on = d.date === date
                const full = d.open === 0
                return (
                  <button
                    key={d.date}
                    onClick={() => {
                      setDate(d.date)
                      setTime('')
                    }}
                    disabled={full}
                    className={`shrink-0 w-[68px] rounded-2xl py-3 transition active:scale-95 ${
                      on ? 'bg-ink text-white' : full ? 'bg-card2 text-ink/25' : 'bg-card shadow-sm'
                    }`}
                  >
                    <div className={`text-[10px] font-bold uppercase ${on ? 'text-white/60' : 'text-ink/40'}`}>{d.weekday}</div>
                    <div className="font-display font-bold text-xl leading-tight">{d.dayNum}</div>
                    <div className={`text-[9px] font-bold uppercase ${on ? 'text-white/50' : 'text-ink/30'}`}>
                      {full ? 'full' : d.month}
                    </div>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* slots */}
          {day && (
            <Section title="pick a time" note={invite.z ? `times are in ${invite.z}` : undefined}>
              <div className="space-y-4">
                {groupSlots(day.slots).map(([part, slots]) => (
                  <div key={part}>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-ink/35 mb-2">{part}</div>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.time}
                          disabled={s.taken}
                          onClick={() => setTime(s.time)}
                          className={`rounded-xl py-2.5 text-[13px] font-bold transition active:scale-95 ${
                            s.taken
                              ? 'bg-card2 text-ink/20 line-through'
                              : time === s.time
                                ? 'bg-ink text-white'
                                : 'bg-card shadow-sm'
                          }`}
                        >
                          {fmtTime(s.time)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* details */}
          <Section title="your details">
            <div className="space-y-3">
              {bound ? (
                <div className="bg-card rounded-2xl shadow-sm px-4 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-ink/35">booking as</div>
                  <div className="font-bold">{invite.n}</div>
                </div>
              ) : (
                <>
                  <input
                    className={INPUT}
                    placeholder="your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    className={INPUT}
                    placeholder="your phone number"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </>
              )}
            </div>
          </Section>

          <Section title="what do you want sewn?" note="so they can prepare before the call">
            <div className="grid grid-cols-4 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyleId(styleId === s.id ? '' : s.id)}
                  className={`bg-card rounded-xl shadow-sm p-1.5 active:scale-95 transition ${
                    styleId === s.id ? 'ring-2 ring-ink' : ''
                  }`}
                >
                  <StyleImage styleId={s.id} className="w-full aspect-square rounded-lg" />
                  <div className="text-[9px] font-bold lowercase mt-1 truncate">{s.name}</div>
                </button>
              ))}
            </div>
          </Section>

          <Section title="a photo of the style you want" note="optional — the full picture also goes to their chat">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
            {photoAttached ? (
              <div className="bg-card rounded-2xl shadow-sm p-3 flex items-center gap-3">
                {photo ? (
                  <img src={photo} alt="the style you want" className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-card2 grid place-items-center text-[10px] font-bold text-ink/40 text-center px-1">
                    {busyPhoto ? '…' : 'in chat'}
                  </div>
                )}
                <div className="flex-1 min-w-0 text-xs text-ink/50 font-medium">
                  {busyPhoto
                    ? 'preparing your photo…'
                    : 'attach this same photo in the WhatsApp chat that opens, so they see it full size.'}
                </div>
                <button
                  onClick={() => {
                    setPhoto('')
                    setPhotoAttached(false)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="shrink-0 text-xs font-bold text-danger active:scale-95 transition"
                >
                  remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-ink/15 text-ink/45 font-bold py-5 text-sm active:scale-[0.98] transition"
              >
                + add a photo
              </button>
            )}
          </Section>

          <Section title="anything else?">
            <textarea
              className={`${INPUT} min-h-20`}
              placeholder="e.g. it's for my brother's wedding in September"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Section>

          <p className="text-xs text-ink/40 mt-6">{channelBlurb(invite.k, '')}</p>

          {/* sticky confirm */}
          <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-bg/95 backdrop-blur mt-6">
            {error && <div className="text-danger text-xs font-bold text-center mb-2">{error}</div>}
            {time && (
              <div className="text-center text-xs font-bold text-ink/50 mb-2">
                {fmtDay(date)} at {fmtTime(time)}
              </div>
            )}
            <button
              onClick={confirm}
              disabled={busyPhoto}
              className="w-full bg-ink text-white rounded-full font-bold py-4 active:scale-95 transition disabled:opacity-40"
            >
              {preview ? 'confirm booking (preview)' : 'confirm booking'}
            </button>
          </div>
        </>
      )}
    </Page>
  )
}

// ---------- confirmation ----------
// The Square Go / IKEA shape: a tick, what was booked, and what happens next.

function Confirmed({
  booked,
  invite,
  preview,
}: {
  booked: { payload: BookingPayload; url: string; text: string }
  invite: NonNullable<ReturnType<typeof decodeInvite>>
  preview: boolean
}) {
  const { payload: p } = booked
  return (
    <Page>
      {preview && <PreviewRibbon />}
      <div className="pt-12 text-center">
        <div className="w-16 h-16 rounded-full bg-ok text-white grid place-items-center mx-auto anim-pop">
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-2xl mt-5">You're booked in</h1>
        <p className="text-sm text-ink/55 mt-2">{invite.b} has your request.</p>
      </div>

      <div className="bg-card rounded-2xl shadow-sm p-5 mt-6 space-y-3 text-sm">
        <Detail label="when" value={`${fmtDay(p.d)} at ${fmtTime(p.t)}`} />
        <Detail label="how long" value={`${invite.a.slotMins} minutes`} />
        <Detail label="where" value={channelBlurb(invite.k, '')} />
        <Detail label="name" value={p.n} />
        {p.h && <Detail label="phone" value={p.h} />}
        {p.s && <Detail label="for" value={styleName(p.s)} />}
      </div>

      <div className="bg-card2 rounded-2xl p-5 mt-3 text-sm text-ink/60">
        <div className="font-bold text-ink lowercase mb-1.5">one last thing</div>
        Send the WhatsApp message that just opened{p.o ? ', and attach your style photo to it' : ''} — that is what puts
        this in {invite.b}'s book.
      </div>

      <a
        href={waLink(invite.p, booked.text)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 w-full bg-wa text-white rounded-full font-bold py-4 text-center block active:scale-95 transition"
      >
        open WhatsApp again
      </a>

      <p className="text-xs text-ink/35 text-center mt-6">
        Bring a soft tape measure to the call. Wear light clothes — no jacket or heavy wrapper.
      </p>
    </Page>
  )
}

// ---------- chrome ----------

const INPUT =
  'w-full bg-card rounded-2xl px-4 py-3.5 text-[15px] font-medium shadow-sm outline-none placeholder:text-ink/30 focus:ring-2 focus:ring-ink/15'

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <div className="max-w-md mx-auto px-5 pb-10">{children}</div>
    </div>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="font-display font-bold lowercase">{title}</h2>
      {note && <p className="text-xs text-ink/40 mt-0.5 mb-2.5">{note}</p>}
      <div className={note ? '' : 'mt-2.5'}>{children}</div>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-20 shrink-0 text-[11px] font-bold uppercase tracking-widest text-ink/35 pt-0.5">{label}</div>
      <div className="font-semibold flex-1">{value}</div>
    </div>
  )
}

function PreviewRibbon() {
  return (
    <div className="-mx-5 px-5 py-2 bg-ink text-white text-[11px] font-bold text-center lowercase">
      preview — this is what your customer sees
    </div>
  )
}

function Broken() {
  return (
    <Page>
      <div className="pt-24 text-center">
        <div className="text-4xl">🔗</div>
        <h1 className="font-display font-bold text-xl mt-3">This link didn't open properly</h1>
        <p className="text-sm text-ink/50 mt-2">
          It may have been cut short when it was copied. Please ask your tailor to send it again.
        </p>
      </div>
    </Page>
  )
}
