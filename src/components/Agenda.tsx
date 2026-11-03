import { useEffect, useState } from 'react'
import { deISO, duracao, hojeISO, inicioSemana, somarDias } from '../lib/datas'
import { agoraMin, blocosDoDia, conflitos, duracaoBloco, fmtHora, horasSemana, minutosDe, ORDEM_TIPOS, TIPOS, useAgenda, type Bloco } from '../lib/agenda'
import { useEstudos } from '../lib/estudos'
import FormBloco from './FormBloco'
import Tarefas from './Tarefas'

type Modo = 'dia' | 'semana'

function lerModo(): Modo {
  try { return localStorage.getItem('modo-agenda') === 'semana' ? 'semana' : 'dia' } catch { return 'dia' }
}

const nomeSemanaDia = (d: string) => deISO(d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
const ddmm = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`

export default function Agenda({ semanaInicial }: { semanaInicial?: string }) {
  const { blocos, carregando, erro, recarregar } = useAgenda()
  const [modo, setModoBruto] = useState<Modo>(semanaInicial ? 'semana' : lerModo)
  const [dia, setDia] = useState(semanaInicial ?? hojeISO())
  const [form, setForm] = useState<{ bloco?: Bloco; data: string } | null>(null)
  const [agora, setAgora] = useState(agoraMin())
  const hoje = hojeISO()
  const semana = inicioSemana(dia)

  useEffect(() => {
    const t = window.setInterval(() => setAgora(agoraMin()), 60000)
    return () => window.clearInterval(t)
  }, [])

  function setModo(m: Modo) {
    setModoBruto(m)
    try { localStorage.setItem('modo-agenda', m) } catch { /* ignora */ }
  }
  const passo = modo === 'dia' ? 1 : 7
  const semanaAtual = inicioSemana(hoje)
  const rotulo = modo === 'dia'
    ? (dia === hoje ? 'Hoje' : dia === somarDias(hoje, 1) ? 'Amanhã' : dia === somarDias(hoje, -1) ? 'Ontem' : `${nomeSemanaDia(dia)}, ${ddmm(dia)}`)
    : (semana === semanaAtual ? 'Esta semana' : semana === somarDias(semanaAtual, 7) ? 'Semana que vem' : `${ddmm(semana)} a ${ddmm(somarDias(semana, 6))}`)

  return (
    <>
      <section className="bloco largo">
        <div className="cabeca agenda-cabeca">
          <div className="alternar" role="group" aria-label="Visão">
            <button aria-pressed={modo === 'dia'} onClick={() => setModo('dia')}>Dia</button>
            <button aria-pressed={modo === 'semana'} onClick={() => setModo('semana')}>Semana</button>
          </div>
          <div className="seletor-mes">
            <button aria-label={modo === 'dia' ? 'Dia anterior' : 'Semana anterior'} onClick={() => setDia(somarDias(dia, -passo))}>‹</button>
            <span>{rotulo}</span>
            <button aria-label={modo === 'dia' ? 'Próximo dia' : 'Próxima semana'} onClick={() => setDia(somarDias(dia, passo))}>›</button>
          </div>
        </div>
        {(modo === 'dia' ? dia !== hoje : semana !== semanaAtual) && (
          <button className="link" style={{ marginTop: -8 }} onClick={() => setDia(hoje)}>Voltar para hoje</button>
        )}
        {erro && <p className="aviso erro">{erro}</p>}

        {!carregando && (modo === 'dia'
          ? <VisaoDia blocos={blocos} dia={dia} agora={dia === hoje ? agora : -1} abrir={(b) => setForm({ bloco: b, data: dia })} />
          : <VisaoSemana blocos={blocos} semana={semana} hoje={hoje} abrir={(b, d) => setForm({ bloco: b, data: d })}
              novo={(d) => setForm({ data: d })} verDia={(d) => { setDia(d); setModo('dia') }} />)}

        <button className="botao" style={{ marginTop: 16 }} onClick={() => setForm({ data: dia })}>Adicionar bloco</button>
      </section>

      <HorasSemana blocos={blocos} semana={semana} />

      <section className="bloco">
        <h2>Tarefas</h2>
        <Tarefas />
      </section>

      {form && <FormBloco {...form} blocos={blocos} fechar={() => setForm(null)} mudou={recarregar} />}
    </>
  )
}

function VisaoDia({ blocos, dia, agora, abrir }: { blocos: Bloco[]; dia: string; agora: number; abrir: (b: Bloco) => void }) {
  const lista = blocosDoDia(blocos, dia)
  const choques = conflitos(lista)
  if (!lista.length) return <p className="vazio" style={{ marginTop: 8 }}>Nada marcado para este dia. Adicione blocos de estudo, trabalho ou tempo protegido.</p>

  return (
    <ul className="agenda-dia">
      {lista.map((b) => {
        const ini = minutosDe(b.inicio), fim = minutosDe(b.fim)
        const agoraAqui = agora >= ini && agora < fim
        const passou = agora >= fim
        return (
          <li key={b.id}>
            <button className={`bloco-ag ${agoraAqui ? 'agora' : ''} ${passou ? 'passou' : ''}`} style={{ ['--cor' as string]: TIPOS[b.tipo].cor }} onClick={() => abrir(b)}>
              <span className="horario num">{fmtHora(b.inicio)}<small>{fmtHora(b.fim)}</small></span>
              <span className="titulo">
                {b.titulo}
                <small>{TIPOS[b.tipo].nome}, {duracao(duracaoBloco(b))}{b.data ? ', só neste dia' : ''}</small>
                {choques.has(b.id) && <small className="choque">Choca com outro bloco</small>}
              </span>
              {agoraAqui && <span className="selo-agora">Agora</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function VisaoSemana({ blocos, semana, hoje, abrir, novo, verDia }: {
  blocos: Bloco[]; semana: string; hoje: string
  abrir: (b: Bloco, d: string) => void; novo: (d: string) => void; verDia: (d: string) => void
}) {
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(semana, i))
  return (
    <div className="agenda-semana">
      {dias.map((d) => {
        const lista = blocosDoDia(blocos, d)
        const choques = conflitos(lista)
        return (
          <div key={d} className={`dia-col ${d === hoje ? 'hoje' : ''} ${d < hoje ? 'passado' : ''}`}>
            <div className="dia-cab">
              <button className="link" onClick={() => verDia(d)}>
                <span className="nome-dia">{nomeSemanaDia(d)}</span> <span className="num">{ddmm(d)}</span>
              </button>
              <button className="add-dia" aria-label={`Adicionar bloco em ${nomeSemanaDia(d)} ${ddmm(d)}`} onClick={() => novo(d)}>+</button>
            </div>
            {lista.length === 0 && <span className="livre">Livre</span>}
            {lista.map((b) => (
              <button key={b.id} className={`mini-bloco ${choques.has(b.id) ? 'com-choque' : ''}`} style={{ ['--cor' as string]: TIPOS[b.tipo].cor }} onClick={() => abrir(b, d)}>
                <span className="num">{fmtHora(b.inicio)}–{fmtHora(b.fim)}</span>
                <span className="t">{b.titulo}</span>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function HorasSemana({ blocos, semana }: { blocos: Bloco[]; semana: string }) {
  const h = horasSemana(blocos, semana)
  const { totalMin } = useEstudos(semana)
  const total = ORDEM_TIPOS.reduce((s, t) => s + h[t], 0)
  const paraVoce = h.pessoal + h.protegido

  return (
    <section className="bloco">
      <h2>Horas planejadas na semana</h2>
      {total === 0 ? <p className="vazio">Quando a agenda tiver blocos, aqui aparece quanto da semana vai para trabalho, estudo e para você.</p> : (
        <>
          <div className="barra-tipos" role="img" aria-label={ORDEM_TIPOS.map((t) => `${TIPOS[t].nome}: ${duracao(h[t])}`).join(', ')}>
            {ORDEM_TIPOS.filter((t) => h[t] > 0).map((t) => (
              <div key={t} style={{ width: `${(h[t] / total) * 100}%`, background: TIPOS[t].cor }} />
            ))}
          </div>
          <ul className="legenda horas">
            {ORDEM_TIPOS.map((t) => (
              <li key={t}>
                <span className="bolinha" style={{ background: TIPOS[t].cor }} />
                <span className="nome">{TIPOS[t].nome}</span>
                <span className="num">{h[t] ? duracao(h[t]) : '–'}</span>
              </li>
            ))}
          </ul>
          <p className="miudo">
            Trabalho {duracao(h.trabalho)}, tempo para você {duracao(paraVoce)}.
            {h.estudo > 0 && ` Estudo: ${duracao(h.estudo)} planejadas, ${duracao(totalMin)} feitas.`}
          </p>
        </>
      )}
    </section>
  )
}
