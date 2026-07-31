import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { FieldLabel, Icons, inputCls } from '../components/ui'
import { CurrencyPicker } from '../components/CurrencyPicker'
import { fmtMoney, track } from '../lib'
import type { Currency } from '../types'

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

export default function Welcome() {
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const saveSettings = useStore((s) => s.saveSettings)
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState(settings.businessName)
  const [currency, setCurrency] = useState<Currency>(settings.currency)

  const finish = ({ keepName }: { keepName: boolean }) => {
    // Small shops bank under their trading name, so seed both — otherwise the
    // invoice header and its "pay to" block disagree straight after onboarding.
    const n = name.trim()
    saveSettings({
      currency,
      ...(keepName && n ? { businessName: n, accountName: n } : {}),
    })
    localStorage.setItem('bt_seen_welcome', '1')
    track('opened')
    navigate('/orders')
  }

  if (step === 2) {
    return (
      <div className="min-h-dvh max-w-md mx-auto flex flex-col px-7 pt-14 pb-10">
        <button
          onClick={() => setStep(1)}
          className="w-10 h-10 -ml-2 rounded-full grid place-items-center text-ink/60 active:scale-90 transition"
          aria-label="back"
        >
          {Icons.back()}
        </button>

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
            onClick={() => finish({ keepName: true })}
            className="w-full bg-ink text-white rounded-full font-bold text-lg py-4 active:scale-95 transition shadow-lg"
          >
            start
          </button>
          <button
            onClick={() => finish({ keepName: false })}
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
