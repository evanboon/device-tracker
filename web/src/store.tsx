import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CURRENT_USER, SEED_DEPARTMENTS, SEED_MODELS, SEED_SITES, TODAY_ISO, eligibleFrom, generateWorkstations,
  lifeState, reviewReasons, fmtDate,
  type Department, type HistoryEntry, type LifeState, type Model, type ReviewReason, type Site, type Workstation,
} from './data'

export type Role = 'IT' | 'Admin'

/** A workstation joined with its lookups and derived flags, ready to display. */
export interface Row {
  w: Workstation
  site: Site | undefined
  dept: Department | undefined
  model: Model | undefined
  modelLabel: string
  life: LifeState
  review: ReviewReason[]
  haystack: string
}

/** Fields people can edit, with the label used in history entries. */
export const EDITABLE: { key: keyof Workstation; label: string; adminOnly?: boolean }[] = [
  { key: 'name', label: 'Workstation name' },
  { key: 'user', label: 'Primary user' },
  { key: 'siteId', label: 'Site' },
  { key: 'deptId', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'location', label: 'Work location' },
  { key: 'modelId', label: 'Model' },
  { key: 'po', label: 'Purchase order' },
  { key: 'lastImaged', label: 'Last imaged' },
  { key: 'warrantyExpiry', label: 'Warranty ends', adminOnly: true },
]

interface Toast {
  id: number
  text: string
  undo?: () => void
}

interface Store {
  role: Role
  setRole: (r: Role) => void
  sites: Site[]
  departments: Department[]
  models: Model[]
  rows: Row[]
  byTag: Map<string, Row>
  update: (tag: string, patch: Partial<Workstation>, source?: HistoryEntry['source'], by?: string) => number
  restore: (w: Workstation) => void
  add: (w: Workstation) => void
  addMany: (ws: Workstation[]) => void
  setException: (tag: string, reason: string | null) => void
  addSite: (s: Omit<Site, 'id'>) => void
  addDepartment: (name: string) => void
  addModel: (m: Omit<Model, 'id'>) => void
  toast: Toast | null
  notify: (text: string, undo?: () => void) => void
  dismissToast: () => void
}

const Ctx = createContext<Store | null>(null)
export const useStore = () => {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => (new URLSearchParams(location.search).get('role') === 'Admin' ? 'Admin' : 'IT'))
  const [sites, setSites] = useState(SEED_SITES)
  const [departments, setDepartments] = useState(SEED_DEPARTMENTS)
  const [models, setModels] = useState(SEED_MODELS)
  const [workstations, setWorkstations] = useState(generateWorkstations)
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const wsRef = useRef(workstations)
  wsRef.current = workstations

  const notify = useCallback((text: string, undo?: () => void) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text, undo })
    timer.current = window.setTimeout(() => setToast(null), 6000)
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  const display = useCallback(
    (key: keyof Workstation, v: unknown): string | null => {
      if (v == null || v === '') return null
      if (key === 'siteId') return sites.find((s) => s.id === v)?.name ?? null
      if (key === 'deptId') return departments.find((d) => d.id === v)?.name ?? null
      if (key === 'modelId') {
        const m = models.find((x) => x.id === v)
        return m ? `${m.manufacturer} ${m.name}` : null
      }
      if (key === 'lastImaged' || key === 'warrantyExpiry') return fmtDate(v as string)
      return String(v)
    },
    [sites, departments, models],
  )

  const update: Store['update'] = useCallback(
    (tag, patch, source = 'Manual edit', by = CURRENT_USER) => {
      const w = wsRef.current.find((x) => x.tag === tag)
      if (!w) return 0
      const entries: HistoryEntry[] = []
      const next = { ...w }
      for (const { key, label } of EDITABLE) {
        if (!(key in patch)) continue
        const to = (patch[key] ?? null) as never
        if ((w[key] ?? null) === to) continue
        entries.push({ field: label, from: display(key, w[key]), to: display(key, to), by, at: TODAY_ISO, source })
        ;(next[key] as unknown) = to
      }
      if (!entries.length) return 0
      if (next.warrantyExpiry !== w.warrantyExpiry) {
        next.eligibleDate = eligibleFrom(next.warrantyExpiry)
        next.warrantyManual = source === 'Manual edit'
      }
      next.history = [...entries, ...w.history]
      next.updatedAt = TODAY_ISO
      setWorkstations((all) => all.map((x) => (x.tag === tag ? next : x)))
      return entries.length
    },
    [display],
  )

  const restore: Store['restore'] = useCallback((w) => setWorkstations((all) => all.map((x) => (x.tag === w.tag ? w : x))), [])

  const add: Store['add'] = useCallback((w) => setWorkstations((all) => [w, ...all]), [])
  const addMany: Store['addMany'] = useCallback((ws) => setWorkstations((all) => [...ws, ...all]), [])

  const setException: Store['setException'] = useCallback((tag, reason) => {
    setWorkstations((all) =>
      all.map((w) => {
        if (w.tag !== tag) return w
        const entry: HistoryEntry = {
          field: 'Replacement hold', from: w.exception?.reason ?? null, to: reason, by: CURRENT_USER, at: TODAY_ISO, source: 'Manual edit',
        }
        return {
          ...w,
          exception: reason ? { reason, addedBy: CURRENT_USER, dateFlagged: TODAY_ISO } : null,
          history: [entry, ...w.history],
          updatedAt: TODAY_ISO,
        }
      }),
    )
  }, [])

  const addSite: Store['addSite'] = useCallback((s) => setSites((all) => [...all, { ...s, id: Math.max(...all.map((x) => x.id)) + 1 }]), [])
  const addDepartment: Store['addDepartment'] = useCallback((name) => setDepartments((all) => [...all, { id: Math.max(...all.map((x) => x.id)) + 1, name }]), [])
  const addModel: Store['addModel'] = useCallback((m) => setModels((all) => [...all, { ...m, id: Math.max(...all.map((x) => x.id)) + 1 }]), [])

  const rows = useMemo(() => {
    const nameCounts = new Map<string, number>()
    for (const w of workstations) if (w.name && w.status !== 'Retired') nameCounts.set(w.name, (nameCounts.get(w.name) ?? 0) + 1)
    const siteMap = new Map(sites.map((s) => [s.id, s]))
    const deptMap = new Map(departments.map((d) => [d.id, d]))
    const modelMap = new Map(models.map((m) => [m.id, m]))
    return workstations.map((w): Row => {
      const site = siteMap.get(w.siteId)
      const model = w.modelId ? modelMap.get(w.modelId) : undefined
      const modelLabel = model ? `${model.manufacturer} ${model.name}` : ''
      return {
        w, site, model, modelLabel,
        dept: w.deptId ? deptMap.get(w.deptId) : undefined,
        life: lifeState(w),
        review: reviewReasons(w, site, nameCounts),
        haystack: `${w.tag} ${w.name ?? ''} ${w.user ?? ''} ${modelLabel}`.toLowerCase(),
      }
    })
  }, [workstations, sites, departments, models])

  const byTag = useMemo(() => new Map(rows.map((r) => [r.w.tag, r])), [rows])

  const value: Store = {
    role, setRole, sites, departments, models, rows, byTag, update, restore, add, addMany, setException,
    addSite, addDepartment, addModel, toast, notify, dismissToast,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
