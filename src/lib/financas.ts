import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { diasNoMes, hojeISO, mesAtual, primeiroDia, somarMeses, ultimoDia } from './datas'

export type Tipo = 'entrada' | 'saida'
export type Categoria = { id: string; nome: string; tipo: Tipo; cor: string; limite_mensal: number | null; autocuidado: boolean; ativo: boolean }
export type Lancamento = {
  id: string; data: string; tipo: Tipo; valor: number; categoria_id: string | null; descricao: string | null; recorrente_id: string | null
  cartao_id?: string | null; parcela?: number | null; parcelas?: number | null; compra_id?: string | null
}
export type Recorrente = { id: string; descricao: string; tipo: Tipo; valor: number; categoria_id: string | null; dia_mes: number; ativo: boolean; cartao_id?: string | null }
export type MetaEconomia = { id: string; nome: string; valor_alvo: number; valor_guardado: number; prazo: string | null; concluida: boolean }

export type Cor = 'verde' | 'amarelo' | 'vermelho' | 'neutro'

const n = (v: unknown) => Number(v) || 0

const COLUNAS = 'id,data,tipo,valor,categoria_id,descricao,recorrente_id'
/** Busca com as colunas do cartão; se o cartoes.sql ainda não foi rodado, cai para as colunas antigas. */
async function buscarLancamentos(desde: string, ate: string) {
  const q = (cols: string) => supabase.from('lancamentos').select(cols)
    .gte('data', desde).lte('data', ate).order('data', { ascending: false }).order('criado_em', { ascending: false })
  const r = await q(`${COLUNAS},cartao_id,parcela,parcelas,compra_id`)
  return r.error ? q(COLUNAS) : r
}

/** Carrega tudo que a tela de finanças precisa para um mês (e os 5 anteriores para a comparação). */
export function useFinancas(mes: string) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [recorrentes, setRecorrentes] = useState<Recorrente[]>([])
  const [metas, setMetas] = useState<MetaEconomia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    setErro('')
    if (mes === mesAtual()) {
      // lança sozinho os fixos que já venceram neste mês (ignora se a função ainda não foi criada)
      await supabase.rpc('gerar_recorrentes', { ate: hojeISO() })
    }
    const desde = primeiroDia(somarMeses(mes, -5))
    const [c, l, r, m] = await Promise.all([
      supabase.from('categorias').select('*').order('nome'),
      buscarLancamentos(desde, ultimoDia(mes)),
      supabase.from('recorrentes').select('*').eq('ativo', true).order('dia_mes'),
      supabase.from('metas_economia').select('*').order('concluida').order('nome'),
    ])
    const falha = c.error || l.error || r.error || m.error
    if (falha) setErro('Não foi possível carregar os dados. Confira a internet e tente de novo.')
    setCategorias((c.data ?? []).map((x) => ({ ...x, limite_mensal: x.limite_mensal == null ? null : n(x.limite_mensal) })))
    setLancamentos(((l.data ?? []) as unknown as Lancamento[]).map((x) => ({ ...x, valor: n(x.valor) })))
    setRecorrentes((r.data ?? []).map((x) => ({ ...x, valor: n(x.valor) })))
    setMetas((m.data ?? []).map((x) => ({ ...x, valor_alvo: n(x.valor_alvo), valor_guardado: n(x.valor_guardado) })))
    setCarregando(false)
  }, [mes])

  useEffect(() => { recarregar() }, [recarregar])

  return { categorias, lancamentos, recorrentes, metas, carregando, erro, recarregar }
}

export type Resumo = ReturnType<typeof calcularMes>

