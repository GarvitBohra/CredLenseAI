import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react'
import { api } from '../lib/api'
import { Button, Card, CardHeader, PageHeader } from '../components/ui'

const COLUMNS = 'borrower_name,age,income,loan_amount,interest_rate,debt_to_income,credit_utilization,past_delinquencies,credit_history_years'
const TEMPLATE = `${COLUMNS}\nJane Doe,34,62000,24000,13.5,42,72,2,6\nJohn Smith,45,95000,30000,9.5,25,30,0,15\n`

export default function Upload() {
  const qc = useQueryClient()
  const input = useRef()
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)

  const mut = useMutation({
    mutationFn: () => { const form = new FormData(); form.append('file', file); return api('/portfolio/upload', { method: 'POST', form }) },
    onSuccess: (r) => {
      ['summary', 'loans', 'alerts'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
      toast.success(`Scored and imported ${r.imported} loans`)
    },
    onError: (e) => toast.error(e.message),
  })

  const pick = (f) => {
    if (f && !f.name.toLowerCase().endsWith('.csv')) return toast.error('Please choose a .csv file')
    setFile(f); mut.reset()
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'credlens_template.csv' })
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader title="Upload loans" subtitle="Score a whole batch of loans from a CSV file (max 5,000 rows)."
        action={<Button variant="outline" onClick={download}><Download size={16} />Download template</Button>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="CSV file" />
          <div className="p-5">
            <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]) }}
              onClick={() => input.current.click()}
              className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${drag ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-300 hover:border-brand-500 dark:border-slate-700'}`}>
              <input ref={input} type="file" accept=".csv" hidden onChange={(e) => pick(e.target.files[0])} />
              {file ? <FileSpreadsheet size={32} className="text-brand-600" /> : <UploadCloud size={32} className="text-slate-400" />}
              <p className="mt-3 text-sm font-medium">{file ? file.name : 'Drag & drop a CSV here, or click to browse'}</p>
              <p className="mt-1 text-xs text-slate-500">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Only .csv files'}</p>
            </div>
            <Button className="mt-5 w-full" disabled={!file || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending && <Loader2 size={16} className="animate-spin" />}Score & import
            </Button>
            {mut.isSuccess && (
              <div className="fade-in mt-4 flex items-center gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-400">
                <CheckCircle2 size={18} />Imported {mut.data.imported} loans. <Link to="/" className="font-semibold underline">View dashboard</Link>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Required columns" />
          <ul className="space-y-1.5 p-5 font-mono text-xs text-slate-600 dark:text-slate-300">
            {COLUMNS.split(',').map((c) => <li key={c}>{c}{c === 'borrower_name' && <span className="ml-1 font-sans text-slate-400">(optional)</span>}</li>)}
          </ul>
        </Card>
      </div>
    </>
  )
}
