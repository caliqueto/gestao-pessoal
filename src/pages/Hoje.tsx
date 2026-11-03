import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConta } from '../lib/conta'
import { IconeAjustes } from '../components/Icones'
import { calcularMes, textoCor, useFinancas } from '../lib/financas'
import { hojeISO, mesAtual, reais } from '../lib/datas'
import Lancar from '../components/Lancar'
import { useAviso } from '../components/Aviso'
import { useHabitos } from '../lib/habitos'
import { useEstudos } from '../lib/estudos'
import HabitosHoje from '../components/HabitosHoje'
import Cronometro from '../components/Cronometro'
import { duracao } from '../lib/datas'
import { agoraMin, blocosDoDia, fmtHora, minutosDe, TIPOS, useAgenda } from '../lib/agenda'
import Tarefas from '../components/Tarefas'
import { resumoCartao, useCartoes } from '../lib/cartoes'
import { usePilares, notaDe } from '../lib/pilares'
import { checkinFeito, useCheckins, useDiario } from '../lib/metas'
import { inicioSemana, somarDias } from '../lib/datas'
import { blocosDoDia as blocosDia } from '../lib/agenda'

function Intencao() {
  const { entradas, carregando, salvar } = useDiario(0)
  const hoje = hojeISO()
  const salva = entradas.find((e) => e.data === hoje && e.tipo === 'intencao')?.texto ?? ''
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const avisar = useAviso()
  if (carregando) return null

  async function gravar() {
    setEditando(false)
    if (texto.trim() === salva) return
    if (!(await salvar(hoje, 'intencao', texto))) avisar('Não salvou a intenção.')
  }
  if (salva && !editando) {
    return <button className="intencao feita" onClick={() => { setTexto(salva); setEditando(true) }} aria-label="Editar intenção do dia">{salva}</button>
  }
  return (
    <input className="intencao" value={texto} placeholder="Qual a sua intenção para hoje?" aria-label="Intenção do dia"
      autoFocus={editando} onFocus={() => { if (!editando) { setTexto(salva); setEditando(true) } }}
      onChange={(e) => setTexto(e.target.value)} onBlur={gravar} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
  )
}

