import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useConta } from '../lib/conta'
import { useAviso } from '../components/Aviso'
import { deISO, diasNoMes, duracao, hojeISO, iso, inicioSemana, mesAtual, nomeDia, nomeMes, somarDias, somarMeses } from '../lib/datas'
import { aproveitamentoMes, DIAS, descreverDias, sequencia, tocaNoDia, useHabitos, type Habito } from '../lib/habitos'
import { salvarSessao, useEstudos } from '../lib/estudos'
import Cronometro from '../components/Cronometro'
import HabitosHoje from '../components/HabitosHoje'

const CORES = ['#7c9cff', '#4ade80', '#f472b6', '#fb923c', '#facc15', '#a78bfa', '#38bdf8']

export default function Rotina() {
  const hab = useHabitos()
  return (
    <>
      <h1>Rotina</h1>
      <p className="sub">Estudos e hábitos. A agenda com blocos da semana chega na Fase 3.</p>
      {hab.erro && <p className="aviso erro">{hab.erro}</p>}
      <div className="grade">
        <Estudos />
        <section className="bloco largo">
          <h2>Hábitos de hoje</h2>
          {!hab.carregando && <HabitosHoje habitos={hab.habitos} feitas={hab.feitas} alternar={hab.alternar} />}
        </section>
        <Habitos {...hab} />
      </div>
    </>
  )
}

