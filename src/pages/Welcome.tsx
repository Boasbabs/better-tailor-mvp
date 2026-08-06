import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { FieldLabel, Icons, inputCls } from '../components/ui'
import { CurrencyPicker } from '../components/CurrencyPicker'
import { FieldPicker } from '../components/measure'
import { fmtMoney, track, trackOnboard, uid } from '../lib'
import type { Currency, Template } from '../types'

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3.5 items-start">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-ink text-white grid place-items-center">{icon}</div>
      <div className="min-w-0">
        <div className="font-bold text-[15px] leading-tight">{title}</div>
        <p className="text-[13px] text-ink/50 leading-snug mt-0.5">{body}</p>
      </div>
    </div>
  )
}

function StepHead({ step, onBack }: { step: 2 | 3; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onBack}
        className="w-10 h-10 -ml-2 rounded-full grid place-items-center text-ink/60 active:scale-90 transition"
        aria-label="back"
      >
        {Icons.back()}
      </button>
      <span className="text-[11px] font-bold tracking-widest text-ink/30">{step} / 3</span>
    </div>
  )
}

export default function Welcome() {
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const saveSettings = useStore((s) => s.saveSettings)
  const addTemplates = useStore((s) => s.addTemplates)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState(settings.businessName)
  const [currency, setCurrency] = useState<Currency>(settings.currency)

  // Step 3. Templates stay local until "start" — going back to step 2, or
  // bailing out entirely, must leave the store exactly as it was found.
  const [drafts, setDrafts] = useState<Template[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [garment, setGarment] = useState('')
  const [fields, setFields] = useState<string[]>([])

  const formReady = garment.trim() !== '' && fields.length > 0

  /**
   * The open form folded back into the draft list — updated in place when
   * she's editing an existing card, appended when it's a new one. Called on
   * every exit from the form so nothing she can still see on screen is lost.
   * Emptying the name or the fields of a card being edited deletes it.
   */
  const fold = (): Template[] => {
    const n = garment.trim()
    if (editingId)
      return formReady
        ? drafts.map((d) => (d.id === editingId ? { ...d, name: n, fields } : d))
        : drafts.filter((d) => d.id !== editingId)
    return formReady ? [...drafts, { id: uid(), name: n, fields }] : drafts
  }

  const blankForm = () => {
    setEditingId(null)
    setGarment('')
    setFields([])
  }

  const saveDraft = () => {
    setDrafts(fold())
    blankForm()
  }

  // Folds the current form away *before* loading the tapped card, so an edit
  // never silently eats a garment she'd half-typed underneath it.
  const editDraft = (d: Template) => {
    setDrafts(fold())
    setEditingId(d.id)
    setGarment(d.name)
    setFields(d.fields)
  }

  const removeDraft = (id: string) => {
    setDrafts(drafts.filter((d) => d.id !== id))
    if (editingId === id) blankForm()
  }

  const finish = (templates: Template[]) => {
    if (templates.length) addTemplates(templates)
    localStorage.setItem('bt_seen_welcome', '1')
    track('opened')
    if (templates.length) templates.forEach(() => trackOnboard('template-added'))
    else trackOnboard('templates-skipped')
    navigate('/orders')
  }

  const leaveStep2 = ({ keepName }: { keepName: boolean }) => {
    // Small shops bank under their trading name, so seed both — otherwise the
    // invoice header and its "pay to" block disagree straight after onboarding.
    const n = name.trim()
    saveSettings({
      currency,
      ...(keepName && n ? { businessName: n, accountName: n } : {}),
    })
    setStep(3)
  }

  if (step === 3) {
    const pending = fold()
    // The card being edited lives in the form, not in the list above it.
    const cards = drafts.filter((d) => d.id !== editingId)
    const untouched = drafts.length === 0 && garment.trim() === '' && fields.length === 0

    return (
      <div className="min-h-dvh max-w-md mx-auto flex flex-col px-7 pt-14 pb-10">
        <StepHead step={3} onBack={() => setStep(2)} />

        <div className="flex-1 mt-8">
          <h1 className="font-display font-bold lowercase tracking-tight text-[38px] leading-[1.05]">
            what do you measure?
          </h1>
          <p className="mt-3 text-[15px] text-ink/55 font-medium leading-snug">
            name a garment you sew and the sizes you take for it. every order for that garment will ask for exactly
            these — and nothing else.
          </p>

          {cards.length > 0 && (
            <div className="mt-7 space-y-2">
              {cards.map((d) => (
                <div key={d.id} className="bg-card rounded-2xl shadow-sm flex items-center pr-2">
                  <button
                    onClick={() => editDraft(d)}
                    className="flex-1 min-w-0 text-left p-3.5 flex items-center gap-3 active:scale-[0.98] transition"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-card2 grid place-items-center text-ink/55">
                      {Icons.ruler()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold truncate">{d.name}</div>
                      <div className="text-xs text-ink/45 truncate">{d.fields.join(' · ')}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => removeDraft(d.id)}
                    aria-label={`remove ${d.name}`}
                    className="p-2 text-ink/30 active:scale-90 transition"
                  >
                    {Icons.x('w-4 h-4')}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-7">
            <FieldLabel>{editingId ? `editing ${garment.trim() || 'this garment'}` : 'garment'}</FieldLabel>
            <input
              className={inputCls}
              placeholder="e.g. Kaftan"
              value={garment}
              onChange={(e) => setGarment(e.target.value)}
            />
          </div>

          <div className="mt-5">
            <FieldLabel>measurements you take</FieldLabel>
            <FieldPicker value={fields} onChange={setFields} />
          </div>

          <button
            onClick={saveDraft}
            disabled={!formReady}
            className="mt-4 w-full bg-card text-ink shadow-sm rounded-full font-bold py-3.5 active:scale-95 transition disabled:opacity-30"
          >
            {editingId ? 'save changes' : 'save & add another'}
          </button>
        </div>

        <div className="mt-8">
          <button
            onClick={() => finish(pending)}
            className="w-full bg-ink text-white rounded-full font-bold text-lg py-4 active:scale-95 transition shadow-lg"
          >
            start
            {pending.length > 0 && (
              <span className="font-medium text-white/60">
                {' '}
                · {pending.length} template{pending.length > 1 ? 's' : ''}
              </span>
            )}
          </button>
          {/* Only offered while there is genuinely nothing to skip — a "skip"
              sitting under two saved garments would be lying about what it does. */}
          {untouched && (
            <button
              onClick={() => finish([])}
              className="w-full text-center text-sm font-bold text-ink/40 mt-3 py-2 active:scale-95 transition"
            >
              skip for now
            </button>
          )}
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="min-h-dvh max-w-md mx-auto flex flex-col px-7 pt-14 pb-10">
        <StepHead step={2} onBack={() => setStep(1)} />

        <div className="flex-1 mt-8">
          <h1 className="font-display font-bold lowercase tracking-tight text-[38px] leading-[1.05]">
            make it yours
          </h1>
          <p className="mt-3 text-[15px] text-ink/55 font-medium leading-snug">
            your shop name and currency go on every invoice you send. you can change both later in settings.
          </p>

          <div className="mt-7">
            <FieldLabel>your business name</FieldLabel>
            <input
              className={inputCls}
              placeholder="e.g. Golden Thread Stitches"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="mt-5">
            <FieldLabel>currency</FieldLabel>
            <CurrencyPicker value={currency} onChange={setCurrency} />
          </div>

          {/* live preview so the payoff is visible before they commit */}
          <div className="mt-5 bg-card rounded-2xl shadow-sm p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink/35">invoice preview</div>
            <div className="mt-2 text-center">
              <div className="font-display font-bold lowercase truncate">{name.trim() || 'your shop name'}</div>
              <div className="text-[11px] text-ink/40 mt-2">BALANCE DUE</div>
              <div className="font-display font-bold text-2xl">{fmtMoney(25000, currency)}</div>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={() => leaveStep2({ keepName: true })}
            className="w-full bg-ink text-white rounded-full font-bold text-lg py-4 active:scale-95 transition shadow-lg"
          >
            next
          </button>
          <button
            onClick={() => leaveStep2({ keepName: false })}
            className="w-full text-center text-sm font-bold text-ink/40 mt-3 py-2 active:scale-95 transition"
          >
            skip for now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col px-7 pt-16 pb-10">
      <div className="flex-1">
        <h1 className="font-display font-bold lowercase tracking-tight text-[52px] leading-[0.95]">
          better
          <br />
          tailor
        </h1>
        <p className="mt-4 text-[17px] text-ink/55 font-medium leading-snug">
          your customers, measurements, orders &amp; invoices — in one place.
        </p>

        <div className="mt-8 bg-card rounded-2xl shadow-sm p-5 space-y-5">
          <Feature
            icon={Icons.ruler()}
            title="measurements on file"
            body="save a customer's sizes once — every new order fills itself in."
          />
          <Feature
            icon={Icons.bell()}
            title="due dates that nag you"
            body="see what's overdue before your customer calls to ask."
          />
          <Feature
            icon={Icons.receipt('w-5 h-5')}
            title="invoices that show balance"
            body="share on WhatsApp with your bank details already on it."
          />
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={() => setStep(2)}
          className="w-full bg-ink text-white rounded-full font-bold text-lg py-4 active:scale-95 transition shadow-lg"
        >
          let's go
        </button>
        <p className="text-center text-xs text-ink/35 mt-4">a prototype — your data stays on this phone.</p>
      </div>
    </div>
  )
}
