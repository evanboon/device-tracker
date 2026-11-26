import { useState } from 'react'
import { useStore, type Role } from './store'
import { Segmented } from './components/ui'
import Inventory from './components/Inventory'
import ImportScreen from './components/Import'
import Ask from './components/Ask'
import Reference from './components/Reference'

export type Screen = 'inventory' | 'import' | 'ask' | 'reference'
const NAV: { id: Screen; label: string }[] = [
  { id: 'inventory', label: 'Inventory' },
  { id: 'import', label: 'Import' },
  { id: 'ask', label: 'Ask' },
  { id: 'reference', label: 'Sites and lists' },
]

/** Lets a link open the prototype on a given screen: ?screen=ask&open=first&role=Admin */
const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '')

export default function App() {
  const { role, setRole, toast, dismissToast } = useStore()
  const [screen, setScreen] = useState<Screen>((params.get('screen') as Screen) || 'inventory')
  // Inventory stays mounted so filters and scroll position survive a trip to another screen.
  const [openTag, setOpenTag] = useState<string | null>(null)
  const showInInventory = (tag: string) => {
    setOpenTag(tag)
    setScreen('inventory')
  }

  return (
    <div className="app flex flex-col">
      <header className="flex flex-none flex-wrap items-center gap-x-8 gap-y-1 bg-spruce px-4 pt-2 text-spruce-ink sm:pt-0">
        <div className="flex items-center gap-2.5 sm:h-12">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <rect x="1" y="3" width="20" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M7 19.5h8M11 16v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M4.5 12.5h4l1.5-3 2 5 1.5-2h4" fill="none" stroke="#7fd1bf" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-lg font-bold tracking-[-0.01em] text-white">Device Tracker</span>
          <span className="text-sm text-spruce-mute">CLAC IT</span>
        </div>
        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:self-stretch">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setScreen(n.id)}
              aria-current={screen === n.id ? 'page' : undefined}
              className={`relative px-3 py-2.5 font-medium whitespace-nowrap sm:py-0 ${screen === n.id ? 'text-white after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-[#7fd1bf]' : 'text-spruce-mute hover:text-white'}`}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-spruce-mute md:inline">Viewing as</span>
          <Segmented<Role> dark label="Viewing as" value={role} options={['IT', 'Admin']} onChange={setRole} />
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <div className={screen === 'inventory' ? 'h-full' : 'hidden'}>
          <Inventory openTag={openTag} onOpenTag={setOpenTag} />
        </div>
        {screen === 'import' && <ImportScreen onDone={() => setScreen('inventory')} />}
        {screen === 'ask' && <Ask onOpen={showInInventory} />}
        {screen === 'reference' && <Reference />}
      </main>

      {toast && (
        <div key={toast.id} role="status" className="pop-in fixed bottom-5 left-1/2 z-[60] flex max-w-[92%] -translate-x-1/2 items-center gap-3 rounded-md bg-ink py-2 pr-2 pl-4 text-sheet shadow-lg">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              className="h-7 rounded px-2 font-semibold text-[#9fdcea] hover:bg-white/10"
              onClick={() => {
                toast.undo!()
                dismissToast()
              }}
            >
              Undo
            </button>
          )}
          <button className="h-7 rounded px-2 text-sheet/70 hover:bg-white/10" onClick={dismissToast}>Dismiss</button>
        </div>
      )}
    </div>
  )
}
