import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck, Sparkles, LineChart, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Button, Field, Input } from '../components/ui'
import { Logo } from '../components/Layout'

const FEATURES = [
  { icon: ShieldCheck, title: 'Reduce default risk', text: 'Score borrowers before you lend, not after.' },
  { icon: Sparkles, title: 'Explainable AI', text: 'See exactly why a borrower is flagged as risky.' },
  { icon: LineChart, title: 'Portfolio monitoring', text: 'Track exposure and catch emerging risk early.' },
]

export default function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('demo@credlens.ai')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try { await login(email, password); nav('/') }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
        <Logo light />
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Lend smarter with<br />explainable credit risk AI.
          </h1>
          <p className="mt-4 max-w-md text-slate-300">
            CredLensAI helps banks, NBFCs and fintech lenders predict defaults and understand every decision.
          </p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10"><Icon size={20} /></div>
                <div><p className="font-semibold">{title}</p><p className="text-sm text-slate-400">{text}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} CredLensAI. Demo project with synthetic data.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your lender workspace.</p>
          </div>
          <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}Sign in
          </Button>
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            Demo login is pre-filled: <b>demo@credlens.ai</b> / <b>demo123</b>
          </p>
        </form>
      </div>
    </div>
  )
}
