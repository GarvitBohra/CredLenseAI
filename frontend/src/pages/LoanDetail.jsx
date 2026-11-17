import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import { money, pct } from '../lib/utils'
import { Card, CardHeader, RiskBadge, Skeleton } from '../components/ui'
import RiskGauge from '../components/RiskGauge'
import ShapBars from '../components/ShapBars'

export default function LoanDetail() {
  const { id } = useParams()
  const { data: l, isLoading, isError, error } = useQuery({ queryKey: ['loan', id], queryFn: () => api(`/portfolio/loans/${id}`) })

  if (isError) return <Card className="p-6 text-sm text-red-600">{error.message}</Card>
  if (isLoading) return <Skeleton className="h-96" />

  const details = [
    ['Age', l.age], ['Annual income', money(l.income)], ['Loan amount', money(l.loan_amount)],
    ['Interest rate', `${l.interest_rate}%`], ['Debt-to-income', `${l.debt_to_income}%`],
    ['Credit utilization', `${l.credit_utilization}%`], ['Past delinquencies', l.past_delinquencies],
    ['Credit history', `${l.credit_history_years} yrs`],
  ]

  return (
    <>
      <Link to="/loans" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft size={15} />Back to loans</Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{l.borrower_name || `Loan #${l.id}`}</h1>
        <RiskBadge band={l.risk_band} />
        <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium dark:bg-slate-800">Suggestion: {l.decision}</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Risk score" />
          <div className="p-5"><RiskGauge probability={l.default_probability} band={l.risk_band} />
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-5 text-sm dark:border-slate-800">
              {details.map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            </dl>
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Why this score?" subtitle={`Predicted default probability ${pct(l.default_probability)}`} />
          <div className="p-5">{l.explanation?.length ? <ShapBars factors={l.explanation} /> : <p className="text-sm text-slate-500">No explanation stored.</p>}</div>
        </Card>
      </div>
    </>
  )
}
