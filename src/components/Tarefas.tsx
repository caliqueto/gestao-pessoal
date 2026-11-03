import { useState, type FormEvent } from 'react'
import { hojeISO, somarDias } from '../lib/datas'
import { rotuloData, useTarefas, type Tarefa } from '../lib/agenda'
import { useAviso } from './Aviso'

/** Lista de tarefas. No modo compacto (Hoje) mostra só as de hoje e as atrasadas. */
export default function Tarefas({ compacto = false }: { compacto?: boolean }) {
  const { pendentes, feitas, carregando, criar, alternar, apagar } = useTarefas()
  const [titulo, setTitulo] = useState('')
  const [quando, setQuando] = useState<'sem' | 'hoje' | 'amanha' | 'outro'>(compacto ? 'hoje' : 'sem')
  const [outro, setOutro] = useState(somarDias(hojeISO(), 2))
  const avisar = useAviso()
  const hoje = hojeISO()

  const lista = compacto ? pendentes.filter((t) => t.data && t.data <= hoje) : pendentes
  const futuras = compacto ? pendentes.filter((t) => !t.data || t.data > hoje).length : 0

  async function adicionar(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    const data = quando === 'sem' ? null : quando === 'hoje' ? hoje : quando === 'amanha' ? somarDias(hoje, 1) : outro
    if (await criar(titulo, data)) setTitulo('')
    else avisar('Não salvou a tarefa. Tente de novo.')
  }

  const item = (t: Tarefa) => {
    const rot = rotuloData(t.data, hoje)
    return (
      <li key={t.id} className={t.feita ? 'feita' : ''}>
        <button className="check" aria-pressed={t.feita} aria-label={t.feita ? `Desmarcar ${t.titulo}` : `Concluir ${t.titulo}`}
          onClick={() => alternar(t)}>{t.feita ? '✓' : ''}</button>
        <span className="desc">{t.titulo}</span>
        {rot && !t.feita && <span className={`quando ${rot === 'Atrasada' ? 'atrasada' : ''}`}>{rot}</span>}
        {!compacto && <button className="apagar" aria-label={`Apagar ${t.titulo}`} onClick={() => apagar(t)}>×</button>}
      </li>
    )
  }

  return (
    <div className="tarefas">
      <form className="nova-tarefa" onSubmit={adicionar}>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={compacto ? 'Nova tarefa para hoje' : 'Nova tarefa'} aria-label="Nova tarefa" />
        <button className="botao sec" disabled={!titulo.trim()}>Adicionar</button>
      </form>
      {!compacto && (
        <div className="quando-escolha" role="group" aria-label="Quando">
          {([['sem', 'Sem data'], ['hoje', 'Hoje'], ['amanha', 'Amanhã'], ['outro', 'Outro dia']] as const).map(([v, n]) => (
            <button key={v} type="button" aria-pressed={quando === v} onClick={() => setQuando(v)}>{n}</button>
          ))}
          {quando === 'outro' && <input type="date" aria-label="Data da tarefa" value={outro} min={hoje} onChange={(e) => setOutro(e.target.value || outro)} />}
        </div>
      )}

      {!carregando && lista.length === 0 && (
        <p className="vazio" style={{ marginTop: 10 }}>{compacto ? 'Nenhuma tarefa para hoje.' : 'Nenhuma tarefa pendente.'}</p>
      )}
      <ul className="lista-tarefas">{lista.map(item)}</ul>
      {compacto && futuras > 0 && <p className="miudo">Mais {futuras} {futuras === 1 ? 'tarefa' : 'tarefas'} para outros dias na aba Rotina.</p>}

      {!compacto && feitas.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary><h3 className="sub-h">Concluídas recentes ({feitas.length})</h3></summary>
          <ul className="lista-tarefas">{feitas.map(item)}</ul>
        </details>
      )}
    </div>
  )
}
