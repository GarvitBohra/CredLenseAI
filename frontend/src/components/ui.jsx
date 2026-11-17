import { cn } from '../lib/utils'

export const Card = ({ className, children, ...p }) => (
  <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900', className)} {...p}>
    {children}
  </div>
)

export const CardHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    {action}
  </div>
)

export function Button({ variant = 'primary', className, ...p }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  }
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60', styles[variant], className)}
      {...p}
    />
  )
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span>
        : hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export const Input = ({ className, ...p }) => (
  <input
    className={cn('w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100', className)}
    {...p}
  />
)

const BADGE = {
  Low: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
  High: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400',
}
export const RiskBadge = ({ band }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', BADGE[band])}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {band}
  </span>
)

export const Skeleton = ({ className }) => <div className={cn('skeleton', className)} />

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    {Icon && <div className="mb-3 rounded-full bg-brand-50 p-3 text-brand-600 dark:bg-brand-500/10"><Icon size={22} /></div>}
    <p className="text-sm font-semibold">{title}</p>
    <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
)

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    {action}
  </div>
)
