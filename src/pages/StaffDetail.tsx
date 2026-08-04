import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Confirm, FieldLabel, Icons, inputCls, useToast } from '../components/ui'
import { RoleOptions, useMe } from '../components/staff'
import { PIN_LENGTH, can, lastActiveLabel, randomPin } from '../perm'
import type { StaffRole } from '../types'

export default function StaffDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const show = useToast((s) => s.show)
  const me = useMe()
  const staff = useStore((s) => s.staff.find((x) => x.id === id))
  const allStaff = useStore((s) => s.staff)
  const orders = useStore((s) => s.orders)
  const updateStaff = useStore((s) => s.updateStaff)
  const deleteStaff = useStore((s) => s.deleteStaff)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const sewing = useMemo(
    () => orders.filter((o) => o.assignedTo === id && o.status !== 'delivered').length,
    [orders, id],
  )

  if (!staff || !can(me, 'manageStaff')) {
    return (
      <SubShell title="staff" backTo="/settings">
        <div className="text-center text-ink/40 py-20">{staff ? 'only the owner can manage staff' : 'not found'}</div>
      </SubShell>
    )
  }

  const isMe = staff.id === me?.id
  const owners = allStaff.filter((s) => s.role === 'owner').length

  const setRole = (role: StaffRole) => {
    // Demoting the only owner would leave nobody able to reach this page again
    // — in an app with no support line to call, that is unrecoverable.
    if (staff.role === 'owner' && role !== 'owner' && owners === 1)
      return show('the shop needs at least one owner')
    // Managers and owners always see contacts, so promoting somebody quietly
    // grants it; drop the override back to off if they are demoted later.
    updateStaff(staff.id, { role, canSeeContacts: role === 'tailor' ? staff.canSeeContacts : true })
  }

  const setPin = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, PIN_LENGTH)
    // Only the owner may be PIN-less, and only their own account — anyone else
    // with a blank PIN would be a tappable door into the boss's shop.
    if (!digits && staff.role !== 'owner') return
    updateStaff(staff.id, { pin: digits })
  }

  return (
    <SubShell title={staff.name || 'teammate'} backTo="/settings">
      <div className="space-y-6 pb-10">
        <div>
          <FieldLabel>name</FieldLabel>
          <input
            className={inputCls}
            placeholder="e.g. Tunde Bello"
            value={staff.name}
            onChange={(e) => updateStaff(staff.id, { name: e.target.value })}
          />
          <p className="text-[11px] text-ink/35 mt-2 ml-1">
            {lastActiveLabel(staff.lastActiveAt)}
            {sewing > 0 ? ` · ${sewing} order${sewing === 1 ? '' : 's'} on their bench` : ' · no orders assigned'}
          </p>
        </div>

        <div>
          <h2 className="font-display font-bold lowercase mb-3">role</h2>
          <RoleOptions value={staff.role} onChange={setRole} />
        </div>

        {/* The single override, and the only one. Managers and owners are not
            offered it because their role already carries it. */}
        {staff.role === 'tailor' && (
          <div>
            <h2 className="font-display font-bold lowercase mb-1">extra access</h2>
            <p className="text-[13px] text-ink/45 mb-3">
              off by default so a tailor can’t take your customer list with them.
            </p>
            <button
              onClick={() => updateStaff(staff.id, { canSeeContacts: !staff.canSeeContacts })}
              className="w-full bg-card rounded-2xl shadow-sm p-4 flex items-center gap-3 text-left active:scale-[0.98] transition"
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm lowercase">customer contact details</div>
                <div className="text-xs text-ink/45 leading-snug mt-0.5">
                  phone, email and address — and the call and whatsapp buttons that go with them.
                </div>
              </div>
              <span
                className={`shrink-0 w-12 h-7 rounded-full p-1 transition ${staff.canSeeContacts ? 'bg-ok' : 'bg-ink/15'}`}
                role="switch"
                aria-checked={staff.canSeeContacts}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    staff.canSeeContacts ? 'translate-x-5' : ''
                  }`}
                />
              </span>
            </button>
          </div>
        )}

        <div>
          <h2 className="font-display font-bold lowercase mb-1">pin</h2>
          <p className="text-[13px] text-ink/45 mb-3">
            {staff.role === 'owner'
              ? 'leave it empty and tapping your name opens the shop. an owner can never be locked out.'
              : `read these four digits out to ${staff.name.split(' ')[0] || 'them'} — they type it to sign in.`}
          </p>
          <div className="flex gap-2">
            <input
              className={`${inputCls} font-display font-bold text-2xl tracking-[0.4em] text-center`}
              inputMode="numeric"
              placeholder={staff.role === 'owner' ? 'no pin' : '••••'}
              value={staff.pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <button
              onClick={() => {
                const p = randomPin()
                updateStaff(staff.id, { pin: p })
                show(`new pin — ${p}`)
              }}
              className="shrink-0 bg-card shadow-sm rounded-2xl px-5 text-xs font-bold lowercase active:scale-95 transition"
            >
              new pin
            </button>
          </div>
          {staff.role !== 'owner' && staff.pin.length < PIN_LENGTH && (
            <p className="text-[11px] text-danger font-bold mt-2 ml-1">needs all four digits before they can sign in.</p>
          )}
        </div>

        {isMe ? (
          <p className="text-center text-[11px] text-ink/35">this is you — you can’t remove your own account.</p>
        ) : (
          <button
            onClick={() => setConfirmRemove(true)}
            className="w-full bg-card rounded-2xl shadow-sm p-4 text-danger font-bold text-sm active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            {Icons.trash('w-4 h-4')} remove {staff.name.split(' ')[0] || 'this person'}
          </button>
        )}
      </div>

      <Confirm
        open={confirmRemove}
        title={`remove ${staff.name.split(' ')[0] || 'this person'}?`}
        body={
          sewing > 0
            ? `they lose access straight away. their ${sewing} open order${sewing === 1 ? '' : 's'} stay here, unassigned.`
            : 'they lose access straight away. nothing else is deleted.'
        }
        confirmLabel="yes, remove"
        onConfirm={() => {
          deleteStaff(staff.id)
          show(`${staff.name.split(' ')[0] || 'they'} can no longer sign in`)
          navigate('/settings', { replace: true })
        }}
        onClose={() => setConfirmRemove(false)}
      />
    </SubShell>
  )
}
