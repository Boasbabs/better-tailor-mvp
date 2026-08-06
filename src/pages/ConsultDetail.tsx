import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Avatar, Confirm, Icons, PillButton, useToast } from '../components/ui'
import { WhenPill } from '../components/consult'
import { StyleImage, styleName } from '../gallery'
import {
  channelName,
  consultUrgency,
  fmtDay,
  fmtTime,
  hintFor,
  joinUrl,
  reminderMessage,
  waLink,
} from '../consult'
import { trackConsult } from '../lib'
import type { MeasurementSet } from '../types'

// The call console. One screen the tailor can stay on for the whole call: start
// it, then type the numbers as they are read out, with the words to say next to
// each field.

export default function ConsultDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const show = useToast((s) => s.show)

  const consultation = useStore((s) => s.consultations.find((c) => c.id === id))
  const templates = useStore((s) => s.templates)
  const settings = useStore((s) => s.settings)
  const customer = useStore((s) => s.customers.find((c) => c.id === consultation?.customerId))
  const updateConsultation = useStore((s) => s.updateConsultation)
  const updateCustomer = useStore((s) => s.updateCustomer)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const templateId = consultation?.templateId ?? ''
  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId])
  const set = customer?.sets.find((s) => s.templateId === templateId)
  const values = set?.values ?? {}

  if (!consultation) {
    return (
      <SubShell title="fitting call" backTo="/consultations">
        <div className="text-center text-ink/40 py-20">call not found</div>
      </SubShell>
    )
  }

  const urgency = consultUrgency(consultation)
  const live = consultation.status === 'upcoming'

  // Writes land on the customer's saved set, so the measurements taken on the
  // call are immediately what the next order auto-fills from.
  const setValue = (field: string, raw: string) => {
    if (!customer) return
    const n = Number(raw)
    const v: number | string = raw.trim() !== '' && Number.isFinite(n) ? n : raw
    const has = customer.sets.some((s) => s.templateId === templateId)
    const sets: MeasurementSet[] = has
      ? customer.sets.map((s) => (s.templateId === templateId ? { ...s, values: { ...s.values, [field]: v } } : s))
      : [...customer.sets, { templateId, values: { [field]: v } }]
    updateCustomer(customer.id, { sets })
  }

  const startCall = () => {
    trackConsult('call-started')
    const url = joinUrl(consultation)
    if (!url) return show(`add your ${channelName(consultation.channel)} link in settings`)
    window.open(url, '_blank')
  }

  const filled = template ? template.fields.filter((f) => values[f] !== undefined && values[f] !== '').length : 0

  return (
    <SubShell title="fitting call" backTo="/consultations">
      <div className="space-y-3 pb-8">
        {/* when */}
        <div className="bg-card rounded-2xl shadow-sm p-5">
          <WhenPill consultation={consultation} />
          <div className="font-display font-bold text-2xl mt-2">{fmtTime(consultation.time)}</div>
          <div className="text-sm text-ink/55 font-medium">{fmtDay(consultation.date)}</div>
          <div className="text-xs text-ink/40 mt-1">
            {consultation.durationMins} minutes · {channelName(consultation.channel)}
          </div>
        </div>

        {/* customer */}
        <div className="bg-card rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <Avatar name={consultation.name} />
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{consultation.name}</div>
            <div className="text-xs text-ink/50">{consultation.phone || 'no phone'}</div>
          </div>
          {customer && (
            <Link to={`/customers/${customer.id}`} className="shrink-0 text-xs font-bold text-ink/40 bg-card2 rounded-full px-3 py-2 active:scale-95 transition">
              profile
            </Link>
          )}
        </div>

        {/* what they want */}
        {(consultation.styleId || consultation.photo || consultation.note) && (
          <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3">
            {(consultation.styleId || consultation.photo) && (
              <div className="flex items-center gap-3">
                {consultation.photo ? (
                  <img src={consultation.photo} alt="style they want" className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <StyleImage styleId={consultation.styleId} className="w-14 h-14 rounded-xl" />
                )}
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-ink/35">wants</div>
                  <div className="font-bold">{consultation.styleId ? styleName(consultation.styleId) : 'a style photo'}</div>
                  {consultation.photoPending && <div className="text-xs text-ink/45">full photo is in your chat</div>}
                </div>
              </div>
            )}
            {consultation.note && <div className="bg-card2 rounded-xl p-3 text-sm text-ink/70">{consultation.note}</div>}
          </div>
        )}

        {/* start the call */}
        {live && (
          <button
            onClick={startCall}
            className={`w-full rounded-full font-bold py-4 flex items-center justify-center gap-2 active:scale-95 transition ${
              consultation.channel === 'whatsapp' ? 'bg-wa text-white' : 'bg-ink text-white'
            }`}
          >
            {consultation.channel === 'whatsapp' ? Icons.whatsapp('w-5 h-5') : Icons.video()}
            {urgency === 'now' ? 'start the call now' : `start the ${channelName(consultation.channel).toLowerCase()}`}
          </button>
        )}

        {/* measurements */}
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold lowercase">take their measurements</h2>
            {template && (
              <span className="text-xs font-bold text-ink/35">
                {filled}/{template.fields.length}
              </span>
            )}
          </div>
          <p className="text-[13px] text-ink/45 mt-0.5 mb-2.5">
            read each line out to them and type what they call back. it saves to {consultation.name.split(' ')[0]}'s
            profile as you go.
          </p>

          <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => updateConsultation(consultation.id, { templateId: t.id })}
                className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                  templateId === t.id ? 'bg-ink text-white' : 'bg-card text-ink/60 shadow-sm'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {!customer ? (
            <div className="bg-card2 rounded-2xl p-5 text-center text-sm text-ink/40 font-medium mt-2">
              this customer was deleted — measurements have nowhere to save.
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {(template?.fields ?? []).map((f) => (
                <div key={f} className="bg-card rounded-2xl shadow-sm p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm lowercase">{f}</div>
                    <div className="text-xs text-ink/45 leading-snug">{hintFor(f)}</div>
                  </div>
                  <div className="shrink-0 bg-card2 rounded-xl px-3 py-2 w-[76px] flex items-baseline gap-0.5">
                    <input
                      inputMode="decimal"
                      className="w-full bg-transparent font-bold font-display text-[17px] outline-none placeholder:text-ink/20 min-w-0"
                      placeholder="—"
                      value={values[f] ?? ''}
                      onChange={(e) => setValue(f, e.target.value)}
                    />
                    <span className="text-ink/30 text-xs font-bold">″</span>
                  </div>
                </div>
              ))}
              {!template && (
                <div className="bg-card2 rounded-2xl p-5 text-center text-sm text-ink/40 font-medium">
                  pick a template above to start.
                </div>
              )}
            </div>
          )}
        </div>

        {/* after the call */}
        {live ? (
          <div className="space-y-2 pt-2">
            <PillButton
              className="w-full"
              onClick={() => {
                updateConsultation(consultation.id, { status: 'done' })
                show('call marked done ✓')
              }}
            >
              mark this call done
            </PillButton>
            {consultation.phone && (
              <a
                href={waLink(consultation.phone, reminderMessage(consultation, settings))}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-card shadow-sm rounded-full font-bold py-3.5 text-center text-[15px] active:scale-95 transition flex items-center justify-center gap-2"
              >
                {Icons.whatsapp('w-[18px] h-[18px]')} send a reminder
              </a>
            )}
            <button onClick={() => setConfirmCancel(true)} className="w-full text-danger font-bold text-sm py-3 active:scale-95 transition">
              cancel this call
            </button>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {customer && consultation.status === 'done' && (
              <PillButton className="w-full" onClick={() => navigate(`/order/new?customer=${customer.id}`)}>
                start an order for {consultation.name.split(' ')[0]}
              </PillButton>
            )}
            <button
              onClick={() => updateConsultation(consultation.id, { status: 'upcoming' })}
              className="w-full text-sm font-bold text-ink/45 py-3 active:scale-95 transition"
            >
              reopen this call
            </button>
          </div>
        )}
      </div>

      <Confirm
        open={confirmCancel}
        title="cancel this call?"
        body={`${consultation.name} keeps their slot free. tell them yourself on WhatsApp — nothing is sent for you.`}
        confirmLabel="yes, cancel"
        onConfirm={() => {
          updateConsultation(consultation.id, { status: 'cancelled' })
          show('call cancelled')
        }}
        onClose={() => setConfirmCancel(false)}
      />
    </SubShell>
  )
}
