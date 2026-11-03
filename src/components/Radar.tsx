type Serie = { nome: string; valores: (number | null)[]; cor: string; tracejada?: boolean }

/** Gráfico de teia: um eixo por pilar, de 0 (centro) a 10 (borda). */
export default function Radar({ eixos, series }: { eixos: { nome: string; cor: string }[]; series: Serie[] }) {
  const n = eixos.length
  const L = 340, cx = L / 2, cy = L / 2, R = 108
  const ponto = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [cx + Math.cos(a) * R * (v / 10), cy + Math.sin(a) * R * (v / 10)] as const
  }
  const poligono = (vals: (number | null)[]) => vals.map((v, i) => ponto(i, v ?? 0).join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${L} ${L}`} className="radar" role="img"
      aria-label={series.map((s) => `${s.nome}: ${eixos.map((e, i) => `${e.nome} ${s.valores[i] ?? 'sem nota'}`).join(', ')}`).join('. ')}>
      {[2.5, 5, 7.5, 10].map((r) => (
        <polygon key={r} points={eixos.map((_, i) => ponto(i, r).join(',')).join(' ')} fill="none" stroke="var(--linha)" strokeWidth="1" />
      ))}
      {eixos.map((_, i) => { const [x, y] = ponto(i, 10); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--linha)" /> })}
      {series.map((s) => s.valores.some((v) => v != null) && (
        <g key={s.nome}>
          <polygon points={poligono(s.valores)} fill={s.tracejada ? 'none' : s.cor} fillOpacity={s.tracejada ? 0 : 0.18}
            stroke={s.cor} strokeWidth={s.tracejada ? 1.5 : 2} strokeDasharray={s.tracejada ? '5 4' : undefined} strokeLinejoin="round" />
          {!s.tracejada && s.valores.map((v, i) => v != null && <circle key={i} cx={ponto(i, v)[0]} cy={ponto(i, v)[1]} r="4" fill={s.cor} />)}
        </g>
      ))}
      {eixos.map((e, i) => {
        const [x, y] = ponto(i, 12.4)
        const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end'
        const v = series[0]?.valores[i]
        return (
          <text key={e.nome} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize="12.5" fill="var(--texto)">
            {e.nome}{v != null && <tspan fill="var(--texto-2)" fontWeight="600"> {v}</tspan>}
          </text>
        )
      })}
    </svg>
  )
}
