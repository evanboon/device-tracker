import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Lock, X } from 'lucide-react'
import { LIFE_LABEL, LOCATIONS, STATUSES, fmtDate, fmtRelative, type Workstation } from '../data'
import { useStore, type Row } from '../store'
import { Code, Dialog, Field } from './ui'
import { LIFE_COLOR, LifeTrack } from './Lifecycle'

type Draft = Pick<Workstation, 'name' | 'user' | 'siteId' | 'deptId' | 'status' | 'location' | 'modelId' | 'po' | 'lastImaged' | 'warrantyExpiry'>
const draftOf = (w: Workstation): Draft => ({
  name: w.name, user: w.user, siteId: w.siteId, deptId: w.deptId, status: w.status, location: w.location,
  modelId: w.modelId, po: w.po, lastImaged: w.lastImaged, warrantyExpiry: w.warrantyExpiry,
})

export default function Detail({ row, onClose, position, onStep }: { row: Row; onClose: () => void; position: string | null; onStep?: (d: number) => void }) {
  const { w } = row
  const { role, sites, departments, models, rows, update, restore, setException, notify } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => draftOf(w))
  const [retiring, setRetiring] = useState(false)
  const [holding, setHolding] = useState(false)
  const [holdReason, setHoldReason] = useState('')
  const admin = role === 'Admin'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !editing) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, onClose])

  const nameTaken = !!draft.name && rows.some((r) => r.w.tag !== w.tag && r.w.status !== 'Retired' && r.w.name === draft.name)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const text = (k: 'name' | 'user' | 'po') => (
    <input className="input" value={draft[k] ?? ''} onChange={(e) => set(k, e.target.value.trim() ? e.target.value : null)} aria-invalid={k === 'name' && nameTaken} />
  )

  const save = () => {
    const before = w
    const n = update(w.tag, { ...draft, name: draft.name?.trim() || null, user: draft.user?.trim() || null })
    setEditing(false)
    if (n) notify(`Saved ${n} change${n === 1 ? '' : 's'} to ${w.name ?? w.tag}`, () => restore(before))
  }
  const retire = () => {
    const before = w
    update(w.tag, { status: 'Retired', user: null, location: null })
    setRetiring(false)
    notify(`Retired ${w.name ?? w.tag}`, () => restore(before))
  }

  const previousNames = [...new Set(w.history.filter((h) => h.field === 'Workstation name' && h.from).map((h) => h.from!))]

  return (
    <>
      <div className="fixed inset-0 z-30 bg-ink/30 xl:hidden" onClick={onClose} />
      <aside aria-label="Workstation details" className="sheet-in fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col border-l border-rule bg-sheet xl:static xl:z-auto xl:w-[420px] xl:flex-none">
        <div className="flex flex-none items-center gap-1 border-b border-rule-2 py-2 pr-2 pl-5">
          {position && <span className="tnum mr-auto text-sm text-ink-2">{position}</span>}
          {onStep && (
            <>
              <button className="btn btn-quiet btn-sm" onClick={() => onStep(-1)} aria-label="Previous workstation"><ChevronUp size={16} /></button>
              <button className="btn btn-quiet btn-sm" onClick={() => onStep(1)} aria-label="Next workstation"><ChevronDown size={16} /></button>
            </>
          )}
          <button className={`btn btn-quiet btn-sm ${position ? '' : 'ml-auto'}`} onClick={onClose} aria-label="Close details"><X size={16} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 pt-4 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2><Code className="text-2xl leading-tight font-bold break-all">{w.name ?? 'Unnamed'}</Code></h2>
                <p className="mt-0.5 text-ink-2">Service tag <Code className="font-semibold text-ink">{w.tag}</Code></p>
              </div>
              {!editing && (
                <button className="btn flex-none" onClick={() => { setDraft(draftOf(w)); setEditing(true) }}>Edit</button>
              )}
            </div>

            {row.review.length > 0 && (
              <div className="mt-4 rounded-md bg-review-wash px-3.5 py-3">
                <p className="font-semibold text-[#8f2d1b]">Needs review</p>
                <ul className="mt-1 space-y-1.5">
                  {row.review.map((r) => (
                    <li key={r.code}>{r.text} <span className="text-ink-2">{r.fix}</span></li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lifecycle */}
            <div className="mt-5">
              <div className="flex items-center gap-2 font-semibold">
                <span className="swatch" style={{ background: LIFE_COLOR[row.life] }} />
                {LIFE_LABEL[row.life]}
              </div>
              <div className="mt-1 h-9"><LifeTrack w={w} state={row.life} large /></div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4">
                <div>
                  <dt className="text-sm text-ink-2">Warranty ends</dt>
                  <dd className="tnum font-medium">{fmtDate(w.warrantyExpiry)}</dd>
                  {w.warrantyExpiry && <dd className="text-sm text-ink-2">{fmtRelative(w.warrantyExpiry)}{w.warrantyManual ? ', entered by hand' : ''}</dd>}
                </div>
                <div>
                  <dt className="text-sm text-ink-2">Replacement eligible</dt>
                  <dd className="tnum font-medium">{fmtDate(w.eligibleDate)}</dd>
                  <dd className="flex items-center gap-1 text-sm text-ink-2"><Lock size={11} />Calculated: 1 year after warranty</dd>
                </div>
              </dl>
              {w.exception ? (
                <div className="mt-3 rounded-md bg-replace-wash px-3.5 py-3">
                  <p className="font-semibold">Replacement on hold</p>
                  <p className="mt-0.5">{w.exception.reason}</p>
                  <p className="mt-1 text-sm text-ink-2">Added by {w.exception.addedBy} on {fmtDate(w.exception.dateFlagged)}</p>
                  {admin && <button className="btn btn-sm mt-2" onClick={() => { setException(w.tag, null); notify('Removed the replacement hold') }}>Remove hold</button>}
                </div>
              ) : (
                row.life === 'replace' && (
                  <button className="btn btn-sm mt-3" disabled={!admin} title={admin ? undefined : 'Only admins can put a replacement on hold'} onClick={() => setHolding(true)}>
                    {!admin && <Lock size={12} />}Put replacement on hold
                  </button>
                )
              )}
            </div>
          </div>

          {/* Fields */}
          <div className="border-t border-rule-2 px-5 py-4">
            {editing ? (
              <form className="grid grid-cols-2 gap-x-3 gap-y-3" onSubmit={(e) => { e.preventDefault(); if (!nameTaken) save() }}>
                <div className="col-span-2">
                  <Field label="Workstation name" error={nameTaken ? `${draft.name} is already in use. Names must be unique.` : null}>{text('name')}</Field>
                </div>
                <div className="col-span-2"><Field label="Primary user">{text('user')}</Field></div>
                <Field label="Site" required>
                  <select className="input" value={draft.siteId} onChange={(e) => set('siteId', Number(e.target.value))}>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Department">
                  <select className="input" value={draft.deptId ?? ''} onChange={(e) => set('deptId', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">None</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="Status" required>
                  <select className="input" value={draft.status} onChange={(e) => set('status', e.target.value as Draft['status'])}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Work location">
                  <select className="input" value={draft.location ?? ''} onChange={(e) => set('location', e.target.value || null)}>
                    <option value="">Not set</option>
                    {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Model">
                    <select className="input" value={draft.modelId ?? ''} onChange={(e) => set('modelId', e.target.value ? Number(e.target.value) : null)}>
                      <option value="">Not set</option>
                      {models.map((m) => <option key={m.id} value={m.id}>{m.manufacturer} {m.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Purchase order">{text('po')}</Field>
                <Field label="Last imaged">
                  <input type="date" className="input" value={draft.lastImaged ?? ''} onChange={(e) => set('lastImaged', e.target.value || null)} />
                </Field>
                <div className="col-span-2">
                  <Field label="Warranty ends" hint={admin ? 'Replacement date updates to match' : undefined}>
                    <input type="date" className="input disabled:bg-chassis disabled:text-ink-2" disabled={!admin} value={draft.warrantyExpiry ?? ''} onChange={(e) => set('warrantyExpiry', e.target.value || null)} />
                  </Field>
                  {!admin && <p className="mt-1 flex items-center gap-1 text-sm text-ink-2"><Lock size={11} />Only admins can change warranty dates.</p>}
                </div>
                <p className="col-span-2 flex items-start gap-1.5 text-sm text-ink-2">
                  <Lock size={12} className="mt-0.5 flex-none" />
                  Service tag, operating system and last sign-in come from imports, and the replacement date is calculated. They can't be edited here.
                </p>
                <div className="col-span-2 flex gap-2 pt-1">
                  <button type="submit" className="btn btn-primary" disabled={nameTaken}>Save changes</button>
                  <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-[116px_minmax(0,1fr)] gap-x-3 gap-y-2">
                <Item label="Primary user">{w.user ?? <Empty>Unassigned</Empty>}</Item>
                <Item label="Site">{row.site?.name}</Item>
                <Item label="Department">{row.dept?.name ?? <Empty>None</Empty>}</Item>
                <Item label="Status">{w.status}</Item>
                <Item label="Work location">{w.location ?? <Empty>Not set</Empty>}</Item>
                <Item label="Model">{row.modelLabel || <Empty>Not set</Empty>}</Item>
                <Item label="Purchase order">{w.po ? <Code>{w.po}</Code> : <Empty>Not set</Empty>}</Item>
                <Item label="Last imaged">{fmtDate(w.lastImaged)}</Item>
                <Item label="Operating system" locked="Imported">{w.os}</Item>
                <Item label="Last sign-in" locked="Imported">{w.lastLogin ? `${fmtDate(w.lastLogin)} (${fmtRelative(w.lastLogin)})` : <Empty>Never</Empty>}</Item>
              </dl>
            )}
          </div>

          {/* History */}
          <div className="border-t border-rule-2 px-5 py-4">
            <h3 className="font-semibold">History</h3>
            {previousNames.length > 0 && (
              <p className="mt-1 text-ink-2">Previously named {previousNames.map((n, i) => <span key={n}>{i > 0 && ', '}<Code className="text-ink">{n}</Code></span>)}</p>
            )}
            <ol className="mt-3 space-y-3 border-l border-rule pl-4">
              {w.history.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-[7px] -left-[20.5px] size-2 rounded-full bg-ink-3 ring-2 ring-sheet" />
                  <p>
                    {h.field === 'Record' ? h.to : (
                      <>
                        <span className="font-medium">{h.field}</span>{' '}
                        {h.from && h.to ? <>changed from {h.from} to <span className="font-medium">{h.to}</span></> : h.to ? <>set to <span className="font-medium">{h.to}</span></> : <>cleared (was {h.from})</>}
                      </>
                    )}
                  </p>
                  <p className="text-sm text-ink-2">{fmtDate(h.at)}, by {h.by}{h.source !== 'Import' || h.by !== 'Workbook import' ? `, ${h.source.toLowerCase()}` : ''}</p>
                </li>
              ))}
            </ol>
          </div>

          {w.status !== 'Retired' && !editing && (
            <div className="border-t border-rule-2 px-5 py-4">
              <button className="btn btn-danger" onClick={() => setRetiring(true)}>Retire workstation</button>
              <p className="mt-1.5 text-sm text-ink-2">Retiring keeps the record and its history. Nothing is deleted.</p>
            </div>
          )}
        </div>
      </aside>

      {retiring && (
        <Dialog title={`Retire ${w.name ?? w.tag}?`} onClose={() => setRetiring(false)} width={440}>
          <div className="px-5 py-4">
            <p>It leaves the in-service counts and {w.user ? `${w.user} is unassigned` : 'stays unassigned'}. The record and its history stay under Retired, and you can undo this.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn" onClick={() => setRetiring(false)}>Cancel</button>
              <button className="btn btn-primary" data-autofocus onClick={retire}>Retire workstation</button>
            </div>
          </div>
        </Dialog>
      )}
      {holding && (
        <Dialog title="Put replacement on hold" onClose={() => setHolding(false)} width={460}>
          <form className="px-5 py-4" onSubmit={(e) => { e.preventDefault(); setException(w.tag, holdReason.trim()); setHolding(false); notify('Put replacement on hold') }}>
            <Field label="Reason" hint="Shown to everyone on this record">
              <textarea className="input" rows={3} value={holdReason} onChange={(e) => setHoldReason(e.target.value)} required />
            </Field>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => setHolding(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!holdReason.trim()}>Put on hold</button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  )
}

function Item({ label, children, locked }: { label: string; children: ReactNode; locked?: string }) {
  return (
    <>
      <dt className="text-ink-2">{label}</dt>
      <dd className="min-w-0">
        {children}
        {locked && <span className="ml-2 inline-flex items-center gap-1 text-sm text-ink-3" title={`${locked}. Can't be edited here.`}><Lock size={11} />{locked}</span>}
      </dd>
    </>
  )
}
const Empty = ({ children }: { children: ReactNode }) => <span className="text-ink-3">{children}</span>
