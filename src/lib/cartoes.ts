import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { diasNoMes, hojeISO, mesDe, somarMeses } from './datas'
import type { Lancamento } from './financas'

export type Cartao = {
  id: string; nome: string; cor: string
  dia_fechamento: number; dia_vencimento: number
  limite: number | null; meta_fatura: number | null; ativo: boolean
}
export type LancCartao = Lancamento & { cartao_id: string; fatura: string; parcela: number | null; parcelas: number | null; compra_id: string | null }

const dois = (n: number) => String(n).padStart(2, '0')
const n = (v: unknown) => Number(v) || 0

/** Dia do mês ajustado ao tamanho do mês (dia 31 em fevereiro vira 28). */
const diaNoMes = (mes: string, dia: number) => `${mes}-${dois(Math.min(dia, diasNoMes(mes)))}`

/** Mês ('AAAA-MM') da fatura de uma compra. Até a véspera do fechamento: fatura do mês; do fechamento em diante: a do mês seguinte. */
export function mesFatura(data: string, fechamento: number) {
  const mes = mesDe(data)
  return Number(data.slice(8)) < Math.min(fechamento, diasNoMes(mes)) ? mes : somarMeses(mes, 1)
}
/** Data em que a fatura do mês fecha. */
export const dataFechamento = (mes: string, c: Pick<Cartao, 'dia_fechamento'>) => diaNoMes(mes, c.dia_fechamento)
/** Data de vencimento da fatura que fecha no mês. Se vence num dia "antes" do fechamento, é no mês seguinte. */
export const dataVencimento = (mes: string, c: Pick<Cartao, 'dia_fechamento' | 'dia_vencimento'>) =>
  diaNoMes(c.dia_vencimento > c.dia_fechamento ? mes : somarMeses(mes, 1), c.dia_vencimento)

/** Divide o valor em parcelas iguais; os centavos que sobram vão para a primeira. */
export function parcelar(valor: number, vezes: number) {
  const centavos = Math.round(valor * 100)
  const base = Math.floor(centavos / vezes)
  return Array.from({ length: vezes }, (_, i) => (base + (i === 0 ? centavos - base * vezes : 0)) / 100)
}

/** Mesma data N meses depois (31/01 + 1 mês = 28/02). */
export function somarMesesData(data: string, meses: number) {
  const m = somarMeses(mesDe(data), meses)
  return diaNoMes(m, Number(data.slice(8)))
}

/** Linhas de lançamento de uma compra no cartão (uma por parcela). */
export function linhasCompra(c: Cartao, compra: { valor: number; vezes: number; data: string; categoria_id: string | null; descricao: string | null }, compraId: string) {
  const primeira = mesFatura(compra.data, c.dia_fechamento)
  return parcelar(compra.valor, compra.vezes).map((v, i) => ({
    tipo: 'saida' as const,
    valor: v,
    categoria_id: compra.categoria_id,
    descricao: compra.descricao,
    data: somarMesesData(compra.data, i),
    cartao_id: c.id,
    fatura: `${somarMeses(primeira, i)}-01`,
    parcela: compra.vezes > 1 ? i + 1 : null,
    parcelas: compra.vezes > 1 ? compra.vezes : null,
    compra_id: compra.vezes > 1 ? compraId : null,
  }))
}

