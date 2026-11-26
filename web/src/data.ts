// Mock data shaped like the ER diagram (member_centre, department, device_model,
// workstation, warranty, replacement_exception, workstation_history).
// Everything here is invented. No real CLAC data is used.

export const TODAY_ISO = '2026-11-10'

export type Status = 'Active' | 'Spare' | 'Retired'
export const STATUSES: Status[] = ['Active', 'Spare', 'Retired']
export const LOCATIONS = ['Office', 'Hybrid', 'Remote']

export interface Site {
  id: number
  name: string
  code: string
  city: string
  province: string
  active: boolean
}
export interface Department {
  id: number
  name: string
}
export interface Model {
  id: number
  manufacturer: string
  name: string
  kind: 'LT' | 'DT'
  year: number
}
export interface HistoryEntry {
  field: string
  from: string | null
  to: string | null
  by: string
  at: string
  source: 'Manual edit' | 'Import' | 'System'
}
export interface ReplacementException {
  reason: string
  addedBy: string
  dateFlagged: string
}
export interface Workstation {
  tag: string
  name: string | null
  siteId: number
  deptId: number | null
  modelId: number | null
  po: string | null
  user: string | null
  status: Status
  location: string | null
  lastImaged: string | null
  lastLogin: string | null
  os: string | null
  createdAt: string
  updatedAt: string
  warrantyExpiry: string | null
  eligibleDate: string | null
  warrantyManual: boolean
  exception: ReplacementException | null
  history: HistoryEntry[]
}

/* ---------- dates ---------- */

