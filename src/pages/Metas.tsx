import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { deISO, hojeISO, inicioSemana, nomeDia, somarDias } from '../lib/datas'
import { checkinFeito, ordenarMetas, progresso, proximoPasso, useCheckins, useDiario, useMetas, type Checkin, type MetaVida, type Passo } from '../lib/metas'
import { usePilares, type Pilar } from '../lib/pilares'
import { rotuloData } from '../lib/agenda'
import { useAviso } from '../components/Aviso'

const ddmm = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`
const dataLonga = (d: string) => deISO(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function Metas() {
  const fimDeSemana = [0, 6].includes(new Date().getDay())
  return (
    <>
      <h1>Metas</h1>
      <p className="sub">Objetivos maiores, o check-in da semana e o seu diário.</p>
      <div className="grade">
        {fimDeSemana && <CheckinSemana />}
        <MetasVida />
        {!fimDeSemana && <CheckinSemana />}
        <Diario />
      </div>
    </>
  )
}

/* ---------------- Metas com passos ---------------- */
function MetasVida() {
  const { metas, passos, carregando, recarregar, alternarPasso } = useMetas()
  const { pilares } = usePilares()
  const [nova, setNova] = useState(false)
  const [verConcluidas, setVerConcluidas] = useState(false)
  const avisar = useAviso()
  const ordenadas = ordenarMetas(metas)
  const abertas = ordenadas.filter((m) => m.status !== 'concluida')
  const concluidas = ordenadas.filter((m) => m.status === 'concluida')

  return (
    <section className="bloco largo">
      <div className="lim-topo" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Metas</h2>
        {!nova && <button className="botao sec" onClick={() => setNova(true)}>Nova meta</button>}
      </div>
      {nova && <FormMeta pilares={pilares} fechar={() => setNova(false)} mudou={recarregar} avisar={avisar} />}
      {!carregando && metas.length === 0 && !nova && (
        <p className="vazio">Uma meta grande fica mais fácil quebrada em passos pequenos. Exemplo: "Montar meu portfólio de design", com passos como "escolher 3 projetos" e "criar a página".</p>
      )}
      <div className="lista-metas">
        {abertas.map((m) => <CartaoMeta key={m.id} meta={m} passos={passos} pilares={pilares} alternarPasso={alternarPasso} mudou={recarregar} avisar={avisar} />)}
      </div>
      {concluidas.length > 0 && (
        <>
          <button className="link" onClick={() => setVerConcluidas(!verConcluidas)}>
            {verConcluidas ? 'Esconder' : 'Ver'} metas concluídas ({concluidas.length})
          </button>
          {verConcluidas && (
            <div className="lista-metas">
              {concluidas.map((m) => <CartaoMeta key={m.id} meta={m} passos={passos} pilares={pilares} alternarPasso={alternarPasso} mudou={recarregar} avisar={avisar} />)}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function CartaoMeta({ meta, passos, pilares, alternarPasso, mudou, avisar }: {
  meta: MetaVida; passos: Passo[]; pilares: Pilar[]; alternarPasso: (p: Passo) => Promise<boolean>; mudou: () => void; avisar: (m: string) => void
}) {
  const [aberta, setAberta] = useState(false)
  const [novoPasso, setNovoPasso] = useState('')
  const pr = progresso(meta, passos)
  const prox = proximoPasso(meta, passos)
  const pilar = pilares.find((p) => p.id === meta.pilar_id)
  const dela = passos.filter((p) => p.meta_id === meta.id)
  const hoje = hojeISO()
  const atrasada = meta.prazo && meta.prazo < hoje && meta.status === 'ativa'

  async function addPasso(e: FormEvent) {
    e.preventDefault()
    if (!novoPasso.trim()) return
    const { error } = await supabase.from('passos_meta').insert({ meta_id: meta.id, titulo: novoPasso.trim(), ordem: dela.length })
    if (error) return avisar('Não salvou o passo.')
    setNovoPasso(''); mudou()
  }
  async function status(s: MetaVida['status']) {
    await supabase.from('metas_vida').update({ status: s }).eq('id', meta.id)
    avisar(s === 'concluida' ? `Meta "${meta.titulo}" concluída!` : s === 'pausada' ? 'Meta pausada.' : 'Meta retomada.')
    mudou()
  }
  async function apagar() {
    if (!confirm(`Apagar a meta "${meta.titulo}" e todos os passos?`)) return
    await supabase.from('metas_vida').delete().eq('id', meta.id)
    avisar('Meta apagada.'); mudou()
  }
  async function apagarPasso(p: Passo) {
    await supabase.from('passos_meta').delete().eq('id', p.id); mudou()
  }

  return (
    <article className={`cartao-meta ${meta.status}`} style={{ ['--cor' as string]: pilar?.cor ?? 'var(--destaque)' }}>
      <button className="cm-topo" aria-expanded={aberta} onClick={() => setAberta(!aberta)}>
        <span className="cm-titulo">
          {meta.titulo}
          <small>
            {[pilar?.nome, meta.prazo && `até ${ddmm(meta.prazo)}`, meta.status === 'pausada' && 'pausada', meta.status === 'concluida' && 'concluída'].filter(Boolean).join(', ')}
            {atrasada && <span className="ruim">, prazo passou</span>}
          </small>
        </span>
        <span className="num cm-pct">{pr.total ? `${pr.feitos}/${pr.total}` : ''}</span>
      </button>
      <div className="barra meta"><div style={{ width: `${pr.pct * 100}%`, background: 'var(--cor)' }} /></div>
      {!aberta && prox && meta.status === 'ativa' && <p className="miudo" style={{ marginTop: 8 }}>Próximo passo: {prox.titulo}{prox.prazo ? ` (${rotuloData(prox.prazo).toLowerCase()})` : ''}</p>}
      {!aberta && !pr.total && meta.status === 'ativa' && <p className="miudo" style={{ marginTop: 8 }}>Toque para adicionar os passos.</p>}

      {aberta && (
        <div className="cm-corpo">
          <ul className="lista-tarefas">
            {dela.map((p) => (
              <li key={p.id} className={p.feito ? 'feita' : ''}>
                <button className="check" aria-pressed={p.feito} aria-label={p.feito ? `Desmarcar ${p.titulo}` : `Concluir ${p.titulo}`}
                  onClick={async () => { if (!(await alternarPasso(p))) avisar('Não salvou.') }}>{p.feito ? '✓' : ''}</button>
                <span className="desc">{p.titulo}</span>
                {p.prazo && !p.feito && <span className={`quando ${p.prazo < hoje ? 'atrasada' : ''}`}>{rotuloData(p.prazo)}</span>}
                <button className="apagar" aria-label={`Apagar passo ${p.titulo}`} onClick={() => apagarPasso(p)}>×</button>
              </li>
            ))}
          </ul>
          {meta.status !== 'concluida' && (
            <form className="nova-tarefa" onSubmit={addPasso} style={{ marginTop: 10 }}>
              <input value={novoPasso} onChange={(e) => setNovoPasso(e.target.value)} placeholder="Novo passo" aria-label="Novo passo" />
              <button className="botao sec" disabled={!novoPasso.trim()}>Adicionar</button>
            </form>
          )}
          {pr.total > 0 && pr.feitos === pr.total && meta.status === 'ativa' && (
            <p className="aviso" style={{ marginTop: 12 }}>Todos os passos feitos. Hora de marcar a meta como concluída?</p>
          )}
          <div className="acoes" style={{ marginTop: 12 }}>
            {meta.status === 'ativa' && <button className="botao" onClick={() => status('concluida')}>Concluir meta</button>}
            {meta.status === 'ativa' && <button className="botao sec" onClick={() => status('pausada')}>Pausar</button>}
            {meta.status !== 'ativa' && <button className="botao sec" onClick={() => status('ativa')}>Reabrir</button>}
            <button className="link perigo" onClick={apagar}>Apagar</button>
          </div>
        </div>
      )}
    </article>
  )
}

function FormMeta({ pilares, fechar, mudou, avisar }: { pilares: Pilar[]; fechar: () => void; mudou: () => void; avisar: (m: string) => void }) {
  const [titulo, setTitulo] = useState('')
  const [pilar, setPilar] = useState('')
  const [prazo, setPrazo] = useState('')
  const [lista, setLista] = useState('')

  async function criar(e: FormEvent) {
    e.preventDefault()
    const { data, error } = await supabase.from('metas_vida').insert({ titulo: titulo.trim(), pilar_id: pilar || null, prazo: prazo || null }).select('id').single()
    if (error || !data) return avisar('Não foi possível criar a meta.')
    const passos = lista.split('\n').map((s) => s.trim()).filter(Boolean)
    if (passos.length) await supabase.from('passos_meta').insert(passos.map((t, i) => ({ meta_id: data.id, titulo: t, ordem: i })))
    avisar(`Meta "${titulo.trim()}" criada.`); fechar(); mudou()
  }

  return (
    <form onSubmit={criar} className="cartao-habito form-meta">
      <div className="campo"><label htmlFor="fm-t">Meta</label>
        <input id="fm-t" required autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Montar meu portfólio de design" /></div>
      <div className="duas">
        <div className="campo"><label htmlFor="fm-p">Pilar</label>
          <select id="fm-p" value={pilar} onChange={(e) => setPilar(e.target.value)}>
            <option value="">Nenhum</option>
            {pilares.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select></div>
        <div className="campo"><label htmlFor="fm-d">Prazo (opcional)</label>
          <input id="fm-d" type="date" min={hojeISO()} value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
      </div>
      <div className="campo"><label htmlFor="fm-l">Primeiros passos (um por linha, opcional)</label>
        <textarea id="fm-l" rows={4} value={lista} onChange={(e) => setLista(e.target.value)} placeholder={'Escolher 3 projetos\nFazer as imagens\nMontar a página'} /></div>
      <div className="acoes"><button className="botao">Criar meta</button><button type="button" className="botao sec" onClick={fechar}>Cancelar</button></div>
    </form>
  )
}

/* ---------------- Check-in da semana ---------------- */
const PERGUNTAS: [keyof Checkin, string][] = [
  ['foi_bom', 'O que foi bom nesta semana?'],
  ['pesou', 'O que pesou?'],
  ['quero_diferente', 'O que quero diferente na próxima?'],
]

function CheckinSemana() {
  const { lista, carregando, salvar, doDia } = useCheckins()
  const atual = inicioSemana(hojeISO())
  const [semana, setSemana] = useState(atual)
  const salvo = doDia(semana)
  const [form, setForm] = useState<Checkin>({ semana, foi_bom: '', pesou: '', quero_diferente: '' })
  const [salvando, setSalvando] = useState(false)
  const avisar = useAviso()
  const anterior = doDia(somarDias(semana, -7))

  useEffect(() => {
    setForm({ semana, foi_bom: salvo?.foi_bom ?? '', pesou: salvo?.pesou ?? '', quero_diferente: salvo?.quero_diferente ?? '' })
  }, [semana, salvo?.foi_bom, salvo?.pesou, salvo?.quero_diferente])

  const mudou = PERGUNTAS.some(([k]) => (form[k] ?? '') !== (salvo?.[k] ?? ''))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const ok = await salvar(form)
    setSalvando(false)
    avisar(ok ? 'Check-in salvo.' : 'Não salvou o check-in. Tente de novo.')
  }

  const rotulo = semana === atual ? 'Esta semana' : semana === somarDias(atual, -7) ? 'Semana passada' : `${ddmm(semana)} a ${ddmm(somarDias(semana, 6))}`

  return (
    <section className="bloco largo">
      <div className="cabeca" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Check-in da semana</h2>
        <div className="seletor-mes">
          <button aria-label="Semana anterior" onClick={() => setSemana(somarDias(semana, -7))}>‹</button>
          <span>{rotulo}</span>
          <button aria-label="Próxima semana" disabled={semana >= atual} onClick={() => setSemana(somarDias(semana, 7))}>›</button>
        </div>
      </div>
      {anterior?.quero_diferente && (
        <p className="lembrete">Na semana anterior você quis: <em>{anterior.quero_diferente}</em></p>
      )}
      {!carregando && (
        <form onSubmit={enviar}>
          {PERGUNTAS.map(([k, pergunta]) => (
            <div className="campo" key={k}>
              <label htmlFor={`ck-${k}`}>{pergunta}</label>
              <textarea id={`ck-${k}`} rows={3} value={(form[k] as string) ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <div className="acoes" style={{ alignItems: 'center' }}>
            <button className="botao" disabled={salvando || !mudou}>{checkinFeito(salvo) ? 'Salvar alterações' : 'Salvar check-in'}</button>
            {checkinFeito(salvo) && !mudou && <span className="miudo" style={{ margin: 0 }}>Salvo.</span>}
          </div>
        </form>
      )}
      {lista.filter((c) => c.semana !== semana && checkinFeito(c)).length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary><h3 className="sub-h">Check-ins anteriores</h3></summary>
          <ul className="checkins-antigos">
            {lista.filter((c) => c.semana !== semana && checkinFeito(c)).map((c) => (
              <li key={c.semana}>
                <strong>Semana de {ddmm(c.semana)}</strong>
                {PERGUNTAS.map(([k, p]) => c[k] && <p key={k}><span>{p}</span> {c[k] as string}</p>)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

/* ---------------- Diário e gratidão ---------------- */
function Diario() {
  const { entradas, carregando, salvar, apagar } = useDiario(30)
  const [dia, setDia] = useState(hojeISO())
  const doDia = entradas.filter((e) => e.data === dia)
  const textoSalvo = doDia.find((e) => e.tipo === 'diario')?.texto ?? ''
  const intencao = doDia.find((e) => e.tipo === 'intencao')?.texto
  const [texto, setTexto] = useState(textoSalvo)
  const [grat, setGrat] = useState('')
  const avisar = useAviso()

  useEffect(() => { setTexto(textoSalvo) }, [dia, textoSalvo])

  async function salvarTexto() {
    if (texto.trim() === textoSalvo) return
    avisar((await salvar(dia, 'diario', texto)) ? 'Diário salvo.' : 'Não salvou. Tente de novo.')
  }
  async function addGrat(e: FormEvent) {
    e.preventDefault()
    if (!grat.trim()) return
    if (await salvar(dia, 'gratidao', grat)) setGrat('')
    else avisar('Não salvou. Tente de novo.')
  }

  const diasComAlgo = [...new Set(entradas.map((e) => e.data))].filter((d) => d !== dia).slice(0, 14)

  return (
    <section className="bloco largo">
      <div className="cabeca" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Diário</h2>
        <div className="seletor-mes">
          <button aria-label="Dia anterior" onClick={() => setDia(somarDias(dia, -1))}>‹</button>
          <span>{nomeDia(dia)}</span>
          <button aria-label="Próximo dia" disabled={dia >= hojeISO()} onClick={() => setDia(somarDias(dia, 1))}>›</button>
        </div>
      </div>
      {intencao && <p className="lembrete">Intenção do dia: <em>{intencao}</em></p>}
      {!carregando && (
        <div className="duas-colunas">
          <div className="campo" style={{ marginBottom: 0 }}>
            <label htmlFor="dr-txt">Como foi o dia?</label>
            <textarea id="dr-txt" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={salvarTexto}
              placeholder="Escreva livre. Salva quando você sai do campo." />
          </div>
          <div>
            <span className="rotulo-campo">Gratidão</span>
            <ul className="gratidoes">
              {doDia.filter((e) => e.tipo === 'gratidao').map((e) => (
                <li key={e.id}><span className="desc">{e.texto}</span><button className="apagar" aria-label="Apagar" onClick={() => apagar(e.id)}>×</button></li>
              ))}
            </ul>
            <form className="nova-tarefa" onSubmit={addGrat}>
              <input value={grat} onChange={(e) => setGrat(e.target.value)} placeholder="Sou grato por..." aria-label="Algo pelo qual sou grato" />
              <button className="botao sec" disabled={!grat.trim()}>Adicionar</button>
            </form>
          </div>
        </div>
      )}
      {diasComAlgo.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary><h3 className="sub-h">Dias anteriores</h3></summary>
          <ul className="checkins-antigos">
            {diasComAlgo.map((d) => {
              const es = entradas.filter((e) => e.data === d)
              const diario = es.find((e) => e.tipo === 'diario')
              const gr = es.filter((e) => e.tipo === 'gratidao')
              const int = es.find((e) => e.tipo === 'intencao')
              return (
                <li key={d}>
                  <button className="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => setDia(d)}>{dataLonga(d)}</button>
                  {int && <p><span>Intenção:</span> {int.texto}</p>}
                  {diario && <p className="trecho">{diario.texto}</p>}
                  {gr.length > 0 && <p><span>Gratidão:</span> {gr.map((g) => g.texto).join('; ')}</p>}
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </section>
  )
}
