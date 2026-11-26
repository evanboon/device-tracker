import { useMemo, useState } from 'react'
import { Check, FileSpreadsheet, Upload } from 'lucide-react'
import { TODAY_ISO, addDays, addYears, eligibleFrom, type Workstation } from '../data'
import { useStore } from '../store'
import { Code } from './ui'

interface Problem {
  row: string
  what: string
  detail: string
  fix?: string // label of the one-click fix, when there is one
}
const PROBLEMS: Problem[] = [
  { row: '9', what: 'Site “Edmonotn” doesn’t match a member centre', detail: 'Closest match is Edmonton.', fix: 'Use Edmonton' },
  { row: '17', what: 'Service tag is missing', detail: 'Add the tag in the file and import again, or leave this row out.' },
  { row: '23 and 41', what: 'Service tag 4HX82M1 appears twice in the file', detail: 'Row 41 is the more complete of the two.', fix: 'Keep row 41' },
  { row: '30', what: 'Status “In Use” isn’t Active, Spare or Retired', detail: 'The workstation has a primary user and signed in last week.', fix: 'Use Active' },
  { row: '38', what: 'Warranty date “2027-13-04” isn’t a real date', detail: 'The row can come in without a warranty date and be fixed later.', fix: 'Import without the date' },
]
const STEPS = ['Choose a file', 'Review', 'Done']

