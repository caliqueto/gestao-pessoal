import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { diaDaSemana, diasNoMes, hojeISO, somarDias } from './datas'

export type Habito = { id: string; nome: string; dias_semana: number[]; cor: string; ativo: boolean; criado_em: string }

/** Quantos dias de histórico carregar para calcular a sequência */
const HISTORICO = 180

export function useHabitos() {
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [feitas, setFeitas] = useState<Record<string, Set<string>>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const recarregar = useCallback(async () => {
    const desde = somarDias(hojeISO(), -HISTORICO)
    const [h, m] = await Promise.all([
      supabase.from('habitos').select('id,nome,dias_semana,cor,ativo,criado_em').eq('ativo', true).order('criado_em'),
      supabase.from('marcacoes_habito').select('habito_id,data').gte('data', desde),
    ])
    setErro(h.error || m.error ? 'Não foi possível carregar os hábitos. Confira a internet.' : '')
    setHabitos((h.data ?? []) as Habito[])
    const mapa: Record<string, Set<string>> = {}
    for (const x of m.data ?? []) (mapa[x.habito_id] ??= new Set()).add(x.data)
    setFeitas(mapa)
    setCarregando(false)
  }, [])

  useEffect(() => { recarregar() }, [recarregar])

  /** Marca ou desmarca o hábito no dia. Muda na tela na hora e desfaz se o banco recusar. */
  async function alternar(habitoId: string, data: string) {
    const atual = feitas[habitoId] ?? new Set<string>()
    const estava = atual.has(data)
    const novo = new Set(atual)
    if (estava) novo.delete(data); else novo.add(data)
    setFeitas((f) => ({ ...f, [habitoId]: novo }))
    const { error } = estava
      ? await supabase.from('marcacoes_habito').delete().eq('habito_id', habitoId).eq('data', data)
      : await supabase.from('marcacoes_habito').insert({ habito_id: habitoId, data })
    if (error) {
      setFeitas((f) => ({ ...f, [habitoId]: atual }))
      return false
    }
    return true
  }

  return { habitos, feitas, carregando, erro, recarregar, alternar }
}

export const tocaNoDia = (h: Pick<Habito, 'dias_semana'>, data: string) => h.dias_semana.includes(diaDaSemana(data))

/**
 * Dias seguidos cumpridos, contando só os dias em que o hábito é feito.
 * Hoje ainda não marcado não quebra a sequência (o dia não acabou).
 */
export function sequencia(h: Pick<Habito, 'dias_semana'>, feitas: Set<string> | undefined, hoje = hojeISO()) {
  if (!feitas?.size || !h.dias_semana.length) return 0
  let d = feitas.has(hoje) ? hoje : somarDias(hoje, -1)
  let n = 0
  for (let i = 0; i < HISTORICO; i++) {
    if (tocaNoDia(h, d)) {
      if (feitas.has(d)) n++
      else break
    } else if (feitas.has(d)) n++ // fez num dia de folga: conta, mas não exige
    d = somarDias(d, -1)
  }
  return n
}

/** Dias cumpridos / dias previstos no mês até hoje (ou até o fim, se o mês já passou). */
export function aproveitamentoMes(h: Pick<Habito, 'dias_semana' | 'criado_em'>, feitas: Set<string> | undefined, mes: string, hoje = hojeISO()) {
  const criado = h.criado_em.slice(0, 10)
  let previstos = 0, feitos = 0
  for (let dia = 1; dia <= diasNoMes(mes); dia++) {
    const d = `${mes}-${String(dia).padStart(2, '0')}`
    if (d > hoje) break
    if (d < criado || !tocaNoDia(h, d)) continue
    previstos++
    if (feitas?.has(d)) feitos++
  }
  return { previstos, feitos, pct: previstos ? feitos / previstos : null }
}

export const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
export const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function descreverDias(dias: number[]) {
  const s = [...dias].sort()
  if (s.length === 7) return 'Todo dia'
  if (s.join() === '1,2,3,4,5') return 'Dias úteis'
  if (s.join() === '0,6') return 'Fins de semana'
  return s.map((d) => NOMES_DIAS[d].slice(0, 3)).join(', ')
}
