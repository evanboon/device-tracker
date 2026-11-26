import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, Download, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { LOCATIONS, TODAY_ISO, fmtMonth, type LifeState, type Workstation } from '../data'
import { useStore, type Row } from '../store'
import { Code } from './ui'
import { LIFE_COLOR } from './Lifecycle'
import Detail from './Detail'
import AddDialog from './AddDialog'

type View = 'in-service' | 'active' | 'spare' | 'lapsed' | 'replace' | 'review' | 'retired'
const VIEWS: { id: View; label: string; test: (r: Row) => boolean; color?: string }[] = [
  { id: 'in-service', label: 'All', test: (r) => r.w.status !== 'Retired' },
  { id: 'active', label: 'Active', test: (r) => r.w.status === 'Active' },
  { id: 'spare', label: 'Spare', test: (r) => r.w.status === 'Spare' },
  { id: 'lapsed', label: 'Out of warranty', color: 'var(--color-lapsed)', test: (r) => r.w.status !== 'Retired' && !!r.w.warrantyExpiry && r.w.warrantyExpiry < TODAY_ISO },
  { id: 'replace', label: 'Due for replacement', color: 'var(--color-replace)', test: (r) => r.life === 'replace' },
  { id: 'review', label: 'Needs review', color: 'var(--color-review)', test: (r) => r.review.length > 0 },
  { id: 'retired', label: 'Retired', test: (r) => r.w.status === 'Retired' },
]

type SortKey = 'name' | 'user' | 'model' | 'site' | 'status' | 'warranty'
const sortValue = (r: Row, k: SortKey) =>
  k === 'name' ? r.w.name ?? r.w.tag
  : k === 'user' ? r.w.user ?? '￿'
  : k === 'model' ? r.modelLabel
  : k === 'site' ? r.site?.code ?? ''
  : k === 'status' ? r.w.status
  : r.w.warrantyExpiry ?? '9999'

const ROW_H = 56

/** One short line per row, so the list reads as words instead of a wall of bars. */
function lifeShort(w: Workstation, life: LifeState) {
  if (life === 'retired') return 'Retired'
  if (life === 'unknown') return 'No warranty date'
  if (life === 'covered') return `Warranty to ${fmtMonth(w.warrantyExpiry!)}`
  if (life === 'lapsed') return `Warranty ended ${fmtMonth(w.warrantyExpiry!)}`
  if (life === 'excepted') return 'Replacement on hold'
  return `Due since ${fmtMonth(w.eligibleDate!)}`
}
const params = new URLSearchParams(location.search)