/** Todos os números do mês: totais, termômetro, previsão, categorias e dia a dia. */
export function calcularMes(mes: string, todos: Lancamento[], categorias: Categoria[], recorrentes: Recorrente[], hoje = hojeISO()) {
  const doMes = todos.filter((l) => l.data.startsWith(mes))
  const entradas = soma(doMes.filter((l) => l.tipo === 'entrada'))
  const saidas = soma(doMes.filter((l) => l.tipo === 'saida'))
  const saldo = entradas - saidas

  const total = diasNoMes(mes)
  const atual = mes === hoje.slice(0, 7)
  const futuro = mes > hoje.slice(0, 7)
  const diaHoje = atual ? Number(hoje.slice(8)) : futuro ? 0 : total
  const restantes = total - diaHoje

  // fixos que ainda vão cair neste mês
  const jaLancados = new Set(doMes.map((l) => l.recorrente_id).filter(Boolean))
  const pendentes = recorrentes.filter((r) => r.ativo && !jaLancados.has(r.id) && Math.min(r.dia_mes, total) > diaHoje)
  const entradaPendente = soma(pendentes.filter((r) => r.tipo === 'entrada'))
  const saidaPendente = soma(pendentes.filter((r) => r.tipo === 'saida'))

  // ritmo dos gastos do dia a dia (sem os fixos) para projetar o resto do mês
  // No começo do mês poucos dias distorcem a média (ex.: o mercado do mês no dia 1).
  // Até o dia 10, mistura o ritmo atual com o ritmo dos meses anteriores; sem histórico, conta pelo menos 7 dias.
  const variaveis = soma(doMes.filter((l) => l.tipo === 'saida' && !l.recorrente_id))
  const ritmoAtual = diaHoje > 0 ? variaveis / Math.max(diaHoje, 7) : 0
  const anteriores = [1, 2, 3, 4, 5].map((i) => {
    const [a, m] = mes.split('-').map(Number)
    const d = new Date(a, m - 1 - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }).filter((m) => todos.some((l) => l.data.startsWith(m)))
  const historico = anteriores.length
    ? soma(todos.filter((l) => l.tipo === 'saida' && !l.recorrente_id && anteriores.some((m) => l.data.startsWith(m))))
      / anteriores.reduce((s, m) => s + diasNoMes(m), 0)
    : null
  const peso = Math.min(diaHoje / 10, 1)
  const mediaDiaria = diaHoje === 0 ? historico ?? 0
    : historico == null || peso === 1 ? (diaHoje >= 7 ? variaveis / diaHoje : ritmoAtual)
    : (variaveis / diaHoje) * peso + historico * (1 - peso)
  const estimativa = diaHoje < 10
  const previsao = saldo + entradaPendente - saidaPendente - mediaDiaria * restantes

  const base = entradas + entradaPendente
  let cor: Cor = 'neutro'
  if (doMes.length || pendentes.length) {
    if (base <= 0) cor = saidas > 0 ? 'vermelho' : 'neutro'
    else cor = previsao < 0 ? 'vermelho' : previsao < base * 0.1 ? 'amarelo' : 'verde'
  }

  const porCategoria = categorias
    .filter((c) => c.tipo === 'saida')
    .map((c) => {
      const gasto = soma(doMes.filter((l) => l.tipo === 'saida' && l.categoria_id === c.id))
      const uso = c.limite_mensal ? gasto / c.limite_mensal : null
      return { ...c, gasto, uso, estado: uso == null ? 'sem-limite' : uso >= 1 ? 'estourou' : uso >= 0.8 ? 'perto' : 'ok' }
    })
  const semCategoria = soma(doMes.filter((l) => l.tipo === 'saida' && !categorias.some((c) => c.id === l.categoria_id)))

  const autocuidado = porCategoria.filter((c) => c.autocuidado).reduce((s, c) => s + c.gasto, 0)

  let acumulado = 0
  const diaADia = Array.from({ length: Math.max(diaHoje, 0) }, (_, i) => {
    const data = `${mes}-${String(i + 1).padStart(2, '0')}`
    const doDia = doMes.filter((l) => l.data === data)
    const e = soma(doDia.filter((l) => l.tipo === 'entrada'))
    const s = soma(doDia.filter((l) => l.tipo === 'saida'))
    acumulado += e - s
    return { data, entrada: e, saida: s, diario: e - s, saldo: acumulado }
  })

  return { entradas, saidas, saldo, previsao, estimativa, cor, mediaDiaria, restantes, pendentes, porCategoria, semCategoria, autocuidado, diaADia, atual, futuro }
}

/** Entrada, saída e saldo de cada um dos últimos 6 meses até o mês escolhido. */
export function compararMeses(mes: string, todos: Lancamento[]) {
  return Array.from({ length: 6 }, (_, i) => {
    const m = somarMeses(mes, i - 5)
    const doMes = todos.filter((l) => l.data.startsWith(m))
    const e = soma(doMes.filter((l) => l.tipo === 'entrada'))
    const s = soma(doMes.filter((l) => l.tipo === 'saida'))
    return { mes: m, entrada: e, saida: s, saldo: e - s }
  })
}

function soma(lista: { valor: number }[]) {
  return lista.reduce((s, l) => s + l.valor, 0)
}

export const textoCor: Record<Cor, string> = {
  verde: 'No azul: o mês deve fechar com folga.',
  amarelo: 'Atenção: o mês deve fechar no limite.',
  vermelho: 'No vermelho: nesse ritmo, falta dinheiro no fim do mês.',
  neutro: 'Lance suas entradas e gastos para ver como o mês vai fechar.',
}
