import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Confirm, FieldLabel, Icons, inputCls, useToast } from '../components/ui'
import { CurrencyPicker } from '../components/CurrencyPicker'
import { FORM_URL, trackWaitlist, uid } from '../lib'

export default function Settings() {
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const saveSettings = useStore((s) => s.saveSettings)
  const templates = useStore((s) => s.templates)
  const addTemplate = useStore((s) => s.addTemplate)
  const resetDemo = useStore((s) => s.resetDemo)
  const show = useToast((s) => s.show)
  const [confirmReset, setConfirmReset] = useState(false)

  const createTemplate = () => {
    const t = { id: uid(), name: 'New template', fields: ['length'] }
    addTemplate(t)
    navigate(`/settings/templates/${t.id}`)
  }

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

        {/* the reusable open link — Mimo/Base share-your-link pattern */}
        <div>
          <h2 className="font-display font-bold lowercase mb-1">your measurement link</h2>
          <p className="text-[13px] text-ink/45 mb-3">
            one link anyone can fill in — good for your whatsapp status. they type their own name and phone, and you
            add them when they reply.
          </p>
          <button
            onClick={() => navigate('/ask')}
            className="w-full bg-card rounded-2xl shadow-sm p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition"
          >
            <div className="w-10 h-10 shrink-0 rounded-xl bg-card2 grid place-items-center text-ink/55">
              {Icons.ruler()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">make a link</div>
              <div className="text-xs text-ink/45">pick which measurements to ask for</div>
            </div>
            {Icons.chevron('w-5 h-5 text-ink/25 shrink-0')}
          </button>
        </div>

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

        {/* templates — listed inline so the tailor sees what they have
            without tapping through an anonymous row first */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display font-bold lowercase">measurement templates</h2>
            <button
              onClick={createTemplate}
              className="shrink-0 text-xs font-bold bg-ink text-white rounded-full px-4 py-2 active:scale-95 transition"
            >
              + new
            </button>
          </div>
          <p className="text-[13px] text-ink/45 mt-1 mb-3">
            the fields you fill in for each garment. tap one to rename it, add fields or reorder them.
          </p>

          <div className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/settings/templates/${t.id}`)}
                className="w-full bg-card rounded-2xl shadow-sm p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-card2 grid place-items-center text-ink/55">
                  {Icons.ruler()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{t.name}</div>
                  <div className="text-xs text-ink/45 truncate">{t.fields.join(' · ') || 'no fields yet'}</div>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-ink/40 bg-card2 rounded-full px-2 py-1">
                  {t.fields.length}
                </span>
                {Icons.chevron('w-5 h-5 text-ink/25 shrink-0')}
              </button>
            ))}
            {templates.length === 0 && (
              <div className="bg-card2 rounded-2xl p-5 text-center text-sm text-ink/40 font-medium">
                no templates yet — tap "+ new" to make one.
              </div>
            )}
          </div>
        </div>

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
