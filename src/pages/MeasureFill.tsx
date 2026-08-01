import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icons, inputCls, useToast } from '../components/ui'
import { FORM_URL, trackMeasure, trackWaitlist } from '../lib'
import {
  decodeRequest,
  encodePayload,
  hintFor,
  replyMessage,
  TAPE_TIPS,
  toInches,
  waLink,
  type ReplyPayload,
} from '../measure-link'

// Every bit of state below is seeded from the payload, so a second link opened
// in the same tab must remount rather than inherit the first link's answers.
export default function MeasureFillRoute() {
  const { payload } = useParams()
  return <MeasureFill key={payload ?? ''} payload={payload} />
}

// The one page in the app a *customer* sees. No tabs, no wordmark up top, no
// way back into the tailor's data — as far as the customer is concerned this
// belongs to their tailor.
function MeasureFill({ payload }: { payload?: string }) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const req = useMemo(() => decodeRequest(payload), [payload])
  const demo = params.get('demo') === '1'
  const variant = req?.c ? 'customer' : 'open'

  const [name, setName] = useState(req?.n ?? '')
  const [phone, setPhone] = useState('')
  const [unit, setUnit] = useState<'in' | 'cm'>('in')
  const [values, setValues] = useState<Record<string, Record<string, string>>>({})
  const [note, setNote] = useState('')
  const [sent, setSent] = useState<ReplyPayload | null>(null)

  useEffect(() => {
    if (req) trackMeasure('opened', req.c ? 'customer' : 'open')
  }, [req])

  if (!req) {
    return (
      <Plain>
        <div className="text-center py-24">
          <div className="text-4xl">🧵</div>
          <h1 className="font-display font-bold text-xl lowercase mt-4">this link looks broken</h1>
          <p className="text-sm text-ink/50 mt-2">
            it may have been cut short when it was sent. ask your tailor to send it again.
          </p>
        </div>
      </Plain>
    )
  }

  const fields = req.s.flatMap((s) => s.f.map((f) => ({ set: s.i, field: f })))
  const filled = fields.filter(({ set, field }) => (values[set]?.[field] ?? '').trim() !== '').length
  const ready = filled > 0 && name.trim() !== ''

  const setValue = (set: string, field: string, v: string) =>
    setValues((prev) => ({ ...prev, [set]: { ...prev[set], [field]: v } }))

  const buildReply = (): ReplyPayload => ({
    v: 1,
    r: req.r,
    c: req.c,
    n: name.trim(),
    h: phone.trim(),
    u: unit,
    m: note.trim(),
    t: Date.now(),
    s: req.s
      .map((sec) => {
        const v: Record<string, number | string> = {}
        for (const f of sec.f) {
          const converted = toInches(values[sec.i]?.[f] ?? '', unit)
          if (converted !== '') v[f] = converted
        }
        return { i: sec.i, n: sec.n, v }
      })
      .filter((sec) => Object.keys(sec.v).length > 0),
  })

  const submit = () => {
    if (!ready) return
    const reply = buildReply()
    trackMeasure('submitted', variant)
    // In preview the tailor is holding the only phone, so hand them straight to
    // the review screen instead of bouncing through WhatsApp to themselves.
    if (demo) {
      navigate(`/received/${encodePayload(reply)}`)
      return
    }
    window.open(waLink(req.p, replyMessage(reply, req.b)), '_blank')
    setSent(reply)
  }

  if (sent) return <Done reply={sent} tailor={req.b} phone={req.p} />

  return (
    <Plain>
      {demo && (
        <div className="bg-[#FFF1DC] text-[#9A5B00] rounded-2xl px-4 py-3 text-[13px] font-bold mb-4">
          preview — this is exactly what your customer sees. fill it in to test the whole loop.
        </div>
      )}

      {/* the tailor's page, not ours */}
      <div className="bg-ink text-white rounded-2xl p-5 mb-4">
        <div className="font-display font-bold text-xl">{req.b || 'your tailor'}</div>
        {req.g && <div className="text-white/55 text-sm">{req.g}</div>}
        <p className="text-white/80 text-sm mt-3 font-medium">
          {req.n ? `${req.n.split(' ')[0]}, please send your measurements 👋` : 'please send your measurements 👋'}
        </p>
      </div>

      {!req.c && (
        <div className="space-y-2 mb-4">
          <input className={inputCls} placeholder="your full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            className={inputCls}
            placeholder="your phone (with country code)"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      )}

      {/* before you start — the H&M / Gymshark preamble */}
      <div className="bg-card rounded-2xl shadow-sm p-4 mb-4">
        <div className="font-bold lowercase mb-2">before you start</div>
        <ul className="space-y-1.5">
          {TAPE_TIPS.map((t) => (
            <li key={t} className="flex gap-2 text-[13px] text-ink/60">
              <span className="text-ok shrink-0 mt-0.5">{Icons.check('w-3.5 h-3.5')}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-1.5 ml-1">measuring in</div>
        <div className="grid grid-cols-2 gap-2">
          {(['in', 'cm'] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              aria-pressed={unit === u}
              className={`h-12 rounded-full text-sm font-bold transition active:scale-95 ${
                unit === u ? 'bg-ink text-white' : 'bg-card text-ink/60 shadow-sm'
              }`}
            >
              {u === 'in' ? 'inches' : 'centimetres'}
            </button>
          ))}
        </div>
        {unit === 'cm' && (
          <p className="text-[11px] text-ink/40 mt-2 ml-1">we'll convert to inches for your tailor.</p>
        )}
      </div>

      {/* one section per template, one instruction per field */}
      {req.s.map((sec) => (
        <div key={sec.i} className="mb-5">
          <h2 className="font-display font-bold lowercase mb-2">{sec.n}</h2>
          <div className="bg-card rounded-2xl shadow-sm divide-y divide-ink/[0.06]">
            {sec.f.map((f) => (
              <div key={f} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold lowercase text-[15px]">{f}</div>
                  <div className="text-[12px] text-ink/45 leading-snug mt-0.5">{hintFor(f)}</div>
                </div>
                <div className="shrink-0 w-[92px] bg-card2 rounded-xl px-3 py-2.5 flex items-baseline gap-1">
                  <input
                    inputMode="decimal"
                    className="w-full bg-transparent font-bold font-display text-[17px] outline-none placeholder:text-ink/20 min-w-0"
                    placeholder="—"
                    value={values[sec.i]?.[f] ?? ''}
                    onChange={(e) => setValue(sec.i, f, e.target.value)}
                  />
                  <span className="text-[11px] font-bold text-ink/35">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-1.5 ml-1">
          anything your tailor should know?
        </div>
        <textarea
          className={`${inputCls} min-h-24 resize-none`}
          placeholder="e.g. I like the sleeves a bit loose"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="h-24" />

      {/* sticky send — progress lives here so it's never scrolled away from */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-bg border-t border-ink/[0.06]">
        <div className="max-w-md mx-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="text-[11px] font-bold text-ink/40 text-center mb-2">
            {filled} of {fields.length} filled{filled < fields.length ? " — you can send what you've got" : ' ✓'}
          </div>
          <button
            onClick={submit}
            disabled={!ready}
            className="w-full bg-wa text-white rounded-full font-bold text-[15px] py-3.5 flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-30"
          >
            {Icons.whatsapp('w-[18px] h-[18px]')}
            send to {req.b || 'my tailor'}
          </button>
          {!name.trim() && <p className="text-center text-[11px] text-ink/35 mt-2">add your name to send</p>}
        </div>
      </div>
    </Plain>
  )
}

// Fresha's "thanks for completing your form" beat, plus the two fallbacks that
// matter when wa.me is blocked or the customer is on desktop.
function Done({ reply, tailor, phone: tailorPhone }: { reply: ReplyPayload; tailor: string; phone: string }) {
  const show = useToast((s) => s.show)
  const text = replyMessage(reply, tailor)
  return (
    <Plain>
      <div className="text-center pt-20">
          <div className="w-20 h-20 rounded-full bg-ok text-white grid place-items-center mx-auto anim-pop">
            {Icons.check('w-10 h-10')}
          </div>
          <h1 className="font-display font-bold text-2xl lowercase mt-6">thanks, {reply.n.split(' ')[0]}!</h1>
          <p className="text-sm text-ink/55 mt-2 px-6">
            your measurements are on their way to {tailor}. they'll save them to your file.
          </p>
        </div>

        <div className="mt-10 space-y-2">
          <button
            onClick={() => window.open(waLink(tailorPhone, text), '_blank')}
            className="w-full bg-wa text-white rounded-full font-bold text-[15px] py-3.5 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            {Icons.whatsapp('w-[18px] h-[18px]')} whatsapp didn't open — try again
          </button>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text)
                show('copied — paste it to your tailor')
              } catch {
                show('could not copy on this browser')
              }
            }}
            className="w-full bg-card shadow-sm rounded-full font-bold text-[15px] py-3.5 active:scale-95 transition"
          >
            copy the message instead
          </button>
        </div>

        {/* the only better-tailor mention on the whole page, and only once
            they're done — a customer here is a tailor's customer first. */}
        <div className="mt-14 text-center">
          <button
            onClick={() => {
              trackWaitlist('customer-form')
              window.open(FORM_URL, '_blank')
            }}
            className="text-[12px] text-ink/40 font-semibold underline underline-offset-4"
          >
            made with better tailor — are you a tailor too?
          </button>
        </div>
    </Plain>
  )
}

function Plain({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <div className="max-w-md mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
