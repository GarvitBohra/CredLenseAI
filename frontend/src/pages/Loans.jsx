import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, Landmark } from 'lucide-react'
import { api } from '../lib/api'
import { money, pct } from '../lib/utils'
import { Button, Card, EmptyState, PageHeader, RiskBadge, Skeleton } from '../components/ui'

const BANDS = ['All', 'High', 'Medium', 'Low']

export default function Loans() {
  const [params, setParams] = useSearchParams()
  const risk = params.get('risk') || 'All'
  const q = params.get('q') || ''
  const [sort, setSort] = useState({ key: 'default_probability', dir: -1 })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['loans', risk, q],
    queryFn: () => api(`/portfolio/loans?limit=300${risk !== 'All' ? `&risk=${risk}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  })

  const rows = useMemo(() => [...(data || [])].sort((a, b) => {
    const x = a[sort.key], y = b[sort.key]
    return (x > y ? 1 : x < y ? -1 : 0) * sort.dir
  }), [data, sort])

  const th = (key, label) => (
    <th className="px-5 py-3">
      <button onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }))} className="inline-flex items-center gap-1 uppercase hover:text-slate-900 dark:hover:text-white">
        {label}<ArrowUpDown size={12} />
      </button>
    </th>
  )

  return (
    <>
      <PageHeader title="Loans" subtitle={q ? `Search results for “${q}”` : 'All loans in your portfolio.'} />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          {BANDS.map((b) => (
            <button key={b} onClick={() => setParams(b === 'All' ? (q ? { q } : {}) : { risk: b, ...(q && { q }) })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${risk === b ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
              {b}
            </button>
          ))}
          {q && <Button variant="ghost" className="ml-auto !py-1" onClick={() => setParams(risk === 'All' ? {} : { risk })}>Clear search</Button>}
        </div>
        {isError ? <p className="p-6 text-sm text-red-600">{error.message}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs tracking-wide text-slate-500">
                <tr>{th('borrower_name', 'Borrower')}{th('loan_amount', 'Amount')}{th('income', 'Income')}{th('default_probability', 'Probability')}{th('risk_band', 'Risk')}<th className="px-5 py-3 uppercase">Decision</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={6} className="px-5 py-3"><Skeleton className="h-5" /></td></tr>)
                  : rows.map((l) => (
                    <tr key={l.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3"><Link to={`/loans/${l.id}`} className="font-medium hover:text-brand-600">{l.borrower_name || `Loan #${l.id}`}</Link></td>
                      <td className="px-5 py-3">{money(l.loan_amount)}</td>
                      <td className="px-5 py-3">{money(l.income)}</td>
                      <td className="px-5 py-3">{pct(l.default_probability)}</td>
                      <td className="px-5 py-3"><RiskBadge band={l.risk_band} /></td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{l.decision}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!isLoading && !rows.length && <EmptyState icon={Landmark} title="No loans found" text="Try a different filter or upload a CSV of loans." />}
          </div>
        )}
      </Card>
    </>
  )
}
