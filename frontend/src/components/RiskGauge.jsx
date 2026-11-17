import { RISK_COLORS } from '../lib/utils'

export default function RiskGauge({ probability, band }) {
  const r = 70, c = 2 * Math.PI * r
  const arc = c * 0.75 // 270 degree gauge
  const filled = arc * Math.min(Math.max(probability, 0), 1)
  const color = RISK_COLORS[band]
  return (
    <div className="relative mx-auto h-52 w-52">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-[225deg]">
        <circle cx="90" cy="90" r={r} fill="none" strokeWidth="14" strokeLinecap="round"
          className="stroke-slate-100 dark:stroke-slate-800" strokeDasharray={`${arc} ${c}`} />
        <circle cx="90" cy="90" r={r} fill="none" strokeWidth="14" strokeLinecap="round"
          stroke={color} strokeDasharray={`${filled} ${c}`} style={{ transition: 'stroke-dasharray .8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight" style={{ color }}>{(probability * 100).toFixed(1)}%</span>
        <span className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Default probability</span>
      </div>
    </div>
  )
}
