import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, Eye, XCircle, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, RiskBadge } from '../components/ui'
import RiskGauge from '../components/RiskGauge'
import ShapBars from '../components/ShapBars'

const FIELDS = [
  { key: 'age', label: 'Age', min: 18, max: 100, step: 1 },
  { key: 'income', label: 'Annual income ($)', min: 1, step: 1000 },
  { key: 'loan_amount', label: 'Loan amount ($)', min: 1, step: 500 },
  { key: 'interest_rate', label: 'Interest rate (%)', min: 0, max: 60, step: 0.1 },
  { key: 'debt_to_income', label: 'Debt-to-income (%)', min: 0, max: 200, step: 0.5 },
  { key: 'credit_utilization', label: 'Credit utilization (%)', min: 0, max: 100, step: 1 },
  { key: 'past_delinquencies', label: 'Past delinquencies', min: 0, step: 1 },
  { key: 'credit_history_years', label: 'Credit history (years)', min: 0, step: 0.5 },
]
const SAMPLE = { borrower_name: 'Sample Borrower', age: 34, income: 62000, loan_amount: 24000, interest_rate: 13.5,
  debt_to_income: 42, credit_utilization: 72, past_delinquencies: 2, credit_history_years: 6 }

const DECISION = {
  Approve: { icon: CheckCircle2, cls: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' },
  Review: { icon: Eye, cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  Reject: { icon: XCircle, cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
}

export default function Assess() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ borrower_name: '', age: '', income: '', loan_amount: '', interest_rate: '',
    debt_to_income: '', credit_utilization: '', past_delinquencies: '', credit_history_years: '' })
  const [errors, setErrors] = useState({})
  const [save, setSave] = useState(true)

  const mut = useMutation({
    mutationFn: (body) => api(`/predict?save=${save}`, { method: 'POST', body }),
    onSuccess: () => {
      if (save) { qc.invalidateQueries({ queryKey: ['summary'] }); qc.invalidateQueries({ queryKey: ['loans'] }); qc.invalidateQueries({ queryKey: ['alerts'] }) }
      toast.success(save ? 'Assessment complete and saved to portfolio' : 'Assessment complete')
    },
    onError: (e) => toast.error(e.message),
  })

  const validate = () => {
    const errs = {}
    for (const f of FIELDS) {
      const v = form[f.key]
      if (v === '' || Number.isNaN(Number(v))) errs[f.key] = 'Required'
      else if (f.min !== undefined && Number(v) < f.min) errs[f.key] = `Min ${f.min}`
      else if (f.max !== undefined && Number(v) > f.max) errs[f.key] = `Max ${f.max}`
    }
    setErrors(errs)
    return !Object.keys(errs).length
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const body = { borrower_name: form.borrower_name }
    FIELDS.forEach((f) => { body[f.key] = Number(form[f.key]) })
    mut.mutate(body)
  }

  const r = mut.data
  const D = r && DECISION[r.decision]

  return (
    <>
      <PageHeader title="Assess a borrower" subtitle="Enter borrower details to get a default probability and the reasons behind it." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Borrower details"
            action={<button type="button" onClick={() => { setForm(SAMPLE); setErrors({}) }}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"><Sparkles size={13} />Fill sample</button>} />
          <form onSubmit={submit} className="space-y-4 p-5" noValidate>
            <Field label="Borrower name (optional)">
              <Input value={form.borrower_name} onChange={(e) => setForm({ ...form, borrower_name: e.target.value })} placeholder="e.g. Priya Sharma" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              {FIELDS.map((f) => (
                <Field key={f.key} label={f.label} error={errors[f.key]}>
                  <Input type="number" step={f.step} value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} aria-invalid={!!errors[f.key]} />
                </Field>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="rounded accent-brand-600" />
              Save this loan to my portfolio
            </label>
            <Button type="submit" disabled={mut.isPending} className="w-full">
              {mut.isPending && <Loader2 size={16} className="animate-spin" />}Calculate risk
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Risk assessment" subtitle="Model output and explanation" />
          {!r ? (
            <EmptyState icon={Sparkles} title="No assessment yet" text="Fill in the borrower details and click Calculate risk to see the prediction and explanation here." />
          ) : (
            <div className="fade-in p-5">
              <div className="grid items-center gap-6 sm:grid-cols-2">
                <RiskGauge probability={r.default_probability} band={r.risk_band} />
                <div className="space-y-3 text-center sm:text-left">
                  <div><p className="text-xs uppercase tracking-wide text-slate-500">Risk band</p><div className="mt-1"><RiskBadge band={r.risk_band} /></div></div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Suggestion</p>
                    <div className={`mt-1 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${D.cls}`}><D.icon size={16} />{r.decision}</div>
                  </div>
                </div>
              </div>
              <h4 className="mb-4 mt-8 text-sm font-semibold">Top factors behind this score</h4>
              <ShapBars factors={r.factors} />
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
