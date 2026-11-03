import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { lerValor, nomeMes, reais } from '../lib/datas'
import { resumoCartao, type Cartao, type useCartoes } from '../lib/cartoes'

type Props = ReturnType<typeof useCartoes> & { avisar: (m: string) => void }

const CORES = ['#a78bfa', '#f472b6', '#38bdf8', '#fb923c', '#4ade80', '#facc15', '#9ca3af']
const ddmm = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`
const mesCurto = (m: string) => nomeMes(m, true).toLowerCase()

/** Painel de cartões de crédito na tela de Finanças. */
export default function PainelCartoes({ ativos, cartoes, lancs, pagas, carregando, recarregar, marcarPaga, avisar }: Props) {
  const [form, setForm] = useState<Cartao | 'novo' | null>(null)

  if (carregando) return null
  return (
    <section className="bloco largo">
      <div className="lim-topo" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Cartões de crédito</h2>
        {form === null && <button className="botao sec" onClick={() => setForm('novo')}>{ativos.length ? 'Novo cartão' : 'Adicionar cartão'}</button>}
      </div>

      {ativos.length === 0 && form === null && (
        <p className="vazio">Cadastre seus cartões para ver quanto já tem na fatura antes dela chegar. Depois é só escolher o cartão na hora de lançar o gasto.</p>
      )}
      {form !== null && (
        <FormCartao cartao={form === 'novo' ? undefined : form} total={cartoes.length} fechar={() => setForm(null)} mudou={recarregar} avisar={avisar} />
      )}

      <div className="lista-cartoes">
        {ativos.map((c) => form !== null && form !== 'novo' && form.id === c.id ? null : (
          <CartaoCredito key={c.id} c={c} r={resumoCartao(c, lancs, pagas)} editar={() => setForm(c)}
            pagar={async (mes, paga) => {
              const ok = await marcarPaga(c.id, mes, paga)
              avisar(ok ? (paga ? `Fatura de ${mesCurto(mes)} marcada como paga.` : 'Pagamento desfeito.') : 'Não salvou. Tente de novo.')
            }} />
        ))}
      </div>
      {ativos.length > 0 && (
        <p className="miudo">Pagar a fatura não entra como gasto: as compras já foram contadas quando você lançou. Só marque como paga.</p>
      )}
    </section>
  )
}

function CartaoCredito({ c, r, editar, pagar }: {
  c: Cartao; r: ReturnType<typeof resumoCartao>; editar: () => void; pagar: (mes: string, paga: boolean) => void
}) {
  const [verCompras, setVerCompras] = useState(false)
  const teto = c.meta_fatura
  const estado = r.usoMeta == null ? '' : r.usoMeta >= 1 ? 'estourou' : r.usoMeta >= 0.8 ? 'perto' : 'ok'
  const quando = r.aberta.diasParaFechar === 0 ? 'fecha hoje' : r.aberta.diasParaFechar === 1 ? 'fecha amanhã' : `fecha em ${r.aberta.diasParaFechar} dias (${ddmm(r.aberta.fecha)})`
  const comParcelas = r.proximas.some((p) => p.total > 0)

  return (
    <article className="cartao-credito" style={{ ['--cor' as string]: c.cor }}>
      <div className="cc-topo">
        <span className="cc-nome"><span className="bolinha" style={{ background: c.cor }} /> {c.nome}</span>
        <button className="link" onClick={editar}>Editar</button>
      </div>

      <div className={`cc-aberta ${estado}`}>
        <div className="rotulo">Fatura aberta de {mesCurto(r.aberta.mes)}, {quando}</div>
        <div className="cc-valor num">{reais(r.aberta.total)}</div>
        {teto ? (
          <>
            <div className="barra"><div style={{ width: `${Math.min((r.usoMeta ?? 0) * 100, 100)}%` }} /></div>
            <div className={`miudo ${estado === 'ok' ? '' : 'alerta'}`} style={{ marginTop: 6 }}>
              {estado === 'estourou' ? `Passou do seu teto de ${reais(teto)} em ${reais(r.aberta.total - teto)}.`
                : estado === 'perto' ? `Passou de 80% do teto: restam ${reais(teto - r.aberta.total)}.`
                : `Teto de ${reais(teto)}: ainda cabem ${reais(teto - r.aberta.total)}.`}
            </div>
          </>
        ) : <div className="miudo" style={{ marginTop: 4 }}>Vence em {ddmm(r.aberta.vence)}.</div>}
      </div>

      {(r.fechada.total > 0 || r.fechada.paga) && (
        <div className={`cc-fechada ${r.fechadaVencida ? 'vencida' : ''}`}>
          <div>
            <div className="rotulo">Fatura fechada de {mesCurto(r.fechada.mes)}</div>
            <div className="num" style={{ fontWeight: 600 }}>{reais(r.fechada.total)}
              <span className="de">{r.fechada.paga ? ', paga' : r.fechadaVencida ? `, venceu em ${ddmm(r.fechada.vence)}` : `, vence em ${ddmm(r.fechada.vence)}`}</span>
            </div>
          </div>
          {r.fechada.paga
            ? <button className="link" onClick={() => pagar(r.fechada.mes, false)}>Desfazer</button>
            : <button className="botao sec" onClick={() => pagar(r.fechada.mes, true)}>Marcar como paga</button>}
        </div>
      )}

      {comParcelas && (
        <div className="cc-proximas">
          <div className="rotulo">Já comprometido nas próximas faturas</div>
          <div className="cc-meses">
            {r.proximas.map((p) => (
              <div key={p.mes}><span>{mesCurto(p.mes)}</span><strong className="num">{p.total ? reais(p.total) : '–'}</strong></div>
            ))}
          </div>
          {r.futuroAlem > 0 && <div className="miudo" style={{ marginTop: 4 }}>E mais {reais(r.futuroAlem)} depois disso.</div>}
        </div>
      )}

      {c.limite && (
        <div className="cc-limite">
          <div className="lim-topo"><span className="rotulo">Limite usado</span><span className="num">{reais(r.comprometido)} <span className="de">de {reais(c.limite)}</span></span></div>
          <div className="barra fina"><div style={{ width: `${Math.min(r.comprometido / c.limite, 1) * 100}%`, background: 'var(--cor)' }} /></div>
        </div>
      )}

      {r.comprasAberta.length > 0 && (
        <>
          <button className="link" onClick={() => setVerCompras(!verCompras)}>
            {verCompras ? 'Esconder' : 'Ver'} compras da fatura aberta ({r.comprasAberta.length})
          </button>
          {verCompras && (
            <ul className="lancamentos">
              {r.comprasAberta.map((l) => (
                <li key={l.id}>
                  <span className="dia-fixo num">{ddmm(l.data)}</span>
                  <span className="desc">{l.descricao || 'Compra'}{l.parcelas && <small>parcela {l.parcela}/{l.parcelas}</small>}</span>
                  <span className="num">{reais(l.valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  )
}

function FormCartao({ cartao, total, fechar, mudou, avisar }: { cartao?: Cartao; total: number; fechar: () => void; mudou: () => void; avisar: (m: string) => void }) {
  const [f, setF] = useState({
    nome: cartao?.nome ?? '',
    fechamento: String(cartao?.dia_fechamento ?? ''),
    vencimento: String(cartao?.dia_vencimento ?? ''),
    limite: cartao?.limite ? String(cartao.limite).replace('.', ',') : '',
    teto: cartao?.meta_fatura ? String(cartao.meta_fatura).replace('.', ',') : '',
    cor: cartao?.cor ?? CORES[total % CORES.length],
  })

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const fech = Number(f.fechamento), venc = Number(f.vencimento)
    if (!(fech >= 1 && fech <= 31 && venc >= 1 && venc <= 31)) return avisar('Os dias precisam ser de 1 a 31.')
    const limite = f.limite.trim() ? lerValor(f.limite) : null
    const teto = f.teto.trim() ? lerValor(f.teto) : null
    if ((limite !== null && !(limite > 0)) || (teto !== null && !(teto > 0))) return avisar('Confira os valores de limite e teto.')
    const dados = { nome: f.nome.trim(), dia_fechamento: fech, dia_vencimento: venc, limite, meta_fatura: teto, cor: f.cor }
    const { error } = cartao
      ? await supabase.from('cartoes').update(dados).eq('id', cartao.id)
      : await supabase.from('cartoes').insert(dados)
    if (error) return avisar('Não foi possível salvar o cartão.')
    if (cartao && cartao.dia_fechamento !== fech) avisar('Cartão salvo. Compras já lançadas continuam na fatura em que estavam.')
    else avisar(cartao ? 'Cartão salvo.' : `Cartão ${dados.nome} adicionado.`)
    fechar(); mudou()
  }
  async function arquivar() {
    if (!cartao || !confirm(`Parar de usar o cartão "${cartao.nome}"? As compras lançadas continuam no histórico.`)) return
    await supabase.from('cartoes').update({ ativo: false }).eq('id', cartao.id)
    avisar('Cartão arquivado.'); fechar(); mudou()
  }

  return (
    <form onSubmit={salvar} className="cartao-habito form-cartao">
      <div className="campo"><label htmlFor="cc-n">Nome do cartão</label>
        <input id="cc-n" required autoFocus value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Nubank" /></div>
      <div className="duas">
        <div className="campo"><label htmlFor="cc-f">Dia que fecha</label>
          <input id="cc-f" type="number" min={1} max={31} required inputMode="numeric" value={f.fechamento} onChange={(e) => setF({ ...f, fechamento: e.target.value })} /></div>
        <div className="campo"><label htmlFor="cc-v">Dia que vence</label>
          <input id="cc-v" type="number" min={1} max={31} required inputMode="numeric" value={f.vencimento} onChange={(e) => setF({ ...f, vencimento: e.target.value })} /></div>
      </div>
      <p className="miudo" style={{ margin: '-6px 0 12px' }}>Os dois aparecem no app do banco. Compras a partir do dia que fecha vão para a fatura seguinte.</p>
      <div className="duas">
        <div className="campo"><label htmlFor="cc-l">Limite (opcional)</label>
          <input id="cc-l" inputMode="decimal" value={f.limite} onChange={(e) => setF({ ...f, limite: e.target.value })} placeholder="0,00" /></div>
        <div className="campo"><label htmlFor="cc-t">Meu teto por fatura (opcional)</label>
          <input id="cc-t" inputMode="decimal" value={f.teto} onChange={(e) => setF({ ...f, teto: e.target.value })} placeholder="0,00" /></div>
      </div>
      <p className="miudo" style={{ margin: '-6px 0 12px' }}>O teto é quanto você quer gastar, não o limite do banco. O app avisa ao passar de 80%.</p>
      <div className="campo">
        <span className="rotulo-campo">Cor</span>
        <div className="opcoes">
          {CORES.map((c) => <button type="button" key={c} className="cor pequena" style={{ background: c }} aria-label={`Cor ${c}`} aria-pressed={f.cor === c} onClick={() => setF({ ...f, cor: c })} />)}
        </div>
      </div>
      <div className="acoes">
        <button className="botao">{cartao ? 'Salvar' : 'Adicionar cartão'}</button>
        <button type="button" className="botao sec" onClick={fechar}>Cancelar</button>
        {cartao && <button type="button" className="link perigo" onClick={arquivar}>Arquivar</button>}
      </div>
    </form>
  )
}
