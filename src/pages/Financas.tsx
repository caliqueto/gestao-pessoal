import { useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { mesAtual, nomeDia, nomeMes, reais, lerValor, somarMeses } from '../lib/datas'
import { calcularMes, compararMeses, textoCor, useFinancas, type Categoria, type Lancamento, type Tipo } from '../lib/financas'
import { useCartoes, type Cartao } from '../lib/cartoes'
import PainelCartoes from '../components/Cartoes'
import Lancar from '../components/Lancar'
import Rosca from '../components/Rosca'
import { useAviso } from '../components/Aviso'

export default function Financas() {
  const [mes, setMes] = useState(mesAtual())
  const { categorias, lancamentos, recorrentes, metas, carregando, erro, recarregar } = useFinancas(mes)
  const [lancando, setLancando] = useState(false)
  const avisar = useAviso()

  const r = useMemo(() => calcularMes(mes, lancamentos, categorias, recorrentes), [mes, lancamentos, categorias, recorrentes])
  const meses = useMemo(() => compararMeses(mes, lancamentos), [mes, lancamentos])
  const doMes = lancamentos.filter((l) => l.data.startsWith(mes))
  const cat = (id: string | null) => categorias.find((c) => c.id === id)
  const cartoes = useCartoes()
  const nomeCartao = (id?: string | null) => (id ? cartoes.cartoes.find((c) => c.id === id)?.nome ?? 'Cartão' : '')

  async function apagar(l: Lancamento, texto: string) {
    const parcelado = l.compra_id && (l.parcelas ?? 1) > 1
    if (!confirm(parcelado ? `Apagar a compra "${texto}" e todas as ${l.parcelas} parcelas?` : `Apagar o lançamento "${texto}"?`)) return
    const { error } = parcelado
      ? await supabase.from('lancamentos').delete().eq('compra_id', l.compra_id!)
      : await supabase.from('lancamentos').delete().eq('id', l.id)
    cartoes.recarregar()
    if (error) avisar('Não foi possível apagar. Tente de novo.')
    else { avisar('Lançamento apagado.'); recarregar() }
  }

  const fatias = [
    ...r.porCategoria.map((c) => ({ nome: c.nome, valor: c.gasto, cor: c.cor })),
    { nome: 'Sem categoria', valor: r.semCategoria, cor: '#6b7280' },
  ]
  const comLimite = r.porCategoria.filter((c) => c.limite_mensal).sort((a, b) => (b.uso ?? 0) - (a.uso ?? 0))
  const preenchido = r.entradas > 0 ? Math.min(r.saidas / r.entradas, 1) : r.saidas > 0 ? 1 : 0

  // agrupa os lançamentos do mês por dia
  const porDia: [string, typeof doMes][] = []
  for (const l of doMes) {
    const g = porDia.find(([d]) => d === l.data)
    if (g) g[1].push(l); else porDia.push([l.data, [l]])
  }

  return (
    <>
      <div className="cabeca">
        <h1>Finanças</h1>
        <div className="seletor-mes">
          <button aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>‹</button>
          <span>{nomeMes(mes)}</span>
          <button aria-label="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}>›</button>
        </div>
      </div>

      {erro && <p className="aviso erro">{erro}</p>}

      {!carregando && (
        <div className="grade">
          {/* ---------- Termômetro ---------- */}
          <section className={`bloco largo termometro ${r.cor}`}>
            <div className="saldo-linha">
              <div>
                <div className="rotulo">Saldo do mês</div>
                <div className="saldo num">{reais(r.saldo)}</div>
              </div>
              <span className={`selo ${r.cor}`}>{r.cor === 'neutro' ? 'Sem dados' : r.cor === 'verde' ? 'Verde' : r.cor === 'amarelo' ? 'Amarelo' : 'Vermelho'}</span>
            </div>
            <div className="barra-termo" aria-hidden="true"><div style={{ width: `${preenchido * 100}%` }} /></div>
            <p className="frase">{textoCor[r.cor]}</p>
            <dl className="numeros">
              <div><dt>Entrou</dt><dd className="num bom">{reais(r.entradas)}</dd></div>
              <div><dt>Saiu</dt><dd className="num ruim">{reais(r.saidas)}</dd></div>
              {(r.atual || r.futuro) && <div><dt>{r.estimativa ? 'Previsão (estimativa)' : 'Previsão do fim do mês'}</dt><dd className="num">{reais(r.previsao)}</dd></div>}
              {r.atual && <div><dt>Gasto médio por dia</dt><dd className="num">{reais(r.mediaDiaria)}</dd></div>}
            </dl>
            {r.pendentes.length > 0 && (
              <p className="miudo">{r.estimativa && r.atual ? 'No começo do mês a previsão usa também o ritmo dos meses anteriores. ' : ''}A previsão já conta {r.pendentes.length} {r.pendentes.length === 1 ? 'fixo que ainda vai cair' : 'fixos que ainda vão cair'} este mês.</p>
            )}
          </section>

          {cartoes.disponivel ? (
            <PainelCartoes {...cartoes} avisar={avisar} />
          ) : (
            <p className="aviso bloco largo">Para acompanhar os cartões de crédito, rode o arquivo <strong>supabase/cartoes.sql</strong> no Supabase (veja o LEIA-ME).</p>
          )}

          {/* ---------- Limites ---------- */}
          <section className="bloco">
            <h2>Limites por categoria</h2>
            {comLimite.length === 0 ? (
              <p className="vazio">Defina um limite mensal nas categorias que mais pesam, lá embaixo em "Categorias e limites". O app avisa quando passar de 80%.</p>
            ) : (
              <ul className="limites">
                {comLimite.map((c) => (
                  <li key={c.id} className={c.estado}>
                    <div className="lim-topo">
                      <span>{c.nome}</span>
                      <span className="num">{reais(c.gasto)} <span className="de">de {reais(c.limite_mensal!)}</span></span>
                    </div>
                    <div className="barra"><div style={{ width: `${Math.min((c.uso ?? 0) * 100, 100)}%` }} /></div>
                    {c.estado === 'perto' && <div className="alerta">Passou de 80%: restam {reais(c.limite_mensal! - c.gasto)}</div>}
                    {c.estado === 'estourou' && <div className="alerta">Estourou em {reais(c.gasto - c.limite_mensal!)}</div>}
                  </li>
                ))}
              </ul>
            )}
            {r.autocuidado > 0 && <p className="miudo">Com autocuidado este mês: <span className="num">{reais(r.autocuidado)}</span></p>}
          </section>

          {/* ---------- Pizza ---------- */}
          <section className="bloco">
            <h2>Para onde foi o dinheiro</h2>
            {r.saidas > 0 ? <Rosca fatias={fatias} total={r.saidas} /> : <p className="vazio">Os gastos do mês aparecem aqui, divididos por categoria.</p>}
          </section>

          {/* ---------- Lançamentos ---------- */}
          <section className="bloco largo">
            <h2>Lançamentos</h2>
            {porDia.length === 0 ? (
              <p className="vazio">Nada lançado em {nomeMes(mes).toLowerCase()}. Use o botão + para lançar o primeiro gasto.</p>
            ) : porDia.map(([dia, itens]) => (
              <div key={dia} className="dia">
                <h3>{nomeDia(dia)}</h3>
                <ul className="lancamentos">
                  {itens.map((l) => {
                    const c = cat(l.categoria_id)
                    const texto = l.descricao || c?.nome || 'Sem categoria'
                    return (
                      <li key={l.id}>
                        <span className="bolinha" style={{ background: c?.cor ?? '#6b7280' }} />
                        <span className="desc">
                          {texto}
                          {l.descricao && c && <small>{c.nome}</small>}
                          {(l.recorrente_id || l.cartao_id) && (
                            <small>{[l.recorrente_id && 'Fixo', nomeCartao(l.cartao_id), l.parcelas && `${l.parcela}/${l.parcelas}`].filter(Boolean).join(', ')}</small>
                          )}
                        </span>
                        <span className={`num ${l.tipo === 'entrada' ? 'bom' : ''}`}>{l.tipo === 'entrada' ? '+' : '−'} {reais(l.valor)}</span>
                        <button className="apagar" aria-label={`Apagar ${texto}`} onClick={() => apagar(l, texto)}>×</button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </section>

          {/* ---------- Dia a dia ---------- */}
          {r.diaADia.length > 0 && (
            <section className="bloco largo">
              <details>
                <summary><h2>Dia a dia</h2></summary>
                <div className="rolar">
                  <table className="tabela num">
                    <thead><tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Diário</th><th>Saldo</th></tr></thead>
                    <tbody>
                      {r.diaADia.map((d) => (
                        <tr key={d.data} className={d.entrada || d.saida ? '' : 'parado'}>
                          <td>{d.data.slice(8)}/{d.data.slice(5, 7)}</td>
                          <td className="bom">{d.entrada ? reais(d.entrada) : '–'}</td>
                          <td className="ruim">{d.saida ? reais(d.saida) : '–'}</td>
                          <td className={d.diario < 0 ? 'ruim' : d.diario > 0 ? 'bom' : ''}>{d.diario ? reais(d.diario) : '–'}</td>
                          <td className={d.saldo < 0 ? 'ruim' : ''}>{reais(d.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          )}

          {/* ---------- Meses lado a lado ---------- */}
          <section className="bloco largo">
            <h2>Últimos 6 meses</h2>
            <div className="rolar">
              <table className="tabela num meses">
                <thead><tr><th></th>{meses.map((m) => <th key={m.mes} className={m.mes === mes ? 'atual' : ''}>{nomeMes(m.mes, true)}</th>)}</tr></thead>
                <tbody>
                  <tr><th>Entrada</th>{meses.map((m) => <td key={m.mes} className="bom">{reais(m.entrada)}</td>)}</tr>
                  <tr><th>Saída</th>{meses.map((m) => <td key={m.mes} className="ruim">{reais(m.saida)}</td>)}</tr>
                  <tr><th>Saldo</th>{meses.map((m) => <td key={m.mes} className={m.saldo < 0 ? 'ruim' : ''}><strong>{reais(m.saldo)}</strong></td>)}</tr>
                </tbody>
              </table>
            </div>
          </section>

          <Fixos categorias={categorias} recorrentes={recorrentes} cartoes={cartoes.ativos} mudou={recarregar} avisar={avisar} />
          <Metas metas={metas} mudou={recarregar} avisar={avisar} />
          <Categorias categorias={categorias} mudou={recarregar} avisar={avisar} />
        </div>
      )}

      <button className="fab" aria-label="Lançar gasto ou entrada" onClick={() => setLancando(true)}>+</button>
      {lancando && <Lancar categorias={categorias} fechar={() => setLancando(false)} salvo={(m) => { avisar(m); recarregar(); cartoes.recarregar() }} />}
    </>
  )
}

type Base = { mudou: () => void; avisar: (m: string) => void }

/* ---------- Gastos fixos ---------- */
function Fixos({ categorias, recorrentes, cartoes, mudou, avisar }: Base & { categorias: Categoria[]; recorrentes: import('../lib/financas').Recorrente[]; cartoes: Cartao[] }) {
  const [abrir, setAbrir] = useState(false)
  const [f, setF] = useState({ descricao: '', valor: '', dia: '5', tipo: 'saida' as Tipo, categoria: '', cartao: '' })

  async function criar(e: FormEvent) {
    e.preventDefault()
    const v = lerValor(f.valor)
    if (!(v > 0)) return avisar('Digite um valor válido.')
    const dados: Record<string, unknown> = { descricao: f.descricao.trim(), valor: v, dia_mes: Number(f.dia), tipo: f.tipo, categoria_id: f.categoria || null }
    if (f.tipo === 'saida' && f.cartao) dados.cartao_id = f.cartao
    const { error } = await supabase.from('recorrentes').insert(dados)
    if (error) return avisar('Não foi possível salvar o fixo.')
    avisar(`${f.descricao} será lançado todo dia ${f.dia}.`)
    setF({ ...f, descricao: '', valor: '' }); setAbrir(false); mudou()
  }
  async function parar(id: string, nome: string) {
    if (!confirm(`Parar de lançar "${nome}" todo mês? Os lançamentos que já existem continuam.`)) return
    await supabase.from('recorrentes').update({ ativo: false }).eq('id', id)
    avisar(`${nome} não será mais lançado.`); mudou()
  }

  return (
    <section className="bloco">
      <h2>Gastos e entradas fixos</h2>
      <p className="miudo" style={{ marginTop: -6 }}>Lançados sozinhos no dia do vencimento.</p>
      {recorrentes.length > 0 && (
        <ul className="lancamentos">
          {recorrentes.map((r) => (
            <li key={r.id}>
              <span className="dia-fixo num">dia {r.dia_mes}</span>
              <span className="desc">{r.descricao}{r.cartao_id && <small>{cartoes.find((c) => c.id === r.cartao_id)?.nome ?? 'Cartão'}</small>}</span>
              <span className={`num ${r.tipo === 'entrada' ? 'bom' : ''}`}>{reais(r.valor)}</span>
              <button className="apagar" aria-label={`Parar ${r.descricao}`} onClick={() => parar(r.id, r.descricao)}>×</button>
            </li>
          ))}
        </ul>
      )}
      {abrir ? (
        <form onSubmit={criar} className="form-compacto">
          <div className="alternar largo" role="group" aria-label="Tipo">
            <button type="button" aria-pressed={f.tipo === 'saida'} onClick={() => setF({ ...f, tipo: 'saida', categoria: '' })}>Gasto</button>
            <button type="button" aria-pressed={f.tipo === 'entrada'} onClick={() => setF({ ...f, tipo: 'entrada', categoria: '' })}>Entrada</button>
          </div>
          <div className="campo"><label htmlFor="fx-d">Nome</label>
            <input id="fx-d" required value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder={f.tipo === 'saida' ? 'Ex.: Internet' : 'Ex.: Salário'} /></div>
          <div className="duas">
            <div className="campo"><label htmlFor="fx-v">Valor</label>
              <input id="fx-v" required inputMode="decimal" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} placeholder="0,00" /></div>
            <div className="campo"><label htmlFor="fx-dia">Dia do mês</label>
              <input id="fx-dia" type="number" min={1} max={31} required value={f.dia} onChange={(e) => setF({ ...f, dia: e.target.value })} /></div>
          </div>
          <div className="campo"><label htmlFor="fx-c">Categoria</label>
            <select id="fx-c" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
              <option value="">Sem categoria</option>
              {categorias.filter((c) => c.tipo === f.tipo && c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select></div>
          {f.tipo === 'saida' && cartoes.length > 0 && (
            <div className="campo"><label htmlFor="fx-ct">Como paga</label>
              <select id="fx-ct" value={f.cartao} onChange={(e) => setF({ ...f, cartao: e.target.value })}>
                <option value="">Pix, débito ou boleto</option>
                {cartoes.map((c) => <option key={c.id} value={c.id}>Cartão {c.nome}</option>)}
              </select></div>
          )}
          <div className="acoes"><button className="botao">Salvar fixo</button><button type="button" className="botao sec" onClick={() => setAbrir(false)}>Cancelar</button></div>
        </form>
      ) : (
        <button className="botao sec" onClick={() => setAbrir(true)}>Adicionar fixo</button>
      )}
    </section>
  )
}

/* ---------- Metas de economia ---------- */
function Metas({ metas, mudou, avisar }: Base & { metas: import('../lib/financas').MetaEconomia[] }) {
  const [nova, setNova] = useState({ nome: '', alvo: '' })
  const [abrir, setAbrir] = useState(false)
  const [guardando, setGuardando] = useState<Record<string, string>>({})

  async function criar(e: FormEvent) {
    e.preventDefault()
    const v = lerValor(nova.alvo)
    if (!(v > 0)) return avisar('Digite quanto quer juntar.')
    const { error } = await supabase.from('metas_economia').insert({ nome: nova.nome.trim(), valor_alvo: v })
    if (error) return avisar('Não foi possível criar a meta.')
    setNova({ nome: '', alvo: '' }); setAbrir(false); mudou()
  }
  async function guardar(id: string, atual: number, alvo: number) {
    const v = lerValor(guardando[id] || '')
    if (!v) return
    const total = Math.max(atual + v, 0)
    await supabase.from('metas_economia').update({ valor_guardado: total, concluida: total >= alvo }).eq('id', id)
    setGuardando({ ...guardando, [id]: '' })
    avisar(total >= alvo ? 'Meta batida!' : `Guardado. Faltam ${reais(alvo - total)}.`); mudou()
  }

  return (
    <section className="bloco">
      <h2>Metas de economia</h2>
      {metas.length === 0 && !abrir && <p className="vazio">Uma reserva de emergência é um bom primeiro objetivo.</p>}
      <ul className="metas">
        {metas.map((m) => {
          const p = Math.min(m.valor_guardado / m.valor_alvo, 1)
          return (
            <li key={m.id}>
              <div className="lim-topo"><span>{m.nome}</span><span className="num">{reais(m.valor_guardado)} <span className="de">de {reais(m.valor_alvo)}</span></span></div>
              <div className="barra meta"><div style={{ width: `${p * 100}%` }} /></div>
              {m.concluida ? <div className="miudo bom">Meta batida.</div> : (
                <form className="guardar" onSubmit={(e) => { e.preventDefault(); guardar(m.id, m.valor_guardado, m.valor_alvo) }}>
                  <input inputMode="decimal" placeholder="Valor" aria-label={`Valor para guardar em ${m.nome}`}
                    value={guardando[m.id] || ''} onChange={(e) => setGuardando({ ...guardando, [m.id]: e.target.value })} />
                  <button className="botao sec">Guardar</button>
                </form>
              )}
            </li>
          )
        })}
      </ul>
      {abrir ? (
        <form onSubmit={criar} className="form-compacto">
          <div className="campo"><label htmlFor="mt-n">Objetivo</label>
            <input id="mt-n" required value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} placeholder="Ex.: Reserva de emergência" /></div>
          <div className="campo"><label htmlFor="mt-v">Quanto quer juntar</label>
            <input id="mt-v" required inputMode="decimal" value={nova.alvo} onChange={(e) => setNova({ ...nova, alvo: e.target.value })} placeholder="0,00" /></div>
          <div className="acoes"><button className="botao">Criar meta</button><button type="button" className="botao sec" onClick={() => setAbrir(false)}>Cancelar</button></div>
        </form>
      ) : <button className="botao sec" onClick={() => setAbrir(true)}>Nova meta</button>}
    </section>
  )
}

/* ---------- Categorias e limites ---------- */
const coresCat = ['#7c9cff', '#4ade80', '#f472b6', '#fb923c', '#facc15', '#a78bfa', '#38bdf8', '#f87171', '#9ca3af']

function Categorias({ categorias, mudou, avisar }: Base & { categorias: Categoria[] }) {
  const [nova, setNova] = useState({ nome: '', tipo: 'saida' as Tipo })

  async function limite(c: Categoria, texto: string) {
    const v = texto.trim() ? lerValor(texto) : null
    if (v !== null && !(v > 0)) return avisar('Limite inválido.')
    if (v === c.limite_mensal) return
    await supabase.from('categorias').update({ limite_mensal: v }).eq('id', c.id)
    avisar(v ? `Limite de ${c.nome}: ${reais(v)} por mês.` : `${c.nome} ficou sem limite.`); mudou()
  }
  async function alternar(c: Categoria, campo: 'autocuidado' | 'ativo') {
    await supabase.from('categorias').update({ [campo]: !c[campo] }).eq('id', c.id); mudou()
  }
  async function criar(e: FormEvent) {
    e.preventDefault()
    const cor = coresCat[categorias.length % coresCat.length]
    const { error } = await supabase.from('categorias').insert({ nome: nova.nome.trim(), tipo: nova.tipo, cor })
    if (error) return avisar('Não foi possível criar a categoria.')
    avisar(`Categoria ${nova.nome} criada.`); setNova({ ...nova, nome: '' }); mudou()
  }

  const grupo = (tipo: Tipo) => categorias.filter((c) => c.tipo === tipo)

  return (
    <section className="bloco largo">
      <details>
        <summary><h2>Categorias e limites</h2></summary>
        <p className="miudo">Deixe o limite vazio para não ter limite. Categorias de autocuidado somam no total de autocuidado.</p>
        <div className="rolar">
        <table className="tabela cats">
          <thead><tr><th>Gastos</th><th>Limite por mês</th><th>Autocuidado</th><th>Ativa</th></tr></thead>
          <tbody>
            {grupo('saida').map((c) => (
              <tr key={c.id} className={c.ativo ? '' : 'parado'}>
                <td><span className="bolinha" style={{ background: c.cor }} /> {c.nome}</td>
                <td><input className="mini num" inputMode="decimal" placeholder="Sem limite" aria-label={`Limite de ${c.nome}`}
                  defaultValue={c.limite_mensal ? String(c.limite_mensal).replace('.', ',') : ''}
                  onBlur={(e) => limite(c, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} /></td>
                <td><input type="checkbox" checked={c.autocuidado} onChange={() => alternar(c, 'autocuidado')} aria-label={`${c.nome} é autocuidado`} /></td>
                <td><input type="checkbox" checked={c.ativo} onChange={() => alternar(c, 'ativo')} aria-label={`${c.nome} ativa`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="miudo">Entradas: {grupo('entrada').map((c) => c.nome).join(', ') || 'nenhuma'}</p>
        <form onSubmit={criar} className="nova-cat">
          <input required placeholder="Nova categoria" aria-label="Nome da nova categoria" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
          <select aria-label="Tipo da nova categoria" value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value as Tipo })}>
            <option value="saida">Gasto</option><option value="entrada">Entrada</option>
          </select>
          <button className="botao sec">Criar</button>
        </form>
      </details>
    </section>
  )
}
