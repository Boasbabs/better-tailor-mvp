import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Icons, PillButton } from '../components/ui'
import { uid } from '../lib'

export default function Templates() {
  const navigate = useNavigate()
  const templates = useStore((s) => s.templates)
  const addTemplate = useStore((s) => s.addTemplate)

  const createTemplate = () => {
    const t = { id: uid(), name: 'New template', fields: ['length'] }
    addTemplate(t)
    navigate(`/settings/templates/${t.id}`)
  }

  return (
    <SubShell title="templates" backTo="/settings">
      <div className="space-y-2 pb-8">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate(`/settings/templates/${t.id}`)}
            className="w-full bg-card rounded-2xl shadow-sm p-4 flex items-center justify-between text-left active:scale-[0.98] transition"
          >
            <div>
              <div className="font-bold">{t.name}</div>
              <div className="text-xs text-ink/45">{t.fields.join(' · ')}</div>
            </div>
            {Icons.chevron('w-5 h-5 text-ink/30')}
          </button>
        ))}
        <PillButton onClick={createTemplate} className="w-full mt-2">
          + create template
        </PillButton>
      </div>
    </SubShell>
  )
}
