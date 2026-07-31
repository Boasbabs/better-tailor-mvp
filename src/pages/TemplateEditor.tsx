import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Confirm, FieldLabel, Icons, inputCls } from '../components/ui'

export default function TemplateEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const template = useStore((s) => s.templates.find((t) => t.id === id))
  const updateTemplate = useStore((s) => s.updateTemplate)
  const deleteTemplate = useStore((s) => s.deleteTemplate)
  const [newField, setNewField] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!template) {
    return (
      <SubShell title="template" backTo="/settings">
        <div className="text-center text-ink/40 py-20">template not found</div>
      </SubShell>
    )
  }

  const move = (i: number, dir: -1 | 1) => {
    const fields = [...template.fields]
    const j = i + dir
    if (j < 0 || j >= fields.length) return
    ;[fields[i], fields[j]] = [fields[j]!, fields[i]!]
    updateTemplate(template.id, { fields })
  }

  const addField = () => {
    const name = newField.trim().toLowerCase()
    if (!name || template.fields.includes(name)) return
    updateTemplate(template.id, { fields: [...template.fields, name] })
    setNewField('')
  }

  return (
    <SubShell title="edit template" backTo="/settings">
      <div className="space-y-5 pb-8">
        <div>
          <FieldLabel>template name</FieldLabel>
          <input
            className={inputCls}
            value={template.name}
            onChange={(e) => updateTemplate(template.id, { name: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel>fields ({template.fields.length})</FieldLabel>
          <div className="space-y-2">
            {template.fields.map((f, i) => (
              <div key={f} className="bg-card rounded-2xl shadow-sm px-4 py-3 flex items-center gap-2">
                <span className="flex-1 font-semibold text-sm lowercase">{f}</span>
                <button onClick={() => move(i, -1)} className="p-1.5 text-ink/40 disabled:opacity-20" disabled={i === 0}>
                  {Icons.up()}
                </button>
                <button onClick={() => move(i, 1)} className="p-1.5 text-ink/40 disabled:opacity-20" disabled={i === template.fields.length - 1}>
                  {Icons.down()}
                </button>
                <button
                  onClick={() => updateTemplate(template.id, { fields: template.fields.filter((x) => x !== f) })}
                  className="p-1.5 text-danger/70"
                >
                  {Icons.trash('w-4 h-4')}
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              className={`${inputCls} flex-1`}
              placeholder="new field name"
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addField()}
            />
            <button onClick={addField} className="bg-ink text-white rounded-full font-bold px-6 active:scale-95 transition">
              add
            </button>
          </div>
        </div>

        <button onClick={() => setConfirmDelete(true)} className="w-full text-danger font-bold text-sm py-3 active:scale-95 transition">
          delete template
        </button>
      </div>

      <Confirm
        open={confirmDelete}
        title="delete this template?"
        body={`"${template.name}" will be removed. Existing customers keep their saved measurements.`}
        onConfirm={() => {
          deleteTemplate(template.id)
          navigate('/settings', { replace: true })
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </SubShell>
  )
}
