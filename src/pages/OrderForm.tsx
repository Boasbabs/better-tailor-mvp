import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Avatar, FieldLabel, PillButton, inputCls, useToast } from '../components/ui'
import { CustomerPickerSheet, FabricPickerSheet, StylePickerSheet } from '../components/pickers'
import { MeasurementGrid } from '../components/measure'
import { AssigneeSheet, useCan, useIsTeam } from '../components/staff'
import { MASK_PHONE, masked } from '../perm'
import { FabricImage, StyleImage, fabricName, styleName } from '../gallery'
import { track, uid } from '../lib'
import type { Customer, Order } from '../types'

export default function OrderForm() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const show = useToast((s) => s.show)

  const templates = useStore((s) => s.templates)
  const customers = useStore((s) => s.customers)
  const addOrder = useStore((s) => s.addOrder)
  const updateOrder = useStore((s) => s.updateOrder)
  const existing = useStore((s) => s.orders.find((o) => o.id === id))

  const editing = Boolean(existing)

  const [customerId, setCustomerId] = useState(existing?.customerId ?? sp.get('customer') ?? '')
  const [garment, setGarment] = useState(existing?.garment ?? '')
  const [templateId, setTemplateId] = useState(existing?.templateId ?? '')
  const [measurements, setMeasurements] = useState<Record<string, number | string>>(existing?.measurements ?? {})
  const [autofilledFrom, setAutofilledFrom] = useState<string | null>(null)
  const [styleId, setStyleId] = useState(existing?.styleId ?? '')
  const [fabricId, setFabricId] = useState(existing?.fabricId ?? '')
  const [price, setPrice] = useState(existing ? String(existing.price) : '')
  const [deposit, setDeposit] = useState(existing && existing.deposit > 0 ? String(existing.deposit) : '')
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [assignedTo, setAssignedTo] = useState<string | undefined>(existing?.assignedTo)

  const [pickCustomer, setPickCustomer] = useState(false)
  const [pickStyle, setPickStyle] = useState(false)
  const [pickFabric, setPickFabric] = useState(false)
  const [pickAssignee, setPickAssignee] = useState(false)

  const isTeam = useIsTeam()
  const canAssign = useCan('assignWork')
  const canSeeContacts = useCan('contacts')
  const assignee = useStore((s) => s.staff.find((x) => x.id === assignedTo))

  const customer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId])
  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId])

  // snapshot autofill: copy the customer's saved set for this template
  const applyTemplate = (tid: string, cust: Customer | undefined) => {
    setTemplateId(tid)
    const t = templates.find((x) => x.id === tid)
    if (!t) return
    const saved = cust?.sets.find((s) => s.templateId === tid)
    const values: Record<string, number | string> = {}
    for (const f of t.fields) values[f] = saved?.values[f] ?? ''
    if (saved) for (const [k, v] of Object.entries(saved.values)) values[k] = v
    setMeasurements(values)
    setAutofilledFrom(saved && cust ? cust.name : null)
  }

  const onPickCustomer = (c: Customer) => {
    setCustomerId(c.id)
    setPickCustomer(false)
    if (templateId && !editing) applyTemplate(templateId, c)
  }

  const save = () => {
    if (!customerId) return show('pick a customer first')
    if (!garment.trim()) return show('give the garment a name')
    if (!templateId) return show('pick a measurement template')
    const cleaned: Record<string, number | string> = {}
    for (const [k, v] of Object.entries(measurements)) {
      if (v === '' || v === undefined) continue
      const n = Number(v)
      cleaned[k] = Number.isFinite(n) && String(v).trim() !== '' ? n : v
    }
    const base: Order = {
      id: existing?.id ?? uid(),
      customerId,
      garment: garment.trim(),
      templateId,
      measurements: cleaned,
      styleId,
      fabricId,
      price: Number(price) || 0,
      deposit: Number(deposit) || 0,
      dueDate: dueDate || undefined,
      status: existing?.status ?? 'new',
      assignedTo,
      notes,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    if (editing) {
      updateOrder(base.id, base)
      navigate(-1)
    } else {
      addOrder(base)
      track('engaged')
      navigate(`/orders/${base.id}`, { replace: true })
    }
  }

  return (
    <SubShell title={editing ? 'edit order' : 'new order'}>
      <div className="space-y-5 pb-8">
        <div>
          <FieldLabel>customer</FieldLabel>
          <button onClick={() => setPickCustomer(true)} className="w-full bg-card rounded-2xl shadow-sm p-3 flex items-center gap-3 text-left active:scale-[0.98] transition">
            {customer ? (
              <>
                <Avatar name={customer.name} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{customer.name}</div>
                  <div className="text-xs text-ink/50">{masked(customer.phone, canSeeContacts, MASK_PHONE)}</div>
                </div>
              </>
            ) : (
              <div className="flex-1 text-ink/40 font-semibold py-1.5 px-1">choose customer…</div>
            )}
            <span className="text-ink/30 text-sm font-bold">change</span>
          </button>
        </div>

        <div>
          <FieldLabel>garment</FieldLabel>
          <input className={inputCls} placeholder="e.g. Agbada (navy)" value={garment} onChange={(e) => setGarment(e.target.value)} />
        </div>

        <div>
          <FieldLabel>measurement template</FieldLabel>
          <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.id, customer)}
                className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                  templateId === t.id ? 'bg-ink text-white' : 'bg-card text-ink/60 shadow-sm'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {template && (
          <div>
            <div className="flex items-baseline justify-between">
              <FieldLabel>measurements (inches)</FieldLabel>
              {autofilledFrom && (
                <span className="text-[11px] font-bold text-ok mb-1.5">✓ auto-filled from {autofilledFrom.split(' ')[0]}'s set</span>
              )}
            </div>
            <MeasurementGrid
              fields={template.fields}
              values={measurements}
              onChange={(f, v) => setMeasurements((m) => ({ ...m, [f]: v }))}
              onAddField={(name) => setMeasurements((m) => ({ ...m, [name]: '' }))}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>style</FieldLabel>
            <button onClick={() => setPickStyle(true)} className="w-full bg-card rounded-2xl shadow-sm p-3 active:scale-[0.98] transition">
              {styleId ? (
                <>
                  <StyleImage styleId={styleId} className="w-full aspect-[4/3] rounded-xl" />
                  <div className="text-xs font-bold lowercase mt-1">{styleName(styleId)}</div>
                </>
              ) : (
                <div className="h-[84px] grid place-items-center text-ink/40 text-xs font-bold">pick style…</div>
              )}
            </button>
          </div>
          <div>
            <FieldLabel>fabric</FieldLabel>
            <button onClick={() => setPickFabric(true)} className="w-full bg-card rounded-2xl shadow-sm p-3 active:scale-[0.98] transition">
              {fabricId ? (
                <>
                  <FabricImage fabricId={fabricId} className="w-full aspect-[4/3] rounded-xl" />
                  <div className="text-xs font-bold lowercase mt-1">{fabricName(fabricId)}</div>
                </>
              ) : (
                <div className="h-[84px] grid place-items-center text-ink/40 text-xs font-bold">pick fabric…</div>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>price</FieldLabel>
            <input className={inputCls} placeholder="45000" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <FieldLabel>deposit paid</FieldLabel>
            <input className={inputCls} placeholder="0" inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </div>
        </div>

        <div>
          <FieldLabel>due date</FieldLabel>
          <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        {isTeam && canAssign && (
          <div>
            <FieldLabel>who is sewing it</FieldLabel>
            <button
              onClick={() => setPickAssignee(true)}
              className="w-full bg-card rounded-2xl shadow-sm p-3 flex items-center gap-3 text-left active:scale-[0.98] transition"
            >
              {assignee ? (
                <>
                  <Avatar name={assignee.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{assignee.name}</div>
                    <div className="text-xs text-ink/50 lowercase">{assignee.role}</div>
                  </div>
                </>
              ) : (
                <div className="flex-1 text-ink/40 font-semibold py-1.5 px-1">nobody yet…</div>
              )}
              <span className="text-ink/30 text-sm font-bold">change</span>
            </button>
          </div>
        )}

        <div>
          <FieldLabel>notes</FieldLabel>
          <textarea className={`${inputCls} min-h-20`} placeholder="style details, adjustments…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <PillButton onClick={save} className="w-full">
          {editing ? 'save changes' : 'add order'}
        </PillButton>
      </div>

      <CustomerPickerSheet open={pickCustomer} onClose={() => setPickCustomer(false)} onPick={onPickCustomer} />
      <StylePickerSheet open={pickStyle} onClose={() => setPickStyle(false)} selected={styleId} onPick={(s) => { setStyleId(s); setPickStyle(false) }} />
      <FabricPickerSheet open={pickFabric} onClose={() => setPickFabric(false)} selected={fabricId} onPick={(f) => { setFabricId(f); setPickFabric(false) }} />
      <AssigneeSheet open={pickAssignee} onClose={() => setPickAssignee(false)} selected={assignedTo} onPick={(a) => { setAssignedTo(a); setPickAssignee(false) }} />
    </SubShell>
  )
}
