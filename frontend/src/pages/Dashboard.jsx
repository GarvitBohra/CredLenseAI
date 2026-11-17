import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Banknote, Landmark, ShieldAlert, TrendingDown, Percent } from 'lucide-react'
import { api } from '../lib/api'
import { compactMoney, money, pct, RISK_COLORS } from '../lib/utils'
import { Card, CardHeader, EmptyState, PageHeader, RiskBadge, Skeleton, Button } from '../components/ui'

function Kpi({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
    green: 'bg-green-50 text-green-600 dark:bg-green-500/10',
  }
  return (
    <Card className="p-5 transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className={`rounded-lg p-2 ${tones[tone]}`}><Icon size={18} /></div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </Card>
  )
}

export default function Dashboard() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => api('/portfolio/summary') })
  const alerts = useQuery({ queryKey: ['alerts'], queryFn: () => api('/portfolio/alerts') })
  const top = useQuery({ queryKey: ['loans', 'High'], queryFn: () => api('/portfolio/loans?risk=high&limit=8') })

  if (summary.isError) return <Card className="p-6 text-sm text-red-600">{summary.error.message}</Card>
  const s = summary.data

  return (
    <>
      <PageHeader title="Portfolio dashboard" subtitle="Live view of risk across your loan book."
        action={<Link to="/assess"><Button>Assess a borrower</Button></Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!s ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />) : (
          <>
            <Kpi icon={Landmark} label="Total loans" value={s.total_loans.toLocaleString()} sub="Active in portfolio" />
            <Kpi icon={Banknote} label="Total exposure" value={compactMoney(s.total_exposure)} sub={`Expected loss ${compactMoney(s.expected_loss)}`} tone="amber" />
            <Kpi icon={Percent} label="Expected default rate" value={pct(s.expected_default_rate)} sub="Average predicted probability" tone="red" />
            <Kpi icon={ShieldAlert} label="High-risk loans" value={s.high_risk_count.toLocaleString()}
              sub={`${s.total_loans ? pct(s.high_risk_count / s.total_loans, 0) : '0%'} of portfolio`} tone="red" />
          </>
        )}
      </div>

      {s && s.total_loans === 0 ? (
        <Card className="mt-6"><EmptyState icon={Landmark} title="No loans yet" text="Upload a CSV or assess a borrower to populate your dashboard."
          action={<Link to="/upload"><Button>Upload CSV</Button></Link>} /></Card>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Average default risk over time" subtitle="By month loan was added" />
            <div className="h-72 p-4">
              {!s ? <Skeleton className="h-full" /> : (
                <ResponsiveContainer>
                  <AreaChart data={s.trend}>
                    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip formatter={(v) => [pct(v), 'Avg risk']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="avg_risk" stroke="#6366f1" strokeWidth={2.5} fill="url(#g)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Risk distribution" subtitle="Loans by risk band" />
            <div className="h-72 p-4">
              {!s ? <Skeleton className="h-full" /> : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={s.risk_bands} dataKey="count" nameKey="band" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                      {s.risk_bands.map((b) => <Cell key={b.band} fill={RISK_COLORS[b.band]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {s && <div className="-mt-6 flex justify-center gap-4 text-xs">
                {s.risk_bands.map((b) => (
                  <span key={b.band} className="flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-full" style={{ background: RISK_COLORS[b.band] }} />{b.band} ({b.count})
                  </span>
                ))}
              </div>}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="Highest-risk loans" subtitle="Top borrowers by default probability"
              action={<Link to="/loans?risk=High" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3">Borrower</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Probability</th><th className="px-5 py-3">Risk</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {top.isLoading ? [0, 1, 2, 3].map((i) => <tr key={i}><td colSpan={4} className="px-5 py-3"><Skeleton className="h-5" /></td></tr>)
                    : top.data?.map((l) => (
                      <tr key={l.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-5 py-3"><Link to={`/loans/${l.id}`} className="font-medium hover:text-brand-600">{l.borrower_name || `Loan #${l.id}`}</Link></td>
                        <td className="px-5 py-3">{money(l.loan_amount)}</td>
                        <td className="px-5 py-3">{pct(l.default_probability)}</td>
                        <td className="px-5 py-3"><RiskBadge band={l.risk_band} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Risk alerts" subtitle="Loans above the 35% threshold" />
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {alerts.isLoading ? <li className="p-4"><Skeleton className="h-16" /></li>
                : alerts.data?.length ? alerts.data.slice(0, 6).map((a) => (
                  <li key={a.loan_id}>
                    <Link to={`/loans/${a.loan_id}`} className="flex gap-3 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
                      <div className="text-sm"><p className="font-medium">{a.borrower_name || `Loan #${a.loan_id}`}</p>
                        <p className="text-xs text-slate-500">{pct(a.default_probability)} default probability</p></div>
                    </Link>
                  </li>
                )) : <li><EmptyState icon={TrendingDown} title="All clear" text="No loans above the alert threshold." /></li>}
            </ul>
          </Card>
        </div>
      )}
    </>
  )
}
