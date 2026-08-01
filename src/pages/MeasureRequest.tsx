import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Avatar, Icons, useToast } from '../components/ui'
import { CustomerPickerSheet } from '../components/pickers'
import { AskActions } from '../components/ask'
import { uid } from '../lib'
import type { Customer } from '../types'

export default function MeasureRequest() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const show = useToast((s) => s.show)
  const customers = useStore((s) => s.customers)
  const templates = useStore((s) => s.templates)
  const requests = useStore((s) => s.requests)

  const preselected = customers.find((c) => c.id === params.get('customer')) ?? null
  const [customer, setCustomer] = useState<Customer | null>(preselected)
  // "open" = a link anyone can fill; they type their own name and phone.
  const [mode, setMode] = useState<'customer' | 'open'>(preselected ? 'customer' : 'customer')
  const [picking, setPicking] = useState(false)

  // Re-asking the same customer reuses their pending request's templates, so
  // "resend" doesn't quietly change what you asked for.
  const pending = customer ? requests.find((r) => r.customerId === customer.id) : undefined
  const suggested = useMemo(() => {
    if (pending) return pending.templateIds
    if (!customer) return []
    const missing = templates.filter((t) => !customer.sets.some((s) => s.templateId === t.id))
    const female = ['t-gown', 't-blouse', 't-skirt']
    const male = ['t-agbada', 't-trouser']
    const wanted = customer.gender === 'female' ? female : customer.gender === 'male' ? male : []
    const hit = missing.filter((t) => wanted.includes(t.id)).map((t) => t.id)
    return hit.length ? hit : missing.slice(0, 1).map((t) => t.id)
  }, [customer, pending, templates])

  const [picked, setPicked] = useState<string[]>(suggested)
  const [syncedFor, setSyncedFor] = useState(customer?.id ?? '')
  // Swapping customer mid-flow should re-suggest rather than keep the old ticks.
  if (customer && customer.id !== syncedFor) {
    setSyncedFor(customer.id)
    setPicked(suggested)
  }

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const bound = mode === 'customer' && !!customer
  const requestId = pending?.id ?? `req-${uid().slice(0, 8)}`

  return (
    <SubShell
      title="ask for measurements"
      backTo={preselected ? `/customers/${preselected.id}` : '/customers'}
    >
      <div className="space-y-6 pb-10">
        <p className="text-[13px] text-ink/50 -mt-1">
          send a link your customer fills in themselves. it opens in their browser — nothing to install.
        </p>

        {/* who */}
        <div>
          <h2 className="font-display font-bold lowercase mb-3">who is it for?</h2>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {(['customer', 'open'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`h-11 rounded-full text-sm font-bold transition active:scale-95 ${
                  mode === m ? 'bg-ink text-white' : 'bg-card text-ink/60 shadow-sm'
                }`}
              >
                {m === 'customer' ? 'a customer' : 'anyone'}
              </button>
            ))}
          </div>

          {mode === 'customer' ? (
            customer ? (
              <button
                onClick={() => setPicking(true)}
                className="w-full bg-card rounded-2xl shadow-sm p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition"
              >
                <Avatar name={customer.name} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{customer.name}</div>
                  <div className="text-xs text-ink/50 truncate">{customer.phone || 'no phone — copy the link instead'}</div>
                </div>
                <span className="text-[11px] font-bold text-ink/40 bg-card2 rounded-full px-3 py-1.5 shrink-0">change</span>
              </button>
            ) : (
              <button
                onClick={() => setPicking(true)}
                className="w-full rounded-2xl border-2 border-dashed border-ink/15 text-ink/50 font-bold py-4 active:scale-[0.98] transition"
              >
                + choose customer
              </button>
            )
          ) : (
            <div className="bg-card rounded-2xl shadow-sm p-4">
              <div className="font-bold">anyone with the link</div>
              <p className="text-[13px] text-ink/50 mt-1">
                they type their own name and phone. good for your whatsapp status — you add them when they reply.
              </p>
            </div>
          )}
        </div>

        {/* what */}
        <div>
          <h2 className="font-display font-bold lowercase mb-1">what should they measure?</h2>
          <p className="text-[13px] text-ink/45 mb-3">
            each one becomes a saved set. every field carries its own instructions.
          </p>
          <div className="space-y-2">
            {templates.map((t) => {
              const on = picked.includes(t.id)
              const has = customer?.sets.some((s) => s.templateId === t.id)
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  aria-pressed={on}
                  className={`w-full rounded-2xl p-3.5 flex items-center gap-3 text-left transition active:scale-[0.98] ${
                    on ? 'bg-ink text-white' : 'bg-card shadow-sm'
                  }`}
                >
                  <span
                    className={`w-6 h-6 shrink-0 rounded-full grid place-items-center ${
                      on ? 'bg-white text-ink' : 'border-2 border-ink/15'
                    }`}
                  >
                    {on && Icons.check('w-3.5 h-3.5')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{t.name}</div>
                    <div className={`text-xs truncate ${on ? 'text-white/55' : 'text-ink/45'}`}>
                      {t.fields.length} fields{has ? ' · already saved' : ''}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* link field + send/copy/preview — the Mimo/Base share-link pattern */}
        {picked.length > 0 && <h2 className="font-display font-bold lowercase -mb-1">their link</h2>}
        <AskActions
          customer={bound ? customer : null}
          templateIds={picked}
          requestId={requestId}
          disabled={mode === 'customer' && !customer}
          sendLabel={bound && customer?.phone ? `send to ${customer.name.split(' ')[0]}` : 'send on whatsapp'}
          onSent={(via) => {
            if (via !== 'whatsapp') return
            navigate(bound ? `/customers/${customer!.id}` : '/customers')
            show('link sent — waiting on them now')
          }}
        />
      </div>

      <CustomerPickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(c) => {
          setCustomer(c)
          setMode('customer')
          setPicking(false)
        }}
      />
    </SubShell>
  )
}
