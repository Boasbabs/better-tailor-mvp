import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Avatar, FieldLabel, Icons, PillButton, inputCls, useToast } from '../components/ui'
import { CustomerPickerSheet } from '../components/pickers'
import { deriveInvoiceStatus, fmtMoney, invoiceMath, nextInvoiceNumber, track, uid } from '../lib'
import type { Customer, Invoice } from '../types'

type ManualLine = { id: string; label: string; amount: string }

export default function InvoiceNew() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const show = useToast((s) => s.show)

  const customers = useStore((s) => s.customers)
  const orders = useStore((s) => s.orders)
  const invoices = useStore((s) => s.invoices)
  const settings = useStore((s) => s.settings)
  const addInvoice = useStore((s) => s.addInvoice)

  const preOrderId = sp.get('order')
  const preOrder = orders.find((o) => o.id === preOrderId)

  const [customerId, setCustomerId] = useState(preOrder?.customerId ?? sp.get('customer') ?? '')
  const [ticked, setTicked] = useState<Set<string>>(new Set(preOrder ? [preOrder.id] : []))
  const [manual, setManual] = useState<ManualLine[]>([])
  const [discountKind, setDiscountKind] = useState<'none' | 'flat' | 'percent'>('none')
  const [discountValue, setDiscountValue] = useState('')
  const [deposit, setDeposit] = useState(preOrder && preOrder.deposit > 0 ? String(preOrder.deposit) : '')
  const [depositTouched, setDepositTouched] = useState(Boolean(preOrder && preOrder.deposit > 0))
  const [pickCustomer, setPickCustomer] = useState(!customerId)

  const customer = customers.find((c) => c.id === customerId)
  const customerOrders = useMemo(() => orders.filter((o) => o.customerId === customerId), [orders, customerId])

  const toggle = (orderId: string) => {
    const next = new Set(ticked)
    if (next.has(orderId)) next.delete(orderId)
    else next.add(orderId)
    setTicked(next)
    if (!depositTouched) {
      const sum = customerOrders.filter((o) => next.has(o.id)).reduce((s, o) => s + o.deposit, 0)
      setDeposit(sum > 0 ? String(sum) : '')
    }
  }

  const onPickCustomer = (c: Customer) => {
    setCustomerId(c.id)
    setTicked(new Set())
    setManual([])
    if (!depositTouched) setDeposit('')
    setPickCustomer(false)
  }

  const lines = useMemo(() => {
    const orderLines = customerOrders
      .filter((o) => ticked.has(o.id))
      .map((o) => ({ label: o.garment, amount: o.price, orderId: o.id }))
    const manualLines = manual
      .filter((m) => m.label.trim() && Number(m.amount) > 0)
      .map((m) => ({ label: m.label.trim(), amount: Number(m.amount) }))
    return [...orderLines, ...manualLines]
  }, [customerOrders, ticked, manual])

  const draft = {
    lines,
    discount:
      discountKind === 'none' || !Number(discountValue)
        ? null
        : { kind: discountKind, value: Number(discountValue) },
    depositPaid: Number(deposit) || 0,
  }
  const math = invoiceMath(draft)
  const cur = settings.currency

  const generate = () => {
    if (!customerId) return show('pick a customer first')
    if (lines.length === 0) return show('add at least one line item')
    const inv: Invoice = {
      id: uid(),
      number: nextInvoiceNumber(invoices),
      customerId,
      lines,
      discount: draft.discount,
      depositPaid: draft.depositPaid,
      status: deriveInvoiceStatus(draft),
      createdAt: new Date().toISOString(),
    }
    addInvoice(inv)
    track('engaged')
    navigate(`/invoices/${inv.id}`, { replace: true })
  }

  return (
    <SubShell title="new invoice">
      <div className="space-y-5 pb-8">
        <div>
          <FieldLabel>customer</FieldLabel>
          <button onClick={() => setPickCustomer(true)} className="w-full bg-card rounded-2xl shadow-sm p-3 flex items-center gap-3 text-left active:scale-[0.98] transition">
            {customer ? (
              <>
                <Avatar name={customer.name} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{customer.name}</div>
                  <div className="text-xs text-ink/50">{customer.phone}</div>
                </div>
              </>
            ) : (
              <div className="flex-1 text-ink/40 font-semibold py-1.5 px-1">choose customer…</div>
            )}
            <span className="text-ink/30 text-sm font-bold">change</span>
          </button>
        </div>

        {customer && (
          <div>
            <FieldLabel>bill their orders</FieldLabel>
            <div className="space-y-2">
              {customerOrders.map((o) => {
                const on = ticked.has(o.id)
                return (
                  <button
                    key={o.id}
                    onClick={() => toggle(o.id)}
                    className={`w-full rounded-2xl p-3.5 flex items-center gap-3 text-left transition active:scale-[0.98] ${
                      on ? 'bg-ink text-white shadow-md' : 'bg-card shadow-sm'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md grid place-items-center ${on ? 'bg-white text-ink' : 'bg-card2'}`}>
                      {on && Icons.check('w-3.5 h-3.5')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{o.garment}</div>
                      <div className={`text-[11px] ${on ? 'text-white/50' : 'text-ink/40'}`}>
                        {o.status}
                        {o.deposit > 0 ? ` · ${fmtMoney(o.deposit, cur)} deposit` : ''}
                      </div>
                    </div>
                    <div className="font-display font-bold text-sm">{fmtMoney(o.price, cur)}</div>
                  </button>
                )
              })}
              {customerOrders.length === 0 && (
                <div className="bg-card2 rounded-2xl p-4 text-center text-sm text-ink/40 font-medium">
                  no orders for this customer — add a manual line below.
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <FieldLabel>extra line items</FieldLabel>
          <div className="space-y-2">
            {manual.map((m) => (
              <div key={m.id} className="flex gap-2">
                <input
                  className={`${inputCls} flex-1 min-w-0`}
                  placeholder="e.g. fabric purchase"
                  value={m.label}
                  onChange={(e) => setManual(manual.map((x) => (x.id === m.id ? { ...x, label: e.target.value } : x)))}
                />
                {/* sized with flex-basis, not width: `inputCls` already carries
                    `w-full`, and a `w-28` alongside it loses the cascade — which
                    is what squashed the label field to a strip of padding. */}
                <input
                  className={`${inputCls} basis-28 grow-0 shrink-0`}
                  placeholder="0"
                  inputMode="numeric"
                  value={m.amount}
                  onChange={(e) => setManual(manual.map((x) => (x.id === m.id ? { ...x, amount: e.target.value } : x)))}
                />
                <button onClick={() => setManual(manual.filter((x) => x.id !== m.id))} className="text-ink/30 px-1">
                  {Icons.x()}
                </button>
              </div>
            ))}
            <button
              onClick={() => setManual([...manual, { id: uid(), label: '', amount: '' }])}
              className="w-full rounded-2xl border-2 border-dashed border-ink/15 text-ink/40 font-bold py-3 text-sm active:scale-[0.98] transition"
            >
              + add line
            </button>
          </div>
        </div>

        <div>
          <FieldLabel>discount</FieldLabel>
          <div className="flex gap-1.5 items-center">
            {(
              [
                ['none', 'none'],
                ['flat', `${cur} off`],
                ['percent', '% off'],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                onClick={() => setDiscountKind(kind)}
                className={`rounded-full px-4 py-2.5 text-xs font-bold transition ${
                  discountKind === kind ? 'bg-ink text-white' : 'bg-card text-ink/60 shadow-sm'
                }`}
              >
                {label}
              </button>
            ))}
            {discountKind !== 'none' && (
              <input
                className={`${inputCls} flex-1 min-w-0`}
                placeholder={discountKind === 'flat' ? '5000' : '10'}
                inputMode="numeric"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            )}
          </div>
        </div>

        <div>
          <FieldLabel>deposit already paid</FieldLabel>
          <input
            className={inputCls}
            placeholder="0"
            inputMode="numeric"
            value={deposit}
            onChange={(e) => {
              setDeposit(e.target.value)
              setDepositTouched(true)
            }}
          />
          <p className="text-[11px] text-ink/35 mt-1.5 ml-1">auto-summed from ticked orders — edit if needed.</p>
        </div>

        {/* live summary */}
        <div className="bg-card rounded-2xl shadow-sm p-4 space-y-2">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-ink/50">subtotal</span>
            <span>{fmtMoney(math.subtotal, cur)}</span>
          </div>
          {math.discount > 0 && (
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-ink/50">discount</span>
              <span>−{fmtMoney(math.discount, cur)}</span>
            </div>
          )}
          {draft.depositPaid > 0 && (
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-ink/50">deposit paid</span>
              <span>−{fmtMoney(draft.depositPaid, cur)}</span>
            </div>
          )}
          <div className="border-t border-ink/5 pt-2 flex justify-between items-baseline">
            <span className="text-sm font-bold">balance due</span>
            <span className="font-display font-bold text-2xl">{fmtMoney(math.balance, cur)}</span>
          </div>
        </div>

        <PillButton onClick={generate} className="w-full" disabled={lines.length === 0}>
          generate invoice
        </PillButton>
      </div>

      <CustomerPickerSheet open={pickCustomer} onClose={() => setPickCustomer(false)} onPick={onPickCustomer} />
    </SubShell>
  )
}