export default function ImportScreen({ onDone }: { onDone: () => void }) {
  const { rows, sites, update, addMany, notify } = useStore()
  const [step, setStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [resolved, setResolved] = useState<Record<string, 'fixed' | 'skipped'>>({})

  // The prototype doesn't parse the file. It stages a realistic result against the Edmonton records.
  const staged = useMemo(() => {
    const edm = sites.find((s) => s.code === 'EDM')!
    const updates = rows.filter((r) => r.w.siteId === edm.id && r.w.status !== 'Retired').slice(0, 46)
    const fresh: Workstation[] = Array.from({ length: 12 }, (_, i) => {
      const warrantyExpiry = addYears(TODAY_ISO, 3)
      return {
        tag: `9${'BCDFGHJKLMNP'[i]}Q${i}T${(i * 7) % 10}Z`, name: `EDM-LT-${String(900 + i * 3).padStart(4, '0')}`, siteId: edm.id, deptId: null, modelId: 12,
        po: 'PO-2026-0171', user: null, status: 'Spare', location: 'Office', lastImaged: addDays(TODAY_ISO, -2), lastLogin: null, os: 'Windows 11 25H2',
        createdAt: TODAY_ISO, updatedAt: TODAY_ISO, warrantyExpiry, eligibleDate: eligibleFrom(warrantyExpiry), warrantyManual: false, exception: null,
        history: [{ field: 'Record', from: null, to: 'Added by import', by: 'Excel import', at: TODAY_ISO, source: 'Import' }],
      }
    })
    return { updates, fresh, unchanged: 131 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step === 0])

  const fixedCount = Object.values(resolved).filter((v) => v === 'fixed').length
  const open = PROBLEMS.filter((p) => !resolved[p.row]).length
  const willImport = staged.updates.length + staged.fresh.length + fixedCount
  const willSkip = PROBLEMS.length - fixedCount
  const total = staged.updates.length + staged.fresh.length + staged.unchanged + PROBLEMS.length + 1

  const start = (name: string) => {
    setFileName(name)
    setResolved({})
    setStep(1)
  }
  const run = () => {
    staged.updates.forEach((r) => update(r.w.tag, { lastImaged: addDays(TODAY_ISO, -3) }, 'Import', 'Excel import'))
    addMany(staged.fresh)
    setStep(2)
    notify(`Imported ${willImport} rows from ${fileName}`)
  }

  return (
    <div className="h-full overflow-y-auto bg-sheet">
      <div className="mx-auto max-w-[860px] px-5 py-6">
        <h1 className="text-2xl font-semibold">Import from Excel</h1>
        <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? 'step' : undefined} className={`flex items-center gap-2 ${i === step ? 'font-semibold' : 'text-ink-2'}`}>
              <span className={`tnum flex size-5 items-center justify-center rounded-full text-xs ${i < step ? 'bg-petrol text-white' : i === step ? 'bg-ink text-sheet' : 'bg-chassis-2'}`}>
                {i < step ? <Check size={12} /> : i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="mt-6">
            <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-rule px-6 py-12 text-center hover:border-petrol hover:bg-petrol-wash/40">
              <Upload size={26} className="text-petrol" />
              <span className="mt-3 text-lg font-semibold">Choose an Excel or CSV file</span>
              <span className="mt-1 max-w-[52ch] text-ink-2">Rows are matched to workstations by service tag. Nothing is saved until you've reviewed what will change.</span>
              <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && start(e.target.files[0].name)} />
            </label>
            <button className="btn mt-4" onClick={() => start('Edmonton refresh Nov 2026.xlsx')}><FileSpreadsheet size={15} />Try it with a sample file</button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6">
            <p className="text-ink-2"><span className="font-medium text-ink">{fileName}</span>, {total} rows read</p>
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 border-y border-rule-2 py-3">
              {[
                [staged.fresh.length, 'new workstations'],
                [staged.updates.length, 'updates'],
                [staged.unchanged, 'unchanged'],
                [open, open === 1 ? 'row needs a decision' : 'rows need a decision'],
              ].map(([n, label], i) => (
                <div key={label} className={i === 3 && open ? 'text-review' : ''}>
                  <dd className="tnum text-xl leading-tight font-semibold">{n}</dd>
                  <dt className={i === 3 && open ? '' : 'text-ink-2'}>{label}</dt>
                </div>
              ))}
            </dl>

            <h2 className="mt-6 text-lg font-semibold">Rows that need a decision</h2>
            <p className="text-ink-2">Fix them here or leave them out. Anything left undecided is skipped.</p>
            <ul className="mt-3 divide-y divide-rule-2 border-y border-rule-2">
              {PROBLEMS.map((p) => {
                const state = resolved[p.row]
                return (
                  <li key={p.row} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <span className="tnum w-24 flex-none text-sm text-ink-2">Row {p.row}</span>
                    <div className={`min-w-[240px] flex-1 ${state ? 'text-ink-2' : ''}`}>
                      <p className="font-medium">{p.what}</p>
                      <p className="text-sm text-ink-2">{p.detail}</p>
                    </div>
                    {state ? (
                      <span className="flex items-center gap-2 text-sm">
                        {state === 'fixed' ? <><Check size={14} className="text-petrol" />{p.fix}</> : 'Left out'}
                        <button className="btn btn-quiet btn-sm" onClick={() => setResolved(({ [p.row]: _, ...rest }) => rest)}>Change</button>
                      </span>
                    ) : (
                      <span className="flex gap-2">
                        {p.fix && <button className="btn btn-sm" onClick={() => setResolved((r) => ({ ...r, [p.row]: 'fixed' }))}>{p.fix}</button>}
                        <button className="btn btn-sm" onClick={() => setResolved((r) => ({ ...r, [p.row]: 'skipped' }))}>Leave out</button>
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>

            <h2 className="mt-6 text-lg font-semibold">What will change</h2>
            <div className="mt-2 max-h-56 overflow-y-auto border-y border-rule-2">
              <table className="w-full text-left">
                <tbody className="divide-y divide-rule-2">
                  {staged.fresh.slice(0, 4).map((w) => (
                    <tr key={w.tag}><td className="py-1.5 pr-3"><Code className="font-semibold">{w.name}</Code></td><td className="pr-3"><Code className="text-ink-2">{w.tag}</Code></td><td className="text-petrol">New, added as Spare</td></tr>
                  ))}
                  {staged.updates.slice(0, 8).map((r) => (
                    <tr key={r.w.tag}><td className="py-1.5 pr-3"><Code className="font-semibold">{r.w.name}</Code></td><td className="pr-3"><Code className="text-ink-2">{r.w.tag}</Code></td><td>Last imaged: {r.w.lastImaged} to {addDays(TODAY_ISO, -3)}</td></tr>
                  ))}
                  <tr><td colSpan={3} className="py-1.5 text-ink-2">and {staged.fresh.length + staged.updates.length - 12} more</td></tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary" onClick={run}>Import {willImport} rows</button>
              <button className="btn" onClick={() => setStep(0)}>Choose a different file</button>
              {willSkip > 0 && <span className="text-ink-2">{willSkip} row{willSkip === 1 ? '' : 's'} will be skipped</span>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8">
            <p className="text-xl font-semibold">Imported {willImport} rows</p>
            <p className="mt-1 max-w-[60ch] text-ink-2">
              {staged.fresh.length} workstations added and {staged.updates.length + fixedCount} updated. {willSkip > 0 ? `${willSkip} skipped. ` : ''}Each change is recorded in the workstation's history with “Excel import” as the source.
            </p>
            <div className="mt-5 flex gap-2">
              <button className="btn btn-primary" onClick={onDone}>View the inventory</button>
              <button className="btn" onClick={() => setStep(0)}>Import another file</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
