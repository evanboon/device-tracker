import { useState } from 'react'
import { CURRENT_USER, LOCATIONS, STATUSES, TODAY_ISO, type Status } from '../data'
import { useStore } from '../store'
import { Dialog, Field } from './ui'

export default function AddDialog({ defaultSiteId, onClose, onAdded }: { defaultSiteId: number | null; onClose: () => void; onAdded: (tag: string) => void }) {
  const { sites, departments, models, rows, byTag, add, notify } = useStore()
  const [tag, setTag] = useState('')
  const [name, setName] = useState('')
  const [siteId, setSiteId] = useState<number | ''>(defaultSiteId ?? '')
  const [status, setStatus] = useState<Status>('Active')
  const [user, setUser] = useState('')
  const [deptId, setDeptId] = useState<number | ''>('')
  const [modelId, setModelId] = useState<number | ''>('')
  const [location, setLocation] = useState('')
  const [tried, setTried] = useState(false)

  const cleanTag = tag.trim().toUpperCase()
  const existing = byTag.get(cleanTag)
  const tagError = !cleanTag
    ? 'Enter the service tag from the label on the device.'
    : !/^[A-Z0-9]{5,12}$/.test(cleanTag)
      ? 'Service tags are 5 to 12 letters and numbers, with no spaces.'
      : existing
        ? `${cleanTag} is already in the inventory as ${existing.w.name ?? 'an unnamed workstation'} at ${existing.site?.name}.`
        : null
  const nameError = name.trim() && rows.some((r) => r.w.name === name.trim() && r.w.status !== 'Retired') ? `${name.trim()} is already in use. Names must be unique.` : null
  const siteError = siteId === '' ? 'Choose the site this workstation belongs to.' : null
  const ok = !tagError && !nameError && !siteError

  const submit = () => {
    setTried(true)
    if (!ok) return
    add({
      tag: cleanTag, name: name.trim() || null, siteId: siteId as number, deptId: deptId || null, modelId: modelId || null, po: null,
      user: user.trim() || null, status, location: location || null, lastImaged: null, lastLogin: null, os: null,
      createdAt: TODAY_ISO, updatedAt: TODAY_ISO, warrantyExpiry: null, eligibleDate: null, warrantyManual: false, exception: null,
      history: [{ field: 'Record', from: null, to: 'Added by hand', by: CURRENT_USER, at: TODAY_ISO, source: 'Manual edit' }],
    })
    notify(`Added ${name.trim() || cleanTag}`)
    onAdded(cleanTag)
  }

  return (
    <Dialog title="Add workstation" onClose={onClose}>
      <form className="grid grid-cols-2 gap-x-3 gap-y-3 px-5 py-4" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
        <Field label="Service tag" required error={(tried || existing) && tagError ? tagError : null}>
          <input className="input font-mono uppercase" value={tag} onChange={(e) => setTag(e.target.value)} aria-invalid={!!((tried || existing) && tagError)} autoComplete="off" />
        </Field>
        <Field label="Workstation name" error={nameError}>
          <input className="input font-mono" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!nameError} placeholder="EDM-LT-0412" autoComplete="off" />
        </Field>
        <Field label="Site" required error={tried ? siteError : null}>
          <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : '')} aria-invalid={tried && !!siteError}>
            <option value="">Choose a site</option>
            {sites.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Status" required>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUSES.filter((s) => s !== 'Retired').map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Primary user" hint={status === 'Spare' ? 'Spares are usually unassigned' : undefined}>
            <input className="input" value={user} onChange={(e) => setUser(e.target.value)} />
          </Field>
        </div>
        <Field label="Department">
          <select className="input" value={deptId} onChange={(e) => setDeptId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">None</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Work location">
          <select className="input" value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">Not set</option>
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Model">
            <select className="input" value={modelId} onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Not set</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.manufacturer} {m.name}</option>)}
            </select>
          </Field>
        </div>
        <p className="col-span-2 text-sm text-ink-2">Warranty dates are entered by an admin. Until then this workstation shows under Needs review.</p>
        <div className="col-span-2 flex justify-end gap-2 border-t border-rule-2 pt-4">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Add workstation</button>
        </div>
      </form>
    </Dialog>
  )
}
