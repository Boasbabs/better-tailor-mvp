import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { FieldLabel, PillButton, inputCls, useToast } from '../components/ui'
import { track, uid } from '../lib'
import type { Customer } from '../types'

export default function CustomerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const show = useToast((s) => s.show)
  const existing = useStore((s) => s.customers.find((c) => c.id === id))
  const addCustomer = useStore((s) => s.addCustomer)
  const updateCustomer = useStore((s) => s.updateCustomer)

  const [name, setName] = useState(existing?.name ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [address, setAddress] = useState(existing?.address ?? '')
  const [area, setArea] = useState(existing?.area ?? '')
  const [gender, setGender] = useState<'male' | 'female' | undefined>(existing?.gender)

  const editing = Boolean(existing)

  const save = () => {
    if (!name.trim()) return show('name is required')
    const contact = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      area: area.trim(),
      gender,
    }
    if (editing && existing) {
      updateCustomer(existing.id, contact)
      navigate(-1)
      return
    }
    const c: Customer = {
      id: uid(),
      ...contact,
      sets: [],
      createdAt: new Date().toISOString(),
    }
    addCustomer(c)
    track('engaged')
    navigate(`/customers/${c.id}`, { replace: true })
  }

  return (
    <SubShell title={editing ? 'edit customer' : 'new customer'}>
      <div className="space-y-5 pb-8">
        <div>
          <FieldLabel>full name</FieldLabel>
          <input className={inputCls} placeholder="e.g. Adaeze Okafor" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <FieldLabel>phone (with country code)</FieldLabel>
          <input className={inputCls} placeholder="+234 803 123 4567" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <p className="text-[11px] text-ink/35 mt-1.5 ml-1">the country code makes WhatsApp sharing work.</p>
        </div>
        <div>
          <FieldLabel>email (optional)</FieldLabel>
          <input className={inputCls} placeholder="name@example.com" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <FieldLabel>address (optional)</FieldLabel>
          <input className={inputCls} placeholder="e.g. 17 Adeniran Ogunsanya St" value={address} onChange={(e) => setAddress(e.target.value)} />
          <p className="text-[11px] text-ink/35 mt-1.5 ml-1">
            phone, email and address are hidden from staff unless you allow it.
          </p>
        </div>
        <div>
          <FieldLabel>area / city</FieldLabel>
          <input className={inputCls} placeholder="e.g. Surulere, Lagos" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div>
          <FieldLabel>gender (optional)</FieldLabel>
          <div className="flex gap-1.5">
            {(['female', 'male'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGender(gender === g ? undefined : g)}
                className={`rounded-full px-5 py-2.5 text-sm font-bold lowercase transition ${
                  gender === g ? 'bg-ink text-white' : 'bg-card text-ink/60 shadow-sm'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <PillButton onClick={save} className="w-full">
          {editing ? 'save changes' : 'add customer'}
        </PillButton>
        {!editing && <p className="text-center text-xs text-ink/35">you'll add their measurements on the next screen.</p>}
      </div>
    </SubShell>
  )
}