export function useCartoes() {
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [lancs, setLancs] = useState<LancCartao[]>([])
  const [pagas, setPagas] = useState<Set<string>>(new Set())
  const [disponivel, setDisponivel] = useState(true)
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const desde = `${somarMeses(hojeISO().slice(0, 7), -4)}-01`
    const [c, l, p] = await Promise.all([
      supabase.from('cartoes').select('*').order('criado_em'),
      supabase.from('lancamentos').select('id,data,tipo,valor,categoria_id,descricao,recorrente_id,cartao_id,fatura,parcela,parcelas,compra_id')
        .not('cartao_id', 'is', null).gte('fatura', desde).order('data', { ascending: false }),
      supabase.from('faturas_pagas').select('cartao_id,fatura'),
    ])
    // sem o cartoes.sql rodado as tabelas não existem: o resto do app segue funcionando
    setDisponivel(!c.error)
    setCartoes((c.data ?? []).map((x) => ({ ...x, limite: x.limite == null ? null : n(x.limite), meta_fatura: x.meta_fatura == null ? null : n(x.meta_fatura) })) as Cartao[])
    setLancs((l.data ?? []).map((x) => ({ ...x, valor: n(x.valor) })) as LancCartao[])
    setPagas(new Set((p.data ?? []).map((x) => `${x.cartao_id}|${x.fatura}`)))
    setCarregando(false)
  }, [])

  useEffect(() => { recarregar() }, [recarregar])

  async function marcarPaga(cartaoId: string, mes: string, paga: boolean) {
    const fatura = `${mes}-01`
    const { error } = paga
      ? await supabase.from('faturas_pagas').insert({ cartao_id: cartaoId, fatura })
      : await supabase.from('faturas_pagas').delete().eq('cartao_id', cartaoId).eq('fatura', fatura)
    if (!error) recarregar()
    return !error
  }

  return { cartoes, ativos: cartoes.filter((c) => c.ativo), lancs, pagas, disponivel, carregando, recarregar, marcarPaga }
}

/** Tudo que o painel de um cartão mostra. */
export function resumoCartao(c: Cartao, lancs: LancCartao[], pagas: Set<string>, hoje = hojeISO()) {
  const doCartao = lancs.filter((l) => l.cartao_id === c.id)
  const total = (mes: string) => doCartao.filter((l) => l.fatura.startsWith(mes)).reduce((s, l) => s + (l.tipo === 'saida' ? l.valor : -l.valor), 0)
  const paga = (mes: string) => pagas.has(`${c.id}|${mes}-01`)

  const mesAberta = mesFatura(hoje, c.dia_fechamento)
  const fecha = dataFechamento(mesAberta, c)
  const diasParaFechar = Math.round((Date.parse(fecha) - Date.parse(hoje)) / 864e5)
  const aberta = { mes: mesAberta, total: total(mesAberta), fecha, vence: dataVencimento(mesAberta, c), diasParaFechar }

  const mesFechada = somarMeses(mesAberta, -1)
  const fechada = { mes: mesFechada, total: total(mesFechada), vence: dataVencimento(mesFechada, c), paga: paga(mesFechada) }
  const fechadaVencida = !fechada.paga && fechada.total > 0 && fechada.vence < hoje

  const proximas = [1, 2, 3].map((i) => { const m = somarMeses(mesAberta, i); return { mes: m, total: total(m) } })
  const futuroAlem = doCartao.filter((l) => l.fatura > `${somarMeses(mesAberta, 3)}-31`).reduce((s, l) => s + l.valor, 0)

  // limite comprometido: tudo que ainda não foi pago (fatura fechada em aberto + aberta + parcelas futuras)
  const mesesAbertos = [...new Set(doCartao.map((l) => l.fatura.slice(0, 7)))].filter((m) => m >= mesFechada && !paga(m))
  const comprometido = mesesAbertos.reduce((s, m) => s + total(m), 0)

  const usoMeta = c.meta_fatura ? aberta.total / c.meta_fatura : null
  const comprasAberta = doCartao.filter((l) => l.fatura.startsWith(mesAberta)).sort((a, b) => b.data.localeCompare(a.data))

  return { aberta, fechada, fechadaVencida, proximas, futuroAlem, comprometido, usoMeta, comprasAberta }
}

/** Soma da fatura aberta de todos os cartões (para o Hoje). */
export function totalAberto(cartoes: Cartao[], lancs: LancCartao[], pagas: Set<string>, hoje = hojeISO()) {
  return cartoes.reduce((s, c) => s + resumoCartao(c, lancs, pagas, hoje).aberta.total, 0)
}

/* Forma de pagamento escolhida por último (por aparelho), para o lançamento rápido */
export function lerUltimoPagamento() { try { return localStorage.getItem('ultimo-pagamento') || '' } catch { return '' } }
export function gravarUltimoPagamento(v: string) { try { localStorage.setItem('ultimo-pagamento', v) } catch { /* ignora */ } }
