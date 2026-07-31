import { useEffect, type ReactNode } from 'react'
import { create } from 'zustand'
import type { InvoiceStatus, OrderStatus } from '../types'
import { dueLabel, urgency } from '../lib'

// ---------- toast ----------
type ToastState = { msg: string | null; show: (m: string) => void; clear: () => void }
export const useToast = create<ToastState>((set) => ({
  msg: null,
  show: (m) => set({ msg: m }),
  clear: () => set({ msg: null }),
}))

export function Toaster() {
  const { msg, clear } = useToast()
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(clear, 2600)
    return () => clearTimeout(t)
  }, [msg, clear])
  if (!msg) return null
  return (
    <div className="fixed inset-x-0 bottom-28 z-[60] flex justify-center px-6 pointer-events-none">
      <div className="anim-pop bg-ink text-white text-sm font-semibold rounded-full px-5 py-3 shadow-lg">
        {msg}
      </div>
    </div>
  )
}

// ---------- primitives ----------
export const inputCls =
  'w-full bg-card rounded-2xl px-4 py-3 text-[15px] font-medium shadow-sm outline-none placeholder:text-ink/30 focus:ring-2 focus:ring-ink/15'

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-1.5 ml-1">{children}</div>
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`bg-card rounded-2xl shadow-sm ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

export function PillButton({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'light' | 'danger' | 'whatsapp'
  className?: string
  disabled?: boolean
}) {
  const styles = {
    primary: 'bg-ink text-white',
    light: 'bg-card text-ink shadow-sm',
    danger: 'bg-danger/10 text-danger',
    whatsapp: 'bg-ok text-white',
  }[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full font-bold text-[15px] px-6 py-3.5 active:scale-95 transition disabled:opacity-30 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

// ---------- pills ----------
export function StatusPill({ status }: { status: OrderStatus }) {
  const cls = {
    new: 'bg-card2 text-ink',
    sewing: 'bg-ink text-white',
    ready: 'bg-white text-ink shadow-sm ring-1 ring-ink/10',
    delivered: 'bg-ok/10 text-ok',
  }[status]
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold lowercase ${cls}`}>{status}</span>
}

export function DuePill({ dueDate, delivered }: { dueDate?: string; delivered?: boolean }) {
  if (delivered) return <span className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-ok/10 text-ok">delivered ✓</span>
  const u = urgency(dueDate)
  const cls =
    u === 'overdue'
      ? 'bg-danger text-white'
      : u === 'soon'
        ? 'bg-warn/15 text-[#b17a08]'
        : 'bg-card2 text-ink/50'
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>{dueLabel(dueDate)}</span>
}

export function InvoicePill({ status }: { status: InvoiceStatus }) {
  const cls = {
    paid: 'bg-ok/10 text-ok',
    'part-paid': 'bg-warn/15 text-[#b17a08]',
    unpaid: 'bg-card2 text-ink/60',
  }[status]
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>{status}</span>
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  const cls = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-11 h-11 text-sm'
  return (
    <div className={`${cls} shrink-0 rounded-full bg-ink text-white grid place-items-center font-bold font-display`}>
      {initials}
    </div>
  )
}

// ---------- overlays ----------
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="anim-fade absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0">
        <div className="anim-sheet max-w-md mx-auto bg-bg rounded-t-3xl p-5 pb-[max(2rem,env(safe-area-inset-bottom))] max-h-[82dvh] overflow-y-auto">
          <div className="w-10 h-1 rounded-full bg-ink/15 mx-auto mb-4" />
          {title && <h3 className="font-display font-bold text-lg lowercase mb-4">{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  )
}

export function Confirm({
  open,
  title,
  body,
  confirmLabel = 'yes, delete',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-8">
      <div className="anim-fade absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="anim-pop relative bg-card rounded-3xl p-6 w-full max-w-xs text-center shadow-xl">
        <div className="font-display font-bold text-lg lowercase">{title}</div>
        {body && <p className="text-sm text-ink/60 mt-2">{body}</p>}
        <div className="flex gap-2 mt-5">
          <button className="flex-1 rounded-full font-bold py-3 bg-card2 active:scale-95 transition" onClick={onClose}>
            cancel
          </button>
          <button
            className="flex-1 rounded-full font-bold py-3 bg-danger text-white active:scale-95 transition"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Celebration({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-8 backdrop-blur-md bg-white/50" onClick={onClose}>
      <div className="anim-pop bg-ink text-white rounded-3xl px-10 py-9 text-center shadow-2xl">
        <div className="text-6xl">🎉</div>
        <div className="font-display font-bold text-2xl lowercase mt-4">delivered!</div>
        <p className="text-white/60 text-sm mt-1">another happy customer.</p>
        <button className="mt-6 bg-white text-ink rounded-full font-bold px-10 py-3 active:scale-95 transition" onClick={onClose}>
          nice
        </button>
      </div>
    </div>
  )
}

// ---------- icons (minimal stroke set) ----------
function I({ d, className = 'w-5 h-5', filled = false }: { d: string; className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

export const Icons = {
  back: (c?: string) => <I className={c ?? 'w-6 h-6'} d="M15 18l-6-6 6-6" />,
  gear: (c?: string) => (
    <svg viewBox="0 0 24 24" className={c ?? 'w-6 h-6'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  ),
  plus: (c?: string) => <I className={c ?? 'w-7 h-7'} d="M12 5v14M5 12h14" />,
  x: (c?: string) => <I className={c ?? 'w-5 h-5'} d="M18 6L6 18M6 6l12 12" />,
  search: (c?: string) => (
    <svg viewBox="0 0 24 24" className={c ?? 'w-5 h-5'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  phone: (c?: string) => (
    <I
      className={c ?? 'w-5 h-5'}
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
    />
  ),
  chat: (c?: string) => <I className={c ?? 'w-5 h-5'} d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.38 8.38 0 0 1 8.5 8.5z" />,
  camera: (c?: string) => (
    <svg viewBox="0 0 24 24" className={c ?? 'w-6 h-6'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  chevron: (c?: string) => <I className={c ?? 'w-5 h-5'} d="M9 18l6-6-6-6" />,
  trash: (c?: string) => <I className={c ?? 'w-5 h-5'} d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />,
  edit: (c?: string) => <I className={c ?? 'w-5 h-5'} d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />,
  download: (c?: string) => <I className={c ?? 'w-5 h-5'} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  check: (c?: string) => <I className={c ?? 'w-4 h-4'} d="M20 6L9 17l-5-5" />,
  up: (c?: string) => <I className={c ?? 'w-4 h-4'} d="M18 15l-6-6-6 6" />,
  down: (c?: string) => <I className={c ?? 'w-4 h-4'} d="M6 9l6 6 6-6" />,
  heart: (c?: string) => (
    <svg viewBox="0 0 24 24" className={c ?? 'w-5 h-5'} fill="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  shirt: (c?: string) => <I className={c ?? 'w-6 h-6'} d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />,
  people: (c?: string) => (
    <svg viewBox="0 0 24 24" className={c ?? 'w-6 h-6'} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  receipt: (c?: string) => <I className={c ?? 'w-6 h-6'} d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2zM8 8h8M8 12h8M8 16h5" />,
}
