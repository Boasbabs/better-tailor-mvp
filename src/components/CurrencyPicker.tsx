import type { Currency } from '../types'

export const CURRENCIES: Currency[] = ['₦', '€', '$', '£', 'GH₵']

// Equal-width cells so the 3-character GH₵ doesn't stretch its pill out of
// step with the single-character ones.
export function CurrencyPicker({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {CURRENCIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-pressed={value === c}
          className={`h-12 rounded-full text-sm font-bold transition active:scale-95 ${
            value === c ? 'bg-ink text-white' : 'bg-card text-ink/60 shadow-sm'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
