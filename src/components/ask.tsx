import { useStore } from '../store'
import { Icons, inputCls, useToast } from './ui'
import { trackMeasure } from '../lib'
import { fillLink, requestMessage, waLink, type RequestPayload } from '../measure-link'
import type { Customer } from '../types'

/** Shared by the /ask page and the in-form sheet so there's one send path, not two. */
export function AskActions({
  customer,
  templateIds,
  requestId,
  disabled,
  sendLabel,
  onSent,
}: {
  customer?: Customer | null // null/undefined = open link, anyone can fill it
  templateIds: string[]
  requestId: string
  disabled?: boolean
  sendLabel?: string
  onSent?: (via: 'whatsapp' | 'copy') => void
}) {
  const settings = useStore((s) => s.settings)
  const templates = useStore((s) => s.templates)
  const saveRequest = useStore((s) => s.saveRequest)
  const show = useToast((s) => s.show)

  const bound = !!customer
  const ready = templateIds.length > 0 && !disabled

  const payload: RequestPayload = {
    v: 1,
    r: requestId,
    b: settings.businessName,
    g: settings.tagline,
    p: settings.phone,
    c: bound ? customer!.id : '',
    n: bound ? customer!.name : '',
    s: templateIds
      .map((id) => templates.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map((t) => ({ i: t.id, n: t.name, f: t.fields })),
  }

  const link = templateIds.length ? fillLink(payload) : ''

  const remember = () => {
    saveRequest({
      id: requestId,
      customerId: bound ? customer!.id : '',
      templateIds,
      sentAt: new Date().toISOString(),
    })
    trackMeasure('sent', bound ? 'customer' : 'open')
  }

  const send = () => {
    if (!ready) return
    // No number on an open link — WhatsApp then shows its own contact picker.
    window.open(waLink(bound ? customer!.phone : '', requestMessage(payload)), '_blank')
    remember()
    onSent?.('whatsapp')
  }

  const copy = async () => {
    if (!ready) return
    try {
      await navigator.clipboard.writeText(link)
      remember()
      show('link copied ✓')
      onSent?.('copy')
    } catch {
      show('could not copy — long-press the link instead')
    }
  }

  return (
    <div className="space-y-3">
      {ready && (
        <div className="bg-card2 rounded-2xl p-3 flex items-center gap-2">
          <input readOnly value={link} className={`${inputCls} bg-card text-[11px] py-2.5 truncate`} />
          <button
            onClick={copy}
            aria-label="copy link"
            className="w-11 h-11 shrink-0 rounded-full bg-card shadow-sm grid place-items-center text-ink/60 active:scale-90 transition"
          >
            {Icons.copy()}
          </button>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={send}
          disabled={!ready}
          className="w-full bg-wa text-white rounded-full font-bold text-[15px] py-3.5 flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-30"
        >
          {Icons.whatsapp('w-[18px] h-[18px]')}
          {sendLabel ?? 'send on whatsapp'}
        </button>
        <button
          onClick={() => ready && window.open(fillLink(payload, true), '_blank')}
          disabled={!ready}
          className="w-full bg-card shadow-sm rounded-full font-bold text-[15px] py-3.5 active:scale-95 transition disabled:opacity-30"
        >
          preview what they'll see
        </button>
        <p className="text-center text-[11px] text-ink/35 pt-1">
          preview opens the real form — fill it in to walk the whole loop yourself.
        </p>
      </div>
    </div>
  )
}
