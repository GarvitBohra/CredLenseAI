export default function ShapBars({ factors = [] }) {
  const max = Math.max(...factors.map((f) => Math.abs(f.impact)), 0.0001)
  return (
    <div className="space-y-4">
      {factors.map((f) => {
        const up = f.impact > 0
        const w = (Math.abs(f.impact) / max) * 100
        return (
          <div key={f.feature}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{f.label}</span>
              <span className={up ? 'font-semibold text-red-600' : 'font-semibold text-green-600'}>
                {up ? '+' : ''}{f.impact.toFixed(2)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full transition-all duration-700 ${up ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${w}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{f.reason}</p>
          </div>
        )
      })}
      <div className="flex gap-4 pt-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-red-500" />Raises risk</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-green-500" />Lowers risk</span>
      </div>
    </div>
  )
}
