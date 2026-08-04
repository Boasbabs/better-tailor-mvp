import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store'
import { Wordmark } from '../components/shell'
import { Avatar, Icons } from '../components/ui'
import { PIN_LENGTH } from '../perm'
import type { Staff } from '../types'

// Two steps on one screen: pick a face, then prove it's you. The list comes
// first because on a shared counter phone the question is always "who is this",
// never "what is the password" — the Dropbox/Expensify member-row shape, sized
// up to be tappable with a tape measure in the other hand.

export default function Lock() {
  const staff = useStore((s) => s.staff)
  const signIn = useStore((s) => s.signIn)
  const [picked, setPicked] = useState<Staff | null>(null)

  // Stable across PinPad's re-renders. A fresh closure here would re-run the
  // verify effect on every render, cancelling and rescheduling the "wrong pin"
  // reset timer each time so it could be pushed back indefinitely.
  const pickedId = picked?.id
  const onDone = useCallback(() => pickedId && signIn(pickedId), [pickedId, signIn])

  if (picked) return <PinPad staff={picked} onBack={() => setPicked(null)} onDone={onDone} />

  return (
    <Frame title="who's working?" sub="tap your name to open the shop">
      <div className="space-y-2">
        {staff.map((s) => (
          <button
            key={s.id}
            onClick={() => (s.pin ? setPicked(s) : signIn(s.id))}
            className="w-full bg-card rounded-2xl shadow-sm p-4 flex items-center gap-3.5 text-left active:scale-[0.98] transition"
          >
            <Avatar name={s.name || '?'} />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{s.name || 'unnamed teammate'}</div>
              <div className="text-xs text-ink/45 lowercase">
                {s.role}
                {s.pin ? '' : ' · no pin — tap to enter'}
              </div>
            </div>
            {s.pin ? <span className="text-ink/25">{Icons.lock('w-[18px] h-[18px]')}</span> : Icons.chevron('w-5 h-5 text-ink/25')}
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-ink/35 mt-6 leading-relaxed">
        forgot a pin? the owner can reset it in
        <br />
        settings › staff › that person
      </p>
    </Frame>
  )
}

function PinPad({ staff, onBack, onDone }: { staff: Staff; onBack: () => void; onDone: () => void }) {
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)

  // Checking on the effect rather than inside the tap handler means the fourth
  // dot is painted before the verdict — without it a correct PIN never shows
  // itself complete, and a wrong one never shows what you actually typed.
  useEffect(() => {
    if (pin.length < PIN_LENGTH) return
    if (pin === staff.pin) {
      onDone()
      return
    }
    setWrong(true)
    const t = setTimeout(() => {
      setWrong(false)
      setPin('')
    }, 700)
    return () => clearTimeout(t)
  }, [pin, staff.pin, onDone])

  const press = (d: string) => {
    if (wrong || pin.length >= PIN_LENGTH) return
    setPin((p) => p + d)
  }

  return (
    <Frame
      title={`${staff.name.split(' ')[0]}'s pin`}
      sub={wrong ? 'wrong pin — try again' : `${staff.role} · 4 digits`}
      danger={wrong}
      onBack={onBack}
    >
      <div className={`flex justify-center gap-3.5 my-8 ${wrong ? 'anim-pop' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition ${
              wrong ? 'bg-danger' : i < pin.length ? 'bg-ink' : 'bg-ink/15'
            }`}
          />
        ))}
      </div>

      {/* w-full is load-bearing: auto side margins on a flex-column child
          cancel the default stretch, and the pad shrink-wraps to 80px. */}
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px] mx-auto">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Key key={d} onClick={() => press(d)}>
            {d}
          </Key>
        ))}
        <span />
        <Key onClick={() => press('0')}>0</Key>
        <Key onClick={() => setPin((p) => p.slice(0, -1))} aria-label="delete">
          {Icons.back('w-5 h-5')}
        </Key>
      </div>
    </Frame>
  )
}

function Key({ children, onClick, ...rest }: { children: React.ReactNode; onClick: () => void; 'aria-label'?: string }) {
  return (
    <button
      onClick={onClick}
      {...rest}
      className="h-16 rounded-2xl bg-card shadow-sm font-display font-bold text-2xl grid place-items-center active:scale-90 active:bg-card2 transition"
    >
      {children}
    </button>
  )
}

function Frame({
  title,
  sub,
  danger,
  onBack,
  children,
}: {
  title: string
  sub: string
  danger?: boolean
  onBack?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="max-w-md w-full mx-auto px-4 pt-6 pb-10 flex-1 flex flex-col">
        <div className="flex items-center gap-2">
          {onBack && (
            <button className="p-1.5 -ml-2 active:scale-90 transition" onClick={onBack} aria-label="back">
              {Icons.back()}
            </button>
          )}
          <Wordmark />
        </div>

        <div className="mt-10 mb-6">
          <h1 className="font-display font-bold text-3xl lowercase tracking-tight">{title}</h1>
          <p className={`text-sm mt-1 lowercase font-semibold ${danger ? 'text-danger' : 'text-ink/45'}`}>{sub}</p>
        </div>

        {children}
      </div>
    </div>
  )
}
