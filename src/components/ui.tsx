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
    whatsapp: 'bg-wa text-white',
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
// One badge recipe everywhere: soft tinted background + saturated same-hue text
// + a leading dot. Solid fills are reserved for overdue — the only pill allowed
// to shout, so it stays the loudest thing on the orders list.
const PILL = 'inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-1 text-[11px] font-bold'

function Badge({ tone, dot, children }: { tone: string; dot: string; children: ReactNode }) {
  return (
    <span className={`${PILL} ${tone}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  )
}

const STATUS_TONES: Record<OrderStatus, { tone: string; dot: string }> = {
  new: { tone: 'bg-ink/[0.06] text-ink/55', dot: 'bg-ink/30' },
  sewing: { tone: 'bg-[#EAEEFF] text-[#3B4FD8]', dot: 'bg-[#3B4FD8]' },
  ready: { tone: 'bg-[#F1EAFF] text-[#7139D4]', dot: 'bg-[#7139D4]' },
  delivered: { tone: 'bg-[#E4F5EC] text-[#12764B]', dot: 'bg-[#12764B]' },
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const { tone, dot } = STATUS_TONES[status]
  return (
    <Badge tone={`${tone} lowercase`} dot={dot}>
      {status}
    </Badge>
  )
}

export function DuePill({ dueDate, delivered }: { dueDate?: string; delivered?: boolean }) {
  if (delivered)
    return (
      <Badge tone="bg-[#E4F5EC] text-[#12764B]" dot="bg-[#12764B]">
        delivered
      </Badge>
    )
  const u = urgency(dueDate)
  const { tone, dot } =
    u === 'overdue'
      ? { tone: 'bg-danger text-white', dot: 'bg-white' }
      : u === 'soon'
        ? { tone: 'bg-[#FFF1DC] text-[#9A5B00]', dot: 'bg-[#E89100]' }
        : { tone: 'bg-ink/[0.06] text-ink/45', dot: 'bg-ink/25' }
  return (
    <Badge tone={tone} dot={dot}>
      {dueLabel(dueDate)}
    </Badge>
  )
}

const INVOICE_TONES: Record<InvoiceStatus, { tone: string; dot: string }> = {
  paid: { tone: 'bg-[#E4F5EC] text-[#12764B]', dot: 'bg-[#12764B]' },
  'part-paid': { tone: 'bg-[#FFF1DC] text-[#9A5B00]', dot: 'bg-[#E89100]' },
  unpaid: { tone: 'bg-ink/[0.06] text-ink/55', dot: 'bg-ink/30' },
}

export function InvoicePill({ status }: { status: InvoiceStatus }) {
  const { tone, dot } = INVOICE_TONES[status]
  return (
    <Badge tone={tone} dot={dot}>
      {status}
    </Badge>
  )
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
  copy: (c?: string) => (
    <svg viewBox="0 0 24 24" className={c ?? 'w-5 h-5'} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M6 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V6" />
    </svg>
  ),
  ruler: (c?: string) => (
    <svg viewBox="0 0 24 24" className={c ?? 'w-5 h-5'} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.6 2.6 21.4 8.4a1.4 1.4 0 0 1 0 2L10.4 21.4a1.4 1.4 0 0 1-2 0L2.6 15.6a1.4 1.4 0 0 1 0-2L13.6 2.6a1.4 1.4 0 0 1 2 0Z" />
      <path d="m14.4 7.4 1.7 1.7M11.4 10.4l1.7 1.7M8.4 13.4l1.7 1.7" />
    </svg>
  ),
  bell: (c?: string) => (
    <svg viewBox="0 0 24 24" className={c ?? 'w-5 h-5'} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8.4a6 6 0 1 0-12 0c0 6.6-2.6 8.6-2.6 8.6h17.2S18 15 18 8.4" />
      <path d="M13.7 20.6a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  up: (c?: string) => <I className={c ?? 'w-4 h-4'} d="M18 15l-6-6-6 6" />,
  down: (c?: string) => <I className={c ?? 'w-4 h-4'} d="M6 9l6 6 6-6" />,
  heart: (c?: string) => (
    <svg viewBox="0 0 24 24" className={c ?? 'w-5 h-5'} fill="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  shirt: (c?: string) => <TabIcon name="orders" active={false} className={c ?? 'w-6 h-6'} />,
  people: (c?: string) => <TabIcon name="customers" active={false} className={c ?? 'w-6 h-6'} />,
  receipt: (c?: string) => <TabIcon name="invoices" active={false} className={c ?? 'w-6 h-6'} />,
  // Official WhatsApp glyph — used only to label WhatsApp actions.
  whatsapp: (c?: string) => (
    <svg viewBox="0 0 24 24" className={c ?? 'w-5 h-5'} fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.19.05-.37-.03-.51-.07-.15-.66-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.03 1.02-1.03 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.27-.2-.57-.34M12.05 21.79h-.01c-1.77 0-3.51-.48-5.03-1.38l-.36-.22-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.15 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42" />
    </svg>
  ),
}

// ---------- tab icons ----------
// Filled when active, outlined when not — the pattern Spotify/Tonal use, and
// far more legible at 26px than relying on opacity alone.
export type TabName = 'orders' | 'customers' | 'invoices'

export function TabIcon({ name, active, className }: { name: TabName; active: boolean; className?: string }) {
  const s = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  const solid = active ? 'currentColor' : 'none'
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'w-[26px] h-[26px]'} aria-hidden="true">
      {name === 'orders' && (
        // garment hanger — reads as "tailoring" more clearly than a t-shirt
        <>
          <path {...s} d="M12 9.4V8.7a2.7 2.7 0 1 1 2.7-2.7" />
          <path {...s} fill={solid} d="M12 9.4 4.15 15.3a1.8 1.8 0 0 0 1.1 3.24h13.5a1.8 1.8 0 0 0 1.1-3.24L12 9.4Z" />
        </>
      )}
      {name === 'customers' && (
        // back person first so the front silhouette overlaps it cleanly
        <>
          <circle {...s} fill={solid} cx="16.9" cy="8.2" r="2.5" />
          <path {...s} d="M18.2 14.1a5.2 5.2 0 0 1 2.9 4.8" />
          <circle {...s} fill={solid} cx="9.3" cy="8" r="3.3" />
          <path {...s} fill={solid} d="M3.3 19.2a6.1 6.1 0 0 1 12.2 0Z" />
        </>
      )}
      {name === 'invoices' && (
        <>
          <path
            {...s}
            fill={solid}
            d="M5.7 3.5a1.2 1.2 0 0 1 1.2-1.2h10.2a1.2 1.2 0 0 1 1.2 1.2v17.1l-2.55-1.5-2.55 1.5-2.55-1.5-2.55 1.5L5.7 20.6V3.5Z"
          />
          <path
            fill="none"
            stroke={active ? '#FFFFFF' : 'currentColor'}
            strokeWidth="1.9"
            strokeLinecap="round"
            d="M9 8.3h6M9 12h6M9 15.7h3.2"
          />
        </>
      )}
    </svg>
  )
}
