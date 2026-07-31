import { useNavigate } from 'react-router-dom'
import { track } from '../lib'

export default function Welcome() {
  const navigate = useNavigate()
  const go = () => {
    localStorage.setItem('bt_seen_welcome', '1')
    track('opened')
    navigate('/orders')
  }
  return (
    <div className="min-h-dvh max-w-md mx-auto flex flex-col px-8 pt-28 pb-10">
      <div className="flex-1">
        <h1 className="font-display font-bold lowercase tracking-tight text-[64px] leading-[0.95]">
          better
          <br />
          tailor
        </h1>
        <p className="mt-6 text-lg text-ink/55 font-medium leading-snug">
          your customers, measurements, orders &amp; invoices — in one place.
        </p>
      </div>
      <div>
        <button
          onClick={go}
          className="w-full bg-ink text-white rounded-full font-bold text-lg py-4 active:scale-95 transition shadow-lg"
        >
          let's go
        </button>
        <p className="text-center text-xs text-ink/35 mt-4">a prototype — your data stays on this phone.</p>
      </div>
    </div>
  )
}
