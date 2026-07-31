import { useStore } from '../store'
import { FORM_URL, trackWaitlist, type WaitlistSource } from '../lib'
import { Icons } from './ui'

// Shown at the top of every tab until dismissed — dismissing hides it app-wide.
export function WaitlistBanner({ source, className = '' }: { source: WaitlistSource; className?: string }) {
  const dismissed = useStore((s) => s.bannerDismissed)
  const dismissBanner = useStore((s) => s.dismissBanner)
  if (dismissed) return null

  const open = () => {
    trackWaitlist(source)
    window.open(FORM_URL, '_blank')
  }

  return (
    <div className={`bg-ink text-white rounded-2xl p-4 pr-3 flex items-center gap-3 ${className}`}>
      <button onClick={open} className="flex-1 min-w-0 text-left active:scale-[0.98] transition">
        <div className="font-bold text-[15px]">❤️ want this app for real?</div>
        <div className="text-white/55 text-xs mt-0.5">join the waitlist — 3 minutes</div>
      </button>
      <button
        onClick={open}
        className="bg-white text-ink rounded-full text-xs font-bold px-4 py-2 shrink-0 active:scale-95 transition"
      >
        join
      </button>
      <button onClick={dismissBanner} className="text-white/40 p-1 shrink-0 active:scale-90 transition" aria-label="dismiss">
        {Icons.x('w-4 h-4')}
      </button>
    </div>
  )
}
