// Stand-in for the AI feature (R12). It turns a plain-English question into a
// read-only SELECT over the inventory. In the real system an LLM writes the query
// and the database runs it under a read-only role; here a few patterns do the same job.
import { TODAY_ISO, addDays, type Department, type Model, type Site } from './data'
import type { Row } from './store'

interface Filter {
  label: string
  sql: string
  test: (r: Row) => boolean
}
export type Answer =
  | { kind: 'refused'; message: string }
  | { kind: 'unknown' }
  | { kind: 'count'; n: number; label: string; sql: string; rows: Row[] }
  | { kind: 'groups'; by: string; groups: [string, number][]; label: string; sql: string }
  | { kind: 'list'; rows: Row[]; label: string; sql: string }

const FROM = `FROM workstation w
  JOIN member_centre mc ON mc.centre_id = w.centre_id
  LEFT JOIN device_model dm ON dm.model_id = w.model_id
  LEFT JOIN department d ON d.department_id = w.department_id
  LEFT JOIN warranty wa ON wa.service_tag = w.service_tag`

export function ask(text: string, rows: Row[], ctx: { sites: Site[]; departments: Department[]; models: Model[] }): Answer {
  const q = ` ${text.toLowerCase().replace(/[?.,]/g, ' ')} `
  if (/\b(delete|remove|update|change|set|retire|rename|drop|insert|add|assign|move)\b/.test(q))
    return { kind: 'refused', message: 'Ask only reads the inventory, so it can’t change records. Open the workstation in Inventory to edit it.' }

  const f: Filter[] = []
  for (const s of ctx.sites)
    if (q.includes(` ${s.name.toLowerCase()} `) || q.includes(` ${s.code.toLowerCase()} `))
      f.push({ label: `at ${s.name}`, sql: `mc.site_code = '${s.code}'`, test: (r) => r.w.siteId === s.id })
  for (const d of ctx.departments)
    if (d.name !== 'IT' && q.includes(d.name.toLowerCase()))
      f.push({ label: `in ${d.name}`, sql: `d.department_name = '${d.name}'`, test: (r) => r.w.deptId === d.id })
  const model = ctx.models.find((m) => q.includes(m.name.toLowerCase()))
  if (model) f.push({ label: model.name, sql: `dm.model_name = '${model.name}'`, test: (r) => r.w.modelId === model.id })
  else {
    const family = ['latitude', 'optiplex', 'thinkpad'].find((x) => q.includes(x))
    const maker = ['dell', 'lenovo'].find((x) => q.includes(x))
    if (family) f.push({ label: family, sql: `dm.model_name ILIKE '${family}%'`, test: (r) => r.modelLabel.toLowerCase().includes(family) })
    else if (maker) f.push({ label: maker, sql: `dm.manufacturer ILIKE '${maker}'`, test: (r) => r.model?.manufacturer.toLowerCase() === maker })
  }

  const status = /\bretired\b/.test(q) ? 'Retired' : /\bspares?\b/.test(q) ? 'Spare' : /\bactive\b/.test(q) ? 'Active' : null
  if (status) f.push({ label: status.toLowerCase(), sql: `w.status = '${status}'`, test: (r) => r.w.status === status })
  else f.push({ label: 'in service', sql: `w.status <> 'Retired'`, test: (r) => r.w.status !== 'Retired' })

  for (const loc of ['Remote', 'Hybrid'])
    if (q.includes(loc.toLowerCase())) f.push({ label: loc.toLowerCase(), sql: `w.work_location = '${loc}'`, test: (r) => r.w.location === loc })

  const year = q.match(/\b(202\d)\b/)?.[1]
  const within = q.match(/(?:next|within|in) (\d+) (day|week|month)s?/)
  if (/(replace|replacement|refresh)/.test(q)) {
    if (year) f.push({ label: `replacement eligible in ${year}`, sql: `EXTRACT(YEAR FROM wa.eligible_replace_date) = ${year}`, test: (r) => !!r.w.eligibleDate?.startsWith(year) })
    else f.push({ label: 'replacement eligible', sql: `wa.eligible_replace_date <= CURRENT_DATE`, test: (r) => !!r.w.eligibleDate && r.w.eligibleDate <= TODAY_ISO })
  } else if (/warrant/.test(q)) {
    if (within) {
      const days = Number(within[1]) * (within[2] === 'day' ? 1 : within[2] === 'week' ? 7 : 30)
      const until = addDays(TODAY_ISO, days)
      f.push({ label: `warranty ending in the next ${within[1]} ${within[2]}s`, sql: `wa.warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + ${days}`, test: (r) => !!r.w.warrantyExpiry && r.w.warrantyExpiry >= TODAY_ISO && r.w.warrantyExpiry <= until })
    } else if (year) f.push({ label: `warranty ending in ${year}`, sql: `EXTRACT(YEAR FROM wa.warranty_expiry) = ${year}`, test: (r) => !!r.w.warrantyExpiry?.startsWith(year) })
    else if (/(out of|expired|lapsed|no longer)/.test(q)) f.push({ label: 'out of warranty', sql: `wa.warranty_expiry < CURRENT_DATE`, test: (r) => !!r.w.warrantyExpiry && r.w.warrantyExpiry < TODAY_ISO })
    else if (/(missing|no warranty|without)/.test(q)) f.push({ label: 'with no warranty date', sql: `wa.warranty_expiry IS NULL`, test: (r) => !r.w.warrantyExpiry })
    else f.push({ label: 'in warranty', sql: `wa.warranty_expiry >= CURRENT_DATE`, test: (r) => !!r.w.warrantyExpiry && r.w.warrantyExpiry >= TODAY_ISO })
  }
  const idle = q.match(/(?:signed in|sign-in|sign in|logged in|login|log in|used)[a-z ]*?(\d+) days/) ?? q.match(/(\d+) days/)
  if (idle && /(sign|log|used|idle)/.test(q)) {
    const cutoff = addDays(TODAY_ISO, -Number(idle[1]))
    f.push({ label: `no sign-in for ${idle[1]} days`, sql: `w.last_login_date < CURRENT_DATE - ${idle[1]}`, test: (r) => !!r.w.lastLogin && r.w.lastLogin < cutoff })
  }
  if (/(unassigned|no user|nobody|without a user)/.test(q)) f.push({ label: 'with no primary user', sql: `w.primary_user IS NULL`, test: (r) => !r.w.user })
  if (/windows 10/.test(q)) f.push({ label: 'on Windows 10', sql: `w.os_version ILIKE 'Windows 10%'`, test: (r) => !!r.w.os?.startsWith('Windows 10') })

  const group = q.match(/(?:by|per|each) (site|centre|model|department|status)/)?.[1]
  const counting = /(how many|count|number of)/.test(q)
  // Only the default "in service" filter matched, and nothing else: we didn't understand the question.
  if (f.length === 1 && !status && !group && !counting) return { kind: 'unknown' }

  const matched = rows.filter((r) => f.every((x) => x.test(r)))
  const label = `Workstations ${f.map((x) => x.label).join(', ')}`
  const where = `WHERE ${f.map((x) => x.sql).join('\n  AND ')}`

  if (group) {
    const key = (r: Row) => (group === 'model' ? r.modelLabel || 'No model' : group === 'department' ? r.dept?.name ?? 'No department' : group === 'status' ? r.w.status : r.site?.name ?? '')
    const col = group === 'model' ? 'dm.model_name' : group === 'department' ? 'd.department_name' : group === 'status' ? 'w.status' : 'mc.centre_name'
    const m = new Map<string, number>()
    for (const r of matched) m.set(key(r), (m.get(key(r)) ?? 0) + 1)
    return {
      kind: 'groups', by: group === 'centre' ? 'site' : group, label,
      groups: [...m].sort((a, b) => b[1] - a[1]),
      sql: `SELECT ${col}, COUNT(*) AS workstations\n${FROM}\n${where}\nGROUP BY ${col}\nORDER BY workstations DESC;`,
    }
  }
  if (counting) return { kind: 'count', n: matched.length, label, rows: matched, sql: `SELECT COUNT(*)\n${FROM}\n${where};` }
  return {
    kind: 'list', rows: matched, label,
    sql: `SELECT w.workstation_name, w.service_tag, w.primary_user, mc.centre_name, wa.warranty_expiry\n${FROM}\n${where}\nORDER BY wa.warranty_expiry;`,
  }
}
