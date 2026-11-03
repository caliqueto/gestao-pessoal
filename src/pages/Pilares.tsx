import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { hojeISO, inicioSemana, somarDias } from '../lib/datas'
import { corNota, esquecidos, mediaSemana, notaDe, SEMANAS_HISTORICO, usePilares, type Pilar } from '../lib/pilares'
import { useAviso } from '../components/Aviso'
import Radar from '../components/Radar'

const ddmm = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`
const CORES = ['#4ade80', '#7c9cff', '#f472b6', '#a78bfa', '#fb923c', '#facc15', '#38bdf8', '#f87171']

export default function Pilares() {
  const p = usePilares()
  const [semana, setSemana] = useState(inicioSemana(hojeISO()))
  const atual = inicioSemana(hojeISO())
  const avisar = useAviso()
  const anterior = somarDias(semana, -7)

  const avaliados = p.ativos.filter((x) => notaDe(p.notas, x.id, semana)).length
  const alerta = esquecidos(p.ativos, p.notas, semana)
  const media = mediaSemana(p.ativos, p.notas, semana)
  const mediaAnt = mediaSemana(p.ativos, p.notas, anterior)

  async function nota(pilar: Pilar, n: number) {
    const r = await p.salvarNota(pilar.id, semana, { nota: n })
    if (!r.ok) avisar('Não salvou a nota. Confira a internet.')
  }
  async function meta(pilar: Pilar, texto: string) {
    const ant = notaDe(p.notas, pilar.id, semana)?.meta_semana ?? ''
    if (texto.trim() === ant) return
    const r = await p.salvarNota(pilar.id, semana, { meta_semana: texto.trim() || null })
    if (!r.ok) avisar(r.motivo === 'nota' ? 'Dê uma nota ao pilar antes de escrever a meta.' : 'Não salvou a meta.')
    else avisar('Meta da semana salva.')
  }

  const rotulo = semana === atual ? 'Esta semana' : semana === somarDias(atual, -7) ? 'Semana passada' : `${ddmm(semana)} a ${ddmm(somarDias(semana, 6))}`

  return (
    <>
      <div className="cabeca">
        <h1>Pilares</h1>
        <div className="seletor-mes">
          <button aria-label="Semana anterior" onClick={() => setSemana(somarDias(semana, -7))}>‹</button>
          <span>{rotulo}</span>
          <button aria-label="Próxima semana" disabled={semana >= atual} onClick={() => setSemana(somarDias(semana, 7))}>›</button>
        </div>
      </div>
      <p className="sub" style={{ marginTop: -8 }}>Como cada área da vida foi na semana. Dê as notas na revisão de domingo.</p>
      {p.erro && <p className="aviso erro">{p.erro}</p>}

      {!p.carregando && (
        <div className="grade">
          {alerta.length > 0 && (
            <section className="bloco largo alerta-pilar">
              <h2>{alerta.length === 1 ? 'Um pilar está pedindo atenção' : 'Pilares pedindo atenção'}</h2>
              <p style={{ margin: 0 }}>
                {alerta.map((x) => x.nome).join(', ')} {alerta.length === 1 ? 'ficou' : 'ficaram'} abaixo de 5 por três semanas seguidas.
                Que tal uma meta pequena para a próxima semana, ou um bloco protegido na agenda?
              </p>
            </section>
          )}

          <section className="bloco largo">
            <div className="lim-topo" style={{ marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>Notas da semana</h2>
              <span className="miudo" style={{ margin: 0 }}>{avaliados} de {p.ativos.length} avaliados</span>
            </div>
            <ul className="notas-pilares">
              {p.ativos.map((x) => {
                const n = notaDe(p.notas, x.id, semana)
                const ant = notaDe(p.notas, x.id, anterior)
                return (
                  <li key={x.id} style={{ ['--cor' as string]: x.cor }}>
                    <div className="np-topo">
                      <span className="np-nome"><span className="bolinha" style={{ background: x.cor }} /> {x.nome}</span>
                      {ant && <span className="miudo" style={{ margin: 0 }}>semana anterior: {ant.nota}</span>}
                    </div>
                    <div className="escala" role="radiogroup" aria-label={`Nota de ${x.nome}`}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                        <button key={v} role="radio" aria-checked={n?.nota === v} className={n?.nota === v ? 'escolhida' : ''}
                          style={n?.nota === v ? { background: corNota(v) } : undefined} onClick={() => nota(x, v)}>{v}</button>
                      ))}
                    </div>
                    <input className="meta-pilar" key={`${x.id}-${semana}`} defaultValue={n?.meta_semana ?? ''} placeholder="Uma meta pequena para este pilar (opcional)"
                      aria-label={`Meta da semana para ${x.nome}`} onBlur={(e) => meta(x, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="bloco">
            <h2>Como a semana ficou</h2>
            {p.ativos.length >= 3 ? (
              <>
                <Radar eixos={p.ativos.map((x) => ({ nome: x.nome, cor: x.cor }))} series={[
                  { nome: rotulo, cor: 'var(--destaque)', valores: p.ativos.map((x) => notaDe(p.notas, x.id, semana)?.nota ?? null) },
                  { nome: 'Semana anterior', cor: 'var(--texto-2)', tracejada: true, valores: p.ativos.map((x) => notaDe(p.notas, x.id, anterior)?.nota ?? null) },
                ]} />
                <div className="legenda-radar">
                  <span><i className="tra-cheio" /> {rotulo}{media != null && `: média ${media.toFixed(1).replace('.', ',')}`}</span>
                  <span><i className="tra-tracejado" /> Semana anterior{mediaAnt != null && `: média ${mediaAnt.toFixed(1).replace('.', ',')}`}</span>
                </div>
              </>
            ) : <p className="vazio">O gráfico de teia aparece com pelo menos 3 pilares ativos.</p>}
          </section>

          <Historico pilares={p.ativos} notas={p.notas} ate={semana} />
          <EditarPilares pilares={p.pilares} mudou={p.recarregar} avisar={avisar} />
        </div>
      )}
    </>
  )
}

function Historico({ pilares, notas, ate }: { pilares: Pilar[]; notas: ReturnType<typeof usePilares>['notas']; ate: string }) {
  const semanas = Array.from({ length: SEMANAS_HISTORICO }, (_, i) => somarDias(ate, -7 * (SEMANAS_HISTORICO - 1 - i)))
  const temAlgo = notas.some((n) => n.semana >= semanas[0] && n.semana <= ate)
  return (
    <section className="bloco">
      <h2>Últimas {SEMANAS_HISTORICO} semanas</h2>
      {!temAlgo ? <p className="vazio">O histórico aparece conforme você dá notas toda semana.</p> : (
        <div className="rolar">
          <table className="calor">
            <thead><tr><th></th>{semanas.map((s) => <th key={s} className="num">{ddmm(s)}</th>)}</tr></thead>
            <tbody>
              {pilares.map((x) => (
                <tr key={x.id}>
                  <th>{x.nome}</th>
                  {semanas.map((s) => {
                    const n = notaDe(notas, x.id, s)?.nota
                    return <td key={s} className="num" style={n ? { background: `color-mix(in srgb, ${corNota(n)} ${20 + n * 5}%, transparent)` } : undefined}
                      aria-label={`${x.nome}, semana de ${ddmm(s)}: ${n ?? 'sem nota'}`}>{n ?? ''}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="miudo">Verde 7 a 10, amarelo 5 e 6, vermelho abaixo de 5.</p>
    </section>
  )
}

function EditarPilares({ pilares, mudou, avisar }: { pilares: Pilar[]; mudou: () => void; avisar: (m: string) => void }) {
  const [novo, setNovo] = useState('')

  async function renomear(x: Pilar, nome: string) {
    if (!nome.trim() || nome.trim() === x.nome) return
    await supabase.from('pilares').update({ nome: nome.trim() }).eq('id', x.id)
    avisar('Pilar renomeado.'); mudou()
  }
  async function alternar(x: Pilar) {
    await supabase.from('pilares').update({ ativo: !x.ativo }).eq('id', x.id); mudou()
  }
  async function mover(x: Pilar, dir: -1 | 1) {
    const lista = [...pilares].sort((a, b) => a.ordem - b.ordem)
    const i = lista.findIndex((y) => y.id === x.id), j = i + dir
    if (j < 0 || j >= lista.length) return
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
    // regrava a ordem de todos (0, 1, 2...) para não ficar empate
    await Promise.all(lista.map((y, k) => y.ordem === k ? null : supabase.from('pilares').update({ ordem: k }).eq('id', y.id)))
    mudou()
  }
  async function criar(e: FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('pilares').insert({ nome: novo.trim(), cor: CORES[pilares.length % CORES.length], ordem: pilares.length })
    if (error) return avisar('Não foi possível criar o pilar.')
    avisar(`Pilar ${novo.trim()} criado.`); setNovo(''); mudou()
  }

  const ordenados = [...pilares].sort((a, b) => a.ordem - b.ordem)
  return (
    <section className="bloco largo">
      <details>
        <summary><h2>Editar pilares</h2></summary>
        <p className="miudo" style={{ marginTop: 0 }}>Desligar um pilar tira ele das notas, mas guarda o histórico.</p>
        <ul className="editar-pilares">
          {ordenados.map((x, i) => (
            <li key={x.id} className={x.ativo ? '' : 'parado'}>
              <span className="bolinha" style={{ background: x.cor }} />
              <input defaultValue={x.nome} aria-label={`Nome do pilar ${x.nome}`} onBlur={(e) => renomear(x, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
              <button className="apagar" aria-label={`Subir ${x.nome}`} disabled={i === 0} onClick={() => mover(x, -1)}>↑</button>
              <button className="apagar" aria-label={`Descer ${x.nome}`} disabled={i === ordenados.length - 1} onClick={() => mover(x, 1)}>↓</button>
              <label className="liga"><input type="checkbox" checked={x.ativo} onChange={() => alternar(x)} /> Ativo</label>
            </li>
          ))}
        </ul>
        <form onSubmit={criar} className="nova-cat">
          <input required placeholder="Novo pilar" aria-label="Nome do novo pilar" value={novo} onChange={(e) => setNovo(e.target.value)} />
          <button className="botao sec">Criar</button>
        </form>
      </details>
    </section>
  )
}
