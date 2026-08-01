import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Avatar, Icons, PillButton, useToast } from '../components/ui'
import { trackMeasure, uid } from '../lib'
import { agoLabel, decodeReply, mergeIntoSets } from '../measure-link'

type Change = 'new' | 'changed' | 'same'

export default function MeasureReceive() {
  const { payload } = useParams()
  const navigate = useNavigate()
  const show = useToast((s) => s.show)
  const reply = useMemo(() => decodeReply(payload), [payload])

  const customers = useStore((s) => s.customers)
  const requests = useStore((s) => s.requests)
  const updateCustomer = useStore((s) => s.updateCustomer)
  const addCustomer = useStore((s) => s.addCustomer)
  const clearRequest = useStore((s) => s.clearRequest)

  const customer = customers.find((c) => c.id === reply?.c)

  useEffect(() => {
    if (reply) trackMeasure('received', reply.c ? 'customer' : 'open')
  }, [reply])

  if (!reply) {
    return (
      <SubShell title="measurements" backTo="/customers">
        <div className="text-center py-20">
          <div className="text-4xl">🧵</div>
          <div className="font-bold lowercase mt-3">this link is broken</div>
          <p className="text-sm text-ink/50 mt-2 px-6">
            whatsapp may have cut it short. the numbers are still in the message above the link — ask them to send it
            again if you need it saved.
          </p>
        </div>
      </SubShell>
    )
  }

  const isNewCustomer = !customer

  const classify = (templateId: string, field: string, value: number | string): Change => {
    const existing = customer?.sets.find((s) => s.templateId === templateId)?.values[field]
    if (existing === undefined || existing === '') return 'new'
    return String(existing) === String(value) ? 'same' : 'changed'
  }

  const changedCount = reply.s.reduce(
    (n, sec) => n + Object.entries(sec.v).filter(([f, v]) => classify(sec.i, f, v) === 'changed').length,
    0,
  )

  const save = () => {
    const targetId = customer?.id ?? uid()
    if (customer) {
      updateCustomer(customer.id, { sets: mergeIntoSets(customer.sets, reply.s) })
    } else {
      addCustomer({
        id: targetId,
        name: reply.n || 'new customer',
        phone: reply.h,
        area: '',
        sets: mergeIntoSets([], reply.s),
        createdAt: new Date().toISOString(),
      })
    }
    clearRequest(reply.r)
    const stale = requests.find((r) => r.customerId && r.customerId === targetId)
    if (stale) clearRequest(stale.id)
    trackMeasure('saved', reply.c ? 'customer' : 'open')
    show(`${(reply.n || 'their').split(' ')[0]}'s measurements saved ✓`)
    navigate(`/customers/${targetId}`, { replace: true })
  }

  return (
    <SubShell title="measurements received" backTo="/customers">
      <div className="space-y-3 pb-8">
        {/* who sent it — Revolut Business / Remote HR submitted-request header */}
        <div className="bg-card rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <Avatar name={reply.n || '?'} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-lg leading-tight truncate">{reply.n || 'unnamed'}</div>
            <div className="text-sm text-ink/50 font-medium">
              {isNewCustomer ? reply.h || 'no phone given' : customer!.phone}
            </div>
            <div className="text-xs text-ink/40">sent {agoLabel(new Date(reply.t).toISOString())}</div>
          </div>
        </div>

        {isNewCustomer && (
          <div className="bg-ink text-white rounded-2xl p-4">
            <div className="font-bold lowercase">not in your customers yet</div>
            <p className="text-white/60 text-sm mt-1">saving will add {reply.n || 'them'} as a new customer.</p>
          </div>
        )}

        {reply.u === 'cm' && (
          <div className="bg-card2 rounded-2xl px-4 py-3 text-[13px] text-ink/55 font-medium">
            they measured in centimetres — converted to inches below.
          </div>
        )}

        {changedCount > 0 && (
          <div className="bg-[#FFF1DC] text-[#9A5B00] rounded-2xl px-4 py-3 text-[13px] font-bold">
            {changedCount} {changedCount === 1 ? 'value differs' : 'values differ'} from what you already had — check the
            amber rows before saving.
          </div>
        )}

        {reply.s.map((sec) => (
          <div key={sec.i} className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 font-bold">{sec.n}</div>
            <div className="divide-y divide-ink/[0.06]">
              {Object.entries(sec.v).map(([field, value]) => {
                const kind = classify(sec.i, field, value)
                const old = customer?.sets.find((s) => s.templateId === sec.i)?.values[field]
                return (
                  <div key={field} className="px-4 py-3 flex items-center gap-3">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        kind === 'changed' ? 'bg-[#E89100]' : kind === 'new' ? 'bg-ok' : 'bg-ink/15'
                      }`}
                    />
                    <div className="flex-1 min-w-0 text-[15px] font-semibold lowercase truncate">{field}</div>
                    {kind === 'changed' && (
                      <span className="text-[13px] text-ink/35 line-through shrink-0">{String(old)}"</span>
                    )}
                    {kind === 'changed' && <span className="text-ink/25 shrink-0">{Icons.chevron('w-3.5 h-3.5')}</span>}
                    <span
                      className={`font-display font-bold text-[16px] shrink-0 ${
                        kind === 'changed' ? 'text-[#9A5B00]' : kind === 'new' ? 'text-ink' : 'text-ink/40'
                      }`}
                    >
                      {String(value)}"
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {reply.m && (
          <div className="bg-card rounded-2xl shadow-sm p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-1">their note</div>
            <p className="text-[15px] font-medium">{reply.m}</p>
          </div>
        )}

        <PillButton className="w-full mt-2" onClick={save}>
          {isNewCustomer ? `add ${(reply.n || 'them').split(' ')[0]} & save` : `save to ${customer!.name.split(' ')[0]}`}
        </PillButton>
        <button
          onClick={() => navigate('/customers', { replace: true })}
          className="w-full text-ink/45 font-bold text-sm py-3 active:scale-95 transition"
        >
          discard
        </button>
      </div>
    </SubShell>
  )
}