export default function Inventory({ openTag, onOpenTag }: { openTag: string | null; onOpenTag: (t: string | null) => void }) {
  const { rows, sites, departments, byTag, notify } = useStore()
  const [siteId, setSiteId] = useState<number | null>(null)
  const [view, setView] = useState<View>((params.get('view') as View) || 'in-service')
  const [query, setQuery] = useState('')
  const [deptId, setDeptId] = useState<number | null>(null)
  const [location_, setLocation] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const [adding, setAdding] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const inSite = useMemo(() => (siteId ? rows.filter((r) => r.w.siteId === siteId) : rows), [rows, siteId])
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, inSite.filter(v.test).length])) as Record<View, number>, [inSite])

  const list = useMemo(() => {
    const test = VIEWS.find((v) => v.id === view)!.test
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    // A search looks everywhere in the site, retired workstations included, so nothing is "missing".
    const out = inSite.filter(
      (r) =>
        (words.length ? words.every((q) => r.haystack.includes(q)) : test(r)) &&
        (!deptId || r.w.deptId === deptId) &&
        (!location_ || r.w.location === location_),
    )
    return out.sort((a, b) => {
      const x = sortValue(a, sort.key), y = sortValue(b, sort.key)
      return (x < y ? -1 : x > y ? 1 : (a.w.name ?? '').localeCompare(b.w.name ?? '')) * sort.dir
    })
  }, [inSite, view, query, deptId, location_, sort])

  // Windowed rendering: only the rows on screen are in the DOM.
  const scroller = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [height, setHeight] = useState(600)
  useEffect(() => {
    const el = scroller.current!
    const ro = new ResizeObserver(() => setHeight(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [view, siteId, query, deptId, location_, sort])
  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - 6)
  const last = Math.min(list.length, Math.ceil((scrollTop + height) / ROW_H) + 6)

  const selected = openTag ? byTag.get(openTag) : undefined
  const selectedIndex = selected ? list.findIndex((r) => r.w.tag === openTag) : -1

  useEffect(() => {
    if (params.get('open') === 'first' && list[0]) onOpenTag(list[Math.min(3, list.length - 1)].w.tag)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const move = (delta: number) => {
    if (!list.length) return
    const i = Math.min(list.length - 1, Math.max(0, (selectedIndex < 0 ? -1 : selectedIndex) + delta))
    onOpenTag(list[i].w.tag)
    const el = scroller.current!
    const top = i * ROW_H
    if (top < el.scrollTop) el.scrollTop = top
    else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const exportCsv = () => {
    const head = ['Service tag', 'Workstation name', 'Site', 'Department', 'Model', 'Primary user', 'Status', 'Work location', 'Warranty ends', 'Replacement eligible', 'Last sign-in']
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const body = list.map((r) =>
      [r.w.tag, r.w.name, r.site?.name, r.dept?.name, r.modelLabel, r.w.user, r.w.status, r.w.location, r.w.warrantyExpiry, r.w.eligibleDate, r.w.lastLogin].map(cell).join(','),
    )
    const url = URL.createObjectURL(new Blob([[head.map(cell).join(','), ...body].join('\r\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `workstations-${TODAY_ISO}.csv`
    a.click()
    URL.revokeObjectURL(url)
    notify(`Exported ${list.length.toLocaleString()} workstations`)
  }

  const site = sites.find((s) => s.id === siteId)
  const SortHead = ({ k, children, className = '' }: { k: SortKey; children: string; className?: string }) => (
    <button
      className={`flex items-center gap-1 text-left text-sm font-medium hover:text-ink ${sort.key === k ? 'text-ink' : 'text-ink-2'} ${className}`}
      onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}
      aria-label={`Sort by ${children}`}
    >
      {children}
      {sort.key === k && (sort.dir === 1 ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
    </button>
  )

  const dept = departments.find((d) => d.id === deptId)
  const filterCount = (deptId ? 1 : 0) + (location_ ? 1 : 0)

  return (
    <div className="flex h-full">
      <section className="list flex min-w-0 flex-1 flex-col bg-sheet" aria-label="Workstations">
        {/* Title doubles as the site picker: one place to choose a site view. */}
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-3">
          <label className="relative mr-auto inline-flex items-center">
            <span className="sr-only">Site</span>
            <select
              style={{ fieldSizing: 'content' } as CSSProperties}
              className="peer appearance-none bg-transparent pr-8 text-2xl font-semibold tracking-[-0.01em] hover:text-petrol-deep"
              value={siteId ?? ''}
              onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All sites</option>
              {sites.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={20} className="pointer-events-none absolute right-1 text-ink-3 peer-hover:text-petrol-deep" />
          </label>
          <button className="btn btn-quiet text-ink-2" onClick={exportCsv} title="Download the current list as a CSV file Excel can open"><Download size={15} />Export</button>
          <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus size={16} />Add workstation</button>
        </div>

        {/* Each tab is a view and its count. */}
        <div role="tablist" aria-label="Views" className="flex gap-5 overflow-x-auto border-b border-rule px-5">
          {VIEWS.map((v) => {
            const on = v.id === view && !query
            return (
              <button
                key={v.id}
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setView(v.id)
                  setQuery('')
                }}
                className={`-mb-px flex flex-none items-center gap-1.5 border-b-2 pt-1 pb-2.5 whitespace-nowrap ${on ? 'border-ink font-semibold text-ink' : 'border-transparent text-ink-2 hover:text-ink'}`}
              >
                {v.color && <span className="size-2 rounded-full" style={{ background: v.color }} />}
                {v.label}
                <span className={`tnum text-sm ${on ? 'text-ink-2' : 'text-ink-3'}`}>{counts[v.id].toLocaleString()}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
            <input
              ref={searchRef}
              className="input !h-9 !pr-9 !pl-9"
              placeholder="Search service tag, name, user or model"
              aria-label="Search workstations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            />
            {query && (
              <button className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-2 hover:bg-chassis" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>
            )}
          </div>
          <button className={`btn !h-9 ${showFilters || filterCount ? 'border-ink-3' : ''}`} aria-expanded={showFilters} onClick={() => setShowFilters((x) => !x)}>
            <SlidersHorizontal size={15} />Filters{filterCount > 0 && <span className="tnum rounded-full bg-ink px-1.5 text-xs text-sheet">{filterCount}</span>}
          </button>
        </div>

        {(showFilters || filterCount > 0) && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            {showFilters ? (
              <>
                <select className="input !h-8 w-auto" aria-label="Department" value={deptId ?? ''} onChange={(e) => setDeptId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Any department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className="input !h-8 w-auto" aria-label="Work location" value={location_ ?? ''} onChange={(e) => setLocation(e.target.value || null)}>
                  <option value="">Any work location</option>
                  {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </>
            ) : (
              [dept && { label: dept.name, clear: () => setDeptId(null) }, location_ && { label: location_, clear: () => setLocation(null) }]
                .filter((x): x is { label: string; clear: () => void } => !!x)
                .map((f) => (
                  <button key={f.label} className="inline-flex h-7 items-center gap-1 rounded-full bg-chassis px-3 text-sm hover:bg-chassis-2" onClick={f.clear} aria-label={`Remove filter ${f.label}`}>
                    {f.label}<X size={13} />
                  </button>
                ))
            )}
            {filterCount > 0 && <button className="text-sm text-ink-2 underline underline-offset-2 hover:text-ink" onClick={() => { setDeptId(null); setLocation(null) }}>Clear filters</button>}
          </div>
        )}

        <div className={`row ${siteId ? '' : 'with-site'} h-9 flex-none border-y border-rule-2 bg-chassis/50`}>
          <SortHead k="name">Workstation</SortHead>
          <SortHead k="user" className="c-user">Assigned to</SortHead>
          <SortHead k="model" className="c-model">Model</SortHead>
          <SortHead k="site" className="c-site">Site</SortHead>
          <SortHead k="warranty" className="justify-end whitespace-nowrap">Lifecycle</SortHead>
        </div>

        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-y-auto"
          tabIndex={0}
          aria-label="Workstation list. Use the arrow keys to move between records."
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              move(e.key === 'ArrowDown' ? 1 : -1)
            }
          }}
        >
          {list.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-lg font-semibold">{query ? `Nothing matches “${query}”` : 'No workstations in this view'}</p>
              <p className="mt-1 text-ink-2">
                {query ? `Search looks at service tag, name, user and model${site ? ` in ${site.name}` : ''}.` : 'Try another tab, or clear the filters.'}
              </p>
              {(siteId || deptId || location_) && (
                <button className="btn mt-4" onClick={() => { setSiteId(null); setDeptId(null); setLocation(null) }}>Search all sites and departments</button>
              )}
            </div>
          ) : (
            <div style={{ height: list.length * ROW_H, position: 'relative' }}>
              {list.slice(first, last).map((r, i) => {
                const on = r.w.tag === openTag
                const quiet = r.life === 'covered' || r.life === 'retired'
                return (
                  <div
                    key={r.w.tag}
                    onClick={() => onOpenTag(r.w.tag)}
                    aria-selected={on}
                    className={`row ${siteId ? '' : 'with-site'} absolute inset-x-0 cursor-pointer border-b border-rule-2 ${on ? 'bg-petrol-wash shadow-[inset_3px_0_0_var(--color-petrol)]' : 'hover:bg-chassis/60'} ${r.w.status === 'Retired' ? 'text-ink-2' : ''}`}
                    style={{ top: (first + i) * ROW_H, height: ROW_H }}
                  >
                    <div className="min-w-0 leading-snug">
                      <div className="flex items-center gap-1.5">
                        <Code className="truncate font-semibold">{r.w.name ?? 'Unnamed'}</Code>
                        {r.review.length > 0 && <span className="size-2 flex-none rounded-full bg-review" title={r.review.map((x) => x.text).join(' ')} aria-label="Needs review" />}
                      </div>
                      <Code className="text-xs text-ink-3">{r.w.tag}</Code>
                    </div>
                    <div className="c-user truncate">
                      {r.w.status === 'Spare' ? <span className="text-ink-3">Spare</span> : r.w.user ?? <span className="text-ink-3">Nobody</span>}
                    </div>
                    <div className="c-model truncate text-ink-2">{r.modelLabel}</div>
                    <div className="c-site"><Code className="text-sm text-ink-2">{r.site?.code}</Code></div>
                    <div className={`flex items-center justify-end gap-2 text-sm whitespace-nowrap ${quiet ? 'text-ink-3' : 'text-ink'}`}>
                      {!quiet && <span className="size-2 flex-none rounded-full" style={{ background: LIFE_COLOR[r.life] }} />}
                      {lifeShort(r.w, r.life)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-none border-t border-rule-2 px-5 py-2 text-sm text-ink-3">
          <span className="tnum">{list.length.toLocaleString()} workstation{list.length === 1 ? '' : 's'}{query && ', retired included'}</span>
        </div>
      </section>

      {selected && (
        <Detail
          key={selected.w.tag}
          row={selected}
          onClose={() => onOpenTag(null)}
          position={selectedIndex >= 0 ? `${selectedIndex + 1} of ${list.length.toLocaleString()}` : null}
          onStep={selectedIndex >= 0 ? move : undefined}
        />
      )}
      {adding && <AddDialog defaultSiteId={siteId} onClose={() => setAdding(false)} onAdded={(tag) => { setAdding(false); setQuery(tag); onOpenTag(tag) }} />}
    </div>
  )
}
