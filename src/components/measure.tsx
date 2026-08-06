import { useState } from 'react'
import { Icons, inputCls } from './ui'

/**
 * The fields this grid actually renders: the template's, in order, then any
 * one-off fields `+ add field` put on this particular set.
 *
 * Exported because anything that *counts* these fields has to count the same
 * list the tailor can see. Deriving the count from `template.fields` alone
 * silently undercounts every set carrying a custom field.
 */
export function renderedFields(fields: string[], values: Record<string, number | string>): string[] {
  return [...fields, ...Object.keys(values).filter((k) => !fields.includes(k))]
}

/**
 * Measurements that mean the same thing on any garment, so they read sensibly
 * as generic suggestions. Deliberately NOT the union of the seeded templates:
 * that set carries garment-bound names like "gown length" and "trouser length"
 * which are noise when the tailor is defining a kaftan.
 */
export const COMMON_FIELDS = [
  'neck',
  'shoulder',
  'chest',
  'bust',
  'back',
  'waist',
  'hip',
  'thigh',
  'knee',
  'ankle',
  'wrist',
  'sleeve',
  'sleeve length',
  'length',
]

/**
 * Picks the field names a template is made of. Suggestions toggle in place
 * (+ → ✓) rather than moving to a separate "added" list, so a chip never
 * changes position under the thumb that just tapped it.
 *
 * Anything typed in is appended to the same chip row, which makes a custom
 * field removable exactly the same way a suggested one is.
 */
export function FieldPicker({ value, onChange }: { value: string[]; onChange: (fields: string[]) => void }) {
  const [custom, setCustom] = useState('')
  const chips = [...COMMON_FIELDS, ...value.filter((f) => !COMMON_FIELDS.includes(f))]

  const toggle = (f: string) => onChange(value.includes(f) ? value.filter((x) => x !== f) : [...value, f])

  const addCustom = () => {
    const name = custom.trim().toLowerCase()
    if (name && !value.includes(name)) onChange([...value, name])
    setCustom('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {chips.map((f) => {
          const on = value.includes(f)
          return (
            <button
              key={f}
              onClick={() => toggle(f)}
              aria-pressed={on}
              className={`rounded-full text-[13px] font-bold pl-3.5 pr-2.5 py-2 flex items-center gap-1.5 transition active:scale-95 ${
                on ? 'bg-ink text-white' : 'bg-card text-ink/60 shadow-sm'
              }`}
            >
              {f}
              <span className={on ? 'text-white/70' : 'text-ink/30'}>
                {on ? Icons.check('w-3.5 h-3.5') : Icons.plus('w-3.5 h-3.5')}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 mt-2.5">
        <input
          className={`${inputCls} flex-1`}
          placeholder="or type your own…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
        />
        <button
          onClick={addCustom}
          disabled={!custom.trim()}
          className="bg-ink text-white rounded-full font-bold px-6 active:scale-95 transition disabled:opacity-30"
        >
          add
        </button>
      </div>
    </div>
  )
}

// Editable measurement chips grid: label on top, value input below.
export function MeasurementGrid({
  fields,
  values,
  onChange,
  onAddField,
  readOnly = false,
}: {
  fields: string[]
  values: Record<string, number | string>
  onChange?: (field: string, value: string) => void
  onAddField?: (name: string) => void
  readOnly?: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [newField, setNewField] = useState('')
  const all = renderedFields(fields, values)

  const commitAdd = () => {
    const name = newField.trim().toLowerCase()
    if (name && !all.includes(name)) onAddField?.(name)
    setNewField('')
    setAdding(false)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {all.map((f) => (
        <div key={f} className="bg-card2 rounded-xl px-2.5 py-2">
          <div className="text-[10px] font-semibold text-ink/45 lowercase truncate">{f}</div>
          {readOnly ? (
            <div className="font-bold font-display text-[15px]">{values[f] !== undefined && values[f] !== '' ? `${values[f]}"` : '—'}</div>
          ) : (
            <input
              inputMode="decimal"
              className="w-full bg-transparent font-bold font-display text-[15px] outline-none placeholder:text-ink/20"
              placeholder="—"
              value={values[f] ?? ''}
              onChange={(e) => onChange?.(f, e.target.value)}
            />
          )}
        </div>
      ))}
      {!readOnly && onAddField && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="rounded-xl px-2.5 py-2 border-2 border-dashed border-ink/15 text-ink/40 text-xs font-bold grid place-items-center min-h-[52px] active:scale-95 transition"
        >
          + add field
        </button>
      )}
      {!readOnly && adding && (
        <div className="bg-card2 rounded-xl px-2.5 py-2 ring-2 ring-ink/20 flex items-center gap-1">
          <input
            autoFocus
            className="w-full bg-transparent text-xs font-semibold outline-none"
            placeholder="field name"
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitAdd()}
            onBlur={commitAdd}
          />
          <button onClick={commitAdd}>{Icons.check()}</button>
        </div>
      )}
    </div>
  )
}
