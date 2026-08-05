import { useState } from 'react'
import { Icons } from './ui'

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