function RevisaoDomingo() {
  const semana = inicioSemana(hojeISO())
  const { ativos, notas } = usePilares()
  const { doDia } = useCheckins()
  const { blocos } = useAgenda()
  const avaliados = ativos.filter((p) => notaDe(notas, p.id, semana)).length
  const checkin = checkinFeito(doDia(semana))
  const proxima = somarDias(semana, 7)
  const blocosProx = Array.from({ length: 7 }, (_, i) => blocosDia(blocos, somarDias(proxima, i))).flat().filter((b) => b.tipo === 'estudo' || b.tipo === 'protegido').length
  let planejou = false
  try { planejou = localStorage.getItem(`planejou-${proxima}`) === '1' } catch { /* ignora */ }
  const passos = [
    { feito: ativos.length > 0 && avaliados === ativos.length, nome: 'Dar nota aos pilares', det: `${avaliados} de ${ativos.length}`, para: '/pilares' },
    { feito: checkin, nome: 'Fazer o check-in', det: checkin ? 'feito' : '3 perguntas', para: '/metas' },
    { feito: planejou, nome: 'Planejar a semana que vem', det: blocosProx ? `${blocosProx} blocos de estudo e protegidos marcados` : 'nenhum bloco de estudo ou protegido ainda', para: '/rotina?aba=agenda&semana=proxima' },
  ]
  return (
    <section className="bloco largo revisao">
      <h2>Revisão da semana</h2>
      <ol className="passos-revisao">
        {passos.map((p) => (
          <li key={p.nome} className={p.feito ? 'feito' : ''}>
            <Link to={p.para}>
              <span className="check" aria-hidden="true">{p.feito ? '✓' : ''}</span>
              <span className="desc">{p.nome}<small>{p.det}</small></span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

function AgendaDeHoje() {
  const { blocos, carregando } = useAgenda()
  const [agora, setAgora] = useState(agoraMin())
  useEffect(() => {
    const t = window.setInterval(() => setAgora(agoraMin()), 60000)
    return () => window.clearInterval(t)
  }, [])
  const lista = blocosDoDia(blocos, hojeISO())
  const atual = lista.find((b) => minutosDe(b.inicio) <= agora && agora < minutosDe(b.fim))
  const proximo = lista.find((b) => minutosDe(b.inicio) > agora)

  return (
    <section className="bloco largo agenda-hoje">
      <div className="duas-colunas">
        <div>
          <h2>Agenda de hoje</h2>
          {!carregando && lista.length === 0 && (
            <p className="vazio">Nada marcado para hoje. <Link to="/rotina?aba=agenda">Montar a rotina</Link></p>
          )}
          {atual && (
            <div className="agora-box" style={{ ['--cor' as string]: TIPOS[atual.tipo].cor }}>
              <span className="selo-agora">Agora</span>
              <strong>{atual.titulo}</strong>
              <span className="miudo" style={{ margin: 0 }}>até {fmtHora(atual.fim)}</span>
            </div>
          )}
          {!atual && proximo && (
            <p className="proximo">Próximo: <strong>{proximo.titulo}</strong> às {fmtHora(proximo.inicio)}</p>
          )}
          {lista.length > 0 && (
            <ul className="linha-tempo">
              {lista.map((b) => (
                <li key={b.id} className={minutosDe(b.fim) <= agora ? 'passou' : b === atual ? 'agora' : ''} style={{ ['--cor' as string]: TIPOS[b.tipo].cor }}>
                  <span className="num">{fmtHora(b.inicio)}</span>
                  <span className="t">{b.titulo}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2>Tarefas de hoje</h2>
          <Tarefas compacto />
        </div>
      </div>
    </section>
  )
}

function HabitosDoDia() {
  const { habitos, feitas, alternar, carregando } = useHabitos()
  return (
    <section className="bloco">
      <h2>Hábitos de hoje</h2>
      {!carregando && <HabitosHoje habitos={habitos} feitas={feitas} alternar={alternar} />}
    </section>
  )
}

function EstudoDaSemana() {
  const { totalMin, recarregar, carregando } = useEstudos()
  const { prefs } = useConta()
  const metaMin = (prefs.meta_horas_estudo ?? 0) * 60
  return (
    <section className="bloco">
      <h2>Estudo da semana</h2>
      <div className="meta-estudo" style={{ marginTop: 0 }}>
        <div className="total">
          <span className="num grande">{carregando ? '…' : duracao(totalMin)}</span>
          {metaMin > 0 && <span className="de"> de {duracao(metaMin)}</span>}
        </div>
        {metaMin > 0
          ? <div className="barra meta" style={{ marginBottom: 14 }}><div style={{ width: `${Math.min(totalMin / metaMin, 1) * 100}%` }} /></div>
          : <p className="miudo" style={{ margin: '4px 0 14px' }}>Defina sua meta semanal na aba <Link to="/rotina">Rotina</Link>.</p>}
      </div>
      <Cronometro salvo={recarregar} compacto />
    </section>
  )
}

function DinheiroDoMes() {
  const mes = mesAtual()
  const { categorias, lancamentos, recorrentes, carregando, recarregar } = useFinancas(mes)
  const [lancando, setLancando] = useState(false)
  const avisar = useAviso()
  const r = useMemo(() => calcularMes(mes, lancamentos, categorias, recorrentes), [mes, lancamentos, categorias, recorrentes])
  const cart = useCartoes()
  const faturas = cart.ativos.map((c) => ({ c, r: resumoCartao(c, cart.lancs, cart.pagas) }))
  const totalCartoes = faturas.reduce((s, f) => s + f.r.aberta.total, 0)
  const atencao = r.porCategoria.filter((c) => c.estado === 'perto' || c.estado === 'estourou').sort((a, b) => (b.uso ?? 0) - (a.uso ?? 0)).slice(0, 3)
  const hoje = lancamentos.filter((l) => l.data === hojeISO() && l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)

  return (
    <section className={`bloco largo termometro ${r.cor}`}>
      <div className="saldo-linha">
        <div>
          <div className="rotulo">Saldo do mês</div>
          <div className="saldo num">{carregando ? '…' : reais(r.saldo)}</div>
        </div>
        <button className="botao" onClick={() => setLancando(true)}>+ Lançar</button>
      </div>
      {!carregando && (
        <>
          <p className="frase">{textoCor[r.cor]}</p>
          <dl className="numeros">
            <div><dt>{r.estimativa ? 'Previsão (estimativa)' : 'Previsão do fim do mês'}</dt><dd className="num">{reais(r.previsao)}</dd></div>
            <div><dt>Gasto hoje</dt><dd className="num">{reais(hoje)}</dd></div>
            {faturas.length > 0 && <div><dt>Nas faturas abertas</dt><dd className="num">{reais(totalCartoes)}</dd></div>}
          </dl>
          {faturas.some((f) => (f.r.usoMeta ?? 0) >= 0.8 || f.r.fechadaVencida) && (
            <ul className="avisos-cartao">
              {faturas.filter((f) => (f.r.usoMeta ?? 0) >= 0.8 || f.r.fechadaVencida).map(({ c, r: fr }) => (
                <li key={c.id}>
                  <span className="bolinha" style={{ background: c.cor }} />
                  {fr.fechadaVencida
                    ? `Fatura do ${c.nome} venceu em ${fr.fechada.vence.slice(8)}/${fr.fechada.vence.slice(5, 7)} e não está marcada como paga.`
                    : `${c.nome}: ${reais(fr.aberta.total)}, ${Math.round((fr.usoMeta ?? 0) * 100)}% do seu teto.`}
                </li>
              ))}
            </ul>
          )}
          {atencao.length > 0 && (
            <ul className="limites compacto">
              {atencao.map((c) => (
                <li key={c.id} className={c.estado}>
                  <div className="lim-topo"><span>{c.nome}</span><span className="num">{Math.round((c.uso ?? 0) * 100)}% do limite</span></div>
                  <div className="barra"><div style={{ width: `${Math.min((c.uso ?? 0) * 100, 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/financas" className="link" style={{ display: 'inline-block', marginTop: 12 }}>Ver finanças</Link>
        </>
      )}
      {lancando && <Lancar categorias={categorias} fechar={() => setLancando(false)} salvo={(m) => { avisar(m); recarregar(); cart.recarregar() }} />}
    </section>
  )
}

export default function Hoje() {
  const { sessao, prefs } = useConta()
  const agora = new Date()
  const diaSemana = agora.toLocaleDateString('pt-BR', { weekday: 'long' })
  const data = agora.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  const ehRevisao = agora.getDay() === prefs.dia_revisao || agora.getDay() === 6
  const hora = agora.getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = (sessao?.user.user_metadata?.nome as string | undefined) || ''

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Link to="/ajustes" className="botao sec so-celular" aria-label="Ajustes" style={{ minHeight: 40, padding: '0 12px' }}>
          <IconeAjustes />
        </Link>
      </div>
      <header className="capa-dia">
        <div className="semana">{diaSemana}</div>
        <div className="data">{data}</div>
        <p className="ola">{saudacao}{nome ? `, ${nome}` : ''}.</p>
        <Intencao />
      </header>

      <div className="grade">
        {ehRevisao && <RevisaoDomingo />}
        <DinheiroDoMes />
        <AgendaDeHoje />
        <HabitosDoDia />
        <EstudoDaSemana />
      </div>
    </>
  )
}
