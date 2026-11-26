import { useMemo, useState } from 'react'
import { Lock, Plus } from 'lucide-react'
import { useStore } from '../store'
import { Code, Dialog, Field, Segmented } from './ui'

const TABS = ['Sites', 'Departments', 'Models'] as const
type Tab = (typeof TABS)[number]
const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK']

export default function Reference() {
  const { role, sites, departments, models, rows, addSite, addDepartment, addModel, notify } = useStore()
  const [tab, setTab] = useState<Tab>('Sites')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const admin = role === 'Admin'
  const singular = tab === 'Sites' ? 'site' : tab === 'Departments' ? 'department' : 'model'

  const usage = useMemo(() => {
    const m = { site: new Map<number, number>(), dept: new Map<number, number>(), model: new Map<number, number>() }
    for (const r of rows) {
      if (r.w.status === 'Retired') continue
      m.site.set(r.w.siteId, (m.site.get(r.w.siteId) ?? 0) + 1)
      if (r.w.deptId) m.dept.set(r.w.deptId, (m.dept.get(r.w.deptId) ?? 0) + 1)
      if (r.w.modelId) m.model.set(r.w.modelId, (m.model.get(r.w.modelId) ?? 0) + 1)
    }
    return m
  }, [rows])

  const v = (k: string) => (form[k] ?? '').trim()
  const input = (k: string, label: string, props: { mono?: boolean; hint?: string; error?: string | null } = {}) => (
    <Field label={label} required hint={props.hint} error={props.error}>
      <input className={`input ${props.mono ? 'font-mono uppercase' : ''}`} value={form[k] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} aria-invalid={!!props.error} />
    </Field>
  )
  const codeTaken = tab === 'Sites' && sites.some((s) => s.code === v('code').toUpperCase())
  const nameTaken =
    (tab === 'Sites' && sites.some((s) => s.name.toLowerCase() === v('name').toLowerCase())) ||
    (tab === 'Departments' && departments.some((d) => d.name.toLowerCase() === v('name').toLowerCase()))
  const ok =
    tab === 'Sites' ? v('name') && /^[a-zA-Z]{3}$/.test(v('code')) && v('city') && !codeTaken && !nameTaken
    : tab === 'Departments' ? v('name') && !nameTaken
    : v('manufacturer') && v('name')

  const submit = () => {
    if (!ok) return
    if (tab === 'Sites') addSite({ name: v('name'), code: v('code').toUpperCase(), city: v('city'), province: v('province') || 'ON', active: true })
    else if (tab === 'Departments') addDepartment(v('name'))
    else addModel({ manufacturer: v('manufacturer'), name: v('name'), kind: 'LT', year: 2026 })
    notify(`Added ${v('name')}`)
    setAdding(false)
    setForm({})
  }

  const th = 'border-b border-rule py-2 pr-4 text-left text-sm font-medium text-ink-2'
  const td = 'border-b border-rule-2 py-2 pr-4'
  const num = 'tnum text-right'

  return (
    <div className="h-full overflow-y-auto bg-sheet">
      <div className="mx-auto max-w-[860px] px-5 py-6">
        <h1 className="text-2xl font-semibold">Sites and lists</h1>
        <p className="mt-1 max-w-[64ch] text-ink-2">The choices people pick from when they add or edit a workstation.</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented<Tab> label="List" value={tab} options={TABS} onChange={setTab} />
          <div className="flex items-center gap-3">
            {!admin && <span className="flex items-center gap-1 text-sm text-ink-2"><Lock size={12} />Only admins can add to these lists</span>}
            <button className="btn btn-primary" disabled={!admin} onClick={() => { setForm({}); setAdding(true) }}><Plus size={16} />Add {singular}</button>
          </div>
        </div>

        <table className="mt-4 w-full">
          {tab === 'Sites' && (
            <>
              <thead><tr><th className={th}>Member centre</th><th className={th}>Site code</th><th className={th}>City</th><th className={th}>Province</th><th className={`${th} ${num}`}>In service</th></tr></thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.id}><td className={`${td} font-medium`}>{s.name}</td><td className={td}><Code>{s.code}</Code></td><td className={td}>{s.city}</td><td className={td}>{s.province}</td><td className={`${td} ${num}`}>{usage.site.get(s.id) ?? 0}</td></tr>
                ))}
              </tbody>
            </>
          )}
          {tab === 'Departments' && (
            <>
              <thead><tr><th className={th}>Department</th><th className={`${th} ${num}`}>In service</th></tr></thead>
              <tbody>
                {departments.map((d) => <tr key={d.id}><td className={`${td} font-medium`}>{d.name}</td><td className={`${td} ${num}`}>{usage.dept.get(d.id) ?? 0}</td></tr>)}
              </tbody>
            </>
          )}
          {tab === 'Models' && (
            <>
              <thead><tr><th className={th}>Manufacturer</th><th className={th}>Model</th><th className={`${th} ${num}`}>In service</th></tr></thead>
              <tbody>
                {models.map((m) => <tr key={m.id}><td className={td}>{m.manufacturer}</td><td className={`${td} font-medium`}>{m.name}</td><td className={`${td} ${num}`}>{usage.model.get(m.id) ?? 0}</td></tr>)}
              </tbody>
            </>
          )}
        </table>
      </div>

      {adding && (
        <Dialog title={`Add ${singular}`} onClose={() => setAdding(false)} width={440}>
          <form className="grid grid-cols-2 gap-3 px-5 py-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
            {tab === 'Sites' && (
              <>
                <div className="col-span-2">{input('name', 'Member centre name', { error: nameTaken ? 'A site with this name already exists.' : null })}</div>
                {input('code', 'Site code', { mono: true, hint: '3 letters', error: codeTaken ? 'This code is already in use.' : null })}
                <Field label="Province">
                  <select className="input" value={form.province ?? 'ON'} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}>
                    {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <div className="col-span-2">{input('city', 'City')}</div>
              </>
            )}
            {tab === 'Departments' && <div className="col-span-2">{input('name', 'Department name', { error: nameTaken ? 'This department already exists.' : null })}</div>}
            {tab === 'Models' && (
              <>
                {input('manufacturer', 'Manufacturer')}
                {input('name', 'Model name')}
              </>
            )}
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" className="btn" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!ok}>Add {singular}</button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