/* ---------------- Estudos ---------------- */
function Estudos() {
  const [semana, setSemana] = useState(inicioSemana(hojeISO()))
  const { sessoes, porDia, totalMin, recarregar } = useEstudos(semana)
  const { prefs, salvarPrefs } = useConta()
  const avisar = useAviso()
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [meta, setMeta] = useState(prefs.meta_horas_estudo ? String(prefs.meta_horas_estudo).replace('.', ',') : '')
  const [manual, setManual] = useState(false)
  const [m, setM] = useState({ minutos: '', data: hojeISO(), assunto: '' })

  const metaMin = (prefs.meta_horas_estudo ?? 0) * 60
  const atual = semana === inicioSemana(hojeISO())
  const maior = Math.max(...porDia.map((d) => d.minutos), metaMin / 7, 1)
  const fimSemana = somarDias(semana, 6)

  async function salvarMeta(e: FormEvent) {
    e.preventDefault()
    const v = Number(meta.replace(',', '.'))
    if (meta && !(v > 0 && v <= 80)) return avisar('Coloque entre 0,5 e 80 horas.')
    await salvarPrefs({ meta_horas_estudo: meta ? v : null })
    setEditandoMeta(false)
    avisar(meta ? `Meta: ${duracao(v * 60)} por semana.` : 'Meta removida.')
  }
  async function registrar(e: FormEvent) {
    e.preventDefault()
    const min = Number(m.minutos)
    if (!(min >= 1)) return avisar('Coloque quantos minutos estudou.')
    const inicio = deISO(m.data); inicio.setHours(12)
    const { error } = await salvarSessao(inicio, min, m.assunto)
    if (error) return avisar('Não salvou. Tente de novo.')
    avisar(`${duracao(min)} registrados em ${nomeDia(m.data).toLowerCase()}.`)
    setM({ minutos: '', data: hojeISO(), assunto: '' }); setManual(false); recarregar()
  }
  async function apagar(id: string) {
    if (!confirm('Apagar esta sessão de estudo?')) return
    await supabase.from('sessoes_estudo').delete().eq('id', id)
    recarregar()
  }

  const pct = metaMin ? Math.min(totalMin / metaMin, 1) : 0
  const faltam = Math.max(metaMin - totalMin, 0)

  return (
    <section className="bloco largo estudos">
      <div className="cabeca" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Estudos</h2>
        <div className="seletor-mes">
          <button aria-label="Semana anterior" onClick={() => setSemana(somarDias(semana, -7))}>‹</button>
          <span>{atual ? 'Esta semana' : `${semana.slice(8)}/${semana.slice(5, 7)} a ${fimSemana.slice(8)}/${fimSemana.slice(5, 7)}`}</span>
          <button aria-label="Próxima semana" disabled={atual} onClick={() => setSemana(somarDias(semana, 7))}>›</button>
        </div>
      </div>

      {atual && <Cronometro salvo={recarregar} />}

      <div className="meta-estudo">
        <div className="total">
          <span className="num grande">{duracao(totalMin)}</span>
          {metaMin > 0 && <span className="de"> de {duracao(metaMin)}</span>}
        </div>
        {metaMin > 0 ? (
          <>
            <div className="barra meta"><div style={{ width: `${pct * 100}%` }} /></div>
            <p className="miudo" style={{ marginTop: 6 }}>
              {faltam === 0 ? 'Meta da semana batida.' : atual ? `Faltam ${duracao(faltam)}.` : `Ficaram faltando ${duracao(faltam)}.`}
            </p>
          </>
        ) : <p className="miudo" style={{ marginTop: 4 }}>Defina uma meta de horas por semana para acompanhar o progresso.</p>}
      </div>

      <div className="barras-semana" role="img" aria-label={`Minutos estudados por dia: ${porDia.map((d) => `${DIAS[deISO(d.data).getDay()]} ${d.minutos}`).join(', ')}`}>
        {porDia.map((d) => {
          const hoje = d.data === hojeISO()
          return (
            <div key={d.data} className={`coluna ${hoje ? 'hoje' : ''}`}>
              <span className="valor num">{d.minutos ? duracao(d.minutos) : ''}</span>
              <div className="trilho">
                {metaMin > 0 && <div className="linha-meta" style={{ bottom: `${(metaMin / 7 / maior) * 100}%` }} />}
                <div className="enche" style={{ height: `${(d.minutos / maior) * 100}%` }} />
              </div>
              <span className="dia">{DIAS[deISO(d.data).getDay()]}</span>
            </div>
          )
        })}
      </div>
      {metaMin > 0 && <p className="miudo" style={{ marginTop: 4 }}>A linha mostra o ritmo da meta: {duracao(metaMin / 7)} por dia.</p>}

      {sessoes.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary><h3 className="sub-h">Sessões da semana ({sessoes.length})</h3></summary>
          <ul className="lancamentos">
            {sessoes.map((s) => (
              <li key={s.id}>
                <span className="desc">{s.assunto || 'Estudo'}<small>{nomeDia(iso(new Date(s.inicio)))}</small></span>
                <span className="num">{duracao(s.minutos)}</span>
                <button className="apagar" aria-label="Apagar sessão" onClick={() => apagar(s.id)}>×</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="acoes" style={{ marginTop: 14 }}>
        {!editandoMeta && <button className="botao sec" onClick={() => setEditandoMeta(true)}>{metaMin ? 'Mudar meta' : 'Definir meta semanal'}</button>}
        {!manual && <button className="botao sec" onClick={() => setManual(true)}>Registrar sem cronômetro</button>}
      </div>

      {editandoMeta && (
        <form onSubmit={salvarMeta} className="form-compacto linha-form">
          <div className="campo"><label htmlFor="meta-h">Horas por semana</label>
            <input id="meta-h" inputMode="decimal" placeholder="Ex.: 5" value={meta} onChange={(e) => setMeta(e.target.value)} /></div>
          <div className="acoes"><button className="botao">Salvar meta</button><button type="button" className="botao sec" onClick={() => setEditandoMeta(false)}>Cancelar</button></div>
        </form>
      )}
      {manual && (
        <form onSubmit={registrar} className="form-compacto">
          <div className="duas">
            <div className="campo"><label htmlFor="mn-min">Minutos</label>
              <input id="mn-min" type="number" min={1} inputMode="numeric" required value={m.minutos} onChange={(e) => setM({ ...m, minutos: e.target.value })} /></div>
            <div className="campo"><label htmlFor="mn-data">Dia</label>
              <input id="mn-data" type="date" max={hojeISO()} value={m.data} onChange={(e) => setM({ ...m, data: e.target.value || hojeISO() })} /></div>
          </div>
          <div className="campo"><label htmlFor="mn-ass">Assunto (opcional)</label>
            <input id="mn-ass" value={m.assunto} onChange={(e) => setM({ ...m, assunto: e.target.value })} placeholder="Ex.: aula 3 da mentoria" /></div>
          <div className="acoes"><button className="botao">Registrar</button><button type="button" className="botao sec" onClick={() => setManual(false)}>Cancelar</button></div>
        </form>
      )}
    </section>
  )
}

/* ---------------- Hábitos ---------------- */
type HabProps = ReturnType<typeof useHabitos>

function Habitos({ habitos, feitas, alternar, recarregar, carregando }: HabProps) {
  const [mes, setMes] = useState(mesAtual())
  const [novo, setNovo] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const avisar = useAviso()

  return (
    <section className="bloco largo">
      <div className="cabeca" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Hábitos</h2>
        <div className="seletor-mes">
          <button aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>‹</button>
          <span>{nomeMes(mes)}</span>
          <button aria-label="Próximo mês" disabled={mes >= mesAtual()} onClick={() => setMes(somarMeses(mes, 1))}>›</button>
        </div>
      </div>
      <p className="miudo" style={{ marginTop: -4 }}>Toque num dia do calendário para marcar ou desmarcar um dia que passou.</p>

      {!carregando && habitos.length === 0 && <p className="vazio" style={{ marginTop: 12 }}>Crie um hábito para começar. Comece com poucos: dois ou três já fazem diferença.</p>}

      <div className="lista-habitos">
        {habitos.map((h) => editando === h.id
          ? <FormHabito key={h.id} habito={h} fechar={() => setEditando(null)} mudou={recarregar} avisar={avisar} />
          : <CartaoHabito key={h.id} h={h} feitas={feitas[h.id]} mes={mes} alternar={alternar} editar={() => setEditando(h.id)} avisar={avisar} />)}
      </div>

      {novo
        ? <FormHabito fechar={() => setNovo(false)} mudou={recarregar} avisar={avisar} total={habitos.length} />
        : <button className="botao sec" style={{ marginTop: 14 }} onClick={() => setNovo(true)}>Novo hábito</button>}
    </section>
  )
}

function CartaoHabito({ h, feitas, mes, alternar, editar, avisar }: {
  h: Habito; feitas?: Set<string>; mes: string; alternar: HabProps['alternar']; editar: () => void; avisar: (m: string) => void
}) {
  const hoje = hojeISO()
  const seq = sequencia(h, feitas, hoje)
  const ap = aproveitamentoMes(h, feitas, mes, hoje)
  const vazios = (deISO(`${mes}-01`).getDay() + 6) % 7 // calendário começa na segunda
  const dias = Array.from({ length: diasNoMes(mes) }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)

  return (
    <article className="cartao-habito" style={{ ['--cor' as string]: h.cor }}>
      <div className="hab-topo">
        <div>
          <h3><span className="bolinha" style={{ background: h.cor }} /> {h.nome}</h3>
          <div className="miudo" style={{ margin: 0 }}>{descreverDias(h.dias_semana)}</div>
        </div>
        <button className="link" onClick={editar}>Editar</button>
      </div>
      <dl className="numeros hab-numeros">
        <div><dt>Sequência</dt><dd className="num">{seq} {seq === 1 ? 'dia' : 'dias'}</dd></div>
        <div><dt>No mês</dt><dd className="num">{ap.pct == null ? '–' : `${Math.round(ap.pct * 100)}%`} <span className="de">{ap.previstos ? `${ap.feitos} de ${ap.previstos}` : ''}</span></dd></div>
      </dl>
      <div className="calendario" role="group" aria-label={`Calendário de ${h.nome} em ${nomeMes(mes)}`}>
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => <span key={i} className="cab">{d}</span>)}
        {Array.from({ length: vazios }, (_, i) => <span key={`v${i}`} />)}
        {dias.map((d) => {
          const feito = feitas?.has(d) ?? false
          const futuro = d > hoje
          const previsto = tocaNoDia(h, d)
          const estado = feito ? 'feito' : futuro ? 'futuro' : !previsto ? 'folga' : d === hoje ? 'hoje' : d < h.criado_em.slice(0, 10) ? 'folga' : 'falhou'
          return (
            <button key={d} className={`quad ${estado} ${d === hoje ? 'eh-hoje' : ''}`} disabled={futuro}
              aria-pressed={feito} aria-label={`${Number(d.slice(8))}: ${feito ? 'feito' : estado === 'falhou' ? 'não feito' : estado === 'folga' ? 'folga' : 'a fazer'}`}
              onClick={async () => { if (!(await alternar(h.id, d))) avisar('Não salvou. Confira a internet.') }}>
              {Number(d.slice(8))}
            </button>
          )
        })}
      </div>
    </article>
  )
}

function FormHabito({ habito, fechar, mudou, avisar, total = 0 }: {
  habito?: Habito; fechar: () => void; mudou: () => void; avisar: (m: string) => void; total?: number
}) {
  const [nome, setNome] = useState(habito?.nome ?? '')
  const [dias, setDias] = useState<number[]>(habito?.dias_semana ?? [0, 1, 2, 3, 4, 5, 6])
  const [cor, setCor] = useState(habito?.cor ?? CORES[total % CORES.length])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!dias.length) return avisar('Escolha pelo menos um dia.')
    const dados = { nome: nome.trim(), dias_semana: [...dias].sort(), cor }
    const { error } = habito
      ? await supabase.from('habitos').update(dados).eq('id', habito.id)
      : await supabase.from('habitos').insert(dados)
    if (error) return avisar('Não foi possível salvar o hábito.')
    avisar(habito ? 'Hábito atualizado.' : `Hábito "${dados.nome}" criado.`)
    fechar(); mudou()
  }
  async function arquivar() {
    if (!habito || !confirm(`Parar de acompanhar "${habito.nome}"? O histórico fica guardado.`)) return
    await supabase.from('habitos').update({ ativo: false }).eq('id', habito.id)
    avisar('Hábito arquivado.'); fechar(); mudou()
  }
  const alternarDia = (d: number) => setDias(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d])

  return (
    <form onSubmit={salvar} className="cartao-habito form-habito">
      <div className="campo"><label htmlFor={`hn-${habito?.id ?? 'novo'}`}>Hábito</label>
        <input id={`hn-${habito?.id ?? 'novo'}`} required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Estudar design" /></div>
      <div className="campo">
        <span className="rotulo-campo">Em quais dias</span>
        <div className="dias-escolha" role="group" aria-label="Dias da semana">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button type="button" key={d} aria-pressed={dias.includes(d)} aria-label={['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d]}
              onClick={() => alternarDia(d)}>{DIAS[d]}</button>
          ))}
        </div>
        <div className="atalhos">
          <button type="button" className="link" onClick={() => setDias([0, 1, 2, 3, 4, 5, 6])}>Todo dia</button>
          <button type="button" className="link" onClick={() => setDias([1, 2, 3, 4, 5])}>Dias úteis</button>
        </div>
      </div>
      <div className="campo">
        <span className="rotulo-campo">Cor</span>
        <div className="opcoes">
          {CORES.map((c) => <button type="button" key={c} className="cor pequena" style={{ background: c }} aria-label={`Cor ${c}`} aria-pressed={cor === c} onClick={() => setCor(c)} />)}
        </div>
      </div>
      <div className="acoes">
        <button className="botao">{habito ? 'Salvar' : 'Criar hábito'}</button>
        <button type="button" className="botao sec" onClick={fechar}>Cancelar</button>
        {habito && <button type="button" className="link perigo" onClick={arquivar}>Arquivar</button>}
      </div>
    </form>
  )
}
