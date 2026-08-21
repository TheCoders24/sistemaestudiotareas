interface ForgettingCurveProps {
  retention: number
  interval: number
  reviews: number
  easeFactor: number
}

export default function ForgettingCurve({ retention, interval, reviews }: ForgettingCurveProps) {
  const width = 400
  const height = 200
  const padding = { top: 20, right: 20, bottom: 30, left: 45 }
  const graphW = width - padding.left - padding.right
  const graphH = height - padding.top - padding.bottom

  const maxDays = 30
  const stability = Math.max(interval, 1)

  const points: string[] = []
  for (let i = 0; i <= maxDays; i++) {
    const x = padding.left + (i / maxDays) * graphW
    const y = padding.top + (1 - Math.exp(-i / stability) * (retention / 100)) * graphH
    points.push(`${x},${y}`)
  }

  const reviewPoints: { x: number; y: number }[] = []
  for (let r = 0; r < Math.min(reviews, 5); r++) {
    const day = Math.round((r / Math.max(reviews - 1, 1)) * maxDays)
    const ret = Math.exp(-day / stability) * (retention / 100)
    reviewPoints.push({
      x: padding.left + (day / maxDays) * graphW,
      y: padding.top + (1 - ret) * graphH,
    })
  }

  const currentDay = Math.min(interval, maxDays)
  const currentRet = Math.exp(-currentDay / stability) * (retention / 100)
  const currentX = padding.left + (currentDay / maxDays) * graphW
  const currentY = padding.top + (1 - currentRet) * graphH

  const dangerY = padding.top + (1 - 0.5) * graphH

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <rect x={padding.left} y={dangerY} width={graphW} height={height - padding.bottom - dangerY} fill="#ef4444" opacity={0.08} />
        <line x1={padding.left} y1={dangerY} x2={padding.left + graphW} y2={dangerY} stroke="#ef4444" strokeDasharray="4,4" opacity={0.4} />
        <text x={padding.left + 4} y={dangerY - 4} fill="#ef4444" fontSize={9} opacity={0.7}>50%</text>

        {[0, 25, 50, 75, 100].map(v => {
          const y = padding.top + (1 - v / 100) * graphH
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={padding.left + graphW} y2={y} stroke="currentColor" opacity={0.08} />
              <text x={padding.left - 4} y={y + 3} textAnchor="end" fill="currentColor" opacity={0.5} fontSize={9}>{v}%</text>
            </g>
          )
        })}

        {[0, 7, 14, 21, 30].map(d => {
          const x = padding.left + (d / maxDays) * graphW
          return (
            <g key={d}>
              <line x1={x} y1={padding.top} x2={x} y2={padding.top + graphH} stroke="currentColor" opacity={0.08} />
              <text x={x} y={height - 5} textAnchor="middle" fill="currentColor" opacity={0.5} fontSize={9}>{d}d</text>
            </g>
          )
        })}

        <path d={`M ${points.join(' L ')} L ${padding.left + graphW},${padding.top + graphH} L ${padding.left},${padding.top + graphH} Z`} fill="url(#curveGrad)" />
        <polyline points={points.join(' ')} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {reviewPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="#f97316" stroke="white" strokeWidth={1.5} />
        ))}

        <circle cx={currentX} cy={currentY} r={6} fill="#22c55e" stroke="white" strokeWidth={2}>
          <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
        </circle>

        <text x={padding.left + graphW / 2} y={height - 1} textAnchor="middle" fill="currentColor" opacity={0.6} fontSize={10}>Días</text>
        <text x={8} y={padding.top + graphH / 2} textAnchor="middle" fill="currentColor" opacity={0.6} fontSize={10} transform={`rotate(-90, 8, ${padding.top + graphH / 2})`}>Retención</text>
      </svg>
    </div>
  )
}
