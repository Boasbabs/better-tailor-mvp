import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Confirm, FieldLabel, Icons, inputCls, useToast } from '../components/ui'
import { CurrencyPicker } from '../components/CurrencyPicker'
import { FORM_URL, trackWaitlist } from '../lib'

export default function Settings() {
  const settings = useStore((s) => s.settings)
  const saveSettings = useStore((s) => s.saveSettings)
  const templates = useStore((s) => s.templates)
  const resetDemo = useStore((s) => s.resetDemo)
  const show = useToast((s) => s.show)
  const [confirmReset, setConfirmReset] = useState(false)

  const openWaitlist = () => {
    trackWaitlist('settings')
    window.open(FORM_URL, '_blank')
  }

  const field = (label: string, key: keyof typeof settings, placeholder: string, inputMode?: 'tel' | 'numeric') => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        className={inputCls}
        placeholder={placeholder}
        inputMode={inputMode}
        value={String(settings[key] ?? '')}
        onChange={(e) => saveSettings({ [key]: e.target.value })}
      />
    </div>
  )

  return (
    <SubShell title="settings" backTo="/orders">
      <div className="space-y-6 pb-10">
        {/* waitlist card */}
        <button onClick={openWaitlist} className="w-full bg-ink text-white rounded-2xl p-5 text-left active:scale-[0.98] transition">
          <div className="flex items-center gap-2 font-bold">
            <span className="text-danger">{Icons.heart()}</span> join the waitlist
          </div>
          <p className="text-white/60 text-sm mt-1">
            want better tailor for real? tell us what to build — 3 minutes.
          </p>
          <div className="mt-3 bg-white text-ink rounded-full text-sm font-bold px-5 py-2.5 inline-block">open the form</div>
        </button>

        {/* business info */}
        <div>
          <h2 className="font-display font-bold lowercase mb-3">business info</h2>
          <div className="space-y-3">
            {field('business name', 'businessName', 'e.g. Golden Thread Stitches')}
            {field('tagline', 'tagline', 'e.g. bespoke tailoring, Lagos')}
            {field('phone', 'phone', '+234…', 'tel')}
          </div>
        </div>

        {/* bank details */}
        <div>
          <h2 className="font-display font-bold lowercase mb-3">payment details (shown on invoices)</h2>
          <div className="space-y-3">
            {field('bank name', 'bankName', 'e.g. GTBank')}
            {field('account number', 'accountNumber', '0123456789', 'numeric')}
            {field('account name', 'accountName', 'account holder name')}
          </div>
        </div>

        {/* templates */}
        <Link to="/settings/templates" className="bg-card rounded-2xl shadow-sm p-4 flex items-center justify-between active:scale-[0.98] transition">
          <div>
            <div className="font-bold">measurement templates</div>
            <div className="text-xs text-ink/45">{templates.length} templates — edit fields or create your own</div>
          </div>
          {Icons.chevron('w-5 h-5 text-ink/30')}
        </Link>

        {/* currency */}
        <div>
          <h2 className="font-display font-bold lowercase mb-3">currency symbol</h2>
          <CurrencyPicker value={settings.currency} onChange={(c) => saveSettings({ currency: c })} />
          <p className="text-[11px] text-ink/35 mt-2 ml-1">display only — no conversion.</p>
        </div>

        {/* reset */}
        <button
          onClick={() => setConfirmReset(true)}
          className="w-full bg-card rounded-2xl shadow-sm p-4 text-danger font-bold text-sm active:scale-[0.98] transition"
        >
          reset demo data
        </button>

        <p className="text-center text-[11px] text-ink/30">better tailor — prototype</p>
      </div>

      <Confirm
        open={confirmReset}
        title="reset demo data?"
        body="all your changes will be replaced with fresh demo data."
        confirmLabel="yes, reset"
        onConfirm={() => {
          resetDemo()
          show('demo data restored ✓')
        }}
        onClose={() => setConfirmReset(false)}
      />
    </SubShell>
  )
}
