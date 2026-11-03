import { reais } from '../lib/datas'

type Fatia = { nome: string; valor: number; cor: string }

/** Gráfico de pizza (rosca) dos gastos, com o total no meio e legenda com valores. */
export default function Rosca({ fatias, total }: { fatias: Fatia[]; total: number }) {
  const r = 70, c = 2 * Math.PI * r
  let andado = 0
  const visiveis = fatias.filter((f) => f.valor > 0).sort((a, b) => b.valor - a.valor)

  return (
    <div className="rosca">
      <svg viewBox="0 0 180 180" role="img" aria-label={`Gastos do mês: ${reais(total)}`}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--superficie-2)" strokeWidth="22" />
        {visiveis.map((f) => {
          const parte = (f.valor / total) * c
          const el = (
            <circle key={f.nome} cx="90" cy="90" r={r} fill="none" stroke={f.cor} strokeWidth="22"
              strokeDasharray={`${Math.max(parte - 1.5, 0.5)} ${c}`} strokeDashoffset={-andado} transform="rotate(-90 90 90)" />
          )
          andado += parte
          return el
        })}
        <text x="90" y="86" textAnchor="middle" fontSize="12" fill="var(--texto-2)">gastos</text>
        <text x="90" y="106" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--texto)" className="num">
          {reais(total).replace(',00', '')}
        </text>
      </svg>
      <ul className="legenda">
        {visiveis.map((f) => (
          <li key={f.nome}>
            <span className="bolinha" style={{ background: f.cor }} />
            <span className="nome">{f.nome}</span>
            <span className="num">{reais(f.valor)}</span>
            <span className="pct num">{Math.round((f.valor / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
