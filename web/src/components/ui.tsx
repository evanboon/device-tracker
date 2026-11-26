import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Modal dialog. Closes on Escape or a click on the backdrop. */
export function Dialog({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea, button.btn-primary')
    first?.focus()
    return () => prev?.focus?.()
  }, [])
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/35 p-4 sm:pt-[8vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className="pop-in w-full rounded-lg bg-sheet shadow-[0_18px_50px_-12px_rgba(16,38,46,0.45)]" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between border-b border-rule-2 py-3 pr-3 pl-5">
          <h2 id={id} className="text-lg font-semibold">{title}</h2>
          <button className="btn btn-quiet btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, hint, error, children, required }: { label: string; hint?: string; error?: string | null; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2 text-sm font-medium">
        <span>{label}{required && <span className="text-ink-3"> (required)</span>}</span>
        {hint && !error && <span className="font-normal text-ink-3">{hint}</span>}
      </span>
      {children}
      {error && <span role="alert" className="mt-1 block text-sm text-review">{error}</span>}
    </label>
  )
}

/** Service tags and workstation names are codes, so they get the mono face. */
export function Code({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono tracking-[-0.01em] ${className}`}>{children}</span>
}

export function Segmented<T extends string>({ value, options, onChange, label, dark }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string; dark?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-md p-0.5 ${dark ? 'bg-spruce-2' : 'bg-chassis-2'}`}>
      {options.map((o) => (
        <button
          key={o}
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={`h-7 rounded px-2.5 text-sm font-medium ${o === value ? 'bg-sheet text-ink shadow-[0_1px_2px_rgba(16,38,46,0.2)]' : dark ? 'text-spruce-ink hover:text-white' : 'text-ink-2 hover:text-ink'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
