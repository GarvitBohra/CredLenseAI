import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, UserSearch, Landmark, Upload, LogOut, Moon, Sun, Search, Menu, X, ScanSearch } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { cn } from '../lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/assess', label: 'Assess Borrower', icon: UserSearch },
  { to: '/loans', label: 'Loans', icon: Landmark },
  { to: '/upload', label: 'Upload CSV', icon: Upload },
]

export const Logo = ({ light }) => (
  <div className="flex items-center gap-2.5">
    <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><ScanSearch size={18} /></div>
    <span className={cn('text-lg font-semibold tracking-tight', light && 'text-white')}>
      CredLens<span className="text-brand-500">AI</span>
    </span>
  </div>
)

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [q, setQ] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch {}
  }, [dark])

  const search = (e) => {
    e.preventDefault()
    nav(`/loans?q=${encodeURIComponent(q)}`)
  }

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-navy-900 text-slate-300">
      <div className="flex h-16 items-center justify-between px-5"><Logo light /></div>
      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              isActive ? 'bg-brand-600 text-white' : 'hover:bg-white/5 hover:text-white')}>
            <Icon size={18} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-xl bg-white/5 p-4 text-xs">
        <p className="font-semibold text-white">Explainable by design</p>
        <p className="mt-1 text-slate-400">Every score shows the top factors behind it.</p>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="relative">{sidebar}
            <button className="absolute right-3 top-4 text-white" onClick={() => setOpen(false)}><X size={20} /></button>
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setOpen(false)} />
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 sm:px-8">
          <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <form onSubmit={search} className="relative hidden max-w-sm flex-1 sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search borrowers…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-900" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-100 sm:inline">{user?.org}</span>
            <button aria-label="Toggle theme" onClick={() => setDark(!dark)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-800">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {(user?.name || user?.email || '?')[0].toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium md:block">{user?.name}</span>
              <button aria-label="Log out" onClick={() => { logout(); nav('/login') }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </header>
        <main className="fade-in mx-auto max-w-7xl p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
