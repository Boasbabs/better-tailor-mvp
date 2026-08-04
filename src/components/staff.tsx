import type { ReactNode } from 'react'
import { useStore } from '../store'
import { Avatar, Icons, Sheet } from '../components/ui'
import { ROLES, can, lastActiveLabel, type Ability } from '../perm'
import type { Staff, StaffRole } from '../types'

// ---------- who am i ----------

/** The signed-in person. Undefined only while the lock screen is up, which is
 *  the one moment nothing behind it is rendered. */
export function useMe(): Staff | undefined {
  return useStore((s) => s.staff.find((x) => x.id === s.currentStaffId))
}

/** `can(useMe(), ability)` in one call — the form nearly every screen wants. */
export function useCan(ability: Ability): boolean {
  return can(useMe(), ability)
}

/** True once there is somebody to switch between. Gates the lock screen, the
 *  "switch user" row and the "mine" filter, so a solo tailor sees none of it. */
export function useIsTeam(): boolean {
  return useStore((s) => s.staff.length > 1)
}

// ---------- the "you can't see this" row ----------
// Shown in place of masked data rather than beside it. A tailor who finds an
// empty space assumes the shop never recorded a number; one who finds this
// knows the number exists and who to ask.

export function LockedNote({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card2 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-[13px] font-semibold text-ink/45">
      <span className="text-ink/30 shrink-0">{Icons.lock('w-4 h-4')}</span>
      {children}
    </div>
  )
}

// ---------- role option ----------
// Typeform's pattern: the role and the sentence that explains it live in the
// same tap target, so nobody picks "manager" by guessing what managers do.

export function RoleOptions({ value, onChange }: { value: StaffRole; onChange: (r: StaffRole) => void }) {
  return (
    <div className="space-y-2">
      {ROLES.map((r) => {
        const on = value === r.id
        return (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            className={`w-full rounded-2xl p-4 text-left transition active:scale-[0.98] ${
              on ? 'bg-ink text-white' : 'bg-card shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm lowercase">{r.name}</span>
              {on && <span className="ml-auto">{Icons.check()}</span>}
            </div>
            <div className={`text-xs mt-1 leading-snug ${on ? 'text-white/60' : 'text-ink/45'}`}>{r.blurb}</div>
          </button>
        )
      })}
    </div>
  )
}

// ---------- staff row ----------

export function StaffRow({ staff, me, sewing, onClick }: { staff: Staff; me?: Staff; sewing: number; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`w-full bg-card rounded-2xl shadow-sm p-3.5 flex items-center gap-3 text-left ${
        onClick ? 'active:scale-[0.98] transition' : ''
      }`}
    >
      {/* A teammate exists from the moment they're created, before the boss has
          typed a name — a blank row and an empty circle read as a rendering
          bug rather than an unfinished record. */}
      <Avatar name={staff.name || '?'} />
      <div className="flex-1 min-w-0">
        <div className={`font-bold truncate ${staff.name ? '' : 'text-ink/40'}`}>
          {staff.name || 'unnamed teammate'}
          {staff.id === me?.id && <span className="text-ink/35 font-semibold"> (you)</span>}
        </div>
        <div className="text-xs text-ink/45 truncate">
          {lastActiveLabel(staff.lastActiveAt)}
          {sewing > 0 ? ` · ${sewing} sewing` : ''}
        </div>
      </div>
      <span className="shrink-0 text-[11px] font-bold text-ink/45 bg-card2 rounded-full px-2.5 py-1 lowercase">
        {staff.role}
      </span>
      {onClick && Icons.chevron('w-5 h-5 text-ink/25 shrink-0')}
    </Tag>
  )
}

// ---------- assignment picker ----------

export function AssigneeSheet({
  open,
  onClose,
  onPick,
  selected,
}: {
  open: boolean
  onClose: () => void
  onPick: (id: string | undefined) => void
  selected?: string
}) {
  const staff = useStore((s) => s.staff)
  const orders = useStore((s) => s.orders)
  return (
    <Sheet open={open} onClose={onClose} title="who is sewing this?">
      <div className="space-y-2">
        <button
          onClick={() => onPick(undefined)}
          className={`w-full rounded-2xl p-4 flex items-center gap-3 text-left transition active:scale-[0.98] ${
            !selected ? 'bg-ink text-white' : 'bg-card shadow-sm'
          }`}
        >
          <div className={`w-11 h-11 shrink-0 rounded-full grid place-items-center ${!selected ? 'bg-white/15' : 'bg-card2 text-ink/35'}`}>
            {Icons.people('w-5 h-5')}
          </div>
          <div className="font-bold text-sm lowercase">nobody yet</div>
          {!selected && <span className="ml-auto">{Icons.check()}</span>}
        </button>
        {staff.map((s) => {
          const on = selected === s.id
          const load = orders.filter((o) => o.assignedTo === s.id && o.status !== 'delivered').length
          return (
            <button
              key={s.id}
              onClick={() => onPick(s.id)}
              className={`w-full rounded-2xl p-3.5 flex items-center gap-3 text-left transition active:scale-[0.98] ${
                on ? 'bg-ink text-white' : 'bg-card shadow-sm'
              }`}
            >
              <Avatar name={s.name} />
              <div className="min-w-0">
                <div className="font-bold truncate">{s.name}</div>
                {/* Current load, so the boss spreads the work instead of
                    piling every rush job on whoever is top of the list. */}
                <div className={`text-xs lowercase ${on ? 'text-white/60' : 'text-ink/45'}`}>
                  {s.role} · {load} open
                </div>
              </div>
              {on && <span className="ml-auto">{Icons.check()}</span>}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