export const toDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const TODAY = toDate(TODAY_ISO)
const DAY = 86_400_000
export const addDays = (iso: string, n: number) => toISO(new Date(toDate(iso).getTime() + n * DAY + DAY / 2))
export const addYears = (iso: string, n: number) => {
  const d = toDate(iso)
  d.setFullYear(d.getFullYear() + n)
  return toISO(d)
}
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const fmtDate = (iso: string | null) => {
  if (!iso) return 'Not set'
  const d = toDate(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}
export const fmtMonth = (iso: string) => {
  const d = toDate(iso)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
/** "3 days ago", "in 5 months" */
export const fmtRelative = (iso: string) => {
  const n = daysBetween(TODAY_ISO, iso)
  const a = Math.abs(n)
  const unit = a < 1 ? 'today' : a < 60 ? `${a} day${a === 1 ? '' : 's'}` : a < 700 ? `${Math.round(a / 30.4)} months` : `${(a / 365).toFixed(1)} years`
  if (a < 1) return unit
  return n < 0 ? `${unit} ago` : `in ${unit}`
}

/** The replacement rule this prototype assumes: eligible one year after warranty ends. */
export const eligibleFrom = (warrantyExpiry: string | null) => (warrantyExpiry ? addYears(warrantyExpiry, 1) : null)

/* ---------- reference data ---------- */

export const SEED_SITES: Site[] = [
  ['Langley', 'LAN', 'Langley', 'BC'],
  ['Kelowna', 'KEL', 'Kelowna', 'BC'],
  ['Calgary', 'CAL', 'Calgary', 'AB'],
  ['Edmonton', 'EDM', 'Edmonton', 'AB'],
  ['Fort McMurray', 'FMM', 'Fort McMurray', 'AB'],
  ['Saskatoon', 'SAS', 'Saskatoon', 'SK'],
  ['Winnipeg', 'WPG', 'Winnipeg', 'MB'],
  ['Kitchener', 'KIT', 'Kitchener', 'ON'],
  ['Mississauga', 'MIS', 'Mississauga', 'ON'],
  ['Grimsby', 'GRI', 'Grimsby', 'ON'],
  ['Ottawa', 'OTT', 'Ottawa', 'ON'],
  ['Chatham', 'CHA', 'Chatham', 'ON'],
].map(([name, code, city, province], i) => ({ id: i + 1, name, code, city, province, active: true }))
const SITE_SIZES = [110, 38, 96, 168, 42, 34, 58, 74, 142, 124, 52, 62]

export const SEED_DEPARTMENTS: Department[] = [
  'Member Services', 'Representation', 'Training', 'Finance', 'Communications',
  'Benefits', 'Human Resources', 'Administration', 'Legal', 'IT',
].map((name, i) => ({ id: i + 1, name }))

export const SEED_MODELS: Model[] = ([
  ['Dell', 'Latitude 5420', 'LT', 2021],
  ['Dell', 'OptiPlex 7090 Micro', 'DT', 2021],
  ['Dell', 'Latitude 5430', 'LT', 2022],
  ['Dell', 'Latitude 5440', 'LT', 2023],
  ['Dell', 'OptiPlex 7010 Micro', 'DT', 2023],
  ['Lenovo', 'ThinkPad T14 Gen 4', 'LT', 2023],
  ['Dell', 'Latitude 5450', 'LT', 2024],
  ['Dell', 'Latitude 7450', 'LT', 2024],
  ['Dell', 'OptiPlex 7020 Micro', 'DT', 2024],
  ['Dell', 'Pro 14 Plus', 'LT', 2025],
  ['Dell', 'Pro Micro QCM1250', 'DT', 2025],
  ['Dell', 'Pro 14 Premium', 'LT', 2026],
] as const).map(([manufacturer, name, kind, year], i) => ({ id: i + 1, manufacturer, name, kind, year }))

const FIRST = ['Priya', 'Marcus', 'Elena', 'Tobias', 'Amara', 'Liam', 'Sofia', 'Jun', 'Hannah', 'Mateo', 'Aisha', 'Connor', 'Mei', 'Darius', 'Ingrid', 'Rafael', 'Nadia', 'Owen', 'Chloe', 'Kwame', 'Freya', 'Anders', 'Leila', 'Gavin', 'Yuki', 'Simone', 'Tariq', 'Bronwyn', 'Emeka', 'Katya', 'Declan', 'Rosa', 'Vikram', 'Maren', 'Isaac', 'Thea', 'Joel', 'Paloma', 'Reid', 'Anneke']
const LAST = ['Nair', 'Vandenberg', 'Okafor', 'Tremblay', 'Dykstra', 'Singh', 'MacLeod', 'Chen', 'Friesen', 'Alvarez', 'Hoekstra', 'Morin', 'Petrov', 'Boersma', 'Lam', 'Gagnon', 'Reimer', 'Hassan', 'Visser', 'Campbell', 'Dhillon', 'Bouchard', 'Kowalski', 'Vriend', 'Tanaka', 'Roy', 'Mensah', 'De Jong', 'Fraser', 'Santos', 'Wiebe', 'Kaur', 'Lindqvist', 'Bakker', 'Park', 'Leblanc', 'Osei', 'Jansen', 'Murphy', 'Zhou']
const EXCEPTION_REASONS = [
  'Runs the legacy badge-printer software. Keep until the vendor update ships.',
  'User retires in March. Replace when they leave.',
  'Loaner pool machine. Replace with the next bulk order.',
  'Training-room desktop, rarely used. Review again next fall.',
  'Replacement is on backorder under the spring purchase order.',
]
const IT_STAFF = ['Priya', 'Marcus', 'Demo user']
export const CURRENT_USER = 'Demo user'

/* ---------- generator ---------- */

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TAG_CHARS = 'BCDFGHJKLMNPQRSTVWXYZ0123456789'

export function generateWorkstations(): Workstation[] {
  const r = rng(339)
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]
  const tags = new Set<string>()
  const newTag = () => {
    for (;;) {
      let t = ''
      for (let i = 0; i < 7; i++) t += TAG_CHARS[Math.floor(r() * TAG_CHARS.length)]
      if (/\d/.test(t) && /[A-Z]/.test(t) && !tags.has(t)) {
        tags.add(t)
        return t
      }
    }
  }
  const yearWeights: [number, number][] = [[2021, 9], [2022, 14], [2023, 24], [2024, 26], [2025, 19], [2026, 8]]
  const pickYear = () => {
    let x = r() * 100
    for (const [y, w] of yearWeights) if ((x -= w) < 0) return y
    return 2024
  }
  const out: Workstation[] = []
  const IMPORTED = '2026-10-26'

  SEED_SITES.forEach((site, si) => {
    let seq = 100 + Math.floor(r() * 80)
    for (let i = 0; i < SITE_SIZES[si]; i++) {
      const year = pickYear()
      const model = pick(SEED_MODELS.filter((m) => m.year === year))
      const month = year === 2026 ? Math.floor(r() * 9) : Math.floor(r() * 12)
      const purchased = toISO(new Date(year, month, 1 + Math.floor(r() * 27)))
      seq += 1 + Math.floor(r() * 4)
      const old = year <= 2022
      const roll = r()
      const status: Status = roll < (old ? 0.18 : 0.012) ? 'Retired' : roll < (old ? 0.3 : 0.1) ? 'Spare' : 'Active'
      const user = status === 'Active' ? `${pick(FIRST)} ${pick(LAST)}` : null
      const warrantyExpiry = addYears(purchased, 3)
      const loginAge = r() < 0.035 ? 95 + Math.floor(r() * 160) : Math.floor(r() * r() * 24)
      const w: Workstation = {
        tag: newTag(),
        name: `${site.code}-${model.kind}-${String(seq).padStart(4, '0')}`,
        siteId: site.id,
        deptId: status === 'Active' ? pick(SEED_DEPARTMENTS).id : r() < 0.3 ? SEED_DEPARTMENTS[9].id : null,
        modelId: model.id,
        po: `PO-${year}-${String(100 + Math.floor(r() * 60)).padStart(4, '0')}`,
        user,
        status,
        location: status === 'Active' ? pick(['Office', 'Office', 'Office', 'Hybrid', 'Hybrid', 'Remote']) : status === 'Spare' ? 'Office' : null,
        lastImaged: addDays(purchased, 10 + Math.floor(r() * (old ? 900 : 200))),
        lastLogin: status === 'Retired' ? addDays(TODAY_ISO, -(200 + Math.floor(r() * 300))) : status === 'Spare' ? addDays(TODAY_ISO, -(20 + Math.floor(r() * 200))) : addDays(TODAY_ISO, -loginAge),
        os: year <= 2021 && r() < 0.22 ? 'Windows 10 22H2' : pick(['Windows 11 24H2', 'Windows 11 24H2', 'Windows 11 25H2', 'Windows 11 23H2']),
        createdAt: IMPORTED,
        updatedAt: IMPORTED,
        warrantyExpiry,
        eligibleDate: eligibleFrom(warrantyExpiry),
        warrantyManual: r() < 0.12,
        exception: null,
        history: [],
      }
      if (w.lastImaged! > TODAY_ISO) w.lastImaged = addDays(TODAY_ISO, -Math.floor(r() * 30))

      // Data-quality problems for the Needs review view to catch
      const q = r()
      if (status === 'Active' && q < 0.012) w.user = null
      else if (q < 0.026) { w.warrantyExpiry = null; w.eligibleDate = null }
      else if (q < 0.034 && status !== 'Retired') w.name = w.name!.replace(site.code, SEED_SITES[(si + 3) % SEED_SITES.length].code)

      if (status !== 'Retired' && w.eligibleDate && w.eligibleDate <= TODAY_ISO && r() < 0.1) {
        w.exception = { reason: pick(EXCEPTION_REASONS), addedBy: 'Priya', dateFlagged: addDays(TODAY_ISO, -Math.floor(r() * 120)) }
      }

      // History, newest first
      const h: HistoryEntry[] = []
      if (status === 'Retired') {
        const at = addDays(TODAY_ISO, -(15 + Math.floor(r() * 180)))
        h.push({ field: 'Status', from: 'Active', to: 'Retired', by: pick(IT_STAFF), at, source: 'Manual edit' })
        h.push({ field: 'Primary user', from: `${pick(FIRST)} ${pick(LAST)}`, to: null, by: pick(IT_STAFF), at, source: 'Manual edit' })
        w.updatedAt = at
      }
      if (r() < 0.3 && w.user) {
        const at = addDays(TODAY_ISO, -(2 + Math.floor(r() * 14)))
        h.push({ field: 'Primary user', from: `${pick(FIRST)} ${pick(LAST)}`, to: w.user, by: pick(IT_STAFF), at, source: 'Manual edit' })
        w.updatedAt = at
      }
      if (r() < 0.16 && w.name) {
        const prev = w.name.replace(/\d{4}$/, String(Math.floor(r() * 9000) + 1000))
        h.push({ field: 'Workstation name', from: prev, to: w.name, by: 'Workbook import', at: IMPORTED, source: 'Import' })
      }
      h.push({ field: 'Record', from: null, to: 'Added from the Excel inventory workbook', by: 'Workbook import', at: IMPORTED, source: 'Import' })
      w.history = h
      out.push(w)
    }
  })

  // Two workstation names used twice, for the duplicate check
  out[40].name = out[12].name
  out[515].name = out[498].name
  return out
}

/* ---------- derived state ---------- */

export type LifeState = 'covered' | 'lapsed' | 'replace' | 'excepted' | 'unknown' | 'retired'

export function lifeState(w: Workstation): LifeState {
  if (w.status === 'Retired') return 'retired'
  if (!w.warrantyExpiry) return 'unknown'
  if (w.eligibleDate && w.eligibleDate <= TODAY_ISO) return w.exception ? 'excepted' : 'replace'
  if (w.warrantyExpiry < TODAY_ISO) return 'lapsed'
  return 'covered'
}

export const LIFE_LABEL: Record<LifeState, string> = {
  covered: 'In warranty',
  lapsed: 'Out of warranty',
  replace: 'Replacement eligible',
  excepted: 'Replacement on hold',
  unknown: 'No warranty date',
  retired: 'Retired',
}

export function lifeSentence(w: Workstation): string {
  const s = lifeState(w)
  if (s === 'retired') return 'Retired'
  if (s === 'unknown') return 'No warranty date on file'
  if (s === 'covered') return `In warranty until ${fmtMonth(w.warrantyExpiry!)}`
  if (s === 'lapsed') return `Out of warranty since ${fmtMonth(w.warrantyExpiry!)}`
  if (s === 'excepted') return `On hold, eligible since ${fmtMonth(w.eligibleDate!)}`
  return `Replacement eligible since ${fmtMonth(w.eligibleDate!)}`
}

export interface ReviewReason {
  code: string
  text: string
  fix: string
}

export function reviewReasons(w: Workstation, site: Site | undefined, nameCounts: Map<string, number>): ReviewReason[] {
  if (w.status === 'Retired') return []
  const out: ReviewReason[] = []
  if (w.status === 'Active' && !w.user)
    out.push({ code: 'no-user', text: 'Active, but nobody is assigned.', fix: 'Assign a primary user, or change the status to Spare.' })
  if (!w.warrantyExpiry)
    out.push({ code: 'no-warranty', text: 'No warranty date on file.', fix: 'An admin can enter the warranty end date.' })
  if (w.name && (nameCounts.get(w.name) ?? 0) > 1)
    out.push({ code: 'dup-name', text: `Another workstation is also named ${w.name}.`, fix: 'Rename one of them. Names must be unique.' })
  if (w.name && site && /^[A-Z]{3}-/.test(w.name) && !w.name.startsWith(site.code + '-'))
    out.push({ code: 'site-mismatch', text: `Named for ${w.name.slice(0, 3)}, but recorded at ${site.name}.`, fix: 'Correct the site, or rename the workstation.' })
  if (w.status === 'Active' && w.lastLogin && daysBetween(w.lastLogin, TODAY_ISO) > 90)
    out.push({ code: 'stale', text: `No sign-in for ${daysBetween(w.lastLogin, TODAY_ISO)} days.`, fix: 'Check whether it is still in use. If not, mark it Spare or retire it.' })
  if (w.os?.startsWith('Windows 10'))
    out.push({ code: 'os', text: 'Still on Windows 10, which is out of support.', fix: 'Re-image to Windows 11 or plan a replacement.' })
  return out
}
