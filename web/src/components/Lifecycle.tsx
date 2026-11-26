import type { CSSProperties } from 'react'
import { TODAY_ISO, lifeSentence, toDate, type LifeState, type Workstation } from '../data'

// Every track shares this axis, so the "today" line lines up down the whole list.
export const AXIS_START = 2023
export const AXIS_END = 2030
const YEARS = AXIS_END - AXIS_START
const t0 = new Date(AXIS_START, 0, 1).getTime()
const t1 = new Date(AXIS_END, 0, 1).getTime()

export const axisPos = (iso: string) => Math.min(100, Math.max(0, ((toDate(iso).getTime() - t0) / (t1 - t0)) * 100))
const TODAY_POS = axisPos(TODAY_ISO)

export const axisVars = { '--today': `${TODAY_POS}%`, '--years': YEARS } as CSSProperties

export function LifeTrack({ w, state, large }: { w: Workstation; state: LifeState; large?: boolean }) {
  const a = w.warrantyExpiry ? axisPos(w.warrantyExpiry) : 0
  const b = w.eligibleDate ? axisPos(w.eligibleDate) : 0
  const cls = state === 'retired' ? 'is-retired' : state === 'unknown' ? 'is-unknown' : ''
  return (
    <div className={`life ${large ? 'life-lg' : ''}`} style={axisVars} role="img" aria-label={lifeSentence(w)} title={lifeSentence(w)}>
      <div className={`life-track ${cls}`} style={{ '--a': `${a}%`, '--b': `${b}%` } as CSSProperties}>
        {state === 'excepted' && <div className="life-hold" />}
      </div>
    </div>
  )
}

/** Year labels for the top of the lifecycle column. */
export function LifeAxis() {
  return (
    <div className="life-axis relative h-full" style={axisVars} aria-hidden="true">
      {Array.from({ length: YEARS }, (_, i) => (
        <span key={i} className={`tnum absolute top-1/2 -translate-y-1/2 pl-1.5 text-xs text-ink-3 ${i % 2 ? 'odd' : ''}`} style={{ left: `${(i / YEARS) * 100}%` }}>
          {AXIS_START + i}
        </span>
      ))}
      <span className="absolute bottom-0 h-1.5 w-px bg-ink" style={{ left: `${TODAY_POS}%` }} />
    </div>
  )
}

export const LIFE_COLOR: Record<LifeState, string> = {
  covered: 'var(--color-covered)',
  lapsed: 'var(--color-lapsed)',
  replace: 'var(--color-replace)',
  excepted: 'var(--color-replace)',
  unknown: 'var(--color-ink-3)',
  retired: 'var(--color-ink-3)',
}

export function LifeLegend() {
  const items: [string, string][] = [
    ['In warranty', 'var(--color-covered)'],
    ['Out of warranty', 'var(--color-lapsed)'],
    ['Replacement eligible', 'var(--color-replace)'],
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="swatch" style={{ background: color }} />
          {label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-px bg-ink" />
        Today
      </span>
    </div>
  )
}
