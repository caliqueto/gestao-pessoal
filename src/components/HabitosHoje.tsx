import { hojeISO } from '../lib/datas'
import { sequencia, tocaNoDia, type Habito } from '../lib/habitos'
import { useAviso } from './Aviso'

type Props = {
  habitos: Habito[]
  feitas: Record<string, Set<string>>
  alternar: (id: string, data: string) => Promise<boolean>
}

/** Lista dos hábitos de hoje: um toque marca, outro desmarca. */
export default function HabitosHoje({ habitos, feitas, alternar }: Props) {
  const hoje = hojeISO()
  const avisar = useAviso()
  const deHoje = habitos.filter((h) => tocaNoDia(h, hoje))
  const folga = habitos.filter((h) => !tocaNoDia(h, hoje))

  if (!habitos.length) return <p className="vazio">Nenhum hábito ainda. Crie o primeiro na aba Rotina.</p>

  const item = (h: Habito, livre: boolean) => {
    const feito = feitas[h.id]?.has(hoje) ?? false
    const seq = sequencia(h, feitas[h.id], hoje)
    return (
      <li key={h.id}>
        <button className={`marcar ${feito ? 'feito' : ''}`} aria-pressed={feito} style={{ ['--cor' as string]: h.cor }}
          onClick={async () => { if (!(await alternar(h.id, hoje))) avisar('Não salvou. Confira a internet.') }}>
          <span className="circulo" aria-hidden="true">{feito ? '✓' : ''}</span>
          <span className="nome">{h.nome}{livre && <small>hoje é folga</small>}</span>
          {seq > 0 && <span className="seq num" aria-label={`${seq} dias seguidos`}>{seq} {seq === 1 ? 'dia' : 'dias'}</span>}
        </button>
      </li>
    )
  }

  const feitosHoje = deHoje.filter((h) => feitas[h.id]?.has(hoje)).length
  return (
    <>
      {deHoje.length > 0 && <p className="miudo" style={{ margin: '-6px 0 10px' }}>{feitosHoje} de {deHoje.length} feitos</p>}
      <ul className="habitos-hoje">
        {deHoje.map((h) => item(h, false))}
        {folga.map((h) => item(h, true))}
      </ul>
    </>
  )
}
