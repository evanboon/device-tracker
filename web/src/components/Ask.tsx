import { useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { ask, type Answer } from '../ask'
import { fmtDate } from '../data'
import { useStore, type Row } from '../store'
import { Code } from './ui'

const EXAMPLES = [
  'How many workstations are out of warranty by site?',
  'Which Edmonton laptops are due for replacement?',
  'Show active workstations with no sign-in for 90 days',
  'Whose warranty ends in the next 3 months in Mississauga?',
  'How many spares do we have per model?',
]

export default function Ask({ onOpen }: { onOpen: (tag: string) => void }) {
  const { rows, sites, departments, models } = useStore()
  const [text, setText] = useState('')
  const [thread, setThread] = useState<{ q: string; a: Answer }[]>([])
  const end = useRef<HTMLDivElement>(null)

  const send = (q: string) => {
    if (!q.trim()) return
    const normal = q.replace(/laptops?|computers?|devices?|machines?|pcs?\b/gi, 'workstations').replace(/due for/gi, 'replacement')
    setThread((t) => [...t, { q: q.trim(), a: ask(normal, rows, { sites, departments, models }) }])
    setText('')
  }
  useEffect(() => {
    const first = new URLSearchParams(location.search).get('q')
    if (first) send(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [thread])

  return (
    <div className="flex h-full flex-col bg-sheet">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[800px] px-5 py-6">
          <h1 className="text-2xl font-semibold">Ask about the inventory</h1>
          <p className="mt-1 flex items-start gap-1.5 text-ink-2">
            <ShieldCheck size={16} className="mt-0.5 flex-none text-petrol" />
            Questions are answered with read-only queries. Asking can never change a record, and every answer shows the query it ran.
          </p>

          {thread.length === 0 && (
            <ul className="mt-6 divide-y divide-rule-2 border-y border-rule-2">
              {EXAMPLES.map((e) => (
                <li key={e}><button className="w-full py-2.5 text-left hover:text-petrol" onClick={() => send(e)}>{e}</button></li>
              ))}
            </ul>
          )}

          <div className="mt-6 space-y-8">
            {thread.map((t, i) => (
              <article key={i}>
                <h2 className="text-lg font-semibold">{t.q}</h2>
                <AnswerView a={t.a} onOpen={onOpen} />
              </article>
            ))}
          </div>
          <div ref={end} />
        </div>
      </div>
      <form className="flex-none border-t border-rule bg-sheet" onSubmit={(e) => { e.preventDefault(); send(text) }}>
        <div className="mx-auto flex max-w-[800px] gap-2 px-5 py-3">
          <input className="input h-10" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question, like “how many spares are in Calgary?”" aria-label="Question" autoFocus />
          <button className="btn btn-primary h-10" disabled={!text.trim()}>Ask</button>
        </div>
      </form>
    </div>
  )
}

function AnswerView({ a, onOpen }: { a: Answer; onOpen: (tag: string) => void }) {
  if (a.kind === 'refused') return <p className="mt-2 rounded-md bg-review-wash px-3.5 py-3">{a.message}</p>
  if (a.kind === 'unknown')
    return <p className="mt-2 text-ink-2">That couldn't be turned into an inventory query. Try naming a site, a status, a model, or a warranty or replacement condition.</p>
  return (
    <div className="mt-2">
      {a.kind === 'count' && <p><span className="tnum text-2xl font-semibold">{a.n.toLocaleString()}</span> <span className="text-ink-2">{a.label.toLowerCase()}</span></p>}
      {a.kind === 'groups' && (
        <>
          <p className="text-ink-2">{a.label}, by {a.by}</p>
          <table className="mt-2 w-full max-w-[460px]">
            <tbody>
              {a.groups.map(([name, n]) => (
                <tr key={name} className="border-b border-rule-2">
                  <td className="py-1.5 pr-4 whitespace-nowrap">{name}</td>
                  <td className="w-full"><div className="h-2 rounded-sm bg-petrol" style={{ width: `${(n / a.groups[0][1]) * 100}%` }} /></td>
                  <td className="tnum py-1.5 pl-3 text-right font-medium">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {a.groups.length === 0 && <p className="mt-2">No workstations match.</p>}
        </>
      )}
      {a.kind === 'list' && <ResultRows rows={a.rows} label={a.label} onOpen={onOpen} />}
      {a.kind === 'count' && a.n > 0 && a.n <= 60 && <ResultRows rows={a.rows} label="" onOpen={onOpen} />}
      <details className="mt-3">
        <summary className="text-sm text-ink-2 hover:text-ink">Show the query that ran (read-only)</summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-chassis px-3.5 py-3 font-mono text-sm leading-relaxed">{a.sql}</pre>
      </details>
    </div>
  )
}

function ResultRows({ rows, label, onOpen }: { rows: Row[]; label: string; onOpen: (tag: string) => void }) {
  const [all, setAll] = useState(false)
  const shown = all ? rows.slice(0, 200) : rows.slice(0, 8)
  return (
    <>
      {label && <p className="text-ink-2"><span className="tnum font-medium text-ink">{rows.length.toLocaleString()}</span> {label.toLowerCase()}</p>}
      {rows.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-rule text-sm text-ink-2">
                <th className="py-1.5 pr-4 font-medium">Workstation</th><th className="pr-4 font-medium">Primary user</th><th className="pr-4 font-medium">Site</th><th className="font-medium">Warranty ends</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.w.tag} className="border-b border-rule-2">
                  <td className="py-1.5 pr-4"><button className="text-petrol underline decoration-petrol/30 underline-offset-2 hover:decoration-petrol" onClick={() => onOpen(r.w.tag)}><Code className="font-semibold">{r.w.name ?? r.w.tag}</Code></button></td>
                  <td className="pr-4 whitespace-nowrap">{r.w.user ?? <span className="text-ink-3">Unassigned</span>}</td>
                  <td className="pr-4">{r.site?.name}</td>
                  <td className="tnum whitespace-nowrap">{fmtDate(r.w.warrantyExpiry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 8 && !all && <button className="btn btn-sm mt-2" onClick={() => setAll(true)}>Show {Math.min(rows.length, 200) - 8} more</button>}
    </>
  )
}
